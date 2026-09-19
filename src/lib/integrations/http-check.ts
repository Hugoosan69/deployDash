import "server-only";

export type HttpCheckResult = {
  status: "online" | "offline" | "error";
  httpStatus: number | null;
  responseTimeMs: number | null;
  errorMessage: string | null;
};

const TIMEOUT_MS = 10_000;

/**
 * Health check direto na URL do projeto. Roda so no servidor: a URL pode
 * responder com corpo grande, entao usamos GET com timeout e descartamos o corpo.
 */
export async function checkHttp(url: string): Promise<HttpCheckResult> {
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      cache: "no-store",
      headers: { "user-agent": "DeployDash/1.0 health-check" },
    });
    const responseTimeMs = Date.now() - startedAt;

    return {
      status: response.ok ? "online" : "error",
      httpStatus: response.status,
      responseTimeMs,
      errorMessage: response.ok ? null : `HTTP ${response.status}`,
    };
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    return {
      status: "offline",
      httpStatus: null,
      responseTimeMs: Date.now() - startedAt,
      errorMessage: aborted
        ? `Sem resposta em ${TIMEOUT_MS / 1000}s`
        : error instanceof Error
          ? error.message
          : "Falha desconhecida",
    };
  } finally {
    clearTimeout(timeout);
  }
}
