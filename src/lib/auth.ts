import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type SessionUser = { id: string; email: string };

/**
 * Autorizacao do dashboard: sessao valida + e-mail na allowlist.
 * "Esconder o botao nao e controle de acesso" — todo Server Action e Route Handler
 * sensivel chama requireUser() antes de qualquer leitura ou escrita.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const email = user?.email?.toLowerCase();
  if (!user || !email) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from("allowed_users")
    .select("email")
    .eq("email", email)
    .maybeSingle();

  if (!data) return null;
  return { id: user.id, email };
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new Error("NAO_AUTORIZADO");
  return user;
}
