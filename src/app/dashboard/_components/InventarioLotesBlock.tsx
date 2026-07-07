import Link from "next/link";
import { ChevronRight, Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { getInventarioLotesPorProyecto } from "@/lib/dashboard/command-center.server";

interface InventarioLotesBlockProps {
  esGlobal: boolean;
}

const PROYECTOS_VISIBLES = 5;

/**
 * Command center block ② — lote inventory per project (design.md §2, §4;
 * spec.md "lote inventory per project"). `% vendido` is the headline metric
 * for a sales/management audience, so vendido reads as `crm-success` here —
 * a different color meaning than the operational lote list (`_LotesList.tsx`),
 * which flags `vendido` in red to mean "no longer sellable".
 */
export async function InventarioLotesBlock({ esGlobal }: InventarioLotesBlockProps) {
  let inventario: Awaited<ReturnType<typeof getInventarioLotesPorProyecto>>;
  try {
    inventario = await getInventarioLotesPorProyecto(esGlobal);
  } catch (error) {
    console.error("Error cargando inventario de lotes por proyecto:", error);
    return (
      <Card variant="elevated">
        <CardContent className="flex items-center gap-3 p-6">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-crm-danger/10 text-crm-danger">
            <Package className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold text-crm-text-primary">No se pudo cargar esta sección</p>
            <p className="text-xs text-crm-text-muted">Intente nuevamente en unos momentos.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (inventario.proyectos.length === 0) {
    return (
      <Card variant="elevated" className="flex h-full flex-col">
        <CardContent className="flex flex-1 items-center gap-3 p-6">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-crm-primary/10 text-crm-primary">
            <Package className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold text-crm-text-primary">Sin proyectos con lotes registrados</p>
            <p className="text-xs text-crm-text-muted">El inventario aparecerá aquí en cuanto registre lotes.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const proyectosOrdenados = [...inventario.proyectos].sort((a, b) => b.total - a.total);
  const visibles = proyectosOrdenados.slice(0, PROYECTOS_VISIBLES);
  const restantes = proyectosOrdenados.length - visibles.length;

  return (
    <Card variant="elevated" className="flex h-full flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-crm-text-primary">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-crm-primary/10 text-crm-primary">
              <Package className="h-4 w-4" aria-hidden="true" />
            </span>
            Inventario por proyecto
          </CardTitle>
          <span className="rounded-full bg-crm-success/10 px-2.5 py-0.5 text-xs font-semibold text-crm-success">
            {inventario.totales.pctVendido}% vendido
          </span>
        </div>
        <CardDescription className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-crm-success" aria-hidden="true" />
            {inventario.totales.disponible} disponibles
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-crm-warning" aria-hidden="true" />
            {inventario.totales.reservado} reservados
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-crm-text-muted" aria-hidden="true" />
            {inventario.totales.vendido} vendidos
          </span>
          <span className="text-crm-text-muted">({inventario.totales.total} lotes)</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        {visibles.map((proyecto) => {
          const pctDisponible = proyecto.total > 0 ? (proyecto.disponible / proyecto.total) * 100 : 0;
          const pctReservado = proyecto.total > 0 ? (proyecto.reservado / proyecto.total) * 100 : 0;
          const pctVendido = proyecto.total > 0 ? (proyecto.vendido / proyecto.total) * 100 : 0;
          return (
            <div key={proyecto.proyectoId} className="space-y-1.5">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate font-medium text-crm-text-primary">{proyecto.nombre}</span>
                <span className="shrink-0 text-crm-text-muted">
                  {proyecto.disponible} disp. · {proyecto.reservado} res. · {proyecto.vendido} vend.
                </span>
              </div>
              <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-crm-border">
                <div
                  className="h-full bg-crm-success transition-[width] duration-200 ease-out-strong"
                  style={{ width: `${pctDisponible}%` }}
                  title={`${Math.round(pctDisponible)}% disponible`}
                />
                <div
                  className="h-full bg-crm-warning transition-[width] duration-200 ease-out-strong"
                  style={{ width: `${pctReservado}%` }}
                  title={`${Math.round(pctReservado)}% reservado`}
                />
                <div
                  className="h-full bg-crm-text-muted transition-[width] duration-200 ease-out-strong"
                  style={{ width: `${pctVendido}%` }}
                  title={`${Math.round(pctVendido)}% vendido`}
                />
              </div>
            </div>
          );
        })}

        <Link
          href="/dashboard/proyectos"
          className="mt-auto flex items-center justify-center gap-1 pt-1 text-xs font-semibold text-crm-primary transition-colors hover:text-crm-primary/80"
        >
          {restantes > 0 ? `Ver los ${restantes} proyectos restantes` : "Ver todos los proyectos"}
          <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
        </Link>
      </CardContent>
    </Card>
  );
}
