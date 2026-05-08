import { createServerOnlyClient } from "@/lib/supabase.server";
import { redirect } from "next/navigation";
import { PERMISOS } from "@/lib/permissions";
import { protegerRuta } from "@/lib/permissions/middleware";
import { Bell, SquarePen, Check, Lock, Info } from "lucide-react";

export default async function ConfiguracionPage() {
  const supabase = await createServerOnlyClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  await protegerRuta({ permiso: PERMISOS.CONFIGURACION.SISTEMA });

  const { data: perfil } = await supabase
    .from("usuario_perfil")
    .select("*, rol:rol!usuario_perfil_rol_id_fkey(id, nombre, descripcion)")
    .eq("id", user.id)
    .single();

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-crm-text-primary">Configuración</h1>
        <p className="text-crm-text-muted mt-2">
          Gestiona tus preferencias y configuración del sistema
        </p>
      </div>

      {/* Configuración de Notificaciones */}
      <div className="bg-crm-card rounded-xl shadow-crm-lg border border-crm-border overflow-hidden mb-6">
        <div className="bg-gradient-to-r from-crm-primary/10 to-crm-accent/10 px-6 py-4 border-b border-crm-border">
          <h2 className="text-xl font-semibold text-crm-text-primary flex items-center gap-3">
            <Bell className="w-6 h-6 text-crm-primary" />
            Notificaciones
          </h2>
        </div>
        <div className="p-6">
          <p className="text-sm text-crm-text-muted mb-4">
            Configura cómo y cuándo quieres recibir notificaciones
          </p>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-crm-background rounded-lg border border-crm-border">
              <div className="flex-1">
                <p className="text-sm font-medium text-crm-text-primary">Notificaciones por email</p>
                <p className="text-xs text-crm-text-muted mt-1">Recibe alertas importantes por correo electrónico</p>
              </div>
              <div className="text-sm text-crm-text-muted">
                Próximamente
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-crm-background rounded-lg border border-crm-border">
              <div className="flex-1">
                <p className="text-sm font-medium text-crm-text-primary">Notificaciones de clientes</p>
                <p className="text-xs text-crm-text-muted mt-1">Alertas cuando se asigna o actualiza un cliente</p>
              </div>
              <div className="text-sm text-crm-text-muted">
                Próximamente
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-crm-background rounded-lg border border-crm-border">
              <div className="flex-1">
                <p className="text-sm font-medium text-crm-text-primary">Notificaciones de ventas</p>
                <p className="text-xs text-crm-text-muted mt-1">Alertas sobre separaciones, ventas y pagos</p>
              </div>
              <div className="text-sm text-crm-text-muted">
                Próximamente
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Configuración de Interfaz */}
      <div className="bg-crm-card rounded-xl shadow-crm-lg border border-crm-border overflow-hidden mb-6">
        <div className="bg-gradient-to-r from-crm-primary/10 to-crm-accent/10 px-6 py-4 border-b border-crm-border">
          <h2 className="text-xl font-semibold text-crm-text-primary flex items-center gap-3">
            <SquarePen className="w-6 h-6 text-crm-primary" />
            Interfaz
          </h2>
        </div>
        <div className="p-6">
          <p className="text-sm text-crm-text-muted mb-4">
            Personaliza la apariencia de la aplicación
          </p>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-crm-background rounded-lg border border-crm-border">
              <div className="flex-1">
                <p className="text-sm font-medium text-crm-text-primary">Tema de la aplicación</p>
                <p className="text-xs text-crm-text-muted mt-1">Puedes cambiar el tema desde el menú de usuario en el header</p>
              </div>
              <Check className="w-5 h-5 text-crm-primary" />
            </div>
            <div className="flex items-center justify-between p-4 bg-crm-background rounded-lg border border-crm-border">
              <div className="flex-1">
                <p className="text-sm font-medium text-crm-text-primary">Idioma</p>
                <p className="text-xs text-crm-text-muted mt-1">Selecciona el idioma de la interfaz</p>
              </div>
              <div className="text-sm text-crm-text-muted">
                Español (predeterminado)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Configuración de Privacidad */}
      <div className="bg-crm-card rounded-xl shadow-crm-lg border border-crm-border overflow-hidden mb-6">
        <div className="bg-gradient-to-r from-crm-primary/10 to-crm-accent/10 px-6 py-4 border-b border-crm-border">
          <h2 className="text-xl font-semibold text-crm-text-primary flex items-center gap-3">
            <Lock className="w-6 h-6 text-crm-primary" />
            Privacidad y Seguridad
          </h2>
        </div>
        <div className="p-6">
          <p className="text-sm text-crm-text-muted mb-4">
            Gestiona la privacidad de tu cuenta y datos
          </p>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-crm-background rounded-lg border border-crm-border">
              <div className="flex-1">
                <p className="text-sm font-medium text-crm-text-primary">Cambiar contraseña</p>
                <p className="text-xs text-crm-text-muted mt-1">Actualiza tu contraseña periódicamente</p>
              </div>
              <a
                href="/dashboard/cambiar-password"
                className="px-4 py-2 text-sm bg-crm-primary text-white rounded-lg hover:bg-crm-primary-dark transition-colors"
              >
                Cambiar
              </a>
            </div>
            <div className="flex items-center justify-between p-4 bg-crm-background rounded-lg border border-crm-border">
              <div className="flex-1">
                <p className="text-sm font-medium text-crm-text-primary">Sesiones activas</p>
                <p className="text-xs text-crm-text-muted mt-1">Gestiona los dispositivos con acceso a tu cuenta</p>
              </div>
              <div className="text-sm text-crm-text-muted">
                Próximamente
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-crm-background rounded-lg border border-crm-border">
              <div className="flex-1">
                <p className="text-sm font-medium text-crm-text-primary">Autenticación de dos factores</p>
                <p className="text-xs text-crm-text-muted mt-1">Añade una capa extra de seguridad a tu cuenta</p>
              </div>
              <div className="text-sm text-crm-text-muted">
                Próximamente
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Información de la cuenta */}
      <div className="bg-crm-card rounded-xl shadow-crm-lg border border-crm-border overflow-hidden">
        <div className="bg-gradient-to-r from-crm-primary/10 to-crm-accent/10 px-6 py-4 border-b border-crm-border">
          <h2 className="text-xl font-semibold text-crm-text-primary flex items-center gap-3">
            <Info className="w-6 h-6 text-crm-primary" />
            Información de la Cuenta
          </h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-crm-background rounded-lg border border-crm-border">
              <p className="text-xs text-crm-text-muted mb-1">Email</p>
              <p className="text-sm font-medium text-crm-text-primary">{user.email}</p>
            </div>
            <div className="p-4 bg-crm-background rounded-lg border border-crm-border">
              <p className="text-xs text-crm-text-muted mb-1">Rol</p>
              <p className="text-sm font-medium text-crm-text-primary">
                {perfil?.rol?.nombre || "Sin rol"}
              </p>
            </div>
            <div className="p-4 bg-crm-background rounded-lg border border-crm-border">
              <p className="text-xs text-crm-text-muted mb-1">Usuario desde</p>
              <p className="text-sm font-medium text-crm-text-primary">
                {new Date(user.created_at).toLocaleDateString("es-PE", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
            <div className="p-4 bg-crm-background rounded-lg border border-crm-border">
              <p className="text-xs text-crm-text-muted mb-1">Última actualización</p>
              <p className="text-sm font-medium text-crm-text-primary">
                {perfil?.updated_at
                  ? new Date(perfil.updated_at).toLocaleDateString("es-PE", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "No disponible"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
