import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

export async function POST() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (n) => cookieStore.get(n)?.value,
        set: (n, v, o) => { try { cookieStore.set({ name: n, value: v, ...o }); } catch {} },
        remove: (n, o) => { try { cookieStore.set({ name: n, value: "", ...o, maxAge: 0 }); } catch {} },
      },
      db: { schema: "crm" },
    }
  );

  await supabase.auth.signOut();

  // Redirige a /auth/login
  return NextResponse.redirect(new URL("/auth/login", process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"));
}
