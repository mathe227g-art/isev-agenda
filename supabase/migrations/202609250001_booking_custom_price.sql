-- Valor avulso por serviço dentro de um agendamento. Migração aditiva:
-- nenhuma linha existente é atualizada ou removida.
begin;

alter table public.bookings
  add column if not exists custom_price numeric(12,2)
  check (custom_price is null or custom_price >= 0);

create or replace function public.capture_booking_price() returns trigger
language plpgsql set search_path='' as $$
begin
  if TG_OP='UPDATE' and old.price_source is not null then
    if new.service_id<>old.service_id then
      raise exception 'Um atendimento com valor registrado não pode trocar de serviço';
    end if;
    new.charged_price=old.charged_price;
    new.price_source=old.price_source;
    new.custom_price=old.custom_price;
  elsif new.status='completed' then
    if new.custom_price is not null then
      new.charged_price=new.custom_price;
    else
      select price into new.charged_price
      from public.services
      where id=new.service_id and company_id=new.company_id;
    end if;
    new.price_source=case
      when new.charged_price is null then 'unpriced'
      else 'at_completion'
    end;
  else
    new.charged_price=null;
    new.price_source=null;
  end if;
  return new;
end; $$;

notify pgrst,'reload schema';
commit;
