import { PieChart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { getInventarioLotesPorProyecto } from "@/lib/dashboard/command-center.server";
import EstadoLotesChart from "@/app/dashboard/proyectos/[id]/reportes/_EstadoLotesChart";
import type { EquipoScope } from "@/lib/auth/equipo-scope.server";

interface LotesDonutBlockProps {
  scope: EquipoScope;
}

/**
 * Command center zone ④ "Inventario" — org-wide lote status donut, paired
 * alongside `InventarioLotesBlock`. Reuses `getInventarioLotesPorProyecto`'s
 * already-computed `totales` (disponible/reservado/vendido) instead of a new
 * query — its shape maps 1:1 onto `_EstadoLotesChart`'s props, and
 * `React.cache` dedupes this call against `InventarioLotesBlock`'s (and
 * `ResumenGeneralBlock`'s) own call to the same fetcher within one request.
 */
export async function LotesDonutBlock({ scope }: LotesDonutBlockProps) {
  let inventario: Awaited<ReturnType<typeof getInventarioLotesPorProyecto>>;
  try {
    inventario = await getInventarioLotesPorProyecto(scope);
  } catch (error) {
    console.error("Error cargando estado de lotes:", error);
    return (
      <Card variant="elevated">
        <CardContent className="flex items-center gap-3 p-6">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-crm-danger/10 text-crm-danger">
            <PieChart className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold text-crm-text-primary">No se pudo cargar esta sección</p>
            <p className="text-xs text-crm-text-muted">Intente nuevamente en unos momentos.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { disponible, reservado, vendido } = inventario.totales;

  return (
    <Card variant="elevated" className="flex h-full flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-crm-text-primary">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-crm-primary/10 text-crm-primary">
            <PieChart className="h-4 w-4" aria-hidden="true" />
          </span>
          Estado de lotes
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-center">
        <EstadoLotesChart vendidos={vendido} reservados={reservado} disponibles={disponible} />
      </CardContent>
    </Card>
  );
}
