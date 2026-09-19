"use client";

import { createBrowserClient } from "@supabase/ssr";

/** Cliente do browser: so anon key, nunca service role. */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
