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
