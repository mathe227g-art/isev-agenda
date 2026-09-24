grant delete on public.bookings to authenticated;
create policy bookings_delete on public.bookings for delete to authenticated
  using (public.is_company_member(company_id));
