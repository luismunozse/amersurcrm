"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import toast from "react-hot-toast";

export default function LoginForm() {
  const [loginType, setLoginType] = useState<'admin' | 'vendedor'>('admin');
  const [username, setUsername] = useState("");
  const [dni, setDni] = useState("");
  const [pass, setPass] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const router = useRouter();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    
    try {
      const s = supabaseBrowser();
      
      if (loginType === 'admin') {
        // Login para administradores con username/contraseña
        console.log("Intentando login admin con:", username);

        // Primero convertir el username a email
        const response = await fetch('/api/auth/login-username', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: username.trim(),
            password: pass
          })
        });

        const result = await response.json();

        if (!response.ok) {
          toast.error(result.error || 'Usuario no encontrado');
          setPending(false);
          return;
        }

        if (result.success && result.email) {
          // Realizar el sign-in real con el email obtenido
          const { data, error } = await s.auth.signInWithPassword({
            email: result.email,
            password: pass
          });

          if (error) {
            console.error("Error de autenticación admin:", error);
            toast.error("Contraseña incorrecta");
            setPending(false);
            return;
          }

          if (data.user) {
            console.log("Login admin exitoso, redirigiendo...");
            toast.success("¡Login exitoso!");
            router.replace("/dashboard");
          }
        }
      } else {
        // Login para vendedores con DNI/contraseña
        console.log("Intentando login vendedor con DNI:", dni);
        
        const response = await fetch('/api/auth/login-dni', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            dni: dni.trim(),
            password: pass
          })
        });
        
        const result = await response.json();
        
        if (!response.ok) {
          toast.error(result.error || 'Error de autenticación');
          setPending(false);
          return;
        }
        
        if (result.success && result.email) {
          // Realizar el sign-in real en el cliente para establecer la sesión
          const { data: authData, error: authError } = await s.auth.signInWithPassword({
            email: result.email,
            password: pass
          });

          if (authError || !authData.user) {
            toast.error("Credenciales inválidas");
            setPending(false);
            return;
          }

          console.log("Login vendedor exitoso, redirigiendo a dashboard vendedor...");
          toast.success("¡Login exitoso!");
          router.replace("/dashboard/vendedor");
        }
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
        <div className="crm-card p-6 sm:p-8 rounded-2xl shadow-2xl border-2 border-crm-primary/20">
          {/* Logo optimizado - Con soporte para modo oscuro/claro */}
          <div className="flex justify-center mb-8">
            <div className="relative">
              {/* Contenedor del logo */}
              <div className="w-32 h-32 sm:w-36 sm:h-36 bg-crm-card rounded-2xl shadow-lg border border-crm-border p-4 flex items-center justify-center transition-all duration-300">
                {/* Logo para modo claro */}
                <Image
                  src="/logo-amersur.png"
                  alt="AMERSUR"
                  width={140}
                  height={140}
                  className="w-full h-full object-contain dark:hidden"
                  priority
                />
                {/* Logo para modo oscuro */}
                <Image
                  src="/amersur-logo-b.png"
                  alt="AMERSUR"
                  width={140}
                  height={140}
                  className="w-full h-full object-contain hidden dark:block"
                  priority
                />
              </div>
              {/* Efectos de resplandor */}
              <div className="absolute inset-0 bg-crm-primary/20 rounded-2xl blur-xl -z-10"></div>
              <div className="absolute inset-0 bg-crm-primary/10 rounded-2xl blur-2xl -z-20"></div>
            </div>
          </div>

          {/* Título */}
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-crm-text-primary mb-3">
              Bienvenido
            </h1>
            <p className="text-crm-text-secondary text-sm sm:text-base">
              Inicia sesión para continuar
            </p>
          </div>

          {/* Selector de tipo de usuario */}
          <div className="mb-6">
            <div className="flex bg-crm-card-hover rounded-xl p-1.5 gap-1">
              <button
                type="button"
                onClick={() => setLoginType('admin')}
                className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                  loginType === 'admin'
                    ? 'crm-button-primary text-white shadow-crm-lg'
                    : 'text-crm-text-secondary hover:text-crm-text-primary'
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span>Administrador</span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setLoginType('vendedor')}
                className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                  loginType === 'vendedor'
                    ? 'crm-button-primary text-white shadow-crm-lg'
                    : 'text-crm-text-secondary hover:text-crm-text-primary'
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>Vendedor</span>
                </div>
              </button>
            </div>
          </div>

          {/* Formulario */}
          <form onSubmit={onSubmit} className="space-y-5">
            {/* Campo de usuario o DNI */}
            <div>
              <label className="block text-sm font-semibold text-crm-text-primary mb-2">
                {loginType === 'admin' ? 'Usuario' : 'DNI'}
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  {loginType === 'admin' ? (
                    <svg className="h-5 w-5 text-crm-text-muted group-focus-within:text-crm-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-crm-text-muted group-focus-within:text-crm-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                    </svg>
                  )}
                </div>
                <input
                  type="text"
                  autoComplete={loginType === 'admin' ? 'username' : 'off'}
                  placeholder={loginType === 'admin' ? 'Ingresa tu usuario' : 'Ingresa tu DNI'}
                  value={loginType === 'admin' ? username : dni}
                  onChange={(e) => loginType === 'admin' ? setUsername(e.target.value) : setDni(e.target.value)}
                  disabled={pending}
                  className="w-full pl-12 pr-4 py-3.5 border border-crm-border rounded-xl bg-crm-card text-crm-text-primary placeholder-crm-text-muted focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-crm-primary transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Contraseña */}
            <div>
              <label className="block text-sm font-semibold text-crm-text-primary mb-2">
                Contraseña
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-crm-text-muted group-focus-within:text-crm-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Ingresa tu contraseña"
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  disabled={pending}
                  className="w-full pl-12 pr-12 py-3.5 border border-crm-border rounded-xl bg-crm-card text-crm-text-primary placeholder-crm-text-muted focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-crm-primary transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-crm-text-muted hover:text-crm-text-secondary transition-colors"
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
              className="w-full crm-button-primary py-3.5 px-4 rounded-xl font-semibold shadow-crm-lg hover:shadow-crm-xl focus:outline-none focus:ring-2 focus:ring-crm-primary focus:ring-offset-2 focus:ring-offset-crm-bg-primary transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5 active:translate-y-0"
            >
              {pending ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Iniciando sesión...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <span>Iniciar Sesión</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 text-center space-y-2">
            <div className="flex items-center justify-center space-x-2 text-xs text-crm-text-muted">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>Conexión segura</span>
            </div>
            <p className="text-xs text-crm-text-muted">
              © 2025 AMERSUR CRM · Tu Propiedad, sin fronteras
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
