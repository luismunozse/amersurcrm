import { Suspense } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/Card";
import { obtenerPermisosUsuario } from "@/lib/permissions/server";
import { resolveComposition } from "@/lib/dashboard/composition";
import { VendedorCockpit } from "./_components/VendedorCockpit";
import { CommandCenter } from "./_components/CommandCenter";
import { TipoCambioChip } from "./_components/TipoCambioChip";

function DashboardShellSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <Card className="animate-pulse lg:col-span-8">
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 shrink-0 rounded-xl bg-crm-border" />
              <div className="space-y-2">
                <div className="h-8 w-16 rounded bg-crm-border" />
                <div className="h-3 w-32 rounded bg-crm-border" />
              </div>
            </div>
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 w-full rounded-xl bg-crm-border" />
            ))}
          </CardContent>
        </Card>
        <div className="flex flex-col gap-5 lg:col-span-4">
          {[...Array(2)].map((_, i) => (
            <Card key={i} className="animate-pulse flex-1">
              <CardContent className="space-y-3 p-6">
                <div className="h-4 w-24 rounded bg-crm-border" />
                <div className="h-8 w-16 rounded bg-crm-border" />
                <div className="h-3 w-32 rounded bg-crm-border" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      <Card className="animate-pulse">
        <CardContent className="space-y-3 p-6">
          <div className="h-4 w-28 rounded bg-crm-border" />
          <div className="h-3 w-full rounded-full bg-crm-border" />
        </CardContent>
      </Card>
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
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 pb-10 pt-6 md:px-8 md:pt-8">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-crm-text-muted">{hoy}</p>
        <Suspense fallback={null}>
          <TipoCambioChip />
        </Suspense>
      </div>
      <Suspense fallback={<DashboardShellSkeleton />}>
        <DashboardComposition />
      </Suspense>
    </div>
  );
}
