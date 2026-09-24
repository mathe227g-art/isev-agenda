begin;

alter table public.bookings
  add column if not exists booking_group_id uuid not null default gen_random_uuid(),
  add column if not exists service_order smallint not null default 1 check (service_order between 1 and 20);
create index if not exists bookings_group_idx on public.bookings(company_id,booking_group_id,service_order);

create or replace function public.booking_slots_multi(p_slug text,p_services uuid[],p_professional uuid,p_date date)
returns table(starts_at timestamptz,ends_at timestamptz)
language sql stable security definer set search_path='' as $$
  with settings as (
    select c.id company_id,c.timezone,sum(s.duration_minutes)::int duration_minutes
    from public.companies c
    join unnest(p_services) with ordinality selected(service_id,position) on true
    join public.services s on s.company_id=c.id and s.id=selected.service_id and s.active
    join public.professionals p on p.company_id=c.id and p.id=p_professional and p.active
    where c.slug=p_slug
      and cardinality(p_services) between 1 and 10
      and p_date between (now() at time zone c.timezone)::date and (now() at time zone c.timezone)::date + 30
    group by c.id,c.timezone
    having count(*)=cardinality(p_services)
  ), candidates as (
    select (p_date::timestamp+n*interval '15 minutes') at time zone cfg.timezone starts_at,
           (p_date::timestamp+n*interval '15 minutes'+cfg.duration_minutes*interval '1 minute') at time zone cfg.timezone ends_at,
           (p_date::timestamp+n*interval '15 minutes')::time local_start,
           (p_date::timestamp+n*interval '15 minutes'+cfg.duration_minutes*interval '1 minute')::time local_end,
           cfg.company_id
    from settings cfg cross join generate_series(0,95) n
  )
  select candidate.starts_at,candidate.ends_at from candidates candidate
  where candidate.starts_at>now()
    and exists(select 1 from public.working_hours h where h.company_id=candidate.company_id
      and h.professional_id=p_professional and h.weekday=extract(dow from p_date)::int
      and candidate.local_start>=h.start_time and candidate.local_end<=h.end_time
      and candidate.local_end>candidate.local_start)
    and not exists(select 1 from public.time_blocks b where b.company_id=candidate.company_id
      and b.professional_id=p_professional and b.starts_at<candidate.ends_at and b.ends_at>candidate.starts_at)
    and not exists(select 1 from public.bookings b where b.company_id=candidate.company_id
      and b.professional_id=p_professional and b.status<>'cancelled'
      and b.starts_at<candidate.ends_at and b.ends_at>candidate.starts_at)
  order by candidate.starts_at;
$$;
revoke all on function public.booking_slots_multi(text,uuid[],uuid,date) from public;
grant execute on function public.booking_slots_multi(text,uuid[],uuid,date) to anon,authenticated;

create or replace function public.book_public_multi(p_slug text,p_services uuid[],p_professional uuid,p_starts_at timestamptz,p_name text,p_phone text,p_email text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_company uuid;v_customer uuid;v_group uuid:=gen_random_uuid();v_token text;v_end timestamptz;v_cursor timestamptz;v_tz text;v_phone text;v_service uuid;v_duration int;v_order int:=0;v_ids jsonb:='[]'::jsonb;v_booking uuid;
begin
  if p_name is null or p_phone is null or p_starts_at is null or p_professional is null or cardinality(p_services) not between 1 and 10 then raise exception 'Dados inválidos'; end if;
  if length(trim(p_name)) not between 2 and 120 or length(trim(p_phone)) not between 7 and 30 or length(coalesce(p_email,''))>200 then raise exception 'Dados de contato inválidos'; end if;
  select id,timezone into v_company,v_tz from public.companies where slug=p_slug;
  if v_company is null then raise exception 'Empresa não encontrada'; end if;
  v_phone=regexp_replace(p_phone,'[^0-9]','','g');
  if length(v_phone) not between 7 and 15 then raise exception 'Telefone inválido'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_company::text||':'||v_phone,0));
  if (select count(distinct booking_group_id) from public.bookings b join public.customers c on c.id=b.customer_id and c.company_id=b.company_id
      where b.company_id=v_company and regexp_replace(c.phone,'[^0-9]','','g')=v_phone and b.created_at>now()-interval '24 hours')>=5 then
    raise exception using errcode='P0429',message='Limite de reservas online atingido';
  end if;
  select s.ends_at into v_end from public.booking_slots_multi(p_slug,p_services,p_professional,(p_starts_at at time zone v_tz)::date) s where s.starts_at=p_starts_at;
  if v_end is null then raise exception 'Horário indisponível; escolha outro'; end if;
  insert into public.customers(company_id,name,phone,email) values(v_company,trim(p_name),v_phone,nullif(trim(p_email),'')) returning id into v_customer;
  v_token=gen_random_uuid()::text||gen_random_uuid()::text;
  v_cursor=p_starts_at;
  foreach v_service in array p_services loop
    v_order=v_order+1;
    select duration_minutes into v_duration from public.services where id=v_service and company_id=v_company and active;
    if v_duration is null then raise exception 'Serviço inválido'; end if;
    insert into public.bookings(company_id,customer_id,professional_id,service_id,starts_at,ends_at,cancel_token_hash,booking_group_id,service_order)
      values(v_company,v_customer,p_professional,v_service,v_cursor,v_cursor+v_duration*interval '1 minute',case when v_order=1 then md5(v_token) end,v_group,v_order)
      returning id into v_booking;
    v_ids=v_ids||jsonb_build_array(v_booking);
    v_cursor=v_cursor+v_duration*interval '1 minute';
  end loop;
  return jsonb_build_object('booking_ids',v_ids,'booking_id',v_ids->>0,'cancel_token',v_token);
end;
$$;
revoke all on function public.book_public_multi(text,uuid[],uuid,timestamptz,text,text,text) from public,anon,authenticated;
grant execute on function public.book_public_multi(text,uuid[],uuid,timestamptz,text,text,text) to service_role;

create or replace function public.cancel_public(p_token text) returns boolean
language plpgsql security definer set search_path='' as $$
declare v_group uuid;v_updated integer;
begin
  if length(p_token)<>72 then return false; end if;
  select booking_group_id into v_group from public.bookings where cancel_token_hash=md5(p_token) and status='confirmed' and starts_at>now();
  if v_group is null then return false; end if;
  update public.bookings set status='cancelled',cancel_token_hash=null where booking_group_id=v_group and status='confirmed' and starts_at>now();
  get diagnostics v_updated=row_count;
  return v_updated>0;
end;
$$;
revoke all on function public.cancel_public(text) from public;
grant execute on function public.cancel_public(text) to anon,authenticated;

notify pgrst,'reload schema';
commit;
