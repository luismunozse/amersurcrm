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
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-crm-text-primary">Inventario por proyecto</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-crm-text-muted">No se pudo cargar esta sección. Intente nuevamente.</p>
        </CardContent>
      </Card>
    );
  }

  if (inventario.proyectos.length === 0) {
    return (
      <Card variant="elevated">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-crm-text-primary">Inventario por proyecto</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-crm-text-muted">Sin proyectos con lotes registrados todavía.</p>
        </CardContent>
      </Card>
    );
  }

  const proyectosOrdenados = [...inventario.proyectos].sort((a, b) => b.total - a.total);
  const visibles = proyectosOrdenados.slice(0, PROYECTOS_VISIBLES);
  const restantes = proyectosOrdenados.length - visibles.length;

  return (
    <Card variant="elevated">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-crm-text-primary">
            <Package className="h-4 w-4 text-crm-primary" aria-hidden="true" />
            Inventario por proyecto
          </CardTitle>
          <span className="rounded-full bg-crm-success/10 px-2.5 py-0.5 text-xs font-semibold text-crm-success">
            {inventario.totales.pctVendido}% vendido
          </span>
        </div>
        <CardDescription className="text-xs">
          {inventario.totales.disponible} disponibles · {inventario.totales.reservado} reservados ·{" "}
          {inventario.totales.vendido} vendidos ({inventario.totales.total} lotes)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {visibles.map((proyecto) => (
          <div key={proyecto.proyectoId} className="space-y-1">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="truncate font-medium text-crm-text-primary">{proyecto.nombre}</span>
              <span className="shrink-0 text-crm-text-muted">
                {proyecto.disponible} disp. · {proyecto.reservado} res. · {proyecto.vendido} vend.
              </span>
            </div>
            <div className="flex h-2 w-full overflow-hidden rounded-full bg-crm-border">
              <div
                className="h-full bg-crm-success transition-[width] duration-200 ease-out-strong"
                style={{ width: `${proyecto.pctVendido}%` }}
                title={`${proyecto.pctVendido}% vendido`}
              />
            </div>
          </div>
        ))}

        <Link
          href="/dashboard/proyectos"
          className="flex items-center justify-center gap-1 pt-1 text-xs font-semibold text-crm-primary transition-colors hover:text-crm-primary/80"
        >
          {restantes > 0 ? `Ver los ${restantes} proyectos restantes` : "Ver todos los proyectos"}
          <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
        </Link>
      </CardContent>
    </Card>
  );
}
