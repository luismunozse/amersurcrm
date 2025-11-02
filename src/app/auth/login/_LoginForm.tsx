"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import toast from "react-hot-toast";

type LoginType = "admin" | "vendedor";

interface FormErrors {
  username?: string;
  dni?: string;
  pass?: string;
}

export default function LoginForm() {
  const router = useRouter();
  const [loginType, setLoginType] = useState<LoginType>("admin");
  const [username, setUsername] = useState("");
  const [dni, setDni] = useState("");
  const [pass, setPass] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [attempts, setAttempts] = useState(0);
  const [lockUntil, setLockUntil] = useState<number | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetDni, setResetDni] = useState("");
  const [resetPending, setResetPending] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const resetInputRef = useRef<HTMLInputElement>(null);

  const remainingLockSeconds = useMemo(() => {
    if (!lockUntil) return 0;
    const diff = Math.ceil((lockUntil - Date.now()) / 1000);
    return diff > 0 ? diff : 0;
  }, [lockUntil]);

  const validateForm = () => {
    const newErrors: FormErrors = {};

    if (loginType === "admin") {
      if (!username.trim()) {
        newErrors.username = "Ingresa tu usuario";
      } else if (username.trim().length < 3) {
        newErrors.username = "Debe tener al menos 3 caracteres";
      }
    } else {
      const dniValue = dni.trim();
      if (!dniValue) {
        newErrors.dni = "Ingresa tu DNI";
      } else if (!/^\d{8}$/.test(dniValue)) {
        newErrors.dni = "El DNI debe tener 8 dígitos numéricos";
      }
    }

    if (!pass) {
      newErrors.pass = "Ingresa tu contraseña";
    } else if (pass.length < 6) {
      newErrors.pass = "Debe tener al menos 6 caracteres";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetSensitiveData = () => {
    setPass("");
    setShowPassword(false);
  };

  const reportLoginAttempt = useCallback(
    async (success: boolean, errorMessage?: string) => {
      const identifier =
        loginType === "admin" ? username.trim() : dni.trim();

      if (!identifier) return;

      try {
        await fetch("/api/auth/login-audit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            identifier,
            loginType,
            success,
            errorMessage: errorMessage ?? null,
            stage: "authentication",
            metadata: {
              source: "login_form",
            },
          }),
        });
      } catch (logError) {
        console.warn("No se pudo registrar el intento de login:", logError);
      }
    },
    [loginType, username, dni]
  );


  const handleOpenResetModal = useCallback(() => {
    setResetDni(loginType === "vendedor" ? dni.trim() : "");
    setResetError(null);
    setShowResetModal(true);
  }, [loginType, dni]);

  const closeResetModal = useCallback(() => {
    setShowResetModal(false);
    setResetPending(false);
    setResetError(null);
    setResetDni("");
  }, []);

  useEffect(() => {
    if (!showResetModal) return;

    const timer = window.setTimeout(() => {
      resetInputRef.current?.focus();
    }, 60);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeResetModal();
      }
    };

    document.documentElement.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", handleKeyDown);
      document.documentElement.style.overflow = "";
    };
  }, [showResetModal, closeResetModal]);

  const handleResetRequestSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (resetPending) return;

      const dniValue = resetDni.trim();
      if (!/^\d{8}$/.test(dniValue)) {
        const message = "El DNI debe tener exactamente 8 dígitos numéricos.";
        setResetError(message);
        toast.error(message);
        return;
      }

      setResetPending(true);
      setResetError(null);

      try {
        const controller = new AbortController();
        const response = await fetch("/api/auth/reset-request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dni: dniValue }),
          signal: controller.signal,
        });

        const result = await response.json();

        if (!response.ok) {
          const message = result.error || "No se pudo enviar la solicitud.";
          setResetError(message);
          toast.error(message);
          return;
        }

        toast.success(result.message || "Solicitud enviada al administrador.");
        closeResetModal();
      } catch (error) {
        console.error("Error enviando solicitud de reseteo:", error);
        setResetError("No se pudo enviar la solicitud. Intenta nuevamente.");
        toast.error("No se pudo enviar la solicitud. Intenta nuevamente.");
      } finally {
        setResetPending(false);
      }
    },
    [resetDni, resetPending, closeResetModal]
  );

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (lockUntil && Date.now() < lockUntil) {
      toast.error(`Demasiados intentos fallidos. Intenta de nuevo en ${remainingLockSeconds}s.`);
      return;
    }

    if (!validateForm()) return;

    setPending(true);
    const supabase = supabaseBrowser();

    try {
      try {
        await supabase.auth.signOut({ scope: "local" });
      } catch (signOutBeforeLoginError) {
        console.warn("No se pudo limpiar la sesión previa antes del login:", signOutBeforeLoginError);
      }

      if (loginType === "admin") {
        const response = await fetch("/api/auth/login-username", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: username.trim(), password: pass }),
        });

        const result = await response.json();
        if (!response.ok) {
          toast.error(result.error || "Usuario no encontrado");
          setAttempts((prev) => prev + 1);
          void reportLoginAttempt(false, result.error || "lookup_failed");
          return;
        }

        const { data, error } = await supabase.auth.signInWithPassword({
          email: result.email,
          password: pass,
        });

        if (error || !data.user) {
          const authErrorMessage = error?.message || "password_mismatch";
          toast.error("Contraseña incorrecta");
          setAttempts((prev) => prev + 1);
          void reportLoginAttempt(false, authErrorMessage);
          return;
        }

        toast.success("¡Login exitoso!");
        resetSensitiveData();
        setAttempts(0);
        void reportLoginAttempt(true);
        router.replace("/dashboard");
      } else {
        const response = await fetch("/api/auth/login-dni", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dni: dni.trim(), password: pass }),
        });

        const result = await response.json();
        if (!response.ok) {
          toast.error(result.error || "Credenciales inválidas");
          setAttempts((prev) => prev + 1);
          void reportLoginAttempt(false, result.error || "lookup_failed");
          return;
        }

        const { data, error } = await supabase.auth.signInWithPassword({
          email: result.email,
          password: pass,
        });

        if (error || !data.user) {
          const authErrorMessage = error?.message || "password_mismatch";
          toast.error("Credenciales inválidas");
          setAttempts((prev) => prev + 1);
          void reportLoginAttempt(false, authErrorMessage);
          return;
        }

        toast.success("¡Login exitoso!");
        resetSensitiveData();
        setAttempts(0);
        void reportLoginAttempt(true);
        router.replace("/dashboard/vendedor");
      }
    } catch (error) {
      console.error("Error inesperado durante el login:", error);
      toast.error("Ocurrió un error inesperado. Intenta nuevamente.");
      setAttempts((prev) => prev + 1);
      const unexpectedMessage =
        error instanceof Error ? error.message : "unexpected_error";
      void reportLoginAttempt(false, unexpectedMessage);
    } finally {
      setPending(false);
    }
  };

  useEffect(() => {
    if (attempts >= 3) {
      setLockUntil(Date.now() + 30_000);
      setAttempts(0);
      toast.error("Demasiados intentos fallidos. Intenta nuevamente en 30 segundos.");
    }
  }, [attempts]);

  const disableSubmit = pending || (lockUntil !== null && Date.now() < lockUntil);

  return (
    <>
      <main className="min-h-screen bg-gradient-to-br from-crm-primary/5 via-crm-bg-primary to-crm-accent/5 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="crm-card p-6 sm:p-8 rounded-2xl shadow-2xl border-2 border-crm-primary/20">
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="w-32 h-32 sm:w-36 sm:h-36 bg-crm-card rounded-2xl shadow-lg border border-crm-border p-4 flex items-center justify-center transition-all duration-300">
                <Image
                  src="/logo-amersur.png"
                  alt="AMERSUR"
                  width={140}
                  height={140}
                  className="w-full h-full object-contain dark:hidden"
                  priority
                />
                <Image
                  src="/amersur-logo-b.png"
                  alt="AMERSUR"
                  width={140}
                  height={140}
                  className="hidden dark:block w-full h-full object-contain"
                  priority
                />
              </div>
              <div className="absolute inset-0 bg-crm-primary/20 rounded-2xl blur-xl -z-10" aria-hidden />
              <div className="absolute inset-0 bg-crm-primary/10 rounded-2xl blur-2xl -z-20" aria-hidden />
            </div>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-crm-text-primary mb-3">
              Bienvenido
            </h1>
            <p className="text-crm-text-secondary text-sm sm:text-base">
              Inicia sesión para continuar
            </p>
          </div>

          <div className="mb-6" role="tablist" aria-label="Tipo de usuario">
            <div className="flex bg-crm-card-hover rounded-xl p-1.5 gap-1">
              <button
                type="button"
                onClick={() => setLoginType("admin")}
                className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crm-primary ${
                  loginType === "admin"
                    ? "crm-button-primary text-white shadow-crm-lg"
                    : "text-crm-text-secondary hover:text-crm-text-primary"
                }`}
                aria-pressed={loginType === "admin"}
              >
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Administrador
                </span>
              </button>
              <button
                type="button"
                onClick={() => setLoginType("vendedor")}
                className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crm-primary ${
                  loginType === "vendedor"
                    ? "crm-button-primary text-white shadow-crm-lg"
                    : "text-crm-text-secondary hover:text-crm-text-primary"
                }`}
                aria-pressed={loginType === "vendedor"}
              >
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Vendedor
                </span>
              </button>
            </div>
          </div>

          <form onSubmit={onSubmit} className="space-y-5" noValidate>
            <div>
              <label className="block text-sm font-semibold text-crm-text-primary mb-2">
                {loginType === "admin" ? "Usuario" : "DNI"}
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  {loginType === "admin" ? (
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
                  inputMode={loginType === "admin" ? "text" : "numeric"}
                  autoComplete={loginType === "admin" ? "username" : "off"}
                  placeholder={loginType === "admin" ? "Ingresa tu usuario" : "Ingresa tu DNI"}
                  value={loginType === "admin" ? username : dni}
                  onChange={(event) => {
                    if (loginType === "admin") {
                      setUsername(event.target.value);
                    } else {
                      setDni(event.target.value);
                    }
                  }}
                  disabled={pending}
                  className="w-full pl-12 pr-4 py-3.5 border border-crm-border rounded-xl bg-crm-card text-crm-text-primary placeholder-crm-text-muted focus:ring-2 focus:ring-crm-primary focus:border-crm-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crm-primary transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-invalid={Boolean(loginType === "admin" ? errors.username : errors.dni)}
                />
              </div>
              {loginType === "admin" && errors.username && (
                <p className="mt-2 text-sm text-crm-danger">{errors.username}</p>
              )}
              {loginType === "vendedor" && errors.dni && (
                <p className="mt-2 text-sm text-crm-danger">{errors.dni}</p>
              )}
            </div>

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
                  onChange={(event) => setPass(event.target.value)}
                  disabled={pending}
                  className="w-full pl-12 pr-12 py-3.5 border border-crm-border rounded-xl bg-crm-card text-crm-text-primary placeholder-crm-text-muted focus:ring-2 focus:ring-crm-primary focus:border-crm-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crm-primary transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-invalid={Boolean(errors.pass)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-crm-text-muted hover:text-crm-text-secondary transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crm-primary rounded-lg"
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
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
              {errors.pass && (
                <p className="mt-2 text-sm text-crm-danger">{errors.pass}</p>
              )}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleOpenResetModal}
                className="inline-flex items-center gap-2 rounded-lg border border-crm-primary/40 px-3 py-1.5 text-xs font-semibold text-crm-primary hover:bg-crm-primary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crm-primary transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11v6m0-10v.01M5.07 19H18.93A1.07 1.07 0 0020 17.93L12.54 4.4a1.07 1.07 0 00-1.88 0L4 17.93A1.07 1.07 0 005.07 19z" />
                </svg>
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            <button
              type="submit"
              disabled={disableSubmit}
              className="w-full crm-button-primary py-3.5 px-4 rounded-xl font-semibold shadow-crm-lg hover:shadow-crm-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crm-primary focus-visible:ring-2 focus-visible:ring-crm-primary focus-visible:ring-offset-2 focus-visible:ring-offset-crm-bg-primary transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5 active:translate-y-0"
            >
              {pending ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" aria-hidden />
                  Iniciando sesión...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  {lockUntil && Date.now() < lockUntil ? `Bloqueado (${remainingLockSeconds}s)` : "Iniciar Sesión"}
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
              )}
            </button>
          </form>

          <div className="mt-8 text-center space-y-2 text-xs text-crm-text-muted">
            <div className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Conexión segura
            </div>
            <p>© 2025 AMERSUR CRM · Tu Propiedad, sin fronteras</p>
            <p>
              ¿Necesitas ayuda?{" "}
              <Link href="/dashboard/ayuda" className="text-crm-primary hover:text-crm-primary/80">
                Centro de soporte
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>

    {showResetModal && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reset-dialog-title"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            closeResetModal();
          }
        }}
      >
        <div
          className="w-full max-w-md rounded-2xl border border-crm-border bg-crm-card p-6 shadow-2xl"
          onMouseDown={(event) => event.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="reset-dialog-title" className="text-xl font-semibold text-crm-text-primary">
                Solicitar blanqueo de contraseña
              </h2>
              <p className="mt-1 text-sm text-crm-text-secondary">
                Ingresa tu DNI y enviaremos la solicitud al administrador para que restablezca tu acceso.
              </p>
            </div>
            <button
              type="button"
              onClick={closeResetModal}
              className="rounded-lg p-1.5 text-crm-text-muted hover:text-crm-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crm-primary transition-colors"
              aria-label="Cerrar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleResetRequestSubmit} className="mt-6 space-y-5" noValidate>
            <div>
              <label htmlFor="reset-dni" className="block text-sm font-semibold text-crm-text-primary mb-2">
                DNI del usuario
              </label>
              <input
                id="reset-dni"
                ref={resetInputRef}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="Ingresa tu DNI (8 dígitos)"
                value={resetDni}
                onChange={(event) => {
                  const value = event.target.value.replace(/\D/g, "");
                  setResetDni(value);
                  setResetError(null);
                }}
                maxLength={8}
                disabled={resetPending}
                className="w-full px-4 py-3 border border-crm-border rounded-xl bg-crm-card text-crm-text-primary placeholder-crm-text-muted focus:ring-2 focus:ring-crm-primary focus:border-crm-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crm-primary transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                aria-invalid={Boolean(resetError)}
                aria-describedby={resetError ? "reset-dni-error" : undefined}
              />
              <p className="mt-2 text-xs text-crm-text-muted">
                Recibirás la confirmación cuando el administrador complete el blanqueo.
              </p>
              {resetError && (
                <p id="reset-dni-error" className="mt-2 text-sm text-crm-danger">
                  {resetError}
                </p>
              )}
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
              <button
                type="button"
                onClick={closeResetModal}
                className="inline-flex items-center justify-center rounded-lg border border-crm-border px-4 py-2.5 text-sm font-semibold text-crm-text-secondary hover:text-crm-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crm-primary transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={resetPending}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-crm-primary px-4 py-2.5 text-sm font-semibold text-white shadow-crm-lg hover:bg-crm-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crm-primary transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {resetPending ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden />
                    Enviando...
                  </>
                ) : (
                  "Enviar solicitud"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
    </>
  );
}
