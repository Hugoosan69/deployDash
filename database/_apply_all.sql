-- DeployDash — schema completo, na ordem de dependencia.
-- Cole inteiro no SQL Editor do projeto Supabase central e rode uma vez.

-- ==================== database/00_core/schema.sql ====================
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

-- ==================== database/01_projects/schema.sql ====================
-- 01_projects — contas Vercel/Supabase e os projetos monitorados.
-- Todo campo *_encrypted guarda AES-256-GCM (v1:iv:tag:ciphertext) produzido em src/lib/crypto.ts.
-- Nenhum segredo entra aqui em texto claro, e nenhum deles volta em listagem.

create table if not exists vercel_accounts (
  id               uuid primary key default gen_random_uuid(),
  label            text not null unique,
  team_id          text,
  token_encrypted  text not null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- O token de management do Supabase (sbp_...) e por conta, nao por projeto.
create table if not exists supabase_accounts (
  id                          uuid primary key default gen_random_uuid(),
  label                       text not null unique,
  management_token_encrypted  text,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

create table if not exists projects (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  slug         text not null unique,
  description  text,

  -- Alvo do health check HTTP. Sem isso, o status vem so da Vercel API.
  health_url   text,
  public_url   text,

  -- Vercel
  vercel_account_id  uuid references vercel_accounts(id) on delete set null,
  vercel_project_id  text,

  -- Supabase
  supabase_account_id        uuid references supabase_accounts(id) on delete set null,
  supabase_project_ref       text,
  supabase_url               text,
  supabase_anon_key_encrypted text,

  -- Banco do projeto
  database_url_encrypted  text,
  database_host           text,
  database_name           text,

  -- Licenca
  license_email       text,
  license_expires_at  timestamptz,

  -- Status consolidado pelo monitoramento
  status             text not null default 'unknown'
                     check (status in ('unknown','online','offline','error')),
  last_status_check  timestamptz,
  is_active          boolean not null default true,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists projects_is_active_idx on projects (is_active);
create index if not exists projects_license_expires_at_idx on projects (license_expires_at);

drop trigger if exists projects_set_updated_at on projects;
create trigger projects_set_updated_at before update on projects
  for each row execute function set_updated_at();

drop trigger if exists vercel_accounts_set_updated_at on vercel_accounts;
create trigger vercel_accounts_set_updated_at before update on vercel_accounts
  for each row execute function set_updated_at();

drop trigger if exists supabase_accounts_set_updated_at on supabase_accounts;
create trigger supabase_accounts_set_updated_at before update on supabase_accounts
  for each row execute function set_updated_at();

alter table projects          enable row level security;
alter table vercel_accounts   enable row level security;
alter table supabase_accounts enable row level security;

drop policy if exists projects_allowed_all on projects;
create policy projects_allowed_all on projects
  for all using (is_allowed_user()) with check (is_allowed_user());

drop policy if exists vercel_accounts_allowed_all on vercel_accounts;
create policy vercel_accounts_allowed_all on vercel_accounts
  for all using (is_allowed_user()) with check (is_allowed_user());

drop policy if exists supabase_accounts_allowed_all on supabase_accounts;
create policy supabase_accounts_allowed_all on supabase_accounts
  for all using (is_allowed_user()) with check (is_allowed_user());

-- ==================== database/02_monitoring/schema.sql ====================
-- 02_monitoring — historico bruto de cada verificacao de status.
-- Uma linha por check por fonte; projects.status guarda so o consolidado mais recente.

create table if not exists project_status_logs (
  id                uuid primary key default gen_random_uuid(),
  project_id        uuid not null references projects(id) on delete cascade,
  source            text not null check (source in ('http','vercel')),
  status            text not null check (status in ('online','offline','error')),
  http_status       integer,
  response_time_ms  integer,
  error_message     text,
  created_at        timestamptz not null default now()
);

create index if not exists project_status_logs_project_created_idx
  on project_status_logs (project_id, created_at desc);

alter table project_status_logs enable row level security;

drop policy if exists project_status_logs_allowed_read on project_status_logs;
create policy project_status_logs_allowed_read on project_status_logs
  for select using (is_allowed_user());

-- ==================== database/03_licenses/schema.sql ====================
-- 03_licenses — controle de avisos de vencimento.
-- A data de expiracao vive em projects.license_expires_at; aqui fica so o que ja foi avisado,
-- para o cron nao reenviar o mesmo alerta a cada execucao.

create table if not exists license_alerts (
  id                 uuid primary key default gen_random_uuid(),
  project_id         uuid not null references projects(id) on delete cascade,
  threshold_days     integer not null,
  license_expires_at timestamptz not null,
  sent_at            timestamptz not null default now(),
  unique (project_id, threshold_days, license_expires_at)
);

alter table license_alerts enable row level security;

drop policy if exists license_alerts_allowed_read on license_alerts;
create policy license_alerts_allowed_read on license_alerts
  for select using (is_allowed_user());

-- ==================== database/04_audit/schema.sql ====================
-- 04_audit — trilha de acoes sensiveis.
-- Toda revelacao de credencial e toda escrita em projects passa por aqui.
-- Escrita so pelo service role (Server Actions); ninguem edita nem apaga.

create table if not exists audit_logs (
  id          uuid primary key default gen_random_uuid(),
  actor_email text,
  project_id  uuid references projects(id) on delete set null,
  action      text not null,
  target      text,
  old_value   jsonb,
  new_value   jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists audit_logs_created_idx on audit_logs (created_at desc);
create index if not exists audit_logs_project_idx on audit_logs (project_id, created_at desc);

alter table audit_logs enable row level security;

drop policy if exists audit_logs_allowed_read on audit_logs;
create policy audit_logs_allowed_read on audit_logs
  for select using (is_allowed_user());

-- ==================== acesso ====================
-- Libera o seu e-mail. Tem que bater exatamente com o usuario criado em
-- Authentication > Users (o app compara sempre em minusculas).
insert into allowed_users (email, label)
values ('seu-email@exemplo.com', 'Hugo')
on conflict (email) do nothing;
