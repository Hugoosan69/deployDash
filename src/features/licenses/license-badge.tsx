import { cn } from "@/lib/utils";

import { getLicenseInfo, type LicenseState } from "./license-info";

const STYLE: Record<LicenseState, string> = {
  ok: "bg-emerald-500/10 text-emerald-300 ring-emerald-500/30",
  expiring_soon: "bg-amber-500/10 text-amber-300 ring-amber-500/30",
  expired: "bg-red-500/10 text-red-300 ring-red-500/30",
  none: "bg-zinc-500/10 text-zinc-400 ring-zinc-500/30",
};

export function LicenseBadge({
  expiresAt,
  className,
}: {
  expiresAt: string | null;
  className?: string;
}) {
  const { state, daysLeft } = getLicenseInfo(expiresAt);

  const label =
    state === "none"
      ? "Sem licenca"
      : state === "expired"
        ? `Expirada ha ${Math.abs(daysLeft ?? 0)}d`
        : state === "expiring_soon"
          ? `Vence em ${daysLeft}d`
          : `Valida (${daysLeft}d)`;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
        STYLE[state],
        className,
      )}
    >
      {label}
    </span>
  );
}
