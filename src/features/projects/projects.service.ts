import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { encryptOptional, encryptSecret, decryptSecret } from "@/lib/crypto";
import { recordAudit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import type { ProjectValues, RevealableField } from "@/schemas/project";

import type { AccountKind, AccountSummary, ProjectSummary } from "./types";

/**
 * Regra de negocio e autorizacao dos projetos. A UI nunca fala com o banco em
 * escrita: tudo passa por aqui, que valida o usuario antes de usar o service role.
 */

// Colunas lidas do banco. Os *_encrypted entram so para derivar os flags has_*,
// e sao descartados em toSummary() antes de qualquer coisa chegar na UI.
const SELECT_COLUMNS = `
  id, name, slug, description, public_url, health_url,
  vercel_account_id, vercel_project_id,
  supabase_account_id, supabase_project_ref, supabase_url,
  database_host, database_name,
  license_email, license_expires_at,
  status, last_status_check, is_active, created_at, updated_at,
  supabase_anon_key_encrypted, database_url_encrypted
`;

type RawProject = Record<string, unknown> & {
  supabase_anon_key_encrypted?: string | null;
  database_url_encrypted?: string | null;
};

function toSummary(row: RawProject): ProjectSummary {
  const { supabase_anon_key_encrypted, database_url_encrypted, ...rest } = row;

  return {
    ...(rest as unknown as Omit<
      ProjectSummary,
      "has_supabase_anon_key" | "has_database_url"
    >),
    has_supabase_anon_key: Boolean(supabase_anon_key_encrypted),
    has_database_url: Boolean(database_url_encrypted),
  };
}

export async function listProjects(): Promise<ProjectSummary[]> {
  await requireUser();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("projects")
    .select(SELECT_COLUMNS)
    .order("is_active", { ascending: false })
    .order("name");

  if (error) throw new Error(`Falha ao listar projetos: ${error.message}`);
  return (data ?? []).map((row) => toSummary(row as RawProject));
}

export async function getProject(id: string): Promise<ProjectSummary | null> {
  await requireUser();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("projects")
    .select(SELECT_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`Falha ao carregar projeto: ${error.message}`);
  return data ? toSummary(data as RawProject) : null;
}

function toRow(values: ProjectValues) {
  return {
    name: values.name,
    slug: values.slug,
    description: values.description,
    public_url: values.public_url,
    health_url: values.health_url,
    vercel_account_id: values.vercel_account_id,
    vercel_project_id: values.vercel_project_id,
    supabase_account_id: values.supabase_account_id,
    supabase_project_ref: values.supabase_project_ref,
    supabase_url: values.supabase_url,
    database_host: values.database_host,
    database_name: values.database_name,
    license_email: values.license_email,
    license_expires_at: values.license_expires_at,
    is_active: values.is_active,
  };
}

export async function createProject(values: ProjectValues): Promise<string> {
  const user = await requireUser();
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("projects")
    .insert({
      ...toRow(values),
      supabase_anon_key_encrypted: encryptOptional(values.supabase_anon_key),
      database_url_encrypted: encryptOptional(values.database_url),
    })
    .select("id")
    .single();

  if (error) throw new Error(`Falha ao criar projeto: ${error.message}`);

  await recordAudit({
    actorEmail: user.email,
    projectId: data.id as string,
    action: "project.create",
    newValue: { name: values.name, slug: values.slug },
  });

  return data.id as string;
}

export async function updateProject(
  id: string,
  values: ProjectValues,
): Promise<void> {
  const user = await requireUser();
  const admin = createAdminClient();

  const patch: Record<string, unknown> = toRow(values);
  // Campo de segredo vazio na edicao significa "mantem o que ja esta cifrado".
  if (values.supabase_anon_key) {
    patch.supabase_anon_key_encrypted = encryptSecret(values.supabase_anon_key);
  }
  if (values.database_url) {
    patch.database_url_encrypted = encryptSecret(values.database_url);
  }

  const { error } = await admin.from("projects").update(patch).eq("id", id);
  if (error) throw new Error(`Falha ao atualizar projeto: ${error.message}`);

  await recordAudit({
    actorEmail: user.email,
    projectId: id,
    action: "project.update",
    newValue: { name: values.name, slug: values.slug },
  });
}

export async function deleteProject(id: string): Promise<void> {
  const user = await requireUser();
  const admin = createAdminClient();

  const { data } = await admin
    .from("projects")
    .select("name, slug")
    .eq("id", id)
    .maybeSingle();

  const { error } = await admin.from("projects").delete().eq("id", id);
  if (error) throw new Error(`Falha ao remover projeto: ${error.message}`);

  await recordAudit({
    actorEmail: user.email,
    action: "project.delete",
    oldValue: data ?? { id },
  });
}

/**
 * Revela um segredo, um por chamada, sempre deixando rastro em audit_logs.
 * O valor nunca aparece em listagem nem em log de aplicacao.
 */
export async function revealProjectSecret(
  projectId: string,
  field: RevealableField,
): Promise<string> {
  const user = await requireUser();
  const admin = createAdminClient();

  const { data: project, error } = await admin
    .from("projects")
    .select(
      "id, supabase_anon_key_encrypted, database_url_encrypted, vercel_account_id, supabase_account_id",
    )
    .eq("id", projectId)
    .maybeSingle();

  if (error || !project) throw new Error("Projeto nao encontrado");

  let encrypted: string | null = null;

  if (field === "supabase_anon_key") {
    encrypted = project.supabase_anon_key_encrypted;
  } else if (field === "database_url") {
    encrypted = project.database_url_encrypted;
  } else if (field === "vercel_token" && project.vercel_account_id) {
    const { data } = await admin
      .from("vercel_accounts")
      .select("token_encrypted")
      .eq("id", project.vercel_account_id)
      .maybeSingle();
    encrypted = data?.token_encrypted ?? null;
  } else if (
    field === "supabase_management_token" &&
    project.supabase_account_id
  ) {
    const { data } = await admin
      .from("supabase_accounts")
      .select("management_token_encrypted")
      .eq("id", project.supabase_account_id)
      .maybeSingle();
    encrypted = data?.management_token_encrypted ?? null;
  }

  if (!encrypted) throw new Error("Nenhum segredo guardado neste campo");

  await recordAudit({
    actorEmail: user.email,
    projectId,
    action: "secret.reveal",
    target: field,
  });

  return decryptSecret(encrypted);
}

/** Quantos projetos apontam para cada conta, para avisar antes de desativar. */
async function countProjectsByAccount(
  column: "vercel_account_id" | "supabase_account_id",
): Promise<Record<string, number>> {
  const admin = createAdminClient();
  const { data } = await admin.from("projects").select(column);

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const accountId = (row as Record<string, string | null>)[column];
    if (!accountId) continue;
    counts[accountId] = (counts[accountId] ?? 0) + 1;
  }
  return counts;
}

export async function listVercelAccounts(): Promise<AccountSummary[]> {
  await requireUser();
  const admin = createAdminClient();
  const [{ data, error }, counts] = await Promise.all([
    admin
      .from("vercel_accounts")
      .select("id, label, team_id, token_encrypted, is_active, created_at")
      .order("is_active", { ascending: false })
      .order("label"),
    countProjectsByAccount("vercel_account_id"),
  ]);

  if (error) throw new Error(`Falha ao listar contas Vercel: ${error.message}`);
  return (data ?? []).map((row) => ({
    id: row.id as string,
    kind: "vercel" as const,
    label: row.label as string,
    team_id: row.team_id as string | null,
    has_token: Boolean(row.token_encrypted),
    is_active: row.is_active as boolean,
    created_at: row.created_at as string,
    project_count: counts[row.id as string] ?? 0,
  }));
}

export async function listSupabaseAccounts(): Promise<AccountSummary[]> {
  await requireUser();
  const admin = createAdminClient();
  const [{ data, error }, counts] = await Promise.all([
    admin
      .from("supabase_accounts")
      .select("id, label, management_token_encrypted, is_active, created_at")
      .order("is_active", { ascending: false })
      .order("label"),
    countProjectsByAccount("supabase_account_id"),
  ]);

  if (error) throw new Error(`Falha ao listar contas Supabase: ${error.message}`);
  return (data ?? []).map((row) => ({
    id: row.id as string,
    kind: "supabase" as const,
    label: row.label as string,
    has_token: Boolean(row.management_token_encrypted),
    is_active: row.is_active as boolean,
    created_at: row.created_at as string,
    project_count: counts[row.id as string] ?? 0,
  }));
}

const ACCOUNT_TABLE: Record<AccountKind, string> = {
  vercel: "vercel_accounts",
  supabase: "supabase_accounts",
};

/**
 * Liga/desliga uma conta. Desativar nao apaga nada: o token continua cifrado no
 * banco e os projetos mantem o vinculo — a conta so para de ser oferecida em
 * cadastro novo e de ser consultada pelo monitoramento.
 */
export async function setAccountActive(
  kind: AccountKind,
  id: string,
  isActive: boolean,
): Promise<void> {
  const user = await requireUser();
  const admin = createAdminClient();

  const { data, error } = await admin
    .from(ACCOUNT_TABLE[kind])
    .update({ is_active: isActive })
    .eq("id", id)
    .select("label")
    .maybeSingle();

  if (error) throw new Error(`Falha ao atualizar a conta: ${error.message}`);
  if (!data) throw new Error("Conta nao encontrada");

  await recordAudit({
    actorEmail: user.email,
    action: isActive ? "account.activate" : "account.deactivate",
    target: `${kind}:${data.label as string}`,
  });
}

export async function createVercelAccount(values: {
  label: string;
  team_id: string | null;
  token: string;
}): Promise<void> {
  const user = await requireUser();
  const admin = createAdminClient();
  const { error } = await admin.from("vercel_accounts").insert({
    label: values.label,
    team_id: values.team_id,
    token_encrypted: encryptSecret(values.token),
  });
  if (error) throw new Error(`Falha ao salvar conta Vercel: ${error.message}`);

  await recordAudit({
    actorEmail: user.email,
    action: "vercel_account.create",
    newValue: { label: values.label },
  });
}

export async function createSupabaseAccount(values: {
  label: string;
  management_token: string | null;
}): Promise<void> {
  const user = await requireUser();
  const admin = createAdminClient();
  const { error } = await admin.from("supabase_accounts").insert({
    label: values.label,
    management_token_encrypted: encryptOptional(values.management_token),
  });
  if (error) throw new Error(`Falha ao salvar conta Supabase: ${error.message}`);

  await recordAudit({
    actorEmail: user.email,
    action: "supabase_account.create",
    newValue: { label: values.label },
  });
}
