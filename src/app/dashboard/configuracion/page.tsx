import { createServerOnlyClient } from "@/lib/supabase.server";
import { redirect } from "next/navigation";

export default async function ConfiguracionPage() {
  const supabase = await createServerOnlyClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: perfil } = await supabase
    .from("usuario_perfil")
    .select("*, rol:rol!usuario_perfil_rol_fk(id, nombre, descripcion)")
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
            <svg className="w-6 h-6 text-crm-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
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
                <p className="text-xs text-crm-text-muted mt-1">Alertas sobre reservas, ventas y pagos</p>
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
            <svg className="w-6 h-6 text-crm-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
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
              <svg className="w-5 h-5 text-crm-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
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
            <svg className="w-6 h-6 text-crm-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
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
            <svg className="w-6 h-6 text-crm-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
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
                {perfil?.actualizado_en
                  ? new Date(perfil.actualizado_en).toLocaleDateString("es-PE", {
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
