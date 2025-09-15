"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import toast from "react-hot-toast";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
    <main className="min-h-screen bg-gradient-to-br from-crm-primary/5 via-crm-bg-primary to-crm-accent/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card principal */}
        <div className="crm-card p-6 sm:p-8 backdrop-blur-xl shadow-2xl border-2 border-crm-primary/20">
          {/* Logo optimizado - Tamaño aumentado */}
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="w-28 h-28 sm:w-32 sm:h-32 bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border-3 border-crm-primary/30 p-4 flex items-center justify-center">
                <Image
                  src="/logo-amersur.png"
                  alt="AMERSUR"
                  width={120}
                  height={120}
                  className="w-full h-full object-contain"
                  priority
                />
              </div>
              {/* Efecto de resplandor más intenso */}
              <div className="absolute inset-0 bg-crm-primary/30 rounded-3xl blur-xl -z-10"></div>
              <div className="absolute inset-0 bg-crm-primary/10 rounded-3xl blur-2xl -z-20"></div>
            </div>
          </div>

          {/* Título */}
          <div className="text-center mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-crm-text-primary mb-2">
              Bienvenido
            </h1>
            <p className="text-crm-text-secondary text-sm sm:text-base">
              Inicia sesión en tu cuenta
            </p>
          </div>

          {/* Formulario */}
          <form onSubmit={onSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-crm-text-primary mb-2">
                Correo electrónico
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-crm-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </div>
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={pending}
                  className="w-full pl-10 pr-4 py-3 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary placeholder-crm-text-muted focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-crm-primary transition-all duration-200"
                />
              </div>
            </div>

            {/* Contraseña */}
            <div>
              <label className="block text-sm font-medium text-crm-text-primary mb-2">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-crm-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Tu contraseña"
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  disabled={pending}
                  className="w-full pl-10 pr-12 py-3 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary placeholder-crm-text-muted focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-crm-primary transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-crm-text-muted hover:text-crm-text-secondary transition-colors"
                >
                  {showPassword ? (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Botón de login */}
            <button
              type="submit"
              disabled={pending}
              className="w-full crm-button-primary py-3 px-4 rounded-lg font-medium text-white shadow-crm-lg hover:shadow-crm-xl focus:outline-none focus:ring-2 focus:ring-crm-primary focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {pending ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Iniciando sesión...</span>
                </div>
              ) : (
                "Iniciar Sesión"
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-xs text-crm-text-muted">
              © 2024 AMERSUR CRM. Tu Propiedad, sin fronteras.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
