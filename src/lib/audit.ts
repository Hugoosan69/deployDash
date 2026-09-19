import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

type AuditEntry = {
  actorEmail: string | null;
  projectId?: string | null;
  action: string;
  target?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
};

/**
 * Registra acao sensivel. Nunca recebe valor de segredo em claro:
 * na revelacao de credencial gravamos apenas qual campo foi lido.
 */
export async function recordAudit(entry: AuditEntry): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("audit_logs").insert({
    actor_email: entry.actorEmail,
    project_id: entry.projectId ?? null,
    action: entry.action,
    target: entry.target ?? null,
    old_value: entry.oldValue ?? null,
    new_value: entry.newValue ?? null,
  });

  if (error) {
    // Falha de auditoria nao pode derrubar a acao do usuario, mas precisa aparecer.
    console.error("[audit] falha ao registrar", entry.action, error.message);
  }
}
