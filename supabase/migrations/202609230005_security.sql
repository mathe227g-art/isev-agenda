-- Aplicar DEPOIS da 004. Reaplicável e transacional; não apaga dados.
-- Preparar variáveis do servidor/Turnstile antes. Bloqueia a antiga reserva direta pelo navegador.
begin;
create or replace function public.is_company_owner(p_company uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.company_members where company_id=p_company and user_id=(select auth.uid()) and role='owner');
$$;
revoke all on function public.is_company_owner(uuid) from public;
grant execute on function public.is_company_owner(uuid) to authenticated;
drop policy if exists professionals_owner_insert on public.professionals;
create policy professionals_owner_insert on public.professionals as restrictive for insert to authenticated with check (public.is_company_owner(company_id));
drop policy if exists professionals_owner_update on public.professionals;
create policy professionals_owner_update on public.professionals as restrictive for update to authenticated using (public.is_company_owner(company_id)) with check (public.is_company_owner(company_id));
drop policy if exists services_owner_insert on public.services;
create policy services_owner_insert on public.services as restrictive for insert to authenticated with check (public.is_company_owner(company_id));
drop policy if exists services_owner_update on public.services;
create policy services_owner_update on public.services as restrictive for update to authenticated using (public.is_company_owner(company_id)) with check (public.is_company_owner(company_id));
drop policy if exists working_hours_owner_insert on public.working_hours;
create policy working_hours_owner_insert on public.working_hours as restrictive for insert to authenticated with check (public.is_company_owner(company_id));
drop policy if exists working_hours_owner_delete on public.working_hours;
create policy working_hours_owner_delete on public.working_hours as restrictive for delete to authenticated using (public.is_company_owner(company_id));
drop policy if exists time_blocks_owner_insert on public.time_blocks;
create policy time_blocks_owner_insert on public.time_blocks as restrictive for insert to authenticated with check (public.is_company_owner(company_id));
drop policy if exists time_blocks_owner_delete on public.time_blocks;
create policy time_blocks_owner_delete on public.time_blocks as restrictive for delete to authenticated using (public.is_company_owner(company_id));
drop policy if exists company_appearance_owner_insert on public.company_appearance;
create policy company_appearance_owner_insert on public.company_appearance as restrictive for insert to authenticated with check (public.is_company_owner(company_id));
drop policy if exists company_appearance_owner_update on public.company_appearance;
create policy company_appearance_owner_update on public.company_appearance as restrictive for update to authenticated using (public.is_company_owner(company_id)) with check (public.is_company_owner(company_id));
create or replace function public.book_public(p_slug text,p_service uuid,p_professional uuid,p_starts_at timestamptz,p_name text,p_phone text,p_email text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_company uuid;v_customer uuid;v_booking uuid;v_token text;v_end timestamptz;v_tz text; v_phone text;
begin
  if p_name is null or p_phone is null or p_starts_at is null or p_service is null or p_professional is null then raise exception 'Dados inválidos'; end if;
  if length(trim(p_name)) not between 2 and 120 or length(trim(p_phone)) not between 7 and 30
     or length(coalesce(p_email,'')) > 200 then raise exception 'Dados de contato inválidos'; end if;
  select id,timezone into v_company,v_tz from public.companies where slug=p_slug;
  if v_company is null then raise exception 'Empresa não encontrada'; end if;
  v_phone=regexp_replace(p_phone,'[^0-9]','','g');
  if length(v_phone) not between 7 and 15 then raise exception 'Telefone inválido'; end if;
  -- Serialize requests for the same company/phone; no race between parallel requests.
  perform pg_advisory_xact_lock(hashtextextended(v_company::text || ':' || v_phone,0));
  if (select count(*) from public.bookings b join public.customers c on c.id=b.customer_id and c.company_id=b.company_id
      where b.company_id=v_company and regexp_replace(c.phone,'[^0-9]','','g')=v_phone
      and b.created_at > now()-interval '24 hours') >= 5 then
    raise exception using errcode='P0429',message='Limite de reservas online atingido';
  end if;
  select s.ends_at into v_end from public.booking_slots(p_slug,p_service,p_professional,(p_starts_at at time zone v_tz)::date) s
  where s.starts_at=p_starts_at;
  if v_end is null then raise exception 'Horário indisponível; escolha outro'; end if;
  insert into public.customers(company_id,name,phone,email) values(v_company,trim(p_name),v_phone,nullif(trim(p_email),''))
    returning id into v_customer;
  v_token=gen_random_uuid()::text || gen_random_uuid()::text;
  insert into public.bookings(company_id,customer_id,professional_id,service_id,starts_at,ends_at,cancel_token_hash)
  values(v_company,v_customer,p_professional,p_service,p_starts_at,v_end,md5(v_token))
  returning id into v_booking;
  return jsonb_build_object('booking_id',v_booking,'cancel_token',v_token);
end;
$$;
revoke all on function public.book_public(text,uuid,uuid,timestamptz,text,text,text) from public,anon,authenticated;
grant execute on function public.book_public(text,uuid,uuid,timestamptz,text,text,text) to service_role;


-- Restrict an internal platform trigger and keep extension objects outside the public API schema.
create schema if not exists extensions;
do $$ begin
  if exists(select 1 from pg_extension e join pg_namespace n on n.oid=e.extnamespace where e.extname='btree_gist' and n.nspname='public') then
    alter extension btree_gist set schema extensions;
  end if;
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public,anon,authenticated;
  end if;
end $$;
notify pgrst,'reload schema';
commit;
