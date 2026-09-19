import { cn } from "@/lib/utils";
import type { ProjectStatus } from "@/features/projects/types";

const STATUS_LABEL: Record<ProjectStatus, string> = {
  online: "Online",
  offline: "Offline",
  error: "Erro",
  unknown: "Sem check",
};

const STATUS_STYLE: Record<ProjectStatus, string> = {
  online: "bg-emerald-500/10 text-emerald-300 ring-emerald-500/30",
  offline: "bg-red-500/10 text-red-300 ring-red-500/30",
  error: "bg-amber-500/10 text-amber-300 ring-amber-500/30",
  unknown: "bg-zinc-500/10 text-zinc-400 ring-zinc-500/30",
};

const DOT_STYLE: Record<ProjectStatus, string> = {
  online: "bg-emerald-400",
  offline: "bg-red-400",
  error: "bg-amber-400",
  unknown: "bg-zinc-500",
};

export function StatusBadge({
  status,
  className,
}: {
  status: ProjectStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
        STATUS_STYLE[status],
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", DOT_STYLE[status])} />
      {STATUS_LABEL[status]}
    </span>
  );
}
