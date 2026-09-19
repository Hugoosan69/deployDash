/**
 * Configuracao ausente explica o que falta em vez de derrubar o app com 500.
 * Nada aqui lanca no import: as telas consultam o estado e mostram o que fazer,
 * e /api/health devolve a mesma leitura para deploy novo e maquina nova.
 */

type EnvVar = {
  name: string;
  scope: "server" | "public";
  required: boolean;
  hint: string;
};

const ENV_VARS: EnvVar[] = [
  {
    name: "NEXT_PUBLIC_SUPABASE_URL",
    scope: "public",
    required: true,
    hint: "URL do projeto Supabase central (Settings > API).",
  },
  {
    name: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    scope: "public",
    required: true,
    hint: "Chave anon do projeto Supabase central.",
  },
  {
    name: "SUPABASE_SERVICE_ROLE_KEY",
    scope: "server",
    required: true,
    hint: "Service role do Supabase. Nunca com prefixo NEXT_PUBLIC_.",
  },
  {
    name: "ENCRYPTION_MASTER_KEY",
    scope: "server",
    required: true,
    hint: '64 caracteres hex. Gere com: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
  },
  {
    name: "CRON_SECRET",
    scope: "server",
    required: false,
    hint: "Segredo exigido por /api/cron/check-status. Sem ele o cron fica desligado.",
  },
  {
    name: "RESEND_API_KEY",
    scope: "server",
    required: false,
    hint: "Envio dos avisos de licenca. Sem ele o alerta so aparece no dashboard.",
  },
  {
    name: "ALERT_EMAIL_TO",
    scope: "server",
    required: false,
    hint: "Destinatario dos avisos de licenca.",
  },
  {
    name: "ALERT_EMAIL_FROM",
    scope: "server",
    required: false,
    hint: "Remetente verificado no Resend.",
  },
];

export type EnvIssue = { name: string; hint: string };

export type EnvStatus = {
  ok: boolean;
  missingRequired: EnvIssue[];
  missingOptional: EnvIssue[];
};

function read(name: string): string | undefined {
  // Variaveis NEXT_PUBLIC_ precisam ser lidas literalmente para o bundler substituir.
  switch (name) {
    case "NEXT_PUBLIC_SUPABASE_URL":
      return process.env.NEXT_PUBLIC_SUPABASE_URL;
    case "NEXT_PUBLIC_SUPABASE_ANON_KEY":
      return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    default:
      return process.env[name];
  }
}

export function checkEnv(): EnvStatus {
  const missingRequired: EnvIssue[] = [];
  const missingOptional: EnvIssue[] = [];

  for (const variable of ENV_VARS) {
    const value = read(variable.name)?.trim();
    if (value) continue;
    const issue = { name: variable.name, hint: variable.hint };
    if (variable.required) missingRequired.push(issue);
    else missingOptional.push(issue);
  }

  if (
    process.env.ENCRYPTION_MASTER_KEY &&
    !/^[0-9a-fA-F]{64}$/.test(process.env.ENCRYPTION_MASTER_KEY.trim())
  ) {
    missingRequired.push({
      name: "ENCRYPTION_MASTER_KEY",
      hint: "Definida, mas nao tem 64 caracteres hex — a criptografia vai falhar.",
    });
  }

  return {
    ok: missingRequired.length === 0,
    missingRequired,
    missingOptional,
  };
}

/** Le uma env obrigatoria ja validada. So chamar depois de checkEnv().ok. */
export function requireEnv(name: string): string {
  const value = read(name)?.trim();
  if (!value) throw new Error(`${name} ausente`);
  return value;
}

export function optionalEnv(name: string): string | null {
  return read(name)?.trim() || null;
}
