import { checkEnv } from "@/lib/env";
import { ConfigMissing } from "@/components/config-missing";

import { LoginForm } from "./login-form";

// Le env em runtime: a tela de configuracao precisa refletir o deploy, nao o build.
export const dynamic = "force-dynamic";

const ERROS: Record<string, string> = {
  nao_autorizado:
    "Essa conta Google nao esta liberada. Fale com quem administra o dashboard.",
  oauth: "O Google cancelou ou recusou a autenticacao.",
  sem_codigo: "O Google voltou sem codigo de autorizacao. Tente de novo.",
  sessao: "Nao foi possivel abrir a sessao. Tente de novo.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const env = checkEnv();
  if (!env.ok) return <ConfigMissing missing={env.missingRequired} />;

  const { next, error } = await searchParams;
  const target = typeof next === "string" ? next : "/dashboard";
  const message = typeof error === "string" ? ERROS[error] : null;

  return (
    <main className="flex flex-1 items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold tracking-tight">DeployDash</h1>
        <p className="mt-1 mb-6 text-sm text-zinc-400">
          Acesso restrito as contas Google autorizadas.
        </p>

        {message ? (
          <p className="mb-4 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {message}
          </p>
        ) : null}

        <LoginForm next={target} />
      </div>
    </main>
  );
}
