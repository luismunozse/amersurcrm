"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Check, X } from "lucide-react";

export default function CambiarPasswordPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [passwordActual, setPasswordActual] = useState("");
  const [passwordNueva, setPasswordNueva] = useState("");
  const [passwordConfirmar, setPasswordConfirmar] = useState("");

  // Validación de requisitos de contraseña
  const requisitos = {
    longitud: passwordNueva.length >= 8,
    mayuscula: /[A-Z]/.test(passwordNueva),
    minuscula: /[a-z]/.test(passwordNueva),
    numero: /[0-9]/.test(passwordNueva),
  };

  const todosRequisitos = Object.values(requisitos).every(Boolean);
  const passwordsCoinciden = passwordNueva === passwordConfirmar && passwordConfirmar.length > 0;

  const validarPassword = (password: string): { valido: boolean; mensaje?: string } => {
    if (password.length < 8) {
      return { valido: false, mensaje: "La contraseña debe tener al menos 8 caracteres" };
    }
    if (!/[A-Z]/.test(password)) {
      return { valido: false, mensaje: "La contraseña debe contener al menos una letra mayúscula" };
    }
    if (!/[a-z]/.test(password)) {
      return { valido: false, mensaje: "La contraseña debe contener al menos una letra minúscula" };
    }
    if (!/[0-9]/.test(password)) {
      return { valido: false, mensaje: "La contraseña debe contener al menos un número" };
    }
    return { valido: true };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!passwordActual || !passwordNueva || !passwordConfirmar) {
      toast.error("Por favor, completa todos los campos");
      return;
    }

    const validacion = validarPassword(passwordNueva);
    if (!validacion.valido) {
      toast.error(validacion.mensaje!);
      return;
    }

    if (passwordNueva !== passwordConfirmar) {
      toast.error("Las contraseñas no coinciden");
      return;
    }

    if (passwordActual === passwordNueva) {
      toast.error("La nueva contraseña debe ser diferente a la actual");
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/auth/cambiar-password", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            passwordActual,
            passwordNueva,
          }),
        });

        const result = await response.json();

        if (result.success) {
          toast.success("Contraseña actualizada exitosamente");
          setPasswordActual("");
          setPasswordNueva("");
          setPasswordConfirmar("");
          router.push("/dashboard");
        } else {
          toast.error(result.error || "Error al cambiar la contraseña");
        }
      } catch (error) {
        console.error("Error:", error);
        toast.error("Error inesperado al cambiar la contraseña");
      }
    });
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <div className="bg-crm-card rounded-xl shadow-crm-lg border border-crm-border overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-crm-primary to-crm-accent p-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Cambiar Contraseña</h1>
                <p className="text-white/90 text-sm mt-1">
                  Actualiza tu contraseña en cualquier momento
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Contraseña Actual */}
              <div>
                <label className="block text-sm font-medium text-crm-text-primary mb-2">
                  Contraseña Actual
                </label>
                <input
                  type="password"
                  value={passwordActual}
                  onChange={(e) => setPasswordActual(e.target.value)}
                  placeholder="Ingresa tu contraseña actual"
                  disabled={isPending}
                  className="w-full px-4 py-2.5 border border-crm-border rounded-lg bg-crm-background text-crm-text-primary placeholder-crm-text-muted focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent disabled:opacity-50"
                  required
                />
              </div>

              {/* Nueva Contraseña */}
              <div>
                <label className="block text-sm font-medium text-crm-text-primary mb-2">
                  Nueva Contraseña
                </label>
                <input
                  type="password"
                  value={passwordNueva}
                  onChange={(e) => setPasswordNueva(e.target.value)}
                  placeholder="Ingresa tu nueva contraseña"
                  disabled={isPending}
                  className="w-full px-4 py-2.5 border border-crm-border rounded-lg bg-crm-background text-crm-text-primary placeholder-crm-text-muted focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent disabled:opacity-50"
                  required
                />
              </div>

              {/* Confirmar Nueva Contraseña */}
              <div>
                <label className="block text-sm font-medium text-crm-text-primary mb-2">
                  Confirmar Nueva Contraseña
                </label>
                <input
                  type="password"
                  value={passwordConfirmar}
                  onChange={(e) => setPasswordConfirmar(e.target.value)}
                  placeholder="Confirma tu nueva contraseña"
                  disabled={isPending}
                  className="w-full px-4 py-2.5 border border-crm-border rounded-lg bg-crm-background text-crm-text-primary placeholder-crm-text-muted focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent disabled:opacity-50"
                  required
                />
                {passwordConfirmar.length > 0 && (
                  <div className="mt-2 flex items-center gap-2">
                    {passwordsCoinciden ? (
                      <>
                        <Check className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-green-600">Las contraseñas coinciden</span>
                      </>
                    ) : (
                      <>
                        <X className="w-4 h-4 text-red-600" />
                        <span className="text-sm text-red-600">Las contraseñas no coinciden</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Requisitos de contraseña */}
              {passwordNueva.length > 0 && (
                <div className="p-4 bg-crm-background rounded-lg border border-crm-border">
                  <p className="text-sm font-medium text-crm-text-primary mb-3">
                    Requisitos de la contraseña:
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {requisitos.longitud ? (
                        <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                      ) : (
                        <X className="w-4 h-4 text-crm-text-muted flex-shrink-0" />
                      )}
                      <span className={`text-sm ${requisitos.longitud ? 'text-green-600' : 'text-crm-text-muted'}`}>
                        Al menos 8 caracteres
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {requisitos.mayuscula ? (
                        <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                      ) : (
                        <X className="w-4 h-4 text-crm-text-muted flex-shrink-0" />
                      )}
                      <span className={`text-sm ${requisitos.mayuscula ? 'text-green-600' : 'text-crm-text-muted'}`}>
                        Una letra mayúscula (A-Z)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {requisitos.minuscula ? (
                        <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                      ) : (
                        <X className="w-4 h-4 text-crm-text-muted flex-shrink-0" />
                      )}
                      <span className={`text-sm ${requisitos.minuscula ? 'text-green-600' : 'text-crm-text-muted'}`}>
                        Una letra minúscula (a-z)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {requisitos.numero ? (
                        <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                      ) : (
                        <X className="w-4 h-4 text-crm-text-muted flex-shrink-0" />
                      )}
                      <span className={`text-sm ${requisitos.numero ? 'text-green-600' : 'text-crm-text-muted'}`}>
                        Un número (0-9)
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Botones */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => router.back()}
                  disabled={isPending}
                  className="flex-1 px-4 py-2.5 border border-crm-border text-crm-text-primary rounded-lg hover:bg-crm-card-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending || !todosRequisitos || !passwordsCoinciden}
                  className="flex-1 px-4 py-2.5 bg-crm-primary text-white rounded-lg hover:bg-crm-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {isPending ? "Actualizando..." : "Actualizar Contraseña"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
