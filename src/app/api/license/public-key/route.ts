import { NextResponse } from "next/server";

import { publicKeyBase64 } from "@/lib/license-signing";

export const dynamic = "force-dynamic";

/**
 * Chave publica de verificacao. E publica de verdade: serve so para conferir
 * assinatura, nunca para produzi-la. Existe para o cliente poder buscar em vez
 * de voce copiar a mao — mas o recomendado e embutir no codigo do site, senao
 * quem consegue trocar a resposta do endpoint tambem troca a chave.
 */
export async function GET() {
  const key = publicKeyBase64();

  if (!key) {
    return NextResponse.json(
      { error: "Assinatura nao configurada neste ambiente" },
      { status: 503 },
    );
  }

  return NextResponse.json(
    { algorithm: "ed25519", format: "spki-der-base64", publicKey: key },
    { headers: { "cache-control": "public, max-age=3600" } },
  );
}
