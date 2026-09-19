"use client";

import { useTransition } from "react";
import Link from "next/link";
import { ExternalLink, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/primitives";
import { StatusBadge } from "@/features/monitoring/status-badge";
import { LicenseBadge } from "@/features/licenses/license-badge";

import { refreshProjectStatusAction } from "./actions";
import type { ProjectSummary } from "./types";

function formatCheckedAt(value: string | null): string {
  if (!value) return "nunca verificado";
  const date = new Date(value);
  const minutes = Math.round((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return "agora mesmo";
  if (minutes < 60) return `ha ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `ha ${hours}h`;
  return date.toLocaleDateString("pt-BR");
}

export function ProjectCard({ project }: { project: ProjectSummary }) {
  const [pending, startTransition] = useTransition();

  function refresh() {
    startTransition(async () => {
      const result = await refreshProjectStatusAction(project.id);
      if (result.ok) toast.success(`${project.name}: status atualizado`);
      else toast.error(result.error ?? "Falha ao verificar");
    });
  }

  return (
    <Card className={project.is_active ? undefined : "opacity-60"}>
      <CardContent className="space-y-3 pt-5">
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

        <div className="flex flex-wrap items-center gap-2">
          <LicenseBadge expiresAt={project.license_expires_at} />
          {project.is_active ? null : (
            <span className="rounded-full bg-zinc-500/10 px-2.5 py-1 text-xs text-zinc-400 ring-1 ring-inset ring-zinc-500/30">
              Inativo
            </span>
          )}
        </div>

        <p className="text-xs text-zinc-500">
          Verificado {formatCheckedAt(project.last_status_check)}
        </p>
      </CardContent>

      <CardFooter>
        <Button
          variant="outline"
          size="sm"
          onClick={refresh}
          disabled={pending}
          aria-label={`Verificar status de ${project.name}`}
        >
          <RefreshCw className={pending ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
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
