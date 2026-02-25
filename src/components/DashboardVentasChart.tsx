import Link from "next/link";
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
            <svg className="w-5 h-5 text-crm-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
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
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
