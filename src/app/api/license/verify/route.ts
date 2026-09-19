import { NextResponse, type NextRequest } from "next/server";

import { verifyLicenseKey } from "@/features/licenses/licensing.service";
import { signLicense, signingConfigured } from "@/lib/license-signing";

export const dynamic = "force-dynamic";

/**
 * Endpoint publico consultado pelos sites licenciados. Sem sessao: a chave e a
 * credencial. A resposta vai assinada com Ed25519 para que o cliente saiba que
 * veio daqui, e nao de um servidor colocado no meio do caminho.
 */
const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type",
  "cache-control": "no-store",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(request: NextRequest) {
  if (!signingConfigured()) {
    return NextResponse.json(
      { error: "LICENSE_SIGNING_PRIVATE_KEY ausente no servidor" },
      { status: 503, headers: CORS },
    );
  }

  let body: { key?: unknown; domain?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Corpo invalido" },
      { status: 400, headers: CORS },
    );
  }

  const key = typeof body.key === "string" ? body.key.trim() : "";
  const domain = typeof body.domain === "string" ? body.domain.slice(0, 255) : null;

  if (!key || key.length > 128) {
    return NextResponse.json(
      { error: "Chave ausente ou invalida" },
      { status: 400, headers: CORS },
    );
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  const result = await verifyLicenseKey({ key, domain, ip });

  if (result.outcome === "rate_limited") {
    return NextResponse.json(
      { error: "Consultas demais. Tente em alguns minutos." },
      { status: 429, headers: { ...CORS, "retry-after": "60" } },
    );
  }

  const signed = signLicense(result.payload);
  if (!signed) {
    return NextResponse.json(
      { error: "Assinatura indisponivel" },
      { status: 503, headers: CORS },
    );
  }

  // Chave desconhecida responde 200 assinado com status "unknown": o cliente
  // precisa distinguir "licenca invalida" de "servidor fora do ar", e um 404
  // seria indistinguivel de erro de rede depois de um proxy no meio.
  return NextResponse.json(signed, { headers: CORS });
}
