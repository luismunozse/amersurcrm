import { Suspense } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/Card";
import { obtenerPermisosUsuario } from "@/lib/permissions/server";
import { resolveComposition } from "@/lib/dashboard/composition";
import { VendedorCockpit } from "./_components/VendedorCockpit";
import { CommandCenter } from "./_components/CommandCenter";

function DashboardShellSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {[...Array(3)].map((_, i) => (
        <Card key={i} className="animate-pulse">
          <CardContent className="space-y-3 p-6">
            <div className="h-4 w-24 rounded bg-crm-border" />
            <div className="h-8 w-16 rounded bg-crm-border" />
            <div className="h-3 w-32 rounded bg-crm-border" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * Resolves the caller's role once, then renders the matching composition.
 * Isolated in its own async component (instead of an inline await in
 * `DashboardPage`) so it can be wrapped by a single top-level `Suspense`
 * without blocking the rest of the dashboard shell chrome (design.md ADR-1).
 */
async function DashboardComposition() {
  const permisos = await obtenerPermisosUsuario();
  // Defensive default: an unresolved role never sees global command-center
  // data — it falls back to the own-scoped cockpit.
  const composicion = permisos ? resolveComposition(permisos.rol) : "cockpit";

  return composicion === "cockpit" ? <VendedorCockpit /> : <CommandCenter />;
}

export default function DashboardPage() {
  const hoy = format(new Date(), "EEEE d 'de' MMMM", { locale: es });

  return (
    <div className="space-y-8 px-4 pb-10 pt-6 md:px-8 md:pt-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-crm-text-muted">{hoy}</p>
      </div>
      <Suspense fallback={<DashboardShellSkeleton />}>
        <DashboardComposition />
      </Suspense>
    </div>
  );
}
