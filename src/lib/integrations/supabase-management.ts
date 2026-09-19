import "server-only";

/**
 * API de management do Supabase (api.supabase.com). O token sbp_ e por CONTA,
 * por isso vive em supabase_accounts e nao repetido em cada projeto.
 */
const API = "https://api.supabase.com/v1";
const TIMEOUT_MS = 10_000;

export type SupabaseProjectInfo = {
  ok: boolean;
  ref: string;
  name: string | null;
  /** ACTIVE_HEALTHY, INACTIVE (pausado no free tier), etc. */
  projectStatus: string | null;
  region: string | null;
  errorMessage: string | null;
};

async function managementFetch<T>(path: string, token: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${API}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`Supabase respondeu HTTP ${response.status}`);
    }
    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

export async function getSupabaseProjectInfo(
  ref: string,
  token: string,
): Promise<SupabaseProjectInfo> {
  try {
    const project = await managementFetch<{
      id?: string;
      name?: string;
      status?: string;
      region?: string;
    }>(`/projects/${encodeURIComponent(ref)}`, token);

    return {
      ok: true,
      ref,
      name: project.name ?? null,
      projectStatus: project.status ?? null,
      region: project.region ?? null,
      errorMessage: null,
    };
  } catch (error) {
    return {
      ok: false,
      ref,
      name: null,
      projectStatus: null,
      region: null,
      errorMessage:
        error instanceof Error ? error.message : "Falha na Supabase Management API",
    };
  }
}

export async function listSupabaseProjects(token: string) {
  const data = await managementFetch<
    { id: string; name: string; status?: string }[]
  >("/projects", token);
  return data.map((project) => ({
    ref: project.id,
    name: project.name,
    status: project.status ?? null,
  }));
}
