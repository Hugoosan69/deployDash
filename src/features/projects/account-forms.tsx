"use client";

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

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Salvando..." : label}
    </Button>
  );
}

function useToast(state: AccountState, successMessage: string) {
  useEffect(() => {
    if (state.ok) toast.success(state.info ?? successMessage);
    else if (state.error) toast.error(state.error);
  }, [state, successMessage]);
}

export function VercelAccountForm() {
  const [state, formAction] = useActionState(createVercelAccountAction, EMPTY);
  useToast(state, "Conta Vercel salva");

  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-3">
      <div className="space-y-1.5">
        <Label htmlFor="vercel-label">Apelido da conta</Label>
        <Input id="vercel-label" name="label" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="vercel-team">Team ID (opcional)</Label>
        <Input id="vercel-team" name="team_id" placeholder="team_..." />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="vercel-token">Token</Label>
        <Input id="vercel-token" name="token" type="password" required />
      </div>
      <div className="sm:col-span-3">
        <Submit label="Adicionar conta Vercel" />
      </div>
    </form>
  );
}

export function SupabaseAccountForm() {
  const [state, formAction] = useActionState(createSupabaseAccountAction, EMPTY);
  useToast(state, "Conta Supabase salva");

  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-3">
      <div className="space-y-1.5">
        <Label htmlFor="supabase-label">Apelido da conta</Label>
        <Input id="supabase-label" name="label" required />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="supabase-token">Token de management (sbp_...)</Label>
        <Input
          id="supabase-token"
          name="management_token"
          type="password"
          placeholder="opcional"
        />
      </div>
      <div className="sm:col-span-3">
        <Submit label="Adicionar conta Supabase" />
      </div>
    </form>
  );
}
