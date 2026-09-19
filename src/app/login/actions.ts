"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { recordAudit } from "@/lib/audit";

/**
 * A entrada acontece pelo OAuth do Google (ver src/app/auth/callback/route.ts).
 * Aqui fica so a saida, que precisa ser server-side para limpar o cookie de sessao.
 */
export async function signOut() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase.auth.signOut();
  await recordAudit({
    actorEmail: user?.email?.toLowerCase() ?? null,
    action: "auth.logout",
  });

  redirect("/login");
}
