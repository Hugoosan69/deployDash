-- 00_core — extensoes, allowlist de acesso e helpers usados pelos demais dominios.
-- Aplicar primeiro: todo schema seguinte depende de is_allowed_user() e set_updated_at().

create extension if not exists pgcrypto;

-- Allowlist de quem pode usar o dashboard. Signup publico fica desligado no Supabase Auth;
-- o e-mail precisa estar aqui para qualquer policy liberar leitura/escrita.
create table if not exists allowed_users (
  email       text primary key,
  label       text,
  created_at  timestamptz not null default now()
);

alter table allowed_users enable row level security;

-- Autorizacao real mora nos Server Actions; RLS e a ultima linha de defesa.
create or replace function is_allowed_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from allowed_users
    where email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

drop policy if exists allowed_users_self_read on allowed_users;
create policy allowed_users_self_read on allowed_users
  for select using (email = lower(coalesce(auth.jwt() ->> 'email', '')));

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
