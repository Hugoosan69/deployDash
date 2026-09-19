import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";

import { getProject } from "@/features/projects/projects.service";
import { getStatusHistory } from "@/features/monitoring/monitoring.service";
import { StatusBadge } from "@/features/monitoring/status-badge";
import { LicenseBadge } from "@/features/licenses/license-badge";
import { SecretReveal } from "@/features/projects/secret-reveal";
import { DeleteProjectButton } from "@/features/projects/delete-project-button";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="break-all text-sm text-zinc-200">{value || "—"}</p>
    </div>
  );
}

export default async function ProjectDetailPage({
  params,
}: PageProps<"/dashboard/projects/[id]">) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  const history = await getStatusHistory(project.id, 20);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/dashboard" className="text-sm text-zinc-400 hover:text-zinc-100">
            ← Projetos
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-semibold tracking-tight">
              {project.name}
            </h1>
            <StatusBadge status={project.status} />
            <LicenseBadge expiresAt={project.license_expires_at} />
          </div>
          <p className="text-sm text-zinc-500">{project.slug}</p>
        </div>

        <div className="flex items-center gap-2">
          <Link href={`/dashboard/projects/${project.id}/edit`}>
            <Button variant="outline" size="sm">
              <Pencil className="h-3.5 w-3.5" />
              Editar
            </Button>
          </Link>
          <DeleteProjectButton
            projectId={project.id}
            projectName={project.name}
          />
        </div>
      </div>

      {project.description ? (
        <p className="text-sm text-zinc-400">{project.description}</p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Endereços</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Field label="URL publica" value={project.public_url} />
            <Field label="Health check" value={project.health_url} />
            <Field label="Supabase URL" value={project.supabase_url} />
            <Field label="Supabase ref" value={project.supabase_project_ref} />
            <Field label="Vercel project" value={project.vercel_project_id} />
            <Field
              label="Banco"
              value={
                project.database_host
                  ? `${project.database_host}${project.database_name ? ` / ${project.database_name}` : ""}`
                  : null
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Credenciais</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-zinc-800">
            <SecretReveal
              projectId={project.id}
              field="supabase_anon_key"
              label="Supabase anon key"
              available={project.has_supabase_anon_key}
            />
            <SecretReveal
              projectId={project.id}
              field="database_url"
              label="DATABASE_URL"
              available={project.has_database_url}
            />
            <SecretReveal
              projectId={project.id}
              field="vercel_token"
              label="Token da conta Vercel"
              available={Boolean(project.vercel_account_id)}
            />
            <SecretReveal
              projectId={project.id}
              field="supabase_management_token"
              label="Token de management Supabase"
              available={Boolean(project.supabase_account_id)}
            />
            <p className="pt-3 text-xs text-zinc-500">
              Cada revelacao fica registrada em audit_logs com o seu e-mail.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historico de status</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-zinc-500">
              Nenhuma verificacao ainda. Use “Verificar” no card ou espere o cron.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-zinc-500">
                  <th className="pb-2 font-medium">Quando</th>
                  <th className="pb-2 font-medium">Fonte</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Tempo</th>
                  <th className="pb-2 font-medium">Detalhe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {history.map((log) => (
                  <tr key={log.id} className="text-zinc-300">
                    <td className="py-2 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString("pt-BR")}
                    </td>
                    <td className="py-2">{log.source}</td>
                    <td className="py-2">
                      <StatusBadge status={log.status} />
                    </td>
                    <td className="py-2">
                      {log.response_time_ms ? `${log.response_time_ms} ms` : "—"}
                    </td>
                    <td className="py-2 text-zinc-500">
                      {log.error_message ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
