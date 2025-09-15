/* import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createServerOnlyClient } from "@/lib/supabase.server";
import DashboardClient from "./DashboardClient";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createServerOnlyClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  return <DashboardClient>{children}</DashboardClient>;
}
 */

// Evita SSG/ISR en el dashboard: siempre SSR con cookies de usuario
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createServerOnlyClient } from "@/lib/supabase.server";
import DashboardClient from "./DashboardClient";
import FloatingNotifications from "@/components/FloatingNotifications";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const s = await createServerOnlyClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) redirect("/auth/login");

  return (
    <>
      <DashboardClient userEmail={user.email}>{children}</DashboardClient>
      {/* Botón flotante de notificaciones */}
      <FloatingNotifications />
    </>
  );
}
