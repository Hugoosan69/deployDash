import type { EnvIssue } from "@/lib/env";

/**
 * Tela de configuracao ausente: substitui o 500 generico por instrucao.
 */
export function ConfigMissing({ missing }: { missing: EnvIssue[] }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 px-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-100">
          Configuracao incompleta
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          O DeployDash nao subiu porque falta variavel de ambiente. Preencha o
          <code className="mx-1 rounded bg-zinc-800 px-1 py-0.5 text-xs">
            .env.local
          </code>
          (ou as envs do projeto na Vercel) e recarregue.
        </p>
      </div>

      <ul className="divide-y divide-zinc-800 rounded-xl border border-zinc-800">
        {missing.map((issue) => (
          <li key={issue.name} className="p-4">
            <p className="font-mono text-sm text-amber-300">{issue.name}</p>
            <p className="mt-1 text-sm text-zinc-400">{issue.hint}</p>
          </li>
        ))}
      </ul>

      <p className="text-xs text-zinc-500">
        O estado completo do ambiente tambem responde em{" "}
        <code className="rounded bg-zinc-800 px-1 py-0.5">/api/health</code>.
      </p>
    </div>
  );
}
