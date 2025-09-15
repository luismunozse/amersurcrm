/* "use client";
import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";

const supabase = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    const { error } = await supabase().auth.signInWithPassword({ email, password: pass });
    if (error) return setErr(error.message);
    router.replace("/"); // al dashboard
  };

  return (
    <main className="min-h-dvh grid place-items-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-3 border p-6 rounded-xl">
        <h1 className="text-xl font-semibold">Iniciar sesión</h1>
        <input className="w-full border p-2 rounded" placeholder="Email"
               value={email} onChange={e=>setEmail(e.target.value)} />
        <input className="w-full border p-2 rounded" placeholder="Password" type="password"
               value={pass} onChange={e=>setPass(e.target.value)} />
        {err && <p className="text-red-600 text-sm">{err}</p>}
        <button className="w-full bg-black text-white py-2 rounded">Entrar</button>
      </form>
    </main>
  );
}
 */

// src/app/auth/login/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { redirect } from "next/navigation";
import { createServerOnlyClient } from "@/lib/supabase.server";
import LoginForm from "./_LoginForm";

export default async function LoginPage() {
  const s = await createServerOnlyClient();
  const { data: { user } } = await s.auth.getUser();
  if (user) redirect("/dashboard"); // ya logueado → al dashboard
  return <LoginForm />;             // si no, mostramos el form
}
