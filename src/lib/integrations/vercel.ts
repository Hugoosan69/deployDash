import "server-only";

/**
 * Cliente minimo da REST API da Vercel. O token chega ja decifrado e
 * so circula dentro do servidor — nunca volta em resposta nem vai para log.
 */
const API = "https://api.vercel.com";
const TIMEOUT_MS = 10_000;

export type VercelDeployment = {
  uid: string;
  url: string | null;
  state: string | null;
  readyState: string | null;
  createdAt: number | null;
  target: string | null;
};

export type VercelProjectStatus = {
  ok: boolean;
  status: "online" | "offline" | "error";
  projectName: string | null;
  latestDeployment: VercelDeployment | null;
  errorMessage: string | null;
};

type FetchOptions = { token: string; teamId?: string | null };

async function vercelFetch<T>(
  path: string,
  { token, teamId }: FetchOptions,
): Promise<T> {
  const url = new URL(`${API}${path}`);
  if (teamId) url.searchParams.set("teamId", teamId);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as
        | { error?: { message?: string } }
        | null;
      throw new Error(
        body?.error?.message ?? `Vercel respondeu HTTP ${response.status}`,
      );
    }
    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

/** Valida um token sem expor nada dele: usado ao cadastrar uma conta. */
export async function getVercelUser(token: string) {
  const data = await vercelFetch<{ user?: { username?: string; email?: string } }>(
    "/v2/user",
    { token },
  );
  return {
    username: data.user?.username ?? null,
    email: data.user?.email ?? null,
  };
}

export async function listVercelProjects(options: FetchOptions) {
  const data = await vercelFetch<{
    projects: { id: string; name: string }[];
  }>("/v9/projects?limit=100", options);
  return data.projects.map((project) => ({ id: project.id, name: project.name }));
}

export async function getVercelProjectStatus(
  projectId: string,
  options: FetchOptions,
): Promise<VercelProjectStatus> {
  try {
    const project = await vercelFetch<{
      name?: string;
      latestDeployments?: {
        uid?: string;
        id?: string;
        url?: string;
        state?: string;
        readyState?: string;
        createdAt?: number;
        target?: string;
      }[];
    }>(`/v9/projects/${encodeURIComponent(projectId)}`, options);

    const deployment = project.latestDeployments?.[0] ?? null;
    const readyState = deployment?.readyState ?? deployment?.state ?? null;

    // READY = ultimo deploy no ar; ERROR/CANCELED indicam problema; o resto ainda roda.
    const status: VercelProjectStatus["status"] =
      readyState === "READY"
        ? "online"
        : readyState === "ERROR" || readyState === "CANCELED"
          ? "error"
          : "offline";

    return {
      ok: true,
      status,
      projectName: project.name ?? null,
      latestDeployment: deployment
        ? {
            uid: deployment.uid ?? deployment.id ?? "",
            url: deployment.url ? `https://${deployment.url}` : null,
            state: deployment.state ?? null,
            readyState,
            createdAt: deployment.createdAt ?? null,
            target: deployment.target ?? null,
          }
        : null,
      errorMessage: null,
    };
  } catch (error) {
    return {
      ok: false,
      status: "error",
      projectName: null,
      latestDeployment: null,
      errorMessage: error instanceof Error ? error.message : "Falha na Vercel API",
    };
  }
}
