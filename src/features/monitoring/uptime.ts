/**
 * Calculo puro em cima dos logs de status — sem "server-only", porque a faixa
 * de uptime renderiza no client. Serve tanto para o card quanto para o detalhe.
 */

export type UptimeCheck = {
  status: "online" | "offline" | "error";
  response_time_ms: number | null;
  error_message: string | null;
  created_at: string;
};

export type UptimeSummary = {
  total: number;
  online: number;
  /** Percentual de checks bem-sucedidos, 0 a 100. Null quando nao houve check. */
  availability: number | null;
  /** Media dos checks que responderam. Null quando nenhum respondeu. */
  avgResponseMs: number | null;
  lastCheckAt: string | null;
};

export function summarizeUptime(
  checks: UptimeCheck[],
  windowHours?: number,
): UptimeSummary {
  const cutoff = windowHours
    ? Date.now() - windowHours * 60 * 60 * 1000
    : null;

  const scoped = cutoff
    ? checks.filter((check) => new Date(check.created_at).getTime() >= cutoff)
    : checks;

  if (scoped.length === 0) {
    return {
      total: 0,
      online: 0,
      availability: null,
      avgResponseMs: null,
      lastCheckAt: null,
    };
  }

  const online = scoped.filter((check) => check.status === "online").length;
  const timed = scoped.filter(
    (check): check is UptimeCheck & { response_time_ms: number } =>
      typeof check.response_time_ms === "number",
  );

  const avgResponseMs =
    timed.length > 0
      ? Math.round(
          timed.reduce((sum, check) => sum + check.response_time_ms, 0) /
            timed.length,
        )
      : null;

  // Os logs chegam do mais novo para o mais antigo.
  const lastCheckAt = scoped[0]?.created_at ?? null;

  return {
    total: scoped.length,
    online,
    availability: Math.round((online / scoped.length) * 1000) / 10,
    avgResponseMs,
    lastCheckAt,
  };
}

export function formatCheckedAt(value: string | null): string {
  if (!value) return "nunca verificado";

  const date = new Date(value);
  const minutes = Math.round((Date.now() - date.getTime()) / 60000);

  if (minutes < 1) return "agora mesmo";
  if (minutes < 60) return `ha ${minutes} min`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `ha ${hours}h`;

  return date.toLocaleDateString("pt-BR");
}
