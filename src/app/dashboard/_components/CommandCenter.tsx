import { Suspense, type ReactNode } from "react";
import { getPerfilRol } from "@/lib/dashboard/scope.server";
import { ResumenGeneralBlock } from "./ResumenGeneralBlock";
import { ResumenGeneralBlockSkeleton } from "./ResumenGeneralBlock.Skeleton";
import { FunnelAgingBlock } from "./FunnelAgingBlock";
import { FunnelAgingBlockSkeleton } from "./FunnelAgingBlock.Skeleton";
import { InventarioLotesBlock } from "./InventarioLotesBlock";
import { InventarioLotesBlockSkeleton } from "./InventarioLotesBlock.Skeleton";
import { VentasVsMetaBlock } from "./VentasVsMetaBlock";
import { VentasVsMetaBlockSkeleton } from "./VentasVsMetaBlock.Skeleton";
import { VentasChartBlock } from "./VentasChartBlock";
import { VentasChartBlockSkeleton } from "./VentasChartBlock.Skeleton";
import { LotesDonutBlock } from "./LotesDonutBlock";
import { LotesDonutBlockSkeleton } from "./LotesDonutBlock.Skeleton";
import { MoraAlertasBlock } from "./MoraAlertasBlock";
import { MoraAlertasBlockSkeleton } from "./MoraAlertasBlock.Skeleton";

/**
 * Gerencia/coordinador command center — "¿cómo va el negocio y dónde está
 * el fuego?" (design.md §1, §4). Renders four zones top to bottom: an
 * org-wide KPI summary, the pipeline/aging + cobranza pair (unchanged),
 * a sales-trend pair, and an inventory pair — each block streaming
 * independently via its own `Suspense`.
 *
 * `esGlobal` is resolved once here via `getPerfilRol()` (design.md ADR-1)
 * and passed down so every command-center fetcher skips its own profile
 * lookup. By construction this composition only renders for admin/gerente/
 * coordinador (`resolveComposition` in `page.tsx`), so `esGlobal` is
 * expected to always be `true` here — resolving it explicitly (rather than
 * hardcoding the literal) keeps the fetchers' defense-in-depth guard
 * meaningful and fails closed if a role ever resolves unexpectedly.
 * `getPerfilRol` is `React.cache`-wrapped and takes no arguments, so calling
 * it here does not add a second network round-trip if anything else in the
 * request tree also calls it.
 */
function ZoneLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-crm-text-muted">
      {children}
    </p>
  );
}

export async function CommandCenter() {
  const { esGlobal, nombreCompleto } = await getPerfilRol();
  // First name only — the full name is available on hover surfaces elsewhere.
  const primerNombre = nombreCompleto?.trim().split(/\s+/)[0] ?? null;

  return (
    <div className="w-full space-y-8">
      <h1 className="text-2xl font-semibold text-crm-text-primary">
        {primerNombre ? `Bienvenido a AMERSUR CRM, ${primerNombre}` : "Bienvenido a AMERSUR CRM"}
      </h1>

      <div>
        <ZoneLabel>Resumen</ZoneLabel>
        <Suspense fallback={<ResumenGeneralBlockSkeleton />}>
          <ResumenGeneralBlock esGlobal={esGlobal} />
        </Suspense>
      </div>

      <div>
        <ZoneLabel>Pipeline y cobranza</ZoneLabel>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <Suspense fallback={<FunnelAgingBlockSkeleton />}>
              <FunnelAgingBlock esGlobal={esGlobal} />
            </Suspense>
          </div>
          <div className="lg:col-span-4">
            <Suspense fallback={<MoraAlertasBlockSkeleton />}>
              <MoraAlertasBlock esGlobal={esGlobal} />
            </Suspense>
          </div>
        </div>
      </div>

      <div>
        <ZoneLabel>Ventas</ZoneLabel>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <Suspense fallback={<VentasChartBlockSkeleton />}>
              <VentasChartBlock esGlobal={esGlobal} />
            </Suspense>
          </div>
          <div className="lg:col-span-5">
            <Suspense fallback={<VentasVsMetaBlockSkeleton />}>
              <VentasVsMetaBlock />
            </Suspense>
          </div>
        </div>
      </div>

      <div>
        <ZoneLabel>Inventario</ZoneLabel>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <Suspense fallback={<InventarioLotesBlockSkeleton />}>
              <InventarioLotesBlock esGlobal={esGlobal} />
            </Suspense>
          </div>
          <div className="lg:col-span-5">
            <Suspense fallback={<LotesDonutBlockSkeleton />}>
              <LotesDonutBlock esGlobal={esGlobal} />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
