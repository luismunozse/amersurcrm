import { Suspense, type ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { getPerfilRol } from "@/lib/dashboard/scope.server";
import { SeguimientosHoy } from "@/components/SeguimientosHoy";
import { CobranzaAlertasPropias } from "./CobranzaAlertasPropias";
import { CobranzaAlertasPropiasSkeleton } from "./CobranzaAlertasPropias.Skeleton";
import { LeadsSinContactar } from "./LeadsSinContactar";
import { LeadsSinContactarSkeleton } from "./LeadsSinContactar.Skeleton";
import { MetaDelMes } from "./MetaDelMes";
import { MetaDelMesSkeleton } from "./MetaDelMes.Skeleton";

function SeguimientosHoySkeleton() {
  return (
    <Card className="animate-pulse h-full">
      <CardContent className="space-y-5 p-6">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 shrink-0 rounded-xl bg-crm-border" />
          <div className="space-y-2">
            <div className="h-8 w-14 rounded bg-crm-border" />
            <div className="h-3 w-36 rounded bg-crm-border" />
          </div>
        </div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-crm-border" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-32 rounded bg-crm-border" />
              <div className="h-2.5 w-20 rounded bg-crm-border" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ZoneLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-crm-text-muted">
      {children}
    </p>
  );
}

/**
 * Vendedor cockpit — "¿qué hago hoy?" (design.md §1, §4).
 *
 * Row 1 (above the fold): `SeguimientosHoy` leads as the hero card (left,
 * tallest — the answer to the question), with `CobranzaAlertasPropias` and
 * `LeadsSinContactar` stacked in the right column. Row 2 (below the fold):
 * `MetaDelMes` as a full-width band. Each block streams independently via
 * its own `Suspense`.
 */
export async function VendedorCockpit() {
  // React.cache-memoized — no extra round-trip if anything else in the
  // request tree resolves the profile too.
  const { nombreCompleto } = await getPerfilRol();
  const primerNombre = nombreCompleto?.trim().split(/\s+/)[0] ?? null;

  return (
    <div className="w-full space-y-8">
      <h1 className="text-2xl font-semibold text-crm-text-primary">
        {primerNombre ? `Bienvenido a AMERSUR CRM, ${primerNombre}` : "Bienvenido a AMERSUR CRM"}
      </h1>

      <div>
        <ZoneLabel>Hoy</ZoneLabel>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:items-start">
          <div className="lg:col-span-8">
            <Suspense fallback={<SeguimientosHoySkeleton />}>
              <SeguimientosHoy />
            </Suspense>
          </div>

          <div className="flex flex-col gap-5 lg:col-span-4">
            <Suspense fallback={<CobranzaAlertasPropiasSkeleton />}>
              <CobranzaAlertasPropias />
            </Suspense>
            <Suspense fallback={<LeadsSinContactarSkeleton />}>
              <LeadsSinContactar />
            </Suspense>
          </div>
        </div>
      </div>

      <div>
        <ZoneLabel>Meta mensual</ZoneLabel>
        <Suspense fallback={<MetaDelMesSkeleton />}>
          <MetaDelMes />
        </Suspense>
      </div>
    </div>
  );
}
