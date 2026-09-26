begin;

alter table public.bookings
  add column if not exists booking_source text not null default 'internal'
  check (booking_source in ('internal','public_link'));

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
    insert into public.bookings(company_id,customer_id,professional_id,service_id,starts_at,ends_at,cancel_token_hash,booking_group_id,service_order,booking_source)
      values(v_company,v_customer,p_professional,v_service,v_cursor,v_cursor+v_duration*interval '1 minute',case when v_order=1 then md5(v_token) end,v_group,v_order,'public_link')
      returning id into v_booking;
    v_ids=v_ids||jsonb_build_array(v_booking);
    v_cursor=v_cursor+v_duration*interval '1 minute';
  end loop;
  return jsonb_build_object('booking_ids',v_ids,'booking_id',v_ids->>0,'cancel_token',v_token);
end;
$$;

revoke all on function public.book_public_multi(text,uuid[],uuid,timestamptz,text,text,text) from public,anon,authenticated;
grant execute on function public.book_public_multi(text,uuid[],uuid,timestamptz,text,text,text) to service_role;

notify pgrst,'reload schema';
commit;
