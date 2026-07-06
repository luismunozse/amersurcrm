import { Suspense } from "react";
import { getPerfilRol } from "@/lib/dashboard/scope.server";
import { FunnelAgingBlock } from "./FunnelAgingBlock";
import { FunnelAgingBlockSkeleton } from "./FunnelAgingBlock.Skeleton";
import { InventarioLotesBlock } from "./InventarioLotesBlock";
import { InventarioLotesBlockSkeleton } from "./InventarioLotesBlock.Skeleton";
import { VentasVsMetaBlock } from "./VentasVsMetaBlock";
import { VentasVsMetaBlockSkeleton } from "./VentasVsMetaBlock.Skeleton";
import { MoraAlertasBlock } from "./MoraAlertasBlock";
import { MoraAlertasBlockSkeleton } from "./MoraAlertasBlock.Skeleton";

/**
 * Gerencia/coordinador command center — "¿cómo va el negocio y dónde está
 * el fuego?" (design.md §1, §4). Renders the four blocks in the confirmed
 * priority order ①→④, each streaming independently via its own `Suspense`.
 *
 * `esGlobal` is resolved once here via `getPerfilRol()` (design.md ADR-1)
 * and passed down so `FunnelAgingBlock`/`InventarioLotesBlock`/
 * `MoraAlertasBlock` skip their own profile lookup. By construction this
 * composition only renders for admin/gerente/coordinador
 * (`resolveComposition` in `page.tsx`), so `esGlobal` is expected to always
 * be `true` here — resolving it explicitly (rather than hardcoding the
 * literal) keeps the new fetchers' defense-in-depth guard meaningful and
 * fails closed if a role ever resolves unexpectedly. `getPerfilRol` is
 * `React.cache`-wrapped and takes no arguments, so calling it here does not
 * add a second network round-trip if anything else in the request tree
 * also calls it.
 */
export async function CommandCenter() {
  const { esGlobal } = await getPerfilRol();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-crm-text-primary">¿Cómo va el negocio?</h1>

      <Suspense fallback={<FunnelAgingBlockSkeleton />}>
        <FunnelAgingBlock esGlobal={esGlobal} />
      </Suspense>

      <Suspense fallback={<InventarioLotesBlockSkeleton />}>
        <InventarioLotesBlock esGlobal={esGlobal} />
      </Suspense>

      <div className="grid gap-4 lg:grid-cols-2">
        <Suspense fallback={<VentasVsMetaBlockSkeleton />}>
          <VentasVsMetaBlock />
        </Suspense>
        <Suspense fallback={<MoraAlertasBlockSkeleton />}>
          <MoraAlertasBlock esGlobal={esGlobal} />
        </Suspense>
      </div>
    </div>
  );
}
