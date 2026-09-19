import {
  listSupabaseAccounts,
  listVercelAccounts,
} from "@/features/projects/projects.service";
import {
  SupabaseAccountForm,
  VercelAccountForm,
} from "@/features/projects/account-forms";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

function AccountList({
  accounts,
}: {
  accounts: { id: string; label: string; has_token: boolean }[];
}) {
  if (accounts.length === 0) {
    return <p className="text-sm text-zinc-500">Nenhuma conta cadastrada.</p>;
  }

  return (
    <ul className="divide-y divide-zinc-800 text-sm">
      {accounts.map((account) => (
        <li key={account.id} className="flex items-center justify-between py-2">
          <span className="text-zinc-200">{account.label}</span>
          <span className="text-xs text-zinc-500">
            {account.has_token ? "token guardado" : "sem token"}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default async function AccountsPage() {
  const [vercelAccounts, supabaseAccounts] = await Promise.all([
    listVercelAccounts(),
    listSupabaseAccounts(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Contas</h1>
        <p className="text-sm text-zinc-400">
          Um token por conta, cifrado antes de ir para o banco. Os projetos apenas
          apontam para a conta.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vercel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <AccountList accounts={vercelAccounts} />
          <VercelAccountForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Supabase</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <AccountList accounts={supabaseAccounts} />
          <SupabaseAccountForm />
        </CardContent>
      </Card>
    </div>
  );
}
