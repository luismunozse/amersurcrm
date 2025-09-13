"use client";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  const doLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    const supabase = supabaseBrowser();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: pass,
    });
    if (error) return setErr(error.message);
    router.replace("/"); // al dashboard
  };

  return (
    <main className="min-h-dvh grid place-items-center p-6">
      <form onSubmit={doLogin} className="w-full max-w-sm space-y-3 border p-6 rounded-xl">
        <h1 className="text-xl font-semibold">Iniciar sesión</h1>
        <input className="w-full border p-2 rounded"
               placeholder="Email" type="email"
               value={email} onChange={e=>setEmail(e.target.value)} />
        <input className="w-full border p-2 rounded"
               placeholder="Password" type="password"
               value={pass} onChange={e=>setPass(e.target.value)} />
        {err && <p className="text-red-600 text-sm">{err}</p>}
        <button className="w-full bg-black text-white py-2 rounded">Entrar</button>
      </form>
    </main>
  );
}
