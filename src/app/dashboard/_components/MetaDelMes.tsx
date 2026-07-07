import Link from "next/link";
import { Target } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
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
        <CardContent className="flex items-center gap-3 p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-crm-danger/10 text-crm-danger">
            <Target className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold text-crm-text-primary">No se pudo cargar esta sección</p>
            <p className="text-xs text-crm-text-muted">Intente nuevamente en unos momentos.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const metaVentasMonto = kpis.reduce((acc: number, k: any) => acc + (k.meta_ventas_monto ?? 0), 0);
  const realVentasMonto = kpis.reduce((acc: number, k: any) => acc + (k.real_ventas_monto ?? 0), 0);

  if (kpis.length === 0 || metaVentasMonto <= 0) {
    return (
      <Card variant="elevated">
        <CardContent className="flex items-center gap-3 p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-crm-primary/10 text-crm-primary">
            <Target className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold text-crm-text-primary">Aún no tiene una meta asignada</p>
            <p className="text-xs text-crm-text-muted">Su coordinador puede asignarle una meta este mes.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const progreso = calcularProgresoMeta(realVentasMonto, metaVentasMonto);

  return (
    <Card variant="elevated">
      <CardContent className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3 sm:shrink-0">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-crm-primary/10 text-crm-primary">
            <Target className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-3xl font-bold leading-none tabular-nums text-crm-text-primary">{progreso}%</p>
            <p className="mt-1.5 text-xs font-medium text-crm-text-muted">Meta mensual</p>
          </div>
        </div>

        <div className="flex-1 space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="text-lg font-semibold tabular-nums text-crm-text-primary">
              {formatearMoneda(realVentasMonto, "PEN")}
            </span>
            <span className="text-xs text-crm-text-muted">
              de {formatearMoneda(metaVentasMonto, "PEN")}
            </span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-crm-border">
            <div
              className="h-full rounded-full bg-gradient-to-r from-crm-primary to-crm-primary-hover transition-[width] duration-300 ease-out-strong"
              style={{ width: `${progreso}%` }}
            />
          </div>
        </div>

        <Link
          href="/dashboard/vendedor/reportes"
          className="inline-block shrink-0 text-xs font-semibold text-crm-primary transition-colors hover:text-crm-primary/80 sm:self-center"
        >
          Ver mis reportes
        </Link>
      </CardContent>
    </Card>
  );
}
