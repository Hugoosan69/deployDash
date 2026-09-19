import {
  listSupabaseAccounts,
  listVercelAccounts,
} from "@/features/projects/projects.service";
import { AccountList } from "@/features/projects/account-list";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const [vercelAccounts, supabaseAccounts] = await Promise.all([
    listVercelAccounts(),
    listSupabaseAccounts(),
  ]);

  const active = [...vercelAccounts, ...supabaseAccounts].filter(
    (account) => account.is_active,
  ).length;
  const total = vercelAccounts.length + supabaseAccounts.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Contas</h1>
        <p className="text-sm text-zinc-400">
          {total === 0
            ? "Um token por conta, cifrado antes de ir para o banco. Os projetos apenas apontam para a conta."
            : `${active} de ${total} conta(s) ativa(s). Um token por conta, cifrado antes de ir para o banco.`}
        </p>
      </div>

      <AccountList
        kind="vercel"
        title="Vercel"
        description="Le o estado do ultimo deployment de cada projeto."
        accounts={vercelAccounts}
      />

      <AccountList
        kind="supabase"
        title="Supabase"
        description="Token de management, por conta. Opcional."
        accounts={supabaseAccounts}
      />
    </div>
  );
}
