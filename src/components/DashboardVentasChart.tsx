import Link from "next/link";
import { BarChart3, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { getCachedVentasMensuales } from "@/lib/cache.server";
import VentasMensualesChart from "@/app/dashboard/proyectos/[id]/reportes/_VentasMensualesChart";

export async function DashboardVentasChart() {
  const data = await getCachedVentasMensuales();
  const totalVentas = Object.values(data).reduce((a, b) => a + b, 0);

  return (
    <Card variant="elevated" className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-crm-text-primary">
            <BarChart3 className="w-5 h-5 text-crm-primary" aria-hidden="true" />
            Ventas mensuales
          </CardTitle>
          <span className="rounded-full bg-crm-success/10 px-3 py-1 text-xs font-semibold text-crm-success">
            {totalVentas} total
          </span>
        </div>
        <CardDescription className="text-sm">Ventas cerradas en los últimos 6 meses</CardDescription>
      </CardHeader>
      <CardContent>
        <VentasMensualesChart data={data} />
        <div className="mt-3 flex justify-end">
          <Link
            href="/dashboard/admin/reportes"
            className="flex items-center gap-1 text-xs font-semibold text-crm-primary hover:text-crm-primary/80 transition"
          >
            Ver reportes completos
            <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
