"use client";

import { useState, useTransition } from "react";
import { Plus, Power, PowerOff } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

import { setAccountActiveAction } from "./accounts-actions";
import { SupabaseAccountForm, VercelAccountForm } from "./account-forms";
import type { AccountKind, AccountSummary } from "./types";

/**
 * Lista de contas com ativar/desativar. Desativar e reversivel de proposito:
 * nao existe remover, porque apagar a conta deixaria orfaos os projetos que
 * apontam para ela e jogaria fora o token cifrado sem como recuperar.
 */
export function AccountList({
  kind,
  title,
  description,
  accounts,
}: {
  kind: AccountKind;
  title: string;
  description: string;
  accounts: AccountSummary[];
}) {
  const [adding, setAdding] = useState(false);
  const [deactivating, setDeactivating] = useState<AccountSummary | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle(account: AccountSummary, isActive: boolean) {
    startTransition(async () => {
      const result = await setAccountActiveAction(kind, account.id, isActive);
      if (!result.ok) {
        toast.error(result.error ?? "Falha ao atualizar a conta");
        return;
      }
      setDeactivating(null);
      toast.success(result.info ?? "Conta atualizada");
    });
  }

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/60">
      <header className="flex items-start justify-between gap-4 border-b border-zinc-800 p-5">
        <div>
          <h2 className="text-base font-semibold text-zinc-100">{title}</h2>
          <p className="mt-0.5 text-sm text-zinc-400">{description}</p>
        </div>
        <Button size="sm" onClick={() => setAdding(true)}>
          <Plus className="h-4 w-4" />
          Adicionar
        </Button>
      </header>

      {accounts.length === 0 ? (
        <p className="p-5 text-sm text-zinc-500">
          Nenhuma conta cadastrada ainda.
        </p>
      ) : (
        <ul className="divide-y divide-zinc-800">
          {accounts.map((account) => (
            <li
              key={account.id}
              className="flex flex-wrap items-center gap-3 p-4 sm:flex-nowrap"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "truncate font-medium",
                      account.is_active ? "text-zinc-100" : "text-zinc-500",
                    )}
                  >
                    {account.label}
                  </span>
                  <StatusPill active={account.is_active} />
                </div>
                <p className="mt-0.5 truncate text-xs text-zinc-500">
                  {account.team_id ? (
                    <span className="font-mono">{account.team_id}</span>
                  ) : kind === "vercel" ? (
                    "conta pessoal"
                  ) : null}
                  {account.team_id || kind === "vercel" ? " · " : null}
                  {account.has_token ? "token guardado" : "sem token"} ·{" "}
                  {account.project_count === 0
                    ? "nenhum projeto"
                    : `${account.project_count} projeto(s)`}
                </p>
              </div>

              {account.is_active ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pending}
                  onClick={() => setDeactivating(account)}
                >
                  <PowerOff className="h-3.5 w-3.5" />
                  Desativar
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pending}
                  onClick={() => toggle(account, true)}
                >
                  <Power className="h-3.5 w-3.5" />
                  Ativar
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={adding}
        onClose={() => setAdding(false)}
        title={`Adicionar conta ${kind === "vercel" ? "Vercel" : "Supabase"}`}
        description={
          kind === "vercel"
            ? "O token e validado na API da Vercel antes de ser guardado."
            : "O token de management e opcional: sem ele o projeto ainda e monitorado por HTTP e pela Vercel."
        }
      >
        {kind === "vercel" ? (
          <VercelAccountForm onDone={() => setAdding(false)} />
        ) : (
          <SupabaseAccountForm onDone={() => setAdding(false)} />
        )}
      </Dialog>

      <ConfirmDialog
        open={deactivating !== null}
        onClose={() => setDeactivating(null)}
        onConfirm={() => deactivating && toggle(deactivating, false)}
        title={`Desativar ${deactivating?.label ?? ""}?`}
        description={
          deactivating?.project_count
            ? `${deactivating.project_count} projeto(s) apontam para esta conta. Eles continuam cadastrados e monitorados por HTTP, mas param de ser consultados na API. O token segue guardado e voce pode reativar quando quiser.`
            : "A conta para de aparecer no cadastro de projetos. O token segue guardado e voce pode reativar quando quiser."
        }
        confirmLabel="Desativar"
        pending={pending}
      />
    </section>
  );
}

function StatusPill({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        active
          ? "bg-emerald-500/10 text-emerald-300 ring-emerald-500/30"
          : "bg-zinc-500/10 text-zinc-400 ring-zinc-500/30",
      )}
    >
      {active ? "Ativa" : "Inativa"}
    </span>
  );
}
