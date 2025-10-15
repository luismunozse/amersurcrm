import { createServerOnlyClient } from "@/lib/supabase.server";
import { redirect } from "next/navigation";
import { ArrowLeftIcon, ChartBarIcon, TrendingUpIcon, UsersIcon, CurrencyDollarIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import VentasMensualesChart from "./_VentasMensualesChart";
import EstadoLotesChart from "./_EstadoLotesChart";
import TopVendedoresTable from "./_TopVendedoresTable";

export default async function ReportesProyectoPage({ params }: { params: { id: string } }) {
  const supabase = await createServerOnlyClient();

  // Obtener datos del proyecto
  const { data: proyecto, error: proyectoError } = await supabase
    .from('proyecto')
    .select('id, nombre, ubicacion, estado, created_at')
    .eq('id', params.id)
    .single();

  if (proyectoError || !proyecto) {
    redirect('/dashboard/proyectos');
  }

  // Obtener estadísticas de lotes
  const { data: lotes } = await supabase
    .from('lote')
    .select('id, estado, precio, moneda, created_at, vendedor_asignado')
    .eq('proyecto_id', params.id);

  const totalLotes = lotes?.length || 0;
  const lotesVendidos = lotes?.filter(l => l.estado === 'vendido').length || 0;
  const lotesReservados = lotes?.filter(l => l.estado === 'reservado').length || 0;
  const lotesDisponibles = lotes?.filter(l => l.estado === 'disponible').length || 0;

  // Calcular ingresos (solo lotes vendidos)
  const lotesVendidosData = lotes?.filter(l => l.estado === 'vendido') || [];
  const ingresosPEN = lotesVendidosData
    .filter(l => l.moneda === 'PEN')
    .reduce((sum, l) => sum + (l.precio || 0), 0);
  const ingresosUSD = lotesVendidosData
    .filter(l => l.moneda === 'USD')
    .reduce((sum, l) => sum + (l.precio || 0), 0);

  // Calcular ingresos proyectados (todos los lotes)
  const ingresosProyectadosPEN = lotes
    ?.filter(l => l.moneda === 'PEN')
    .reduce((sum, l) => sum + (l.precio || 0), 0) || 0;
  const ingresosProyectadosUSD = lotes
    ?.filter(l => l.moneda === 'USD')
    .reduce((sum, l) => sum + (l.precio || 0), 0) || 0;

  // Calcular porcentajes
  const porcentajeVendido = totalLotes > 0 ? Math.round((lotesVendidos / totalLotes) * 100) : 0;
  const porcentajeReservado = totalLotes > 0 ? Math.round((lotesReservados / totalLotes) * 100) : 0;
  const porcentajeDisponible = totalLotes > 0 ? Math.round((lotesDisponibles / totalLotes) * 100) : 0;

  // Estadísticas por vendedor
  const ventasPorVendedor: Record<string, { vendidos: number; ingresos: number }> = {};

  lotesVendidosData.forEach(lote => {
    if (lote.vendedor_asignado) {
      if (!ventasPorVendedor[lote.vendedor_asignado]) {
        ventasPorVendedor[lote.vendedor_asignado] = { vendidos: 0, ingresos: 0 };
      }
      ventasPorVendedor[lote.vendedor_asignado].vendidos += 1;

      // Convertir todo a PEN para simplificar (asumiendo tasa 1 USD = 3.8 PEN)
      const ingreso = lote.moneda === 'USD' ? (lote.precio || 0) * 3.8 : (lote.precio || 0);
      ventasPorVendedor[lote.vendedor_asignado].ingresos += ingreso;
    }
  });

  // Ventas por mes (últimos 6 meses)
  const ventasPorMes: Record<string, number> = {};
  const now = new Date();

  for (let i = 5; i >= 0; i--) {
    const fecha = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mes = fecha.toLocaleDateString('es-PE', { year: 'numeric', month: '2-digit' });
    ventasPorMes[mes] = 0;
  }

  lotesVendidosData.forEach(lote => {
    if (lote.created_at) {
      const fecha = new Date(lote.created_at);
      const mes = fecha.toLocaleDateString('es-PE', { year: 'numeric', month: '2-digit' });
      if (ventasPorMes.hasOwnProperty(mes)) {
        ventasPorMes[mes] += 1;
      }
    }
  });

  return (
    <div className="w-full p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href={`/dashboard/proyectos/${params.id}`}
            className="p-2 rounded-lg text-crm-text-secondary hover:text-crm-text-primary hover:bg-crm-card-hover transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-crm-text-primary">
              Reportes del Proyecto
            </h1>
            <p className="text-crm-text-muted mt-1">
              {proyecto.nombre}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
            proyecto.estado === 'activo'
              ? 'bg-green-100 text-green-700 border border-green-200'
              : proyecto.estado === 'pausado'
              ? 'bg-yellow-100 text-yellow-700 border border-yellow-200'
              : 'bg-red-100 text-red-700 border border-red-200'
          }`}>
            {proyecto.estado === 'activo' ? '● Activo' : proyecto.estado === 'pausado' ? '● Pausado' : '● Cerrado'}
          </span>
        </div>
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Lotes */}
        <div className="crm-card p-6 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-crm-primary/10 rounded-lg">
              <ChartBarIcon className="w-6 h-6 text-crm-primary" />
            </div>
          </div>
          <p className="text-3xl font-bold text-crm-text-primary">{totalLotes}</p>
          <p className="text-sm text-crm-text-muted mt-1">Total de Lotes</p>
        </div>

        {/* Lotes Vendidos */}
        <div className="crm-card p-6 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <TrendingUpIcon className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-green-600">{lotesVendidos}</p>
          <p className="text-sm text-crm-text-muted mt-1">
            Vendidos ({porcentajeVendido}%)
          </p>
          <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-600 transition-all duration-500"
              style={{ width: `${porcentajeVendido}%` }}
            />
          </div>
        </div>

        {/* Ingresos Reales */}
        <div className="crm-card p-6 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <CurrencyDollarIcon className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-blue-600">
            {ingresosPEN > 0 && `S/ ${ingresosPEN.toLocaleString()}`}
            {ingresosPEN > 0 && ingresosUSD > 0 && <br />}
            {ingresosUSD > 0 && `$ ${ingresosUSD.toLocaleString()}`}
          </p>
          <p className="text-sm text-crm-text-muted mt-1">Ingresos Reales</p>
        </div>

        {/* Ingresos Proyectados */}
        <div className="crm-card p-6 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <CurrencyDollarIcon className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-purple-600">
            {ingresosProyectadosPEN > 0 && `S/ ${ingresosProyectadosPEN.toLocaleString()}`}
            {ingresosProyectadosPEN > 0 && ingresosProyectadosUSD > 0 && <br />}
            {ingresosProyectadosUSD > 0 && `$ ${ingresosProyectadosUSD.toLocaleString()}`}
          </p>
          <p className="text-sm text-crm-text-muted mt-1">Potencial Total</p>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ventas Mensuales */}
        <div className="crm-card p-6 rounded-xl">
          <h3 className="text-lg font-semibold text-crm-text-primary mb-4">
            Ventas por Mes (Últimos 6 meses)
          </h3>
          <VentasMensualesChart data={ventasPorMes} />
        </div>

        {/* Estado de Lotes */}
        <div className="crm-card p-6 rounded-xl">
          <h3 className="text-lg font-semibold text-crm-text-primary mb-4">
            Distribución de Lotes
          </h3>
          <EstadoLotesChart
            vendidos={lotesVendidos}
            reservados={lotesReservados}
            disponibles={lotesDisponibles}
          />
        </div>
      </div>

      {/* Top Vendedores */}
      <div className="crm-card p-6 rounded-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-crm-accent/10 rounded-lg">
            <UsersIcon className="w-6 h-6 text-crm-accent" />
          </div>
          <h3 className="text-lg font-semibold text-crm-text-primary">
            Top Vendedores
          </h3>
        </div>
        <TopVendedoresTable data={ventasPorVendedor} />
      </div>

      {/* Información Adicional */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="crm-card p-4 rounded-xl border-l-4 border-yellow-500">
          <p className="text-sm font-medium text-crm-text-primary">Reservados</p>
          <p className="text-2xl font-bold text-yellow-600 mt-1">
            {lotesReservados} ({porcentajeReservado}%)
          </p>
        </div>
        <div className="crm-card p-4 rounded-xl border-l-4 border-crm-accent">
          <p className="text-sm font-medium text-crm-text-primary">Disponibles</p>
          <p className="text-2xl font-bold text-crm-accent mt-1">
            {lotesDisponibles} ({porcentajeDisponible}%)
          </p>
        </div>
        <div className="crm-card p-4 rounded-xl border-l-4 border-crm-primary">
          <p className="text-sm font-medium text-crm-text-primary">Tasa de Conversión</p>
          <p className="text-2xl font-bold text-crm-primary mt-1">
            {porcentajeVendido}%
          </p>
        </div>
      </div>
    </div>
  );
}
