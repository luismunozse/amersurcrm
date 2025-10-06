"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import toast from "react-hot-toast";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export default function CambiarPasswordPage() {
  const [passwordActual, setPasswordActual] = useState("");
  const [passwordNueva, setPasswordNueva] = useState("");
  const [passwordConfirmar, setPasswordConfirmar] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [pending, setPending] = useState(false);
  const router = useRouter();

  const validarPassword = (password: string): { valido: boolean; mensaje?: string } => {
    if (password.length < 8) {
      return { valido: false, mensaje: "La contraseña debe tener al menos 8 caracteres" };
    }
    if (!/[A-Z]/.test(password)) {
      return { valido: false, mensaje: "La contraseña debe contener al menos una mayúscula" };
    }
    if (!/[a-z]/.test(password)) {
      return { valido: false, mensaje: "La contraseña debe contener al menos una minúscula" };
    }
    if (!/[0-9]/.test(password)) {
      return { valido: false, mensaje: "La contraseña debe contener al menos un número" };
    }
    return { valido: true };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validaciones
    if (!passwordActual || !passwordNueva || !passwordConfirmar) {
      toast.error("Todos los campos son obligatorios");
      return;
    }

    if (passwordNueva !== passwordConfirmar) {
      toast.error("Las contraseñas nuevas no coinciden");
      return;
    }

    const validacion = validarPassword(passwordNueva);
    if (!validacion.valido) {
      toast.error(validacion.mensaje || "Contraseña no válida");
      return;
    }

    if (passwordActual === passwordNueva) {
      toast.error("La nueva contraseña debe ser diferente a la actual");
      return;
    }

    setPending(true);

    try {
      // Llamar a la API para cambiar la contraseña
      const response = await fetch('/api/auth/cambiar-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          passwordActual,
          passwordNueva,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || 'Error al cambiar la contraseña');
        setPending(false);
        return;
      }

      if (result.success) {
        toast.success("¡Contraseña actualizada exitosamente!");

        // Redirigir al dashboard después de 1 segundo
        setTimeout(() => {
          router.replace("/dashboard");
        }, 1000);
      }
    } catch (error) {
      console.error("Error al cambiar contraseña:", error);
      toast.error("Error inesperado al cambiar la contraseña");
      setPending(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-crm-primary/5 via-crm-bg-primary to-crm-accent/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="crm-card p-6 sm:p-8 backdrop-blur-xl shadow-2xl border-2 border-crm-primary/20">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border-3 border-crm-primary/30 p-3 flex items-center justify-center">
                <Image
                  src="/logo-amersur.png"
                  alt="AMERSUR"
                  width={80}
                  height={80}
                  className="w-full h-full object-contain"
                  priority
                />
              </div>
              <div className="absolute inset-0 bg-crm-primary/30 rounded-3xl blur-xl -z-10"></div>
            </div>
          </div>

          {/* Título y mensaje */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-crm-text-primary mb-2">
              Cambio de Contraseña Obligatorio
            </h1>
            <p className="text-sm text-crm-text-secondary">
              Por seguridad, debes cambiar tu contraseña temporal antes de continuar
            </p>
          </div>

          {/* Info box */}
          <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="text-sm text-yellow-800 dark:text-yellow-200">
                <p className="font-medium mb-1">Requisitos de seguridad:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Mínimo 8 caracteres</li>
                  <li>Al menos una letra mayúscula</li>
                  <li>Al menos una letra minúscula</li>
                  <li>Al menos un número</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Contraseña actual */}
            <div>
              <label className="block text-sm font-medium text-crm-text-primary mb-2">
                Contraseña Temporal *
              </label>
              <div className="relative">
                <input
                  type={showPasswords ? "text" : "password"}
                  value={passwordActual}
                  onChange={(e) => setPasswordActual(e.target.value)}
                  disabled={pending}
                  placeholder="Ingresa tu contraseña temporal"
                  className="w-full px-4 py-3 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary placeholder-crm-text-muted focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-crm-primary"
                  required
                />
              </div>
            </div>

            {/* Nueva contraseña */}
            <div>
              <label className="block text-sm font-medium text-crm-text-primary mb-2">
                Nueva Contraseña *
              </label>
              <div className="relative">
                <input
                  type={showPasswords ? "text" : "password"}
                  value={passwordNueva}
                  onChange={(e) => setPasswordNueva(e.target.value)}
                  disabled={pending}
                  placeholder="Ingresa tu nueva contraseña"
                  className="w-full px-4 py-3 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary placeholder-crm-text-muted focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-crm-primary"
                  required
                />
              </div>
            </div>

            {/* Confirmar contraseña */}
            <div>
              <label className="block text-sm font-medium text-crm-text-primary mb-2">
                Confirmar Nueva Contraseña *
              </label>
              <div className="relative">
                <input
                  type={showPasswords ? "text" : "password"}
                  value={passwordConfirmar}
                  onChange={(e) => setPasswordConfirmar(e.target.value)}
                  disabled={pending}
                  placeholder="Confirma tu nueva contraseña"
                  className="w-full px-4 py-3 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary placeholder-crm-text-muted focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-crm-primary"
                  required
                />
              </div>
            </div>

            {/* Mostrar contraseñas */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="showPasswords"
                checked={showPasswords}
                onChange={(e) => setShowPasswords(e.target.checked)}
                className="h-4 w-4 text-crm-primary focus:ring-crm-primary border-crm-border rounded"
              />
              <label htmlFor="showPasswords" className="ml-2 text-sm text-crm-text-secondary">
                Mostrar contraseñas
              </label>
            </div>

            {/* Botón */}
            <button
              type="submit"
              disabled={pending}
              className="w-full crm-button-primary py-3 px-4 rounded-lg font-medium text-white shadow-crm-lg hover:shadow-crm-xl focus:outline-none focus:ring-2 focus:ring-crm-primary focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {pending ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Cambiando contraseña...</span>
                </div>
              ) : (
                "Cambiar Contraseña"
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-xs text-crm-text-muted">
              No podrás acceder al sistema hasta que cambies tu contraseña
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
