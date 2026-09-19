"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import {
  projectSchema,
  type ProjectInput,
  type ProjectValues,
} from "@/schemas/project";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  FieldError,
  Input,
  Label,
  Select,
  Textarea,
} from "@/components/ui/primitives";
import { slugify } from "@/lib/utils";

import { createProjectAction, updateProjectAction } from "./actions";
import type { AccountSummary, ProjectSummary } from "./types";

type Props = {
  project?: ProjectSummary;
  vercelAccounts: AccountSummary[];
  supabaseAccounts: AccountSummary[];
};

/**
 * Mesmo schema Zod do Server Action: feedback imediato no client, e o servidor
 * revalida tudo de novo antes de escrever.
 */
export function ProjectForm({
  project,
  vercelAccounts,
  supabaseAccounts,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const isEdit = Boolean(project);

  // Conta desativada some da lista, mas continua visivel quando o projeto ja
  // aponta para ela: escondê-la faria a edicao trocar o vinculo em silencio.
  const selectableVercel = vercelAccounts.filter(
    (account) => account.is_active || account.id === project?.vercel_account_id,
  );
  const selectableSupabase = supabaseAccounts.filter(
    (account) => account.is_active || account.id === project?.supabase_account_id,
  );

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors },
    // O schema transforma "" em null e a data em ISO, entao o tipo de entrada do
    // formulario e o de saida do submit sao diferentes — dai os tres genericos.
  } = useForm<ProjectInput, unknown, ProjectValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: project?.name ?? "",
      slug: project?.slug ?? "",
      description: project?.description ?? "",
      public_url: project?.public_url ?? "",
      health_url: project?.health_url ?? "",
      vercel_account_id: project?.vercel_account_id ?? "",
      vercel_project_id: project?.vercel_project_id ?? "",
      supabase_account_id: project?.supabase_account_id ?? "",
      supabase_project_ref: project?.supabase_project_ref ?? "",
      supabase_url: project?.supabase_url ?? "",
      supabase_anon_key: "",
      database_url: "",
      database_host: project?.database_host ?? "",
      database_name: project?.database_name ?? "",
      license_email: project?.license_email ?? "",
      license_expires_at: project?.license_expires_at
        ? project.license_expires_at.slice(0, 10)
        : "",
      is_active: project?.is_active ?? true,
    },
  });

  function onSubmit(values: ProjectValues) {
    setServerError(null);
    const formData = new FormData();
    for (const [key, value] of Object.entries(values)) {
      if (key === "is_active") {
        if (value) formData.set("is_active", "on");
        continue;
      }
      formData.set(key, value == null ? "" : String(value));
    }

    startTransition(async () => {
      const result = project
        ? await updateProjectAction(project.id, { ok: false, error: null }, formData)
        : await createProjectAction({ ok: false, error: null }, formData);

      if (!result.ok) {
        setServerError(result.error);
        toast.error(result.error ?? "Falha ao salvar");
        return;
      }

      toast.success(isEdit ? "Projeto atualizado" : "Projeto criado");
      router.push("/dashboard");
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      autoComplete="off"
      className="space-y-6"
    >
      <Card>
        <CardHeader>
          <CardTitle>Identificacao</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              {...register("name", {
                onBlur: () => {
                  if (!getValues("slug")) {
                    setValue("slug", slugify(getValues("name") ?? ""));
                  }
                },
              })}
            />
            <FieldError message={errors.name?.message} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="slug">Slug</Label>
            <Input id="slug" {...register("slug")} />
            <FieldError message={errors.slug?.message} />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="description">Descricao</Label>
            <Textarea id="description" {...register("description")} />
            <FieldError message={errors.description?.message} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="public_url">URL publica</Label>
            <Input
              id="public_url"
              placeholder="https://meu-app.vercel.app"
              {...register("public_url")}
            />
            <FieldError message={errors.public_url?.message} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="health_url">URL de health check</Label>
            <Input
              id="health_url"
              placeholder="https://meu-app.vercel.app/api/health"
              {...register("health_url")}
            />
            <FieldError message={errors.health_url?.message} />
          </div>

          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-zinc-700 bg-zinc-950"
              {...register("is_active")}
            />
            Projeto ativo (entra no monitoramento)
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vercel</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="vercel_account_id">Conta</Label>
            <Select id="vercel_account_id" {...register("vercel_account_id")}>
              <option value="">— nenhuma —</option>
              {selectableVercel.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.label}
                  {account.is_active ? "" : " (inativa)"}
                </option>
              ))}
            </Select>
            <FieldError message={errors.vercel_account_id?.message} />
            {selectableVercel.length === 0 ? (
              <p className="text-xs text-amber-300/80">
                Nenhuma conta Vercel ativa. Cadastre uma em Contas para ler o
                estado dos deployments.
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="vercel_project_id">Project ID</Label>
            <Input
              id="vercel_project_id"
              placeholder="prj_..."
              {...register("vercel_project_id")}
            />
            <FieldError message={errors.vercel_project_id?.message} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Supabase e banco</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="supabase_account_id">Conta</Label>
            <Select id="supabase_account_id" {...register("supabase_account_id")}>
              <option value="">— nenhuma —</option>
              {selectableSupabase.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.label}
                  {account.is_active ? "" : " (inativa)"}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="supabase_project_ref">Project ref</Label>
            <Input id="supabase_project_ref" {...register("supabase_project_ref")} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="supabase_url">URL do projeto</Label>
            <Input
              id="supabase_url"
              placeholder="https://xxxx.supabase.co"
              {...register("supabase_url")}
            />
            <FieldError message={errors.supabase_url?.message} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="supabase_anon_key">Anon key</Label>
            <Input
              id="supabase_anon_key"
              type="password"
              autoComplete="new-password"
              placeholder={
                project?.has_supabase_anon_key
                  ? "guardada — preencha so para substituir"
                  : "eyJ..."
              }
              {...register("supabase_anon_key")}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="database_host">Host do banco</Label>
            <Input id="database_host" {...register("database_host")} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="database_name">Nome do banco</Label>
            <Input id="database_name" {...register("database_name")} />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="database_url">DATABASE_URL</Label>
            <Input
              id="database_url"
              type="password"
              autoComplete="new-password"
              placeholder={
                project?.has_database_url
                  ? "guardada — preencha so para substituir"
                  : "postgresql://..."
              }
              {...register("database_url")}
            />
            <p className="text-xs text-zinc-500">
              Guardada cifrada com AES-256-GCM. Some da tela depois de salva.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Licenca</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="license_email">E-mail do titular</Label>
            <Input id="license_email" {...register("license_email")} />
            <FieldError message={errors.license_email?.message} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="license_expires_at">Expira em</Label>
            <Input
              id="license_expires_at"
              type="date"
              {...register("license_expires_at")}
            />
            <FieldError message={errors.license_expires_at?.message} />
          </div>
        </CardContent>
      </Card>

      {serverError ? (
        <p className="text-sm text-red-400">{serverError}</p>
      ) : null}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : isEdit ? "Salvar alteracoes" : "Criar projeto"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.back()}
          disabled={pending}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
