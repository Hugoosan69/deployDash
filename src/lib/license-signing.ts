import "server-only";

import {
  createHash,
  createPrivateKey,
  createPublicKey,
  randomBytes,
  sign as signBuffer,
} from "node:crypto";

import { optionalEnv } from "@/lib/env";

/**
 * A resposta do endpoint de licenca vai assinada com Ed25519.
 *
 * Sem assinatura, derrubar a validacao e trivial: basta apontar o dominio do
 * DeployDash para outro servidor (hosts, proxy, DNS) e responder "valida para
 * sempre". Com assinatura, o site so aceita o que veio da chave privada que
 * mora aqui — e a chave publica pode ir no codigo do cliente sem risco.
 */

export type LicensePayload = {
  /** Sempre presente, para o cliente saber contra o que esta validando. */
  project: string;
  status: "active" | "grace" | "expired" | "revoked" | "unknown";
  expires_at: string | null;
  /** Ate quando o site deve apenas avisar, sem bloquear. */
  grace_until: string | null;
  checked_at: string;
  /** Tempo sugerido de cache no cliente, em segundos. */
  ttl: number;
  nonce: string;
};

export type SignedLicense = {
  payload: LicensePayload;
  /** Assinatura base64url do JSON canonico do payload. */
  signature: string;
  algorithm: "ed25519";
};

function privateKey() {
  const raw = optionalEnv("LICENSE_SIGNING_PRIVATE_KEY");
  if (!raw) return null;

  return createPrivateKey({
    key: Buffer.from(raw, "base64"),
    format: "der",
    type: "pkcs8",
  });
}

export function signingConfigured(): boolean {
  return privateKey() !== null;
}

/** Chave publica em base64 (SPKI), derivada da privada. Vai embutida no cliente. */
export function publicKeyBase64(): string | null {
  const key = privateKey();
  if (!key) return null;

  return createPublicKey(key)
    .export({ type: "spki", format: "der" })
    .toString("base64");
}

/**
 * JSON canonico: chaves em ordem alfabetica, para cliente e servidor
 * assinarem/verificarem exatamente os mesmos bytes.
 */
export function canonicalJson(payload: LicensePayload): string {
  return JSON.stringify(
    Object.fromEntries(
      Object.entries(payload).sort(([a], [b]) => a.localeCompare(b)),
    ),
  );
}

export function signLicense(
  payload: Omit<LicensePayload, "nonce" | "checked_at">,
): SignedLicense | null {
  const key = privateKey();
  if (!key) return null;

  const complete: LicensePayload = {
    ...payload,
    checked_at: new Date().toISOString(),
    nonce: randomBytes(12).toString("base64url"),
  };

  const signature = signBuffer(
    null,
    Buffer.from(canonicalJson(complete), "utf8"),
    key,
  ).toString("base64url");

  return { payload: complete, signature, algorithm: "ed25519" };
}

/** Prefixo das chaves emitidas. `live` deixa espaco para um `test` no futuro. */
const KEY_PREFIX = "dd_live_";

export function generateLicenseKey(): { key: string; hash: string; prefix: string } {
  const key = KEY_PREFIX + randomBytes(24).toString("base64url");
  return {
    key,
    hash: hashLicenseKey(key),
    // O suficiente para reconhecer na tela sem servir para autenticar.
    prefix: key.slice(0, KEY_PREFIX.length + 6),
  };
}

/**
 * A chave e guardada como hash, igual senha. sha-256 sem salt de proposito:
 * precisamos procurar pelo hash no banco a cada consulta, e a entropia de
 * 192 bits torna forca bruta irrelevante.
 */
export function hashLicenseKey(key: string): string {
  return createHash("sha256").update(key.trim()).digest("hex");
}
