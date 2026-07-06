import Link from "next/link";
import { Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { obtenerKPIs } from "@/app/dashboard/admin/metas/_actions-metas";
import { calcularProgresoMeta } from "@/lib/dashboard/meta";
import { formatearMoneda } from "@/lib/types/crm-flujo";

/**
 * Vendedor cockpit — month goal vs. sales, below the fold (design.md §2, §4).
 * Reuses `obtenerKPIs`, which auto-scopes vendors to their own
 * `vendedor_username` for the current period.
 */
export async function MetaDelMes() {
  let kpis: any[];
  try {
    const hoy = new Date();
    const result = await obtenerKPIs({ periodoAnio: hoy.getFullYear(), periodoMes: hoy.getMonth() + 1 });
    kpis = result.success ? result.data ?? [] : [];
  } catch (error) {
    console.error("Error cargando meta del mes:", error);
    return (
      <Card variant="elevated">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-crm-text-primary">
            <Target className="h-4 w-4 text-crm-primary" aria-hidden="true" />
            Meta del mes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-crm-text-muted">No se pudo cargar esta sección. Intente nuevamente.</p>
        </CardContent>
      </Card>
    );
  }

  const metaVentasMonto = kpis.reduce((acc: number, k: any) => acc + (k.meta_ventas_monto ?? 0), 0);
  const realVentasMonto = kpis.reduce((acc: number, k: any) => acc + (k.real_ventas_monto ?? 0), 0);

  if (kpis.length === 0 || metaVentasMonto <= 0) {
    return (
      <Card variant="elevated">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-crm-text-primary">
            <Target className="h-4 w-4 text-crm-primary" aria-hidden="true" />
            Meta del mes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-crm-text-muted">Aún no tiene una meta asignada este mes.</p>
        </CardContent>
      </Card>
    );
  }

  const progreso = calcularProgresoMeta(realVentasMonto, metaVentasMonto);

  return (
    <Card variant="elevated">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-crm-text-primary">
          <Target className="h-4 w-4 text-crm-primary" aria-hidden="true" />
          Meta del mes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-baseline justify-between">
          <span className="text-lg font-semibold text-crm-text-primary">
            {formatearMoneda(realVentasMonto, "PEN")}
          </span>
          <span className="text-xs text-crm-text-muted">de {formatearMoneda(metaVentasMonto, "PEN")}</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-crm-border">
          <div
            className="h-full rounded-full bg-crm-primary transition-[width] duration-200 ease-out-strong"
            style={{ width: `${progreso}%` }}
          />
        </div>
        <p className="text-xs text-crm-text-muted">{progreso}% de la meta mensual</p>
        <Link
          href="/dashboard/vendedor/reportes"
          className="inline-block text-xs font-semibold text-crm-primary transition-colors hover:text-crm-primary/80"
        >
          Ver mis reportes
        </Link>
      </CardContent>
    </Card>
  );
}
