"use server";

import { revalidatePath } from "next/cache";

import { supabaseAccountSchema, vercelAccountSchema } from "@/schemas/project";
import {
  createSupabaseAccount,
  createVercelAccount,
  setAccountActive,
} from "@/features/projects/projects.service";
import type { AccountKind } from "@/features/projects/types";
import { getVercelUser } from "@/lib/integrations/vercel";

export type AccountState = { ok: boolean; error: string | null; info?: string };

export async function createVercelAccountAction(
  _prev: AccountState,
  formData: FormData,
): Promise<AccountState> {
  const parsed = vercelAccountSchema.safeParse({
    label: formData.get("label"),
    team_id: formData.get("team_id"),
    token: formData.get("token"),
  });

  if (!parsed.success) {
    return { ok: false, error: "Confira os campos." };
  }

  // Valida o token antes de guardar: token errado so aparece no primeiro check senao.
  try {
    const user = await getVercelUser(parsed.data.token);
    await createVercelAccount({
      label: parsed.data.label,
      team_id: parsed.data.team_id,
      token: parsed.data.token,
    });
    revalidatePath("/dashboard/accounts");
    return {
      ok: true,
      error: null,
      info: user.username ? `Token valido (${user.username})` : "Token valido",
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? `Token recusado pela Vercel: ${error.message}`
          : "Token recusado pela Vercel",
    };
  }
}

export async function createSupabaseAccountAction(
  _prev: AccountState,
  formData: FormData,
): Promise<AccountState> {
  const parsed = supabaseAccountSchema.safeParse({
    label: formData.get("label"),
    management_token: formData.get("management_token"),
  });

  if (!parsed.success) {
    return { ok: false, error: "Confira os campos." };
  }

  try {
    await createSupabaseAccount(parsed.data);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Falha ao salvar conta",
    };
  }

  revalidatePath("/dashboard/accounts");
  return { ok: true, error: null };
}

export async function setAccountActiveAction(
  kind: AccountKind,
  id: string,
  isActive: boolean,
): Promise<AccountState> {
  try {
    await setAccountActive(kind, id, isActive);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Falha ao atualizar a conta",
    };
  }

  revalidatePath("/dashboard/accounts");
  revalidatePath("/dashboard");
  return { ok: true, error: null, info: isActive ? "Conta ativada" : "Conta desativada" };
}
