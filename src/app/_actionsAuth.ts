"use server";

import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabaseServer";

export async function signOut() {
  const s = await supabaseServer();
  await s.auth.signOut();
  redirect("/auth/login");
}
