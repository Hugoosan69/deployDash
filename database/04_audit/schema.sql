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
