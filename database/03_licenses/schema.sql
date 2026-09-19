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
