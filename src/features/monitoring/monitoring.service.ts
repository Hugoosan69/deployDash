import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { decryptSecret } from "@/lib/crypto";
import { checkHttp } from "@/lib/integrations/http-check";
import { getVercelProjectStatus } from "@/lib/integrations/vercel";
import type { ProjectStatus } from "@/features/projects/types";

/**
 * Verificacao de status. Duas fontes independentes por projeto:
 *   - http:   GET na health_url (ou public_url) — diz se o site responde de fato;
 *   - vercel: estado do ultimo deployment via API — diz por que nao responde.
 * Cada fonte vira uma linha em project_status_logs; projects.status guarda o pior
 * resultado da rodada, que e o que precisa aparecer no card.
 */

export type StatusLog = {
  id: string;
  project_id: string;
  source: "http" | "vercel";
  status: Exclude<ProjectStatus, "unknown">;
  http_status: number | null;
  response_time_ms: number | null;
  error_message: string | null;
  created_at: string;
};

export type CheckOutcome = {
  projectId: string;
  name: string;
  status: ProjectStatus;
  checks: {
    source: "http" | "vercel";
    status: Exclude<ProjectStatus, "unknown">;
    errorMessage: string | null;
    responseTimeMs: number | null;
  }[];
};

const SEVERITY: Record<Exclude<ProjectStatus, "unknown">, number> = {
  online: 0,
  error: 1,
  offline: 2,
};

function worst(
  statuses: Exclude<ProjectStatus, "unknown">[],
): ProjectStatus {
  if (statuses.length === 0) return "unknown";
  return statuses.reduce((acc, current) =>
    SEVERITY[current] > SEVERITY[acc] ? current : acc,
  );
}

type ProjectRow = {
  id: string;
  name: string;
  health_url: string | null;
  public_url: string | null;
  vercel_project_id: string | null;
  vercel_account_id: string | null;
};

/**
 * Roda os checks de um projeto e persiste o resultado.
 * Recebe um cache de tokens Vercel ja decifrados para nao decifrar o mesmo
 * token uma vez por projeto durante a rodada do cron.
 */
export async function checkProject(
  project: ProjectRow,
  vercelTokens?: Map<string, { token: string; teamId: string | null }>,
): Promise<CheckOutcome> {
  const admin = createAdminClient();
  const checks: CheckOutcome["checks"] = [];
  const logs: Record<string, unknown>[] = [];

  const url = project.health_url ?? project.public_url;
  if (url) {
    const result = await checkHttp(url);
    checks.push({
      source: "http",
      status: result.status,
      errorMessage: result.errorMessage,
      responseTimeMs: result.responseTimeMs,
    });
    logs.push({
      project_id: project.id,
      source: "http",
      status: result.status,
      http_status: result.httpStatus,
      response_time_ms: result.responseTimeMs,
      error_message: result.errorMessage,
    });
  }

  const credentials = project.vercel_account_id
    ? (vercelTokens?.get(project.vercel_account_id) ??
      (await loadVercelCredentials(project.vercel_account_id)))
    : null;

  if (project.vercel_project_id && credentials) {
    const result = await getVercelProjectStatus(project.vercel_project_id, {
      token: credentials.token,
      teamId: credentials.teamId,
    });
    checks.push({
      source: "vercel",
      status: result.status,
      errorMessage: result.errorMessage,
      responseTimeMs: null,
    });
    logs.push({
      project_id: project.id,
      source: "vercel",
      status: result.status,
      http_status: null,
      response_time_ms: null,
      error_message: result.errorMessage,
    });
  }

  const status = worst(checks.map((check) => check.status));

  if (logs.length > 0) {
    await admin.from("project_status_logs").insert(logs);
  }

  await admin
    .from("projects")
    .update({ status, last_status_check: new Date().toISOString() })
    .eq("id", project.id);

  return { projectId: project.id, name: project.name, status, checks };
}

async function loadVercelCredentials(accountId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("vercel_accounts")
    .select("token_encrypted, team_id")
    .eq("id", accountId)
    .maybeSingle();

  if (!data?.token_encrypted) return null;
  return {
    token: decryptSecret(data.token_encrypted),
    teamId: (data.team_id as string | null) ?? null,
  };
}

/** Rodada completa usada pelo cron. Projetos inativos ficam de fora. */
export async function checkAllProjects(): Promise<CheckOutcome[]> {
  const admin = createAdminClient();

  const { data: projects, error } = await admin
    .from("projects")
    .select(
      "id, name, health_url, public_url, vercel_project_id, vercel_account_id",
    )
    .eq("is_active", true);

  if (error) throw new Error(`Falha ao carregar projetos: ${error.message}`);
  if (!projects?.length) return [];

  // Decifra cada token Vercel uma unica vez por rodada.
  const accountIds = [
    ...new Set(
      projects
        .map((project) => project.vercel_account_id as string | null)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const tokens = new Map<string, { token: string; teamId: string | null }>();
  for (const accountId of accountIds) {
    const credentials = await loadVercelCredentials(accountId);
    if (credentials) tokens.set(accountId, credentials);
  }

  const outcomes: CheckOutcome[] = [];
  for (const project of projects as ProjectRow[]) {
    try {
      outcomes.push(await checkProject(project, tokens));
    } catch (error) {
      outcomes.push({
        projectId: project.id,
        name: project.name,
        status: "error",
        checks: [
          {
            source: "http",
            status: "error",
            errorMessage:
              error instanceof Error ? error.message : "Falha na verificacao",
            responseTimeMs: null,
          },
        ],
      });
    }
  }

  return outcomes;
}

export async function getStatusHistory(
  projectId: string,
  limit = 30,
): Promise<StatusLog[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("project_status_logs")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Falha ao carregar historico: ${error.message}`);
  return (data ?? []) as StatusLog[];
}
