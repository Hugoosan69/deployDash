import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/**
 * Retorno do OAuth do Google. Aqui a allowlist e a unica barreira real: o Google
 * autentica qualquer conta, entao um e-mail fora de allowed_users tem a sessao
 * encerrada no proprio callback, antes de chegar em qualquer tela.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";
  const oauthError = searchParams.get("error_description") ?? searchParams.get("error");

  if (oauthError) {
    return NextResponse.redirect(`${origin}/login?error=oauth`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=sem_codigo`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user?.email) {
    return NextResponse.redirect(`${origin}/login?error=sessao`);
  }

  const email = data.user.email.toLowerCase();

  const admin = createAdminClient();
  const { data: allowed } = await admin
    .from("allowed_users")
    .select("email")
    .eq("email", email)
    .maybeSingle();

  if (!allowed) {
    await supabase.auth.signOut();
    await recordAudit({
      actorEmail: email,
      action: "auth.denied",
      target: "fora da allowlist",
    });
    return NextResponse.redirect(`${origin}/login?error=nao_autorizado`);
  }

  await recordAudit({ actorEmail: email, action: "auth.login" });

  const target = next.startsWith("/") ? next : "/dashboard";
  return NextResponse.redirect(`${origin}${target}`);
}
