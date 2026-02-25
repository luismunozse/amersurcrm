import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { getCachedDashboardStats } from "@/lib/cache.server";
import EstadoLotesChart from "@/app/dashboard/proyectos/[id]/reportes/_EstadoLotesChart";

export async function DashboardLotesDonut() {
  const stats = await getCachedDashboardStats();

  return (
    <Card variant="elevated" className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-crm-text-primary">
            <svg className="w-5 h-5 text-crm-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
            </svg>
            Estado de lotes
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <EstadoLotesChart
          vendidos={stats.lotesVendidos}
          reservados={stats.lotesReservados}
          disponibles={stats.lotesDisponibles}
        />
        <div className="mt-3 flex justify-end">
          <Link
            href="/dashboard/propiedades"
            className="flex items-center gap-1 text-xs font-semibold text-crm-primary hover:text-crm-primary/80 transition"
          >
            Ver propiedades
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
