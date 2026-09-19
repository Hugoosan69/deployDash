import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { recordAudit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import {
  generateLicenseKey,
  hashLicenseKey,
  type LicensePayload,
} from "@/lib/license-signing";

/**
 * Emissao e verificacao de licenca.
 *
 * Renovar nao edita a licenca existente: emite outra e marca a anterior como
 * `superseded`. Assim o historico de renovacoes sobrevive, que era justamente o
 * que o campo solto `projects.license_expires_at` perdia a cada edicao.
 */

export type LicenseRow = {
  id: string;
  project_id: string;
  key_prefix: string;
  status: "active" | "revoked" | "superseded";
  issued_at: string;
  expires_at: string;
  grace_days: number;
  revoked_at: string | null;
  revoke_reason: string | null;
  notes: string | null;
};

export type LicenseCheckRow = {
  id: string;
  domain: string | null;
  outcome: string;
  created_at: string;
};

const SELECT = `
  id, project_id, key_prefix, status, issued_at, expires_at,
  grace_days, revoked_at, revoke_reason, notes
`;

export async function listLicenses(projectId: string): Promise<LicenseRow[]> {
  await requireUser();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("licenses")
    .select(SELECT)
    .eq("project_id", projectId)
    .order("issued_at", { ascending: false });

  if (error) throw new Error(`Falha ao listar licencas: ${error.message}`);
  return (data ?? []) as LicenseRow[];
}

export async function listRecentChecks(
  licenseIds: string[],
  limit = 20,
): Promise<LicenseCheckRow[]> {
  await requireUser();
  if (licenseIds.length === 0) return [];

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("license_checks")
    .select("id, domain, outcome, created_at")
    .in("license_id", licenseIds)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Falha ao carregar consultas: ${error.message}`);
  return (data ?? []) as LicenseCheckRow[];
}

/**
 * Emite uma licenca e devolve a chave em claro — **a unica vez** que ela existe
 * fora do site cliente. No banco fica so o hash.
 */
export async function issueLicense(input: {
  projectId: string;
  expiresAt: string;
  graceDays: number;
  notes: string | null;
}): Promise<{ key: string; license: LicenseRow }> {
  const user = await requireUser();
  const admin = createAdminClient();

  // Uma ativa por projeto: a anterior e aposentada, nao apagada.
  await admin
    .from("licenses")
    .update({ status: "superseded" })
    .eq("project_id", input.projectId)
    .eq("status", "active");

  const { key, hash, prefix } = generateLicenseKey();

  const { data, error } = await admin
    .from("licenses")
    .insert({
      project_id: input.projectId,
      key_hash: hash,
      key_prefix: prefix,
      expires_at: input.expiresAt,
      grace_days: input.graceDays,
      notes: input.notes,
    })
    .select(SELECT)
    .single();

  if (error) throw new Error(`Falha ao emitir licenca: ${error.message}`);

  // Espelha o vencimento no projeto para os avisos por e-mail continuarem valendo.
  await admin
    .from("projects")
    .update({ license_expires_at: input.expiresAt })
    .eq("id", input.projectId);

  await recordAudit({
    actorEmail: user.email,
    projectId: input.projectId,
    action: "license.issue",
    target: prefix,
    newValue: { expires_at: input.expiresAt, grace_days: input.graceDays },
  });

  return { key, license: data as LicenseRow };
}

export async function revokeLicense(
  licenseId: string,
  reason: string | null,
): Promise<void> {
  const user = await requireUser();
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("licenses")
    .update({
      status: "revoked",
      revoked_at: new Date().toISOString(),
      revoke_reason: reason,
    })
    .eq("id", licenseId)
    .select("project_id, key_prefix")
    .maybeSingle();

  if (error) throw new Error(`Falha ao revogar: ${error.message}`);
  if (!data) throw new Error("Licenca nao encontrada");

  await recordAudit({
    actorEmail: user.email,
    projectId: data.project_id as string,
    action: "license.revoke",
    target: data.key_prefix as string,
    newValue: { reason },
  });
}

export type VerifyResult = {
  payload: Omit<LicensePayload, "nonce" | "checked_at">;
  outcome:
    | "active"
    | "expired"
    | "grace"
    | "revoked"
    | "unknown_key"
    | "rate_limited";
};

/** Quantas consultas a mesma chave pode fazer por minuto antes de tomar 429. */
const RATE_LIMIT_PER_MINUTE = 20;

/**
 * Verificacao publica: sem sessao, chamada pelo proprio site cliente.
 * Nao usa requireUser — a chave e a credencial.
 */
export async function verifyLicenseKey(input: {
  key: string;
  domain: string | null;
  ip: string | null;
}): Promise<VerifyResult> {
  const admin = createAdminClient();
  const hash = hashLicenseKey(input.key);

  const { data: license } = await admin
    .from("licenses")
    .select("id, project_id, key_prefix, status, expires_at, grace_days")
    .eq("key_hash", hash)
    .maybeSingle();

  if (!license) {
    // Chave desconhecida tambem e registrada: e assim que uma tentativa de
    // adivinhacao aparece antes de virar problema.
    await admin.from("license_checks").insert({
      license_id: null,
      key_prefix: input.key.slice(0, 14),
      domain: input.domain,
      ip: input.ip,
      outcome: "unknown_key",
    });

    return {
      outcome: "unknown_key",
      payload: {
        project: "",
        status: "unknown",
        expires_at: null,
        grace_until: null,
        ttl: 3600,
      },
    };
  }

  const since = new Date(Date.now() - 60_000).toISOString();
  const { count } = await admin
    .from("license_checks")
    .select("id", { count: "exact", head: true })
    .eq("license_id", license.id)
    .gte("created_at", since);

  if ((count ?? 0) >= RATE_LIMIT_PER_MINUTE) {
    return {
      outcome: "rate_limited",
      payload: {
        project: "",
        status: "unknown",
        expires_at: null,
        grace_until: null,
        ttl: 3600,
      },
    };
  }

  const { data: project } = await admin
    .from("projects")
    .select("slug")
    .eq("id", license.project_id)
    .maybeSingle();

  const expiresAt = new Date(license.expires_at as string);
  const graceUntil = new Date(expiresAt);
  graceUntil.setDate(graceUntil.getDate() + (license.grace_days as number));

  const now = Date.now();

  const outcome: VerifyResult["outcome"] =
    license.status === "revoked"
      ? "revoked"
      : now <= expiresAt.getTime()
        ? "active"
        : now <= graceUntil.getTime()
          ? "grace"
          : "expired";

  await admin.from("license_checks").insert({
    license_id: license.id,
    key_prefix: license.key_prefix,
    domain: input.domain,
    ip: input.ip,
    outcome,
  });

  return {
    outcome,
    payload: {
      project: (project?.slug as string) ?? "",
      status: outcome === "revoked" ? "revoked" : outcome,
      expires_at: expiresAt.toISOString(),
      grace_until: graceUntil.toISOString(),
      // 12h de cache: revogacao por inadimplencia vale em ate meio dia, sem
      // transformar o dashboard em dependencia de cada request do site.
      ttl: 12 * 60 * 60,
    },
  };
}
