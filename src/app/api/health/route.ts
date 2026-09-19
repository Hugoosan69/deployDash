import { NextResponse } from "next/server";

import { checkEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * Estado do ambiente sem exigir login: diz o que falta configurar, nunca
 * o valor de nada. Deploy novo e maquina nova comecam por aqui.
 */
export async function GET() {
  const env = checkEnv();

  return NextResponse.json(
    {
      status: env.ok ? "ok" : "misconfigured",
      missingRequired: env.missingRequired,
      missingOptional: env.missingOptional,
      checkedAt: new Date().toISOString(),
    },
    { status: env.ok ? 200 : 503 },
  );
}
