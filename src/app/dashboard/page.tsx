import Link from "next/link";
import { Plus } from "lucide-react";

import { listProjects } from "@/features/projects/projects.service";
import { ProjectCard } from "@/features/projects/project-card";
import { getLicenseInfo } from "@/features/licenses/license-info";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const projects = await listProjects();

  const online = projects.filter((project) => project.status === "online").length;
  const down = projects.filter(
    (project) => project.status === "offline" || project.status === "error",
  ).length;
  const licensesAtRisk = projects.filter((project) => {
    const { state } = getLicenseInfo(project.license_expires_at);
    return state === "expiring_soon" || state === "expired";
  }).length;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Projetos</h1>
          <p className="text-sm text-zinc-400">
            {projects.length} cadastrado(s) · {online} online · {down} com
            problema · {licensesAtRisk} licenca(s) em risco
          </p>
        </div>
        <Link href="/dashboard/projects/new">
          <Button>
            <Plus className="h-4 w-4" />
            Novo projeto
          </Button>
        </Link>
      </div>

      {projects.length === 0 ? (
        <EmptyState
          title="Nenhum projeto cadastrado"
          description="Cadastre o primeiro projeto para começar a monitorar status, credenciais e licenças."
          action={
            <Link href="/dashboard/projects/new">
              <Button>Cadastrar projeto</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
