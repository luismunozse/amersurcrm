"use client";
import { createBrowserClient } from "@supabase/ssr";
export function supabaseBrowser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Faltan envs de Supabase");
  return createBrowserClient(url, key, { db: { schema: "crm" } });
}
