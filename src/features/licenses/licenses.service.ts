import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { optionalEnv } from "@/lib/env";
import { ALERT_THRESHOLDS, getLicenseInfo } from "./license-info";

/**
 * Licencas: a data vive em projects.license_expires_at. Aqui ficam o calculo do
 * estado (usado pelo badge) e o envio do aviso, com license_alerts impedindo
 * que o cron reenvie o mesmo alerta a cada 10 minutos.
 */

type ExpiringProject = {
  id: string;
  name: string;
  license_email: string | null;
  license_expires_at: string;
};

/**
 * Envia os avisos pendentes. Sem RESEND_API_KEY o aviso nao e enviado por e-mail,
 * mas o estado continua visivel no dashboard — configuracao ausente nao quebra nada.
 */
export async function sendPendingLicenseAlerts(): Promise<{
  sent: number;
  skipped: number;
  reason?: string;
}> {
  const admin = createAdminClient();
  const now = new Date();

  const horizon = new Date(now);
  horizon.setDate(horizon.getDate() + Math.max(...ALERT_THRESHOLDS));

  const { data: projects, error } = await admin
    .from("projects")
    .select("id, name, license_email, license_expires_at")
    .eq("is_active", true)
    .not("license_expires_at", "is", null)
    .lte("license_expires_at", horizon.toISOString());

  if (error) throw new Error(`Falha ao carregar licencas: ${error.message}`);
  if (!projects?.length) return { sent: 0, skipped: 0 };

  const apiKey = optionalEnv("RESEND_API_KEY");
  const from = optionalEnv("ALERT_EMAIL_FROM");
  const fallbackTo = optionalEnv("ALERT_EMAIL_TO");

  let sent = 0;
  let skipped = 0;

  for (const project of projects as ExpiringProject[]) {
    const { daysLeft } = getLicenseInfo(project.license_expires_at, now);
    if (daysLeft === null) continue;

    // Dispara no maior limiar ja alcancado (7 dias cobre tambem daysLeft menor).
    const threshold = ALERT_THRESHOLDS.find((value) => daysLeft <= value);
    if (threshold === undefined) continue;

    const { data: existing } = await admin
      .from("license_alerts")
      .select("id")
      .eq("project_id", project.id)
      .eq("threshold_days", threshold)
      .eq("license_expires_at", project.license_expires_at)
      .maybeSingle();

    if (existing) continue;

    const to = project.license_email ?? fallbackTo;
    if (!apiKey || !from || !to) {
      skipped += 1;
      continue;
    }

    const delivered = await sendEmail({
      apiKey,
      from,
      to,
      subject: `Licenca de ${project.name} vence em ${daysLeft} dia(s)`,
      text:
        `A licenca do projeto ${project.name} expira em ` +
        `${new Date(project.license_expires_at).toLocaleDateString("pt-BR")} ` +
        `(${daysLeft} dia(s)).`,
    });

    if (!delivered) {
      skipped += 1;
      continue;
    }

    await admin.from("license_alerts").insert({
      project_id: project.id,
      threshold_days: threshold,
      license_expires_at: project.license_expires_at,
    });
    sent += 1;
  }

  const reason =
    skipped > 0 && !apiKey
      ? "RESEND_API_KEY ausente: avisos so aparecem no dashboard"
      : undefined;

  return { sent, skipped, reason };
}

async function sendEmail(params: {
  apiKey: string;
  from: string;
  to: string;
  subject: string;
  text: string;
}): Promise<boolean> {
  // Chamada direta a API do Resend: o SDK nao resolveria nada que fetch nao resolva.
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${params.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: params.from,
        to: [params.to],
        subject: params.subject,
        text: params.text,
      }),
    });
    if (!response.ok) {
      console.error("[licenses] Resend respondeu", response.status);
      return false;
    }
    return true;
  } catch (error) {
    console.error(
      "[licenses] falha ao enviar aviso",
      error instanceof Error ? error.message : error,
    );
    return false;
  }
}
