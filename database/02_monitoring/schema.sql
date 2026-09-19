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
