"use server";

import { revalidatePath } from "next/cache";

import { projectSchema, revealSchema } from "@/schemas/project";
import {
  createProject,
  deleteProject,
  revealProjectSecret,
  updateProject,
} from "@/features/projects/projects.service";
import { checkProject } from "@/features/monitoring/monitoring.service";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Server Actions dos projetos. O mesmo schema Zod do formulario e revalidado
 * aqui antes de qualquer escrita — o servidor nao confia no client.
 */

export type ActionState = {
  ok: boolean;
  error: string | null;
  fieldErrors?: Record<string, string[]>;
};

const OK: ActionState = { ok: true, error: null };

function fail(error: string): ActionState {
  return { ok: false, error };
}

function parseForm(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  return projectSchema.safeParse({
    ...raw,
    is_active: formData.get("is_active") === "on",
  });
}

function toMessage(error: unknown): string {
  if (error instanceof Error && error.message === "NAO_AUTORIZADO") {
    return "Sessao expirada ou e-mail sem acesso.";
  }
  return error instanceof Error ? error.message : "Falha inesperada.";
}

export async function createProjectAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Confira os campos destacados.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<
        string,
        string[]
      >,
    };
  }

  try {
    await createProject(parsed.data);
  } catch (error) {
    return fail(toMessage(error));
  }

  revalidatePath("/dashboard");
  return OK;
}

export async function updateProjectAction(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Confira os campos destacados.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<
        string,
        string[]
      >,
    };
  }

  try {
    await updateProject(id, parsed.data);
  } catch (error) {
    return fail(toMessage(error));
  }

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/projects/${id}`);
  return OK;
}

export async function deleteProjectAction(id: string): Promise<ActionState> {
  try {
    await deleteProject(id);
  } catch (error) {
    return fail(toMessage(error));
  }

  revalidatePath("/dashboard");
  return OK;
}

/** Revela um segredo por vez. O valor volta so para quem pediu e fica auditado. */
export async function revealSecretAction(
  projectId: string,
  field: string,
): Promise<{ ok: boolean; value?: string; error?: string }> {
  const parsed = revealSchema.safeParse({ field });
  if (!parsed.success) return { ok: false, error: "Campo invalido." };

  try {
    const value = await revealProjectSecret(projectId, parsed.data.field);
    return { ok: true, value };
  } catch (error) {
    return { ok: false, error: toMessage(error) };
  }
}

/** Verificacao sob demanda, disparada pelo botao de refresh do card. */
export async function refreshProjectStatusAction(
  projectId: string,
): Promise<ActionState> {
  try {
    await requireUser();
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("projects")
      .select(
        "id, name, health_url, public_url, vercel_project_id, vercel_account_id",
      )
      .eq("id", projectId)
      .maybeSingle();

    if (error || !data) return fail("Projeto nao encontrado.");

    await checkProject({
      id: data.id as string,
      name: data.name as string,
      health_url: data.health_url as string | null,
      public_url: data.public_url as string | null,
      vercel_project_id: data.vercel_project_id as string | null,
      vercel_account_id: data.vercel_account_id as string | null,
    });
  } catch (error) {
    return fail(toMessage(error));
  }

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/projects/${projectId}`);
  return OK;
}
