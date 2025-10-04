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

  const [notifications, notificationsCount, exchangeRates] = await Promise.all([
    getCachedNotificacionesNoLeidas(),
    getCachedNotificacionesCount(),
    getSunatExchangeRates(),
  ]);

  return (
    <DashboardClient
      userEmail={user.email}
      notifications={notifications}
      notificationsCount={notificationsCount}
      exchangeRates={exchangeRates}
    >
      {children}
    </DashboardClient>
  );
}
