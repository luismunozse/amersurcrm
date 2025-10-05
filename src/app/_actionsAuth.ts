"use server";

import { redirect, RedirectType } from "next/navigation";
import { createServerActionClient } from "@/lib/supabase.server-actions";

export async function signOut() {
  const s = await createServerActionClient();
  await s.auth.signOut();
  redirect("/auth/login", RedirectType.replace);
}
