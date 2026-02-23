import { Suspense } from "react";
import { createServerOnlyClient } from "@/lib/supabase.server";
import { redirect } from "next/navigation";
import AgendaDashboard from "./_AgendaDashboard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AgendaPage() {
  const supabase = await createServerOnlyClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  return (
    <div className="min-h-screen bg-crm-bg-primary">
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-crm-text-primary">Agenda y Recordatorios</h1>
          <p className="text-sm sm:text-base text-crm-text-secondary mt-1 sm:mt-2">
            Gestiona tus eventos, citas y recordatorios
          </p>
        </div>

        <Suspense fallback={
          <div className="crm-card p-6">
            <div className="animate-pulse">
              <div className="h-8 bg-crm-border rounded mb-4"></div>
              <div className="h-64 bg-crm-border rounded"></div>
            </div>
          </div>
        }>
          <AgendaDashboard />
        </Suspense>
      </div>
    </div>
  );
}