-- iSev Agenda: tenant-scoped schema. Apply once in this project's SQL editor.
create extension if not exists btree_gist;

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  timezone text not null default 'America/Sao_Paulo',
  created_at timestamptz not null default now()
);
create table public.company_members (
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','staff')),
  primary key (company_id,user_id)
);
create table public.professionals (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null check (length(trim(name)) between 2 and 120),
  active boolean not null default true,
  unique (company_id,id)
);
create table public.services (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null check (length(trim(name)) between 2 and 120),
  duration_minutes integer not null check (duration_minutes between 5 and 1440),
  price numeric(12,2) check (price >= 0),
  active boolean not null default true,
  unique (company_id,id)
);
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null check (length(trim(name)) between 2 and 120),
  phone text,
  email text,
  created_at timestamptz not null default now(),
  unique (company_id,id)
);
create table public.working_hours (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  professional_id uuid not null,
  weekday integer not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  check (start_time < end_time),
  foreign key (company_id,professional_id) references public.professionals(company_id,id) on delete cascade
);
create table public.time_blocks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  professional_id uuid not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text,
  check (starts_at < ends_at),
  foreign key (company_id,professional_id) references public.professionals(company_id,id) on delete cascade
);
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  customer_id uuid not null,
  professional_id uuid not null,
  service_id uuid not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'confirmed' check (status in ('confirmed','completed','cancelled','no_show')),
  notes text,
  created_at timestamptz not null default now(),
  check (starts_at < ends_at),
  foreign key (company_id,customer_id) references public.customers(company_id,id),
  foreign key (company_id,professional_id) references public.professionals(company_id,id),
  foreign key (company_id,service_id) references public.services(company_id,id),
  constraint bookings_no_overlap exclude using gist
    (professional_id with =, tstzrange(starts_at,ends_at,'[)') with &&)
    where (status <> 'cancelled')
);
create index bookings_company_date_idx on public.bookings(company_id,starts_at);
create index customers_company_name_idx on public.customers(company_id,name);
create index time_blocks_professional_date_idx on public.time_blocks(professional_id,starts_at);

create function public.is_company_member(p_company uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.company_members where company_id = p_company and user_id = (select auth.uid()));
$$;
revoke all on function public.is_company_member(uuid) from public;
grant execute on function public.is_company_member(uuid) to authenticated;

alter table public.companies enable row level security;
alter table public.company_members enable row level security;
alter table public.professionals enable row level security;
alter table public.services enable row level security;
alter table public.customers enable row level security;
alter table public.working_hours enable row level security;
alter table public.time_blocks enable row level security;
alter table public.bookings enable row level security;

create policy companies_read on public.companies for select to authenticated using (public.is_company_member(id));
create policy members_read on public.company_members for select to authenticated using (public.is_company_member(company_id));
create policy professionals_read on public.professionals for select to authenticated using (public.is_company_member(company_id));
create policy professionals_insert on public.professionals for insert to authenticated with check (public.is_company_member(company_id));
create policy professionals_update on public.professionals for update to authenticated using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));
create policy services_read on public.services for select to authenticated using (public.is_company_member(company_id));
create policy services_insert on public.services for insert to authenticated with check (public.is_company_member(company_id));
create policy services_update on public.services for update to authenticated using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));
create policy customers_read on public.customers for select to authenticated using (public.is_company_member(company_id));
create policy customers_insert on public.customers for insert to authenticated with check (public.is_company_member(company_id));
create policy customers_update on public.customers for update to authenticated using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));
create policy hours_read on public.working_hours for select to authenticated using (public.is_company_member(company_id));
create policy hours_insert on public.working_hours for insert to authenticated with check (public.is_company_member(company_id));
create policy hours_delete on public.working_hours for delete to authenticated using (public.is_company_member(company_id));
create policy blocks_read on public.time_blocks for select to authenticated using (public.is_company_member(company_id));
create policy blocks_insert on public.time_blocks for insert to authenticated with check (public.is_company_member(company_id));
create policy blocks_delete on public.time_blocks for delete to authenticated using (public.is_company_member(company_id));
create policy bookings_read on public.bookings for select to authenticated using (public.is_company_member(company_id));
create policy bookings_insert on public.bookings for insert to authenticated with check (public.is_company_member(company_id));
create policy bookings_update on public.bookings for update to authenticated using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));

create function public.create_company(p_name text,p_slug text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if (select auth.uid()) is null then raise exception 'É necessário entrar na conta'; end if;
  if length(trim(p_name)) not between 2 and 120 or p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'Nome ou endereço inválido';
  end if;
  insert into public.companies(name,slug) values(trim(p_name),p_slug) returning id into v_id;
  insert into public.company_members(company_id,user_id,role) values(v_id,(select auth.uid()),'owner');
  return v_id;
end;
$$;
revoke all on function public.create_company(text,text) from public;
grant execute on function public.create_company(text,text) to authenticated;
