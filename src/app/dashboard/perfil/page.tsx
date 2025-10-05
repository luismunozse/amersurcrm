"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { cambiarPasswordPerfil } from "../admin/usuarios/_actions";

interface PerfilUsuario {
  id: string;
  email: string;
  nombre_completo?: string;
  dni?: string;
  telefono?: string;
  rol?: {
    nombre: string;
    descripcion: string;
  };
  requiere_cambio_password?: boolean;
  activo: boolean;
  created_at: string;
}

export default function PerfilPage() {
  const router = useRouter();
  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null);
  const [cargando, setCargando] = useState(true);
  const [cambiandoPassword, setCambiandoPassword] = useState(false);

  // Form state
  const [passwordActual, setPasswordActual] = useState("");
  const [passwordNueva, setPasswordNueva] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  useEffect(() => {
    cargarPerfil();
  }, []);

  const cargarPerfil = async () => {
    try {
      setCargando(true);
      const response = await fetch("/api/auth/perfil");
      const data = await response.json();

      if (data.success && data.perfil) {
        setPerfil(data.perfil);
      } else {
        toast.error("Error cargando perfil");
      }
    } catch (error) {
      console.error("Error cargando perfil:", error);
      toast.error("Error cargando perfil");
    } finally {
      setCargando(false);
    }
  };

  const handleCambiarPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordNueva !== passwordConfirm) {
      toast.error("Las contraseñas no coinciden");
      return;
    }

    if (passwordNueva.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    setCambiandoPassword(true);

    try {
      const result = await cambiarPasswordPerfil(passwordActual, passwordNueva);

      if (result.success) {
        toast.success(result.message);
        setPasswordActual("");
        setPasswordNueva("");
        setPasswordConfirm("");
        // Recargar perfil para actualizar requiere_cambio_password
        cargarPerfil();
      } else {
        toast.error(result.error || "Error cambiando contraseña");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error inesperado");
    } finally {
      setCambiandoPassword(false);
    }
  };

  if (cargando) {
    return (
      <div className="min-h-screen bg-crm-bg-primary flex items-center justify-center">
        <div className="animate-pulse text-crm-text-secondary">
          Cargando perfil...
        </div>
      </div>
    );
  }

  if (!perfil) {
    return (
      <div className="min-h-screen bg-crm-bg-primary flex items-center justify-center">
        <div className="crm-card p-6 text-center">
          <p className="text-crm-text-secondary mb-4">
            No se pudo cargar el perfil
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="crm-button-primary px-4 py-2 rounded-lg"
          >
            Volver al Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-crm-bg-primary">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-crm-text-primary">
            Mi Perfil
          </h1>
          <p className="text-crm-text-secondary mt-2">
            Gestiona tu información personal y contraseña
          </p>
        </div>

        {/* Alerta si requiere cambio de contraseña */}
        {perfil.requiere_cambio_password && (
          <div className="crm-card p-4 mb-6 border-l-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20">
            <div className="flex items-start gap-3">
              <svg
                className="w-6 h-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div>
                <h3 className="font-semibold text-yellow-800 dark:text-yellow-300">
                  Cambio de Contraseña Requerido
                </h3>
                <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                  Por seguridad, debes cambiar tu contraseña temporal antes de
                  continuar usando el sistema.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Información del Perfil */}
          <div className="crm-card p-6">
            <h2 className="text-xl font-semibold text-crm-text-primary mb-4">
              Información Personal
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-crm-text-secondary mb-1">
                  Nombre Completo
                </label>
                <p className="text-crm-text-primary">
                  {perfil.nombre_completo || "No registrado"}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-crm-text-secondary mb-1">
                  DNI
                </label>
                <p className="text-crm-text-primary">
                  {perfil.dni || "No registrado"}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-crm-text-secondary mb-1">
                  Email
                </label>
                <p className="text-crm-text-primary">{perfil.email}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-crm-text-secondary mb-1">
                  Teléfono
                </label>
                <p className="text-crm-text-primary">
                  {perfil.telefono || "No registrado"}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-crm-text-secondary mb-1">
                  Rol
                </label>
                <p className="text-crm-text-primary">
                  {perfil.rol?.nombre?.replace("ROL_", "").replace("_", " ") ||
                    "No asignado"}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-crm-text-secondary mb-1">
                  Estado
                </label>
                <span
                  className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                    perfil.activo
                      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                  }`}
                >
                  {perfil.activo ? "Activo" : "Inactivo"}
                </span>
              </div>
            </div>
          </div>

          {/* Cambiar Contraseña */}
          <div className="crm-card p-6">
            <h2 className="text-xl font-semibold text-crm-text-primary mb-4">
              Cambiar Contraseña
            </h2>

            <form onSubmit={handleCambiarPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-crm-text-primary mb-2">
                  Contraseña Actual *
                </label>
                <input
                  type="password"
                  value={passwordActual}
                  onChange={(e) => setPasswordActual(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary placeholder-crm-text-muted focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-crm-primary"
                  placeholder="Tu contraseña actual"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-crm-text-primary mb-2">
                  Nueva Contraseña *
                </label>
                <input
                  type="password"
                  value={passwordNueva}
                  onChange={(e) => setPasswordNueva(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary placeholder-crm-text-muted focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-crm-primary"
                  placeholder="Nueva contraseña (mín. 6 caracteres)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-crm-text-primary mb-2">
                  Confirmar Nueva Contraseña *
                </label>
                <input
                  type="password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary placeholder-crm-text-muted focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-crm-primary"
                  placeholder="Confirma tu nueva contraseña"
                />
              </div>

              {passwordNueva && passwordConfirm && passwordNueva !== passwordConfirm && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  Las contraseñas no coinciden
                </p>
              )}

              <button
                type="submit"
                disabled={cambiandoPassword}
                className="w-full crm-button-primary px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cambiandoPassword
                  ? "Cambiando contraseña..."
                  : "Cambiar Contraseña"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
