import "server-only";

import { createClient } from "@supabase/supabase-js";

import { requireEnv } from "@/lib/env";

/**
 * Cliente com service role: ignora RLS de proposito, entao so pode ser usado
 * dentro de servico de dominio que ja validou quem esta chamando
 * (ver requireUser() em src/lib/auth.ts). Nunca importar de Client Component.
 */
export function createAdminClient() {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}
