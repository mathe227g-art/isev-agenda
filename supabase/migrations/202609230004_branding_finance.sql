-- Executar apenas esta migração adicional no projeto existente.
-- Não reaplicar os três SQLs anteriores. Operação transacional e reaplicável.
begin;
create table if not exists public.company_appearance (
  company_id uuid primary key references public.companies(id) on delete cascade,
  primary_color text not null default '#0066ff' check (primary_color ~ '^#[0-9a-fA-F]{6}$'),
  theme text not null default 'light' check (theme in ('light','dark')),
  logo_data_url text check (logo_data_url is null or (length(logo_data_url)<=2800000 and logo_data_url ~ '^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$')),
  professional_colors jsonb not null default '{}' check (jsonb_typeof(professional_colors)='object'),
  service_colors jsonb not null default '{}' check (jsonb_typeof(service_colors)='object')
);
alter table public.company_appearance enable row level security;
drop policy if exists appearance_read on public.company_appearance;
create policy appearance_read on public.company_appearance for select to authenticated using (public.is_company_member(company_id));
drop policy if exists appearance_insert on public.company_appearance;
create policy appearance_insert on public.company_appearance for insert to authenticated with check (public.is_company_member(company_id));
drop policy if exists appearance_update on public.company_appearance;
create policy appearance_update on public.company_appearance for update to authenticated using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));
grant select,insert,update on public.company_appearance to authenticated;

-- Atomic per-entity color changes avoid replacing someone else's color settings.
create or replace function public.set_agenda_color(p_company uuid,p_kind text,p_entity uuid,p_color text) returns void
language plpgsql security invoker set search_path='' as $$
begin
  if not public.is_company_member(p_company) then raise exception 'Acesso negado'; end if;
  if p_color !~ '^#[0-9a-fA-F]{6}$' or p_kind not in ('professional','service') then raise exception 'Cor inválida'; end if;
  if p_kind='professional' and not exists(select 1 from public.professionals where id=p_entity and company_id=p_company) then raise exception 'Profissional inválido'; end if;
  if p_kind='service' and not exists(select 1 from public.services where id=p_entity and company_id=p_company) then raise exception 'Serviço inválido'; end if;
  insert into public.company_appearance(company_id) values(p_company) on conflict do nothing;
  if p_kind='professional' then
    update public.company_appearance set professional_colors=jsonb_set(professional_colors,array[p_entity::text],to_jsonb(p_color)) where company_id=p_company;
  else
    update public.company_appearance set service_colors=jsonb_set(service_colors,array[p_entity::text],to_jsonb(p_color)) where company_id=p_company;
  end if;
end; $$;
revoke all on function public.set_agenda_color(uuid,text,uuid,text) from public;
grant execute on function public.set_agenda_color(uuid,text,uuid,text) to authenticated;

-- Public booking receives only visual identity, never membership or customer data.
create or replace function public.booking_branding(p_slug text) returns jsonb
language sql stable security definer set search_path='' as $$
  select jsonb_build_object('primary_color',coalesce(a.primary_color,'#0066ff'),'theme',coalesce(a.theme,'light'),'logo_data_url',a.logo_data_url)
  from public.companies c left join public.company_appearance a on a.company_id=c.id where c.slug=p_slug;
$$;
revoke all on function public.booking_branding(text) from public;
grant execute on function public.booking_branding(text) to anon,authenticated;

alter table public.bookings add column if not exists charged_price numeric(12,2) check (charged_price>=0);
alter table public.bookings add column if not exists price_source text check (price_source in ('at_completion','historical_estimate','unpriced'));
-- Historical values were not stored. Mark their current-price backfill as estimates.
update public.bookings b set charged_price=s.price,price_source=case when s.price is null then 'unpriced' else 'historical_estimate' end
from public.services s where s.id=b.service_id and s.company_id=b.company_id and b.status='completed' and b.price_source is null;

create or replace function public.capture_booking_price() returns trigger
language plpgsql set search_path='' as $$
begin
  if TG_OP='UPDATE' and old.price_source is not null then
    if new.service_id<>old.service_id then raise exception 'Um atendimento com valor registrado não pode trocar de serviço'; end if;
    new.charged_price=old.charged_price;new.price_source=old.price_source;
  elsif new.status='completed' then
    select price into new.charged_price from public.services where id=new.service_id and company_id=new.company_id;
    new.price_source=case when new.charged_price is null then 'unpriced' else 'at_completion' end;
  else
    new.charged_price=null;new.price_source=null;
  end if;
  return new;
end; $$;
drop trigger if exists capture_booking_price on public.bookings;
create trigger capture_booking_price before insert or update on public.bookings for each row execute function public.capture_booking_price();
notify pgrst,'reload schema';
commit;

