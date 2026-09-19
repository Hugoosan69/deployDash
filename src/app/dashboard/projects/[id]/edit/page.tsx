import Link from "next/link";
import { notFound } from "next/navigation";

import {
  getProject,
  listSupabaseAccounts,
  listVercelAccounts,
} from "@/features/projects/projects.service";
import { ProjectForm } from "@/features/projects/project-form";

export const dynamic = "force-dynamic";

export default async function EditProjectPage({
  params,
}: PageProps<"/dashboard/projects/[id]/edit">) {
  const { id } = await params;

  const [project, vercelAccounts, supabaseAccounts] = await Promise.all([
    getProject(id),
    listVercelAccounts(),
    listSupabaseAccounts(),
  ]);

  if (!project) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/dashboard/projects/${project.id}`}
          className="text-sm text-zinc-400 hover:text-zinc-100"
        >
          ← {project.name}
        </Link>
        <h1 className="mt-2 text-xl font-semibold tracking-tight">
          Editar projeto
        </h1>
        <p className="text-sm text-zinc-400">
          Campo de segredo em branco mantem o valor ja guardado.
        </p>
      </div>

      <ProjectForm
        project={project}
        vercelAccounts={vercelAccounts}
        supabaseAccounts={supabaseAccounts}
      />
    </div>
  );
}
