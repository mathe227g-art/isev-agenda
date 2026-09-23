-- Somente leitura. Cada resultado esperado precisa ser conferido no projeto real.
select
  not has_function_privilege('anon','public.book_public(text,uuid,uuid,timestamptz,text,text,text)','execute') as reserva_anon_bloqueada,
  not has_function_privilege('authenticated','public.book_public(text,uuid,uuid,timestamptz,text,text,text)','execute') as reserva_direta_bloqueada,
  has_function_privilege('service_role','public.book_public(text,uuid,uuid,timestamptz,text,text,text)','execute') as servidor_pode_reservar;

select c.relname as tabela,c.relrowsecurity as rls_ativo
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in
('companies','company_members','customers','bookings','professionals','services','working_hours','time_blocks','company_appearance');

select tablename,policyname,permissive,roles,cmd,qual,with_check
from pg_policies where schemaname='public' order by tablename,policyname;

select table_name,grantee,privilege_type from information_schema.role_table_grants
where table_schema='public' and grantee='anon'
and table_name in ('customers','bookings','company_members','company_appearance');
-- A consulta anterior deve retornar zero linhas.
