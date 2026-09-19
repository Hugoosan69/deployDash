import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

/**
 * Segredos de projeto (tokens Vercel, service keys, DATABASE_URL) sao guardados
 * cifrados com AES-256-GCM: IV novo por registro e tag de integridade, para que
 * um valor adulterado no banco falhe em vez de decifrar em lixo silencioso.
 *
 * Formato persistido: v1:<iv b64>:<tag b64>:<ciphertext b64>
 */
const VERSION = "v1";
const IV_BYTES = 12;
const KEY_BYTES = 32;

function masterKey(): Buffer {
  const raw = process.env.ENCRYPTION_MASTER_KEY;
  if (!raw) {
    throw new Error("ENCRYPTION_MASTER_KEY ausente");
  }
  const key = Buffer.from(raw.trim(), "hex");
  if (key.length !== KEY_BYTES) {
    throw new Error(
      "ENCRYPTION_MASTER_KEY deve ter 64 caracteres hex (32 bytes). " +
        'Gere com: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
    );
  }
  return key;
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", masterKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plain, "utf8"),
    cipher.final(),
  ]);
  return [
    VERSION,
    iv.toString("base64"),
    cipher.getAuthTag().toString("base64"),
    ciphertext.toString("base64"),
  ].join(":");
}

export function decryptSecret(payload: string): string {
  const [version, ivB64, tagB64, ciphertextB64] = payload.split(":");
  if (version !== VERSION || !ivB64 || !tagB64 || !ciphertextB64) {
    throw new Error("Segredo cifrado em formato desconhecido");
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    masterKey(),
    Buffer.from(ivB64, "base64"),
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextB64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

/** Cifra so se houver conteudo; campo opcional vazio continua nulo no banco. */
export function encryptOptional(plain: string | null | undefined): string | null {
  const value = plain?.trim();
  return value ? encryptSecret(value) : null;
}

export function decryptOptional(payload: string | null | undefined): string | null {
  return payload ? decryptSecret(payload) : null;
}

/** Comparacao de segredo (CRON_SECRET) sem vazar tamanho por tempo de resposta. */
export function secretEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/** Mascara para exibir um segredo sem revelar: "sbp_...4f2a". */
export function maskSecret(value: string): string {
  if (value.length <= 8) return "••••••••";
  return `${value.slice(0, 4)}••••${value.slice(-4)}`;
}
