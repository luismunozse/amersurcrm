"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Check, X, Lock } from "lucide-react";
import { LoadingButton } from "@/components/form/LoadingButton";
import { FormInput } from "@/components/form/FormInput";

export default function CambiarPasswordForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [passwordActual, setPasswordActual] = useState("");
  const [passwordNueva, setPasswordNueva] = useState("");
  const [passwordConfirmar, setPasswordConfirmar] = useState("");
  const [showForm, setShowForm] = useState(false);

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
        const response = await fetch("/api/perfil/cambiar-password", {
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
          setShowForm(false);
          router.refresh();
        } else {
          toast.error(result.error || "Error al cambiar la contraseña");
        }
      } catch (error) {
        console.error("Error:", error);
        toast.error("Error inesperado al cambiar la contraseña");
      }
    });
  };

  if (!showForm) {
    return (
      <div className="p-4 bg-crm-card border border-crm-border rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-crm-primary/10 rounded-full flex items-center justify-center">
              <Lock className="w-5 h-5 text-crm-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-crm-text-primary">Contraseña</h3>
              <p className="text-xs text-crm-text-muted">Actualiza tu contraseña de acceso</p>
            </div>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 text-sm font-medium text-crm-primary border border-crm-primary rounded-lg hover:bg-crm-primary/10 transition-colors"
          >
            Cambiar Contraseña
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-crm-card border border-crm-border rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-crm-primary/10 rounded-full flex items-center justify-center">
            <Lock className="w-5 h-5 text-crm-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-crm-text-primary">Cambiar Contraseña</h2>
            <p className="text-sm text-crm-text-muted">Actualiza tu contraseña de acceso</p>
          </div>
        </div>
        <button
          onClick={() => {
            setShowForm(false);
            setPasswordActual("");
            setPasswordNueva("");
            setPasswordConfirmar("");
          }}
          className="text-crm-text-muted hover:text-crm-text-primary transition-colors"
          disabled={isPending}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Contraseña Actual */}
        <FormInput
          id="passwordActual"
          label="Contraseña Actual"
          type="password"
          value={passwordActual}
          onChange={(e) => setPasswordActual(e.target.value)}
          placeholder="Ingresa tu contraseña actual"
          disabled={isPending}
          required
        />

        {/* Nueva Contraseña */}
        <FormInput
          id="passwordNueva"
          label="Nueva Contraseña"
          type="password"
          value={passwordNueva}
          onChange={(e) => setPasswordNueva(e.target.value)}
          placeholder="Ingresa tu nueva contraseña"
          disabled={isPending}
          required
        />

        {/* Confirmar Nueva Contraseña */}
        <div>
          <FormInput
            id="passwordConfirmar"
            label="Confirmar Nueva Contraseña"
            type="password"
            value={passwordConfirmar}
            onChange={(e) => setPasswordConfirmar(e.target.value)}
            placeholder="Confirma tu nueva contraseña"
            disabled={isPending}
            required
          />
          {passwordConfirmar.length > 0 && (
            <div className="mt-2 flex items-center gap-2">
              {passwordsCoinciden ? (
                <>
                  <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <span className="text-xs text-green-600 dark:text-green-400">Las contraseñas coinciden</span>
                </>
              ) : (
                <>
                  <X className="w-4 h-4 text-red-600 dark:text-red-400" />
                  <span className="text-xs text-red-600 dark:text-red-400">Las contraseñas no coinciden</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Requisitos de contraseña */}
        {passwordNueva.length > 0 && (
          <div className="p-4 bg-crm-bg-primary dark:bg-crm-card rounded-lg border border-crm-border">
            <p className="text-sm font-medium text-crm-text-primary mb-3">
              Requisitos de la contraseña:
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {requisitos.longitud ? (
                  <Check className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                ) : (
                  <X className="w-4 h-4 text-crm-text-muted flex-shrink-0" />
                )}
                <span className={`text-xs ${requisitos.longitud ? 'text-green-600 dark:text-green-400' : 'text-crm-text-muted'}`}>
                  Al menos 8 caracteres
                </span>
              </div>
              <div className="flex items-center gap-2">
                {requisitos.mayuscula ? (
                  <Check className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                ) : (
                  <X className="w-4 h-4 text-crm-text-muted flex-shrink-0" />
                )}
                <span className={`text-xs ${requisitos.mayuscula ? 'text-green-600 dark:text-green-400' : 'text-crm-text-muted'}`}>
                  Una letra mayúscula (A-Z)
                </span>
              </div>
              <div className="flex items-center gap-2">
                {requisitos.minuscula ? (
                  <Check className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                ) : (
                  <X className="w-4 h-4 text-crm-text-muted flex-shrink-0" />
                )}
                <span className={`text-xs ${requisitos.minuscula ? 'text-green-600 dark:text-green-400' : 'text-crm-text-muted'}`}>
                  Una letra minúscula (a-z)
                </span>
              </div>
              <div className="flex items-center gap-2">
                {requisitos.numero ? (
                  <Check className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                ) : (
                  <X className="w-4 h-4 text-crm-text-muted flex-shrink-0" />
                )}
                <span className={`text-xs ${requisitos.numero ? 'text-green-600 dark:text-green-400' : 'text-crm-text-muted'}`}>
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
            onClick={() => {
              setShowForm(false);
              setPasswordActual("");
              setPasswordNueva("");
              setPasswordConfirmar("");
            }}
            disabled={isPending}
            className="flex-1 px-4 py-2.5 border border-crm-border text-crm-text-primary rounded-lg hover:bg-crm-bg-primary dark:hover:bg-crm-card-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            Cancelar
          </button>
          <LoadingButton
            type="submit"
            variant="primary"
            isLoading={isPending}
            loadingText="Actualizando..."
            disabled={!todosRequisitos || !passwordsCoinciden}
            className="flex-1"
          >
            Actualizar Contraseña
          </LoadingButton>
        </div>
      </form>
    </div>
  );
}

