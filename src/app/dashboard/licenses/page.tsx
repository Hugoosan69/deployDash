import Link from "next/link";

import { listProjects } from "@/features/projects/projects.service";
import { getLicenseInfo } from "@/features/licenses/license-info";
import { LicenseBadge } from "@/features/licenses/license-badge";
import { Card, CardContent, EmptyState } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

const ORDER = { expired: 0, expiring_soon: 1, ok: 2, none: 3 } as const;

export default async function LicensesPage() {
  const projects = await listProjects();

  const rows = projects
    .map((project) => ({
      project,
      info: getLicenseInfo(project.license_expires_at),
    }))
    .sort((a, b) => {
      const byState = ORDER[a.info.state] - ORDER[b.info.state];
      if (byState !== 0) return byState;
      return (a.info.daysLeft ?? 0) - (b.info.daysLeft ?? 0);
    });

  const atRisk = rows.filter(
    (row) => row.info.state === "expired" || row.info.state === "expiring_soon",
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Licencas</h1>
        <p className="text-sm text-zinc-400">
          {atRisk} licenca(s) vencida(s) ou vencendo nos proximos 30 dias. O aviso
          por e-mail sai 7 e 1 dia antes.
        </p>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="Nenhum projeto cadastrado"
          description="Cadastre projetos para acompanhar o vencimento das licenças aqui."
        />
      ) : (
        <Card>
          <CardContent className="pt-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-zinc-500">
                  <th className="pb-2 font-medium">Projeto</th>
                  <th className="pb-2 font-medium">Titular</th>
                  <th className="pb-2 font-medium">Expira em</th>
                  <th className="pb-2 font-medium">Situacao</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {rows.map(({ project }) => (
                  <tr key={project.id}>
                    <td className="py-2.5">
                      <Link
                        href={`/dashboard/projects/${project.id}`}
                        className="text-zinc-200 hover:underline"
                      >
                        {project.name}
                      </Link>
                    </td>
                    <td className="py-2.5 text-zinc-400">
                      {project.license_email ?? "—"}
                    </td>
                    <td className="py-2.5 text-zinc-400">
                      {project.license_expires_at
                        ? new Date(project.license_expires_at).toLocaleDateString(
                            "pt-BR",
                          )
                        : "—"}
                    </td>
                    <td className="py-2.5">
                      <LicenseBadge expiresAt={project.license_expires_at} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
