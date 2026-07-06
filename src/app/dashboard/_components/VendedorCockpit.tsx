import { Suspense } from "react";
import { Card, CardContent } from "@/components/ui/Card";
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
      <CardContent className="space-y-4 p-6">
        <div className="h-5 w-40 rounded bg-crm-border" />
        {[...Array(4)].map((_, i) => (
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

/**
 * Vendedor cockpit — "¿qué hago hoy?" (design.md §1, §4).
 *
 * Row 1 (above the fold): `SeguimientosHoy` leads (left, tallest — the
 * answer to the question), with `CobranzaAlertasPropias` and
 * `LeadsSinContactar` stacked in the right column. Row 2 (below the fold):
 * `MetaDelMes`. Each block streams independently via its own `Suspense`.
 */
export function VendedorCockpit() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <h1 className="text-2xl font-semibold text-crm-text-primary">¿Qué hago hoy?</h1>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-start">
        <Suspense fallback={<SeguimientosHoySkeleton />}>
          <SeguimientosHoy />
        </Suspense>

        <div className="space-y-4">
          <Suspense fallback={<CobranzaAlertasPropiasSkeleton />}>
            <CobranzaAlertasPropias />
          </Suspense>
          <Suspense fallback={<LeadsSinContactarSkeleton />}>
            <LeadsSinContactar />
          </Suspense>
        </div>
      </div>

      <Suspense fallback={<MetaDelMesSkeleton />}>
        <MetaDelMes />
      </Suspense>
    </div>
  );
}
