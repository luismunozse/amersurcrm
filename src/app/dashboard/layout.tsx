// Evita SSG/ISR en el dashboard: siempre SSR con cookies de usuario
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createServerOnlyClient, getCachedAuthUser } from "@/lib/supabase.server";
import DashboardClient from "./DashboardClient";
import { getCachedNotificacionesNoLeidas, getCachedNotificacionesCount } from "@/lib/cache.server";
import { getSunatExchangeRates } from "@/lib/exchange";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const s = await createServerOnlyClient();
  // Usar función cacheada para evitar rate limits
  const { user } = await getCachedAuthUser();
  if (!user) redirect("/auth/login");

  // Obtener el perfil del usuario para nombre, username, rol, avatar y verificar si requiere cambio de password
  const { data: perfil, error: _perfilError } = await s
    .schema('crm')
    .from('usuario_perfil')
    .select(`
      nombre_completo,
      username,
      avatar_url,
      requiere_cambio_password,
      rol:rol!usuario_perfil_rol_id_fkey (
        nombre
      )
    `)
    .eq('id', user.id)
    .single();

  // Si el usuario requiere cambio de contraseña, redirigir a la página de cambio
  if (perfil?.requiere_cambio_password === true) {
    redirect("/auth/cambiar-password");
  }

  // Separar queries críticas (configuración) de no-críticas (notificaciones, exchange)
  // Las no-críticas usan catch para no bloquear si fallan
  const [
    configuracionResult,
    notifications,
    notificationsCount,
    exchangeRates,
  ] = await Promise.all([
    // CRÍTICA: configuración del sistema (necesaria para push)
    s
      .from("configuracion_sistema")
      .select("notificaciones_push, push_vapid_public, push_provider")
      .eq("id", 1)
      .maybeSingle(),
    // NO-CRÍTICAS: si fallan, usamos valores por defecto
    getCachedNotificacionesNoLeidas().catch(() => []),
    getCachedNotificacionesCount().catch(() => 0),
    getSunatExchangeRates().catch(() => []),
  ]);

  const configuracion = configuracionResult?.data ?? null;
  const pushConfig =
    configuracion &&
    configuracion.notificaciones_push &&
    configuracion.push_provider === "webpush" &&
    configuracion.push_vapid_public
      ? {
          enabled: true,
          vapidPublicKey: configuracion.push_vapid_public as string,
        }
      : {
          enabled: false,
          vapidPublicKey: null,
        };

  // Extraer el nombre del rol, manejando el caso donde puede ser array u objeto
  const rolNombre = perfil?.rol
    ? (Array.isArray(perfil.rol) ? perfil.rol[0]?.nombre : (perfil.rol as any)?.nombre)
    : undefined;

  return (
    <DashboardClient
      userEmail={user.email}
      userName={perfil?.nombre_completo}
      userUsername={perfil?.username}
      userRole={rolNombre}
      userAvatarUrl={perfil?.avatar_url}
      lastSignInAt={user.last_sign_in_at}
      notifications={notifications}
      notificationsCount={notificationsCount}
      exchangeRates={exchangeRates}
      pushConfig={pushConfig}
    >
      {children}
    </DashboardClient>
  );
}
