import { NextResponse, type NextRequest } from "next/server";

import { checkEnv, optionalEnv } from "@/lib/env";
import { secretEquals } from "@/lib/crypto";
import { checkAllProjects } from "@/features/monitoring/monitoring.service";
import { sendPendingLicenseAlerts } from "@/features/licenses/licenses.service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Rodada de monitoramento. Nao usa sessao: quem chama e o GitHub Actions
 * (.github/workflows/check-status.yml) com o CRON_SECRET no header.
 * Sem o segredo configurado, o endpoint fica fechado em vez de aberto.
 */
async function handle(request: NextRequest) {
  const env = checkEnv();
  if (!env.ok) {
    return NextResponse.json(
      { error: "Configuracao incompleta", missing: env.missingRequired },
      { status: 503 },
    );
  }

  const expected = optionalEnv("CRON_SECRET");
  if (!expected) {
    return NextResponse.json(
      { error: "CRON_SECRET nao configurado; verificacao automatica desligada" },
      { status: 503 },
    );
  }

  const header = request.headers.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!provided || !secretEquals(provided, expected)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const startedAt = Date.now();
  const outcomes = await checkAllProjects();
  const licenses = await sendPendingLicenseAlerts();

  return NextResponse.json({
    checked: outcomes.length,
    down: outcomes.filter((outcome) => outcome.status !== "online").length,
    durationMs: Date.now() - startedAt,
    licenses,
    results: outcomes.map((outcome) => ({
      project: outcome.name,
      status: outcome.status,
    })),
  });
}

export async function POST(request: NextRequest) {
  return handle(request);
}

/** GET tambem serve, para conferir a rodada manualmente com curl. */
export async function GET(request: NextRequest) {
  return handle(request);
}
