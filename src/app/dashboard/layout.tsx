import Link from "next/link";
import { redirect } from "next/navigation";

import { checkEnv } from "@/lib/env";
import { getSessionUser } from "@/lib/auth";
import { ConfigMissing } from "@/components/config-missing";
import { Button } from "@/components/ui/button";
import { signOut } from "@/app/login/actions";

export default async function DashboardLayout({
  children,
}: LayoutProps<"/dashboard">) {
  const env = checkEnv();
  if (!env.ok) return <ConfigMissing missing={env.missingRequired} />;

  // Middleware ja barrou quem nao tem sessao; aqui vale a allowlist.
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-zinc-800">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-6 px-6">
          <Link href="/dashboard" className="font-semibold tracking-tight">
            DeployDash
          </Link>
          <nav className="flex items-center gap-4 text-sm text-zinc-400">
            <Link href="/dashboard" className="hover:text-zinc-100">
              Projetos
            </Link>
            <Link href="/dashboard/licenses" className="hover:text-zinc-100">
              Licencas
            </Link>
            <Link href="/dashboard/accounts" className="hover:text-zinc-100">
              Contas
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-xs text-zinc-500 sm:inline">
              {user.email}
            </span>
            <form action={signOut}>
              <Button type="submit" variant="ghost" size="sm">
                Sair
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        {children}
      </main>
    </div>
  );
}
