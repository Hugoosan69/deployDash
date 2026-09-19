"use client";

import { useTransition } from "react";
import Link from "next/link";
import { ExternalLink, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/primitives";
import { StatusBadge } from "@/features/monitoring/status-badge";
import { UptimeStrip } from "@/features/monitoring/uptime-strip";
import {
  formatCheckedAt,
  summarizeUptime,
  type UptimeCheck,
} from "@/features/monitoring/uptime";
import { LicenseBadge } from "@/features/licenses/license-badge";

import { refreshProjectStatusAction } from "./actions";
import type { ProjectSummary } from "./types";

export function ProjectCard({
  project,
  checks = [],
}: {
  project: ProjectSummary;
  checks?: UptimeCheck[];
}) {
  const [pending, startTransition] = useTransition();
  const uptime = summarizeUptime(checks, 24);

  function refresh() {
    startTransition(async () => {
      const result = await refreshProjectStatusAction(project.id);
      if (result.ok) toast.success(`${project.name}: status atualizado`);
      else toast.error(result.error ?? "Falha ao verificar");
    });
  }

  return (
    <Card
      className={
        project.is_active
          ? "transition-colors hover:border-zinc-700"
          : "opacity-60 transition-colors hover:border-zinc-700"
      }
    >
      <CardContent className="space-y-4 pt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              href={`/dashboard/projects/${project.id}`}
              className="font-medium text-zinc-100 hover:underline"
            >
              {project.name}
            </Link>
            <p className="truncate text-xs text-zinc-500">{project.slug}</p>
          </div>
          <StatusBadge status={project.status} />
        </div>

        {project.description ? (
          <p className="line-clamp-2 text-sm text-zinc-400">
            {project.description}
          </p>
        ) : null}

        <div>
          <UptimeStrip checks={checks} slots={24} />
          <div className="mt-1.5 flex items-center justify-between text-xs text-zinc-500">
            <span>
              {uptime.availability === null
                ? "sem verificacao nas ultimas 24h"
                : `${uptime.availability}% em 24h`}
            </span>
            <span>
              {uptime.avgResponseMs === null
                ? formatCheckedAt(project.last_status_check)
                : `${uptime.avgResponseMs} ms`}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <LicenseBadge expiresAt={project.license_expires_at} />
          {project.is_active ? null : (
            <span className="rounded-full bg-zinc-500/10 px-2.5 py-1 text-xs text-zinc-400 ring-1 ring-inset ring-zinc-500/30">
              Inativo
            </span>
          )}
        </div>
      </CardContent>

      <CardFooter>
        <Button
          variant="outline"
          size="sm"
          onClick={refresh}
          disabled={pending}
          aria-label={`Verificar status de ${project.name}`}
        >
          <RefreshCw
            className={pending ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"}
          />
          Verificar
        </Button>

        {project.public_url ? (
          <a
            href={project.public_url}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Abrir
          </a>
        ) : null}

        <Link
          href={`/dashboard/projects/${project.id}`}
          className="ml-auto text-xs text-zinc-400 hover:text-zinc-100"
        >
          Detalhes
        </Link>
      </CardFooter>
    </Card>
  );
}
