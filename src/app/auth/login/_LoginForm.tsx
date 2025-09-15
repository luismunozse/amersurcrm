"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import toast from "react-hot-toast";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [pending, setPending] = useState(false);
  const router = useRouter();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    
    try {
      const s = supabaseBrowser();
      console.log("Intentando login con:", email);
      
      const { data, error } = await s.auth.signInWithPassword({ 
        email: email.trim(), 
        password: pass 
      });
      
      console.log("Respuesta de Supabase:", { data, error });
      
      if (error) {
        console.error("Error de autenticación:", error);
        toast.error(`Error: ${error.message}`);
        setPending(false);
        return;
      }
      
      if (data.user) {
        console.log("Login exitoso, redirigiendo...");
        toast.success("¡Login exitoso!");
        router.replace("/dashboard");
      } else {
        console.error("No se recibió usuario");
        toast.error("Error: No se pudo autenticar");
        setPending(false);
      }
    } catch (err) {
      console.error("Error inesperado:", err);
      toast.error("Error inesperado durante el login");
      setPending(false);
    }
  };

  return (
    <main className="min-h-dvh grid place-items-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-3 border p-6 rounded-xl">
        <h1 className="text-xl font-semibold">Iniciar sesión</h1>
        <input
          className="w-full border p-2 rounded"
          type="email" autoComplete="email" placeholder="Email"
          value={email} onChange={(e)=>setEmail(e.target.value)} disabled={pending}
        />
        <input
          className="w-full border p-2 rounded"
          type="password" autoComplete="current-password" placeholder="Password"
          value={pass} onChange={(e)=>setPass(e.target.value)} disabled={pending}
        />
        <button className="w-full bg-black text-white py-2 rounded" disabled={pending}>
          {pending ? "Ingresando..." : "Entrar"}
        </button>
      </form>
    </main>
  );
}
