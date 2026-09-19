import { cn } from "@/lib/utils";

import type { UptimeCheck } from "./uptime";

const BAR_STYLE: Record<UptimeCheck["status"], string> = {
  online: "bg-emerald-500/80",
  error: "bg-amber-500/80",
  offline: "bg-red-500/80",
};

/**
 * Faixa das ultimas verificacoes, da mais antiga para a mais recente.
 * Trinta linhas de tabela nao respondem "esse projeto e instavel?"; a faixa sim.
 */
export function UptimeStrip({
  checks,
  slots = 24,
  className,
}: {
  checks: UptimeCheck[];
  slots?: number;
  className?: string;
}) {
  // Os logs vem do mais novo para o mais antigo; a faixa le da esquerda pra direita.
  const recent = checks.slice(0, slots).reverse();
  const empty = slots - recent.length;

  return (
    <div className={cn("flex items-end gap-[3px]", className)} role="img"
      aria-label={
        recent.length === 0
          ? "Sem verificacoes registradas"
          : `Ultimas ${recent.length} verificacoes`
      }
    >
      {Array.from({ length: Math.max(empty, 0) }).map((_, index) => (
        <span
          key={`vazio-${index}`}
          className="h-6 w-1.5 rounded-sm bg-zinc-800"
        />
      ))}

      {recent.map((check, index) => (
        <span
          key={`${check.created_at}-${index}`}
          title={`${new Date(check.created_at).toLocaleString("pt-BR")} — ${
            check.status
          }${check.response_time_ms ? ` (${check.response_time_ms} ms)` : ""}${
            check.error_message ? ` — ${check.error_message}` : ""
          }`}
          className={cn(
            "h-6 w-1.5 rounded-sm transition-colors",
            BAR_STYLE[check.status],
          )}
        />
      ))}
    </div>
  );
}
