import { BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { getVentasMensuales } from "@/lib/dashboard/command-center.server";
import VentasMensualesChart from "@/app/dashboard/proyectos/[id]/reportes/_VentasMensualesChart";
import type { EquipoScope } from "@/lib/auth/equipo-scope.server";

interface VentasChartBlockProps {
  scope: EquipoScope;
}

/**
 * Command center zone ③ "Ventas" — org-wide monthly sales trend, last 6
 * months. Reuses the shared `_VentasMensualesChart` (a plain SVG/flexbox
 * component, NOT recharts — it declares its own `"use client"` at the top,
 * so a plain import here is enough for Next.js to create the client
 * boundary; no `next/dynamic`/`ssr:false` needed, matching exactly how
 * `reportes/page.tsx` wires it in).
 */
export async function VentasChartBlock({ scope }: VentasChartBlockProps) {
  let data: Awaited<ReturnType<typeof getVentasMensuales>>;
  try {
    data = await getVentasMensuales(scope);
  } catch (error) {
    console.error("Error cargando ventas mensuales:", error);
    return (
      <Card variant="elevated">
        <CardContent className="flex items-center gap-3 p-6">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-crm-danger/10 text-crm-danger">
            <BarChart3 className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold text-crm-text-primary">No se pudo cargar esta sección</p>
            <p className="text-xs text-crm-text-muted">Intente nuevamente en unos momentos.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalVentas = Object.values(data).reduce((a, b) => a + b, 0);

  return (
    <Card variant="elevated" className="flex h-full flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-crm-text-primary">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-crm-primary/10 text-crm-primary">
              <BarChart3 className="h-4 w-4" aria-hidden="true" />
            </span>
            Ventas mensuales
          </CardTitle>
          <span className="rounded-full bg-crm-success/10 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-crm-success">
            {totalVentas} en 6 meses
          </span>
        </div>
        <CardDescription className="mt-2 text-xs">Ventas cerradas en los últimos 6 meses</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-center">
        <VentasMensualesChart data={data} />
      </CardContent>
    </Card>
  );
}
