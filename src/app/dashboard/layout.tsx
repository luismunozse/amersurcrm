// Evita SSG/ISR en el dashboard: siempre SSR con cookies de usuario
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createServerOnlyClient } from "@/lib/supabase.server";
import DashboardClient from "./DashboardClient";
import { getCachedNotificacionesNoLeidas, getCachedNotificacionesCount } from "@/lib/cache.server";
import { getSunatExchangeRates } from "@/lib/exchange";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const s = await createServerOnlyClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) redirect("/auth/login");

  // Obtener el perfil del usuario para nombre, username, rol, avatar y verificar si requiere cambio de password
  const { data: perfil } = await s
    .from('usuario_perfil')
    .select('nombre_completo, username, rol, avatar_url, requiere_cambio_password')
    .eq('id', user.id)
    .single();

  // Si el usuario requiere cambio de contraseña, redirigir a la página de cambio
  if (perfil?.requiere_cambio_password) {
    redirect("/auth/cambiar-password");
  }

  const [notifications, notificationsCount, exchangeRates, configuracionResult] = await Promise.all([
    getCachedNotificacionesNoLeidas(),
    getCachedNotificacionesCount(),
    getSunatExchangeRates(),
    s
      .from("configuracion_sistema")
      .select(
        "notificaciones_push, push_vapid_public, push_provider",
      )
      .eq("id", 1)
      .maybeSingle(),
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

  return (
    <DashboardClient
      userEmail={user.email}
      userName={perfil?.nombre_completo}
      userUsername={perfil?.username}
      userRole={perfil?.rol}
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
