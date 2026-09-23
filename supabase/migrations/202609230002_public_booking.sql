-- Public booking functions expose only catalog and open time slots, never customer records.
create function public.booking_catalog(p_slug text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'company',jsonb_build_object('name',c.name,'slug',c.slug,'timezone',c.timezone),
    'services',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'name',s.name,'duration_minutes',s.duration_minutes,'price',s.price) order by s.name)
      from public.services s where s.company_id=c.id and s.active), '[]'::jsonb),
    'professionals',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'name',p.name) order by p.name)
      from public.professionals p where p.company_id=c.id and p.active), '[]'::jsonb)
  ) from public.companies c where c.slug=p_slug;
$$;
revoke all on function public.booking_catalog(text) from public;
grant execute on function public.booking_catalog(text) to anon,authenticated;

create function public.booking_slots(p_slug text,p_service uuid,p_professional uuid,p_date date)
returns table(starts_at timestamptz,ends_at timestamptz)
language sql stable security definer set search_path = '' as $$
  with settings as (
    select c.id company_id,c.timezone,s.duration_minutes
    from public.companies c join public.services s on s.company_id=c.id and s.id=p_service and s.active
    join public.professionals p on p.company_id=c.id and p.id=p_professional and p.active
    where c.slug=p_slug and p_date between (now() at time zone c.timezone)::date and (now() at time zone c.timezone)::date + 30
  ), candidates as (
    select (p_date::timestamp + n * interval '30 minutes') at time zone cfg.timezone as starts_at,
           (p_date::timestamp + n * interval '30 minutes' + cfg.duration_minutes * interval '1 minute') at time zone cfg.timezone as ends_at,
           (p_date::timestamp + n * interval '30 minutes')::time as local_start,
           (p_date::timestamp + n * interval '30 minutes' + cfg.duration_minutes * interval '1 minute')::time as local_end,
           cfg.company_id
    from settings cfg cross join generate_series(0,47) n
  )
  select candidate.starts_at,candidate.ends_at from candidates candidate
  where candidate.starts_at > now()
    and exists (select 1 from public.working_hours h where h.company_id=candidate.company_id
      and h.professional_id=p_professional and h.weekday=extract(dow from p_date)::int
      and candidate.local_start >= h.start_time and candidate.local_end <= h.end_time
      and candidate.local_end > candidate.local_start)
    and not exists (select 1 from public.time_blocks b where b.company_id=candidate.company_id
      and b.professional_id=p_professional and b.starts_at < candidate.ends_at and b.ends_at > candidate.starts_at)
    and not exists (select 1 from public.bookings b where b.company_id=candidate.company_id
      and b.professional_id=p_professional and b.status <> 'cancelled'
      and b.starts_at < candidate.ends_at and b.ends_at > candidate.starts_at)
  order by candidate.starts_at;
$$;
revoke all on function public.booking_slots(text,uuid,uuid,date) from public;
grant execute on function public.booking_slots(text,uuid,uuid,date) to anon,authenticated;

alter table public.bookings add column cancel_token_hash text;
create unique index bookings_cancel_token_hash_idx on public.bookings(cancel_token_hash) where cancel_token_hash is not null;
create function public.book_public(p_slug text,p_service uuid,p_professional uuid,p_starts_at timestamptz,p_name text,p_phone text,p_email text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_company uuid;v_customer uuid;v_booking uuid;v_token text;v_end timestamptz;v_tz text;
begin
  if length(trim(p_name)) not between 2 and 120 or length(trim(p_phone)) not between 7 and 30
     or length(coalesce(p_email,'')) > 200 then raise exception 'Dados de contato inválidos'; end if;
  select id,timezone into v_company,v_tz from public.companies where slug=p_slug;
  if v_company is null then raise exception 'Empresa não encontrada'; end if;
  select s.ends_at into v_end from public.booking_slots(p_slug,p_service,p_professional,(p_starts_at at time zone v_tz)::date) s
  where s.starts_at=p_starts_at;
  if v_end is null then raise exception 'Horário indisponível; escolha outro'; end if;
  insert into public.customers(company_id,name,phone,email) values(v_company,trim(p_name),trim(p_phone),nullif(trim(p_email),''))
    returning id into v_customer;
  v_token=gen_random_uuid()::text || gen_random_uuid()::text;
  insert into public.bookings(company_id,customer_id,professional_id,service_id,starts_at,ends_at,cancel_token_hash)
  values(v_company,v_customer,p_professional,p_service,p_starts_at,v_end,md5(v_token))
  returning id into v_booking;
  return jsonb_build_object('booking_id',v_booking,'cancel_token',v_token);
end;
$$;
revoke all on function public.book_public(text,uuid,uuid,timestamptz,text,text,text) from public;
grant execute on function public.book_public(text,uuid,uuid,timestamptz,text,text,text) to anon,authenticated;

create function public.cancel_public(p_token text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare v_updated integer;
begin
  if length(p_token) <> 72 then return false; end if;
  update public.bookings set status='cancelled',cancel_token_hash=null
  where cancel_token_hash=md5(p_token)
    and status='confirmed' and starts_at>now();
  get diagnostics v_updated=row_count;
  return v_updated=1;
end;
$$;
revoke all on function public.cancel_public(text) from public;
grant execute on function public.cancel_public(text) to anon,authenticated;
