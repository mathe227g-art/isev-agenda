-- PostgREST requires SQL privileges in addition to row-level policies.
-- RLS still restricts every authenticated query to the user's company.
grant usage on schema public to authenticated;
grant select on public.companies, public.company_members,
  public.professionals, public.services, public.customers,
  public.working_hours, public.time_blocks, public.bookings
  to authenticated;
grant insert, update on public.professionals, public.services,
  public.customers, public.bookings to authenticated;
grant insert, delete on public.working_hours, public.time_blocks
  to authenticated;
