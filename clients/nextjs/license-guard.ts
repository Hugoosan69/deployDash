import { createPublicKey, verify as verifySignature } from "node:crypto";

/**
 * Verificacao de licenca para um site Next.js — copie este arquivo para
 * `src/lib/license-guard.ts` no projeto cliente.
 *
 * Como funciona:
 *   1. pergunta ao DeployDash de 12 em 12 horas;
 *   2. confere a assinatura Ed25519 da resposta com a chave publica abaixo;
 *   3. guarda a ultima resposta valida em memoria.
 *
 * Duas decisoes deliberadas:
 *
 * - **Falha de rede nao bloqueia site.** Se o DeployDash estiver fora do ar, o
 *   site segue funcionando com a ultima resposta conhecida, e mesmo sem nenhuma
 *   resposta ele libera. Um dashboard indisponivel nao pode derrubar o site do
 *   cliente — o risco de falso bloqueio e pior que o de um dia a mais de uso.
 * - **A chave publica fica embutida, nao e buscada.** Buscar a chave do mesmo
 *   servidor que manda a resposta nao prova nada: quem consegue forjar um
 *   tambem forja o outro.
 */

const DEPLOYDASH_URL = "https://deploydash-seven.vercel.app";

/** Chave publica do DeployDash (Ed25519, SPKI base64). Publica de verdade. */
const PUBLIC_KEY_BASE64 =
  "MCowBQYDK2VwAyEAl28aLsi9fbc9TpK6SIebzROJTWc6GgictszeFLFl3FA=";

/** Por quanto tempo uma resposta em cache continua valendo se a rede falhar. */
const STALE_TOLERANCE_MS = 72 * 60 * 60 * 1000;

const FETCH_TIMEOUT_MS = 4000;

export type LicenseStatus = "active" | "grace" | "expired" | "revoked" | "unknown";

export type LicenseState = {
  status: LicenseStatus;
  expiresAt: string | null;
  graceUntil: string | null;
  /** true quando a resposta veio do cache porque a consulta falhou. */
  stale: boolean;
};

type Payload = {
  project: string;
  status: LicenseStatus;
  expires_at: string | null;
  grace_until: string | null;
  checked_at: string;
  ttl: number;
  nonce: string;
};

let cache: { payload: Payload; fetchedAt: number } | null = null;
let inFlight: Promise<LicenseState> | null = null;

function canonicalJson(payload: Payload): string {
  return JSON.stringify(
    Object.fromEntries(
      Object.entries(payload).sort(([a], [b]) => a.localeCompare(b)),
    ),
  );
}

function signatureIsValid(payload: Payload, signature: string): boolean {
  try {
    const key = createPublicKey({
      key: Buffer.from(PUBLIC_KEY_BASE64, "base64"),
      format: "der",
      type: "spki",
    });

    return verifySignature(
      null,
      Buffer.from(canonicalJson(payload), "utf8"),
      key,
      Buffer.from(signature, "base64url"),
    );
  } catch {
    return false;
  }
}

function toState(payload: Payload, stale: boolean): LicenseState {
  return {
    status: payload.status,
    expiresAt: payload.expires_at,
    graceUntil: payload.grace_until,
    stale,
  };
}

const LIBERADO: LicenseState = {
  status: "unknown",
  expiresAt: null,
  graceUntil: null,
  stale: true,
};

async function consultar(): Promise<LicenseState> {
  const key = process.env.LICENSE_KEY;
  if (!key) {
    console.warn("[licenca] LICENSE_KEY ausente; verificacao desligada");
    return LIBERADO;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(`${DEPLOYDASH_URL}/api/license/verify`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        key,
        domain: process.env.NEXT_PUBLIC_APP_URL ?? null,
      }),
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const body = (await response.json()) as {
      payload: Payload;
      signature: string;
    };

    if (!signatureIsValid(body.payload, body.signature)) {
      // Resposta sem assinatura valida e tratada como servidor nao confiavel:
      // ignoramos o conteudo em vez de obedecer a ele.
      console.error("[licenca] assinatura invalida — resposta ignorada");
      return cache ? toState(cache.payload, true) : LIBERADO;
    }

    cache = { payload: body.payload, fetchedAt: Date.now() };
    return toState(body.payload, false);
  } catch (error) {
    console.warn(
      "[licenca] falha ao consultar:",
      error instanceof Error ? error.message : error,
    );

    if (cache && Date.now() - cache.fetchedAt < STALE_TOLERANCE_MS) {
      return toState(cache.payload, true);
    }
    return LIBERADO;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Estado atual da licenca. Chame de Server Component / layout.
 * Respostas em cache nao geram trafego; consultas simultaneas compartilham
 * a mesma requisicao.
 */
export async function getLicenseState(): Promise<LicenseState> {
  if (cache) {
    const idade = Date.now() - cache.fetchedAt;
    if (idade < cache.payload.ttl * 1000) return toState(cache.payload, false);
  }

  inFlight ??= consultar().finally(() => {
    inFlight = null;
  });

  return inFlight;
}

/** O site deve bloquear o acesso? So quando ha certeza assinada de que venceu. */
export function shouldBlock(state: LicenseState): boolean {
  return state.status === "expired" || state.status === "revoked";
}

/** O site deve mostrar o aviso de vencimento? */
export function shouldWarn(state: LicenseState): boolean {
  return state.status === "grace";
}
