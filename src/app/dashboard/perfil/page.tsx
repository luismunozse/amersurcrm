import { createServerOnlyClient } from "@/lib/supabase.server";
import { redirect } from "next/navigation";
import AvatarUpload from "./_AvatarUpload";
import EmailConfirmationToast from "./_EmailConfirmationToast";
import PerfilTabsWrapper from "./_PerfilTabsWrapper";

export default async function MiPerfilPage() {
  const supabase = await createServerOnlyClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Obtener perfil completo del usuario (incluyendo avatar_url)
  const { data: perfil } = await supabase
    .from('usuario_perfil')
    .select('*, rol:rol!usuario_perfil_rol_id_fkey(id, nombre, descripcion)')
    .eq('id', user.id)
    .single();

  if (!perfil) {
    redirect("/dashboard");
  }

  const isAdmin = perfil?.rol?.nombre === 'ROL_ADMIN';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Toast para confirmación de email */}
      <EmailConfirmationToast />

      {/* Header */}
      <div className="bg-crm-card border border-crm-border rounded-xl p-6 shadow-sm">
        <div className="flex items-start gap-6">
          {/* Avatar grande con upload */}
          <div className="flex-shrink-0">
            <AvatarUpload
              currentAvatarUrl={perfil.avatar_url}
              userName={perfil.nombre_completo || 'Usuario'}
            />
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

      {/* Tabs con contenido */}
      <div className="bg-crm-card border border-crm-border rounded-xl p-6 shadow-sm">
        <PerfilTabsWrapper
          perfil={perfil}
          isAdmin={isAdmin}
          currentEmail={user.email || ''}
          userId={user.id}
          fechaAlta={perfil.created_at || new Date().toISOString()}
          ultimoAcceso={user.last_sign_in_at}
          user={user}
        />
      </div>
    </div>
  );
}
