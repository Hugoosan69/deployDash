import Link from "next/link";

import {
  listSupabaseAccounts,
  listVercelAccounts,
} from "@/features/projects/projects.service";
import { ProjectForm } from "@/features/projects/project-form";

export const dynamic = "force-dynamic";

export default async function NewProjectPage() {
  const [vercelAccounts, supabaseAccounts] = await Promise.all([
    listVercelAccounts(),
    listSupabaseAccounts(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard" className="text-sm text-zinc-400 hover:text-zinc-100">
          ← Projetos
        </Link>
        <h1 className="mt-2 text-xl font-semibold tracking-tight">
          Novo projeto
        </h1>
        <p className="text-sm text-zinc-400">
          Os segredos sao cifrados antes de ir para o banco e nunca voltam em
          listagem.
        </p>
      </div>

      <ProjectForm
        vercelAccounts={vercelAccounts}
        supabaseAccounts={supabaseAccounts}
      />
    </div>
  );
}
