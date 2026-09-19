import { z } from "zod";

/**
 * Fonte unica de verdade por campo: este schema alimenta o React Hook Form e e
 * revalidado dentro do Server Action antes de tocar o banco.
 */

const optionalText = z
  .string()
  .trim()
  .max(500)
  .optional()
  .transform((value) => (value ? value : null));

const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .optional()
  .refine((value) => !value || /^https?:\/\//.test(value), {
    message: "Precisa comecar com http:// ou https://",
  })
  .transform((value) => (value ? value : null));

const optionalSecret = z
  .string()
  .trim()
  .max(4000)
  .optional()
  .transform((value) => (value ? value : null));

const optionalUuid = z
  .string()
  .trim()
  .optional()
  .refine((value) => !value || z.string().uuid().safeParse(value).success, {
    message: "Conta invalida",
  })
  .transform((value) => (value ? value : null));

export const projectSchema = z.object({
  name: z.string().trim().min(2, "Nome muito curto").max(120),
  slug: z
    .string()
    .trim()
    .min(2, "Slug muito curto")
    .max(120)
    .regex(/^[a-z0-9-]+$/, "Use apenas minusculas, numeros e hifen"),
  description: optionalText,

  public_url: optionalUrl,
  health_url: optionalUrl,

  vercel_account_id: optionalUuid,
  vercel_project_id: optionalText,

  supabase_account_id: optionalUuid,
  supabase_project_ref: optionalText,
  supabase_url: optionalUrl,
  // Segredos: vazio na edicao significa "manter o que ja esta cifrado no banco".
  supabase_anon_key: optionalSecret,

  database_url: optionalSecret,
  database_host: optionalText,
  database_name: optionalText,

  license_email: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || z.string().email().safeParse(value).success, {
      message: "E-mail invalido",
    })
    .transform((value) => (value ? value : null)),
  license_expires_at: z
    .string()
    .trim()
    .optional()
    .refine(
      (value) => !value || !Number.isNaN(Date.parse(value)),
      { message: "Data invalida" },
    )
    .transform((value) => (value ? new Date(value).toISOString() : null)),

  is_active: z.boolean().default(true),
});

export type ProjectInput = z.input<typeof projectSchema>;
export type ProjectValues = z.output<typeof projectSchema>;

export const vercelAccountSchema = z.object({
  label: z.string().trim().min(2).max(120),
  // O autofill do navegador ja tentou mandar e-mail nesse campo; o servidor exige
  // o formato real do Team ID em vez de confiar no pattern do input.
  team_id: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || /^team_[A-Za-z0-9]+$/.test(value), {
      message: 'Team ID comeca com "team_". Deixe vazio se for conta pessoal.',
    })
    .transform((value) => (value ? value : null)),
  token: z.string().trim().min(10, "Token invalido"),
});

export const supabaseAccountSchema = z.object({
  label: z.string().trim().min(2).max(120),
  management_token: optionalSecret,
});

/** Campos cujo valor revelado exige registro em audit_logs. */
export const revealableFields = [
  "supabase_anon_key",
  "database_url",
  "vercel_token",
  "supabase_management_token",
] as const;

export type RevealableField = (typeof revealableFields)[number];

export const revealSchema = z.object({
  field: z.enum(revealableFields),
});
