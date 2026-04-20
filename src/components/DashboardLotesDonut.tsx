import Link from "next/link";
import { PieChart, ChevronRight } from "lucide-react";
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
            <PieChart className="w-5 h-5 text-crm-primary" aria-hidden="true" />
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
            <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
