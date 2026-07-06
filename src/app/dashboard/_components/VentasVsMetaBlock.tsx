import { Target, TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { obtenerKPIs } from "@/app/dashboard/admin/metas/_actions-metas";
import { calcularProgresoMeta, calcularDeltaMensual, calcularPeriodoAnterior } from "@/lib/dashboard/meta";
import { formatearMoneda } from "@/lib/types/crm-flujo";
import type { KPIVendedor } from "@/lib/types/metas";

function sumarCampo(kpis: KPIVendedor[], campo: keyof KPIVendedor): number {
  return kpis.reduce((acc, kpi) => acc + ((kpi[campo] as number) ?? 0), 0);
}

/**
 * Command center block ③ — org-wide sales vs. goal + MoM delta (design.md
 * §2, §4). `obtenerKPIs` already returns every vendedor's row for global
 * roles (admin/gerente/coordinador all hold `METAS.ASIGNAR`), so no
 * `esGlobal` prop is needed here — unlike the three NEW command-center
 * fetchers, this one auto-scopes via its own permission check.
 *
 * No CTA link: design.md §4 names a link destination for blocks ①/②/④ but
 * not for this one, and `/dashboard/admin/metas` is gated `soloAdmins()`
 * (ROL_ADMIN only) — linking there would 404/redirect for gerente and
 * coordinador, who both render this same block. Omitting the link avoids
 * reproducing that pre-existing route-guard gap in new UI.
 */
export async function VentasVsMetaBlock() {
  let actual: KPIVendedor[];
  let anterior: KPIVendedor[];
  try {
    const hoy = new Date();
    const periodoAnterior = calcularPeriodoAnterior(hoy.getFullYear(), hoy.getMonth() + 1);
    const [resultActual, resultAnterior] = await Promise.all([
      obtenerKPIs({ periodoAnio: hoy.getFullYear(), periodoMes: hoy.getMonth() + 1 }),
      obtenerKPIs({ periodoAnio: periodoAnterior.anio, periodoMes: periodoAnterior.mes }),
    ]);
    actual = resultActual.success ? ((resultActual.data ?? []) as KPIVendedor[]) : [];
    anterior = resultAnterior.success ? ((resultAnterior.data ?? []) as KPIVendedor[]) : [];
  } catch (error) {
    console.error("Error cargando ventas vs. meta:", error);
    return (
      <Card variant="elevated">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-crm-text-primary">
            <Target className="h-4 w-4 text-crm-primary" aria-hidden="true" />
            Ventas vs. meta del mes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-crm-text-muted">No se pudo cargar esta sección. Intente nuevamente.</p>
        </CardContent>
      </Card>
    );
  }

  const metaMonto = sumarCampo(actual, "meta_ventas_monto");
  const realMonto = sumarCampo(actual, "real_ventas_monto");
  const metaCantidad = sumarCampo(actual, "meta_ventas_cantidad");
  const realCantidad = sumarCampo(actual, "real_ventas_cantidad");
  const realMontoAnterior = sumarCampo(anterior, "real_ventas_monto");

  if (actual.length === 0 || metaMonto <= 0) {
    return (
      <Card variant="elevated">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-crm-text-primary">
            <Target className="h-4 w-4 text-crm-primary" aria-hidden="true" />
            Ventas vs. meta del mes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-crm-text-muted">Aún no hay metas asignadas este mes.</p>
        </CardContent>
      </Card>
    );
  }

  const progreso = calcularProgresoMeta(realMonto, metaMonto);
  const delta = calcularDeltaMensual(realMonto, realMontoAnterior);

  return (
    <Card variant="elevated">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-crm-text-primary">
          <Target className="h-4 w-4 text-crm-primary" aria-hidden="true" />
          Ventas vs. meta del mes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-semibold text-crm-text-primary">{formatearMoneda(realMonto, "PEN")}</span>
          <span className="text-xs text-crm-text-muted">de {formatearMoneda(metaMonto, "PEN")}</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-crm-border">
          <div
            className="h-full rounded-full bg-crm-primary transition-[width] duration-200 ease-out-strong"
            style={{ width: `${progreso}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-crm-text-muted">
          <span>
            {progreso}% de la meta · {realCantidad}/{metaCantidad} unidades
          </span>
          {delta !== null && (
            <span
              className={`inline-flex items-center gap-1 font-semibold ${
                delta >= 0 ? "text-crm-success" : "text-crm-danger"
              }`}
            >
              {delta >= 0 ? (
                <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {delta >= 0 ? "+" : ""}
              {delta}% vs. mes anterior
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
