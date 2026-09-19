"use client";

import type { ReactNode } from "react";
import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/primitives";

import {
  createSupabaseAccountAction,
  createVercelAccountAction,
  type AccountState,
} from "./accounts-actions";

const EMPTY: AccountState = { ok: false, error: null };

/** O gerenciador de senhas do navegador enche campo de token com credencial salva. */
const NO_AUTOFILL = {
  autoComplete: "off",
  autoCorrect: "off",
  autoCapitalize: "off",
  spellCheck: false,
} as const;

function Hint({ children }: { children: ReactNode }) {
  return <p className="text-xs text-zinc-500">{children}</p>;
}

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Salvando..." : label}
    </Button>
  );
}

function useToast(
  state: AccountState,
  successMessage: string,
  onDone?: () => void,
) {
  useEffect(() => {
    if (state.ok) {
      toast.success(state.info ?? successMessage);
      onDone?.();
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state, successMessage, onDone]);
}

export function VercelAccountForm({ onDone }: { onDone?: () => void }) {
  const [state, formAction] = useActionState(createVercelAccountAction, EMPTY);
  useToast(state, "Conta Vercel salva", onDone);

  return (
    <form
      action={formAction}
      autoComplete="off"
      className="grid gap-3"
    >
      <div className="space-y-1.5">
        <Label htmlFor="vercel-label">Apelido da conta</Label>
        <Input id="vercel-label" name="label" required {...NO_AUTOFILL} />
        <Hint>Como voce chama essa conta. Ex.: pessoal, cliente X.</Hint>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="vercel-team">Team ID (opcional)</Label>
        <Input
          id="vercel-team"
          name="team_id"
          placeholder="team_..."
          pattern="team_[A-Za-z0-9]+"
          title="Comeca com team_ — deixe vazio se os projetos estao na conta pessoal"
          {...NO_AUTOFILL}
        />
        <Hint>
          So se os projetos estiverem num time. Settings &gt; General &gt; Team ID.
        </Hint>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="vercel-token">Token</Label>
        <Input
          id="vercel-token"
          name="token"
          type="password"
          required
          autoComplete="new-password"
          {...{ autoCorrect: "off", autoCapitalize: "off", spellCheck: false }}
        />
        <Hint>
          vercel.com/account/tokens. E validado antes de salvar.
        </Hint>
      </div>
      <div className="pt-1">
        <Submit label="Adicionar conta Vercel" />
      </div>
    </form>
  );
}

export function SupabaseAccountForm({ onDone }: { onDone?: () => void }) {
  const [state, formAction] = useActionState(createSupabaseAccountAction, EMPTY);
  useToast(state, "Conta Supabase salva", onDone);

  return (
    <form
      action={formAction}
      autoComplete="off"
      className="grid gap-3"
    >
      <div className="space-y-1.5">
        <Label htmlFor="supabase-label">Apelido da conta</Label>
        <Input id="supabase-label" name="label" required {...NO_AUTOFILL} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="supabase-token">Token de management (sbp_...)</Label>
        <Input
          id="supabase-token"
          name="management_token"
          type="password"
          placeholder="opcional"
          autoComplete="new-password"
          {...{ autoCorrect: "off", autoCapitalize: "off", spellCheck: false }}
        />
        <Hint>
          supabase.com/dashboard/account/tokens. Sem ele o projeto ainda e
          monitorado por HTTP e pela Vercel.
        </Hint>
      </div>
      <div className="pt-1">
        <Submit label="Adicionar conta Supabase" />
      </div>
    </form>
  );
}
