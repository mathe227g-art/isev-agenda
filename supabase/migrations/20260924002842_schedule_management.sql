-- Deletion respects tenant membership and existing booking foreign keys.
grant delete on public.customers, public.services, public.professionals to authenticated;
create policy customers_delete on public.customers for delete to authenticated
  using (public.is_company_member(company_id));
create policy services_delete on public.services for delete to authenticated
  using (public.is_company_owner(company_id));
create policy professionals_delete on public.professionals for delete to authenticated
  using (public.is_company_owner(company_id));

-- Replace the complete week atomically. Empty days mean recurring days off;
-- two intervals in one day leave an unavailable lunch break between them.
create function public.save_working_week(p_company uuid, p_professional uuid, p_intervals jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if not public.is_company_owner(p_company) then
    raise exception 'Somente o proprietário pode alterar a disponibilidade.';
  end if;
  if not exists (select 1 from public.professionals where company_id=p_company and id=p_professional) then
    raise exception 'Profissional não encontrado.';
  end if;
  if p_intervals is null or jsonb_typeof(p_intervals) <> 'array' then
    raise exception 'Formato de horários inválido.';
  end if;
  if jsonb_array_length(p_intervals) > 56 then
    raise exception 'Limite de intervalos excedido.';
  end if;
  if exists (select 1 from jsonb_to_recordset(p_intervals) as x(weekday int,start_time time,end_time time)
    where weekday is null or weekday not between 0 and 6 or start_time is null or end_time is null or start_time>=end_time) then
    raise exception 'Confira os dias e horários informados.';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_intervals) with ordinality a(v,n)
    join jsonb_array_elements(p_intervals) with ordinality b(v,n) on a.n<b.n
    where (a.v->>'weekday')::int=(b.v->>'weekday')::int
      and (a.v->>'start_time')::time<(b.v->>'end_time')::time
      and (b.v->>'start_time')::time<(a.v->>'end_time')::time
  ) then raise exception 'Os intervalos de trabalho não podem se sobrepor.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_professional::text, 723));
  delete from public.working_hours where company_id=p_company and professional_id=p_professional;
  insert into public.working_hours(company_id,professional_id,weekday,start_time,end_time)
    select p_company,p_professional,weekday,start_time,end_time
    from jsonb_to_recordset(p_intervals) as x(weekday int,start_time time,end_time time);
end;
$$;
revoke all on function public.save_working_week(uuid,uuid,jsonb) from public,anon;
grant execute on function public.save_working_week(uuid,uuid,jsonb) to authenticated;
