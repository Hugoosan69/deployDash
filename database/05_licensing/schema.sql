-- 05_licensing — licenca que o site cliente consulta.
--
-- Renovar NAO edita a linha: emite uma nova e marca a anterior como superseded.
-- E o que faz o historico existir, em vez de sumir a cada alteracao de data.

create table if not exists licenses (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references projects(id) on delete cascade,

  -- A chave nunca e guardada em claro: so o hash sha-256 e um prefixo curto
  -- para voce reconhecer qual e qual na tela.
  key_hash     text not null unique,
  key_prefix   text not null,

  status       text not null default 'active'
               check (status in ('active','revoked','superseded')),
  issued_at    timestamptz not null default now(),
  expires_at   timestamptz not null,
  -- Dias apos o vencimento em que o site avisa mas ainda nao bloqueia.
  grace_days   integer not null default 7 check (grace_days >= 0),

  revoked_at   timestamptz,
  revoke_reason text,
  notes        text,
  created_at   timestamptz not null default now()
);

create index if not exists licenses_project_idx on licenses (project_id, issued_at desc);
create index if not exists licenses_status_idx on licenses (status);

-- Uma licenca ativa por projeto; as anteriores viram superseded.
create unique index if not exists licenses_one_active_per_project
  on licenses (project_id) where status = 'active';

-- Cada consulta do site. Serve para responder "esse site ainda esta rodando?"
-- e para o rate limit do endpoint publico.
create table if not exists license_checks (
  id          uuid primary key default gen_random_uuid(),
  license_id  uuid references licenses(id) on delete cascade,
  key_prefix  text,
  domain      text,
  ip          text,
  outcome     text not null
              check (outcome in ('active','expired','grace','revoked','unknown_key','rate_limited')),
  created_at  timestamptz not null default now()
);

create index if not exists license_checks_license_idx
  on license_checks (license_id, created_at desc);
create index if not exists license_checks_created_idx
  on license_checks (created_at desc);

alter table licenses       enable row level security;
alter table license_checks enable row level security;

drop policy if exists licenses_allowed_all on licenses;
create policy licenses_allowed_all on licenses
  for all using (is_allowed_user()) with check (is_allowed_user());

drop policy if exists license_checks_allowed_read on license_checks;
create policy license_checks_allowed_read on license_checks
  for select using (is_allowed_user());
