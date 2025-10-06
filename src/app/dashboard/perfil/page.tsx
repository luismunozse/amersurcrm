import { createServerOnlyClient } from "@/lib/supabase.server";
import { redirect } from "next/navigation";
import EditarPerfilForm from "./_EditarPerfilForm";
import { User, Mail, Briefcase } from "lucide-react";

export default async function MiPerfilPage() {
  const supabase = await createServerOnlyClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Obtener perfil completo del usuario
  const { data: perfil } = await supabase
    .from('usuario_perfil')
    .select('*, rol:rol!usuario_perfil_rol_fk(id, nombre, descripcion)')
    .eq('id', user.id)
    .single();

  if (!perfil) {
    redirect("/dashboard");
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-crm-card border border-crm-border rounded-xl p-6 shadow-sm">
        <div className="flex items-start gap-6">
          {/* Avatar grande */}
          <div className="flex-shrink-0">
            <div className="w-24 h-24 bg-gradient-to-br from-crm-primary to-crm-accent rounded-full flex items-center justify-center shadow-lg ring-4 ring-crm-border">
              <span className="text-white text-3xl font-bold">
                {perfil.nombre_completo?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
          </div>

          {/* Info básica */}
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-crm-text-primary mb-2">
              {perfil.nombre_completo || 'Sin nombre'}
            </h1>
            <p className="text-lg text-crm-text-muted mb-4">
              {perfil.username}
            </p>

            <div className="flex flex-wrap gap-3">
              {perfil.rol && (
                <span className="px-3 py-1 text-sm font-medium rounded-full bg-crm-primary/10 text-crm-primary border border-crm-primary/20">
                  {perfil.rol.nombre === 'ROL_ADMIN' ? 'Administrador' :
                   perfil.rol.nombre === 'ROL_COORDINADOR_VENTAS' ? 'Coordinador' :
                   'Vendedor'}
                </span>
              )}
              {perfil.activo ? (
                <span className="px-3 py-1 text-sm font-medium rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800">
                  Activo
                </span>
              ) : (
                <span className="px-3 py-1 text-sm font-medium rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
                  Inactivo
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Grid de información */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Información de contacto */}
        <div className="bg-crm-card border border-crm-border rounded-xl p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-crm-text-primary mb-4 flex items-center gap-2">
            <Mail className="h-5 w-5 text-crm-primary" />
            Información de Contacto
          </h2>
          <div className="space-y-3">
            {user.email && (
              <div>
                <p className="text-xs text-crm-text-muted mb-1">Email</p>
                <p className="text-sm text-crm-text-primary font-medium">{user.email}</p>
              </div>
            )}
            {perfil.dni && (
              <div>
                <p className="text-xs text-crm-text-muted mb-1">DNI</p>
                <p className="text-sm text-crm-text-primary font-medium">{perfil.dni}</p>
              </div>
            )}
            {perfil.telefono && (
              <div>
                <p className="text-xs text-crm-text-muted mb-1">Teléfono</p>
                <p className="text-sm text-crm-text-primary font-medium">{perfil.telefono}</p>
              </div>
            )}
            {!user.email && !perfil.dni && !perfil.telefono && (
              <p className="text-sm text-crm-text-muted">No hay información de contacto</p>
            )}
          </div>
        </div>

        {/* Información profesional */}
        <div className="bg-crm-card border border-crm-border rounded-xl p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-crm-text-primary mb-4 flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-crm-primary" />
            Información Profesional
          </h2>
          <div className="space-y-3">
            {perfil.meta_mensual && (
              <div>
                <p className="text-xs text-crm-text-muted mb-1">Meta Mensual</p>
                <p className="text-sm text-crm-text-primary font-medium">
                  S/ {perfil.meta_mensual.toLocaleString()}
                </p>
              </div>
            )}
            {perfil.comision_porcentaje && (
              <div>
                <p className="text-xs text-crm-text-muted mb-1">Comisión</p>
                <p className="text-sm text-crm-text-primary font-medium">
                  {perfil.comision_porcentaje}%
                </p>
              </div>
            )}
            {perfil.created_at && (
              <div>
                <p className="text-xs text-crm-text-muted mb-1">Fecha de Alta</p>
                <p className="text-sm text-crm-text-primary font-medium">
                  {new Date(perfil.created_at).toLocaleDateString('es-PE', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric'
                  })}
                </p>
              </div>
            )}
            {!perfil.meta_mensual && !perfil.comision_porcentaje && (
              <p className="text-sm text-crm-text-muted">No hay información profesional</p>
            )}
          </div>
        </div>
      </div>

      {/* Formulario de edición */}
      <div className="bg-crm-card border border-crm-border rounded-xl p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-crm-text-primary mb-6 flex items-center gap-2">
          <User className="h-6 w-6 text-crm-primary" />
          Editar Información Personal
        </h2>
        <EditarPerfilForm perfil={perfil} userEmail={user.email || ''} />
      </div>
    </div>
  );
}
