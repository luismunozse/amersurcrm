import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { getCachedDashboardStats } from '@/lib/cache.server';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  subtitle?: string;
}

function StatCard({ title, value, change, changeType = 'neutral', icon, color = 'primary', subtitle }: StatCardProps) {
  const colorClasses = {
    primary: 'text-crm-primary bg-crm-primary/10',
    success: 'text-crm-success bg-crm-success/10',
    warning: 'text-crm-warning bg-crm-warning/10',
    danger: 'text-crm-danger bg-crm-danger/10',
    info: 'text-crm-info bg-crm-info/10',
  };

  const changeClasses = {
    positive: 'text-crm-success',
    negative: 'text-crm-danger',
    neutral: 'text-crm-text-muted',
  };

  const changeIcons = {
    positive: (
      <svg className="w-3 h-3 inline mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
      </svg>
    ),
    negative: (
      <svg className="w-3 h-3 inline mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
      </svg>
    ),
    neutral: null,
  };

  return (
    <Card hover className="relative overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-crm-text-secondary">
          {title}
        </CardTitle>
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-crm-text-primary">{value}</div>
        {subtitle && (
          <p className="text-xs text-crm-text-muted mt-0.5">{subtitle}</p>
        )}
        {change && (
          <p className={`text-xs ${changeClasses[changeType]} mt-1 font-medium`}>
            {changeIcons[changeType]}
            {change}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function calcDelta(actual: number, anterior: number): { text: string; type: 'positive' | 'negative' | 'neutral' } {
  if (anterior === 0 && actual === 0) return { text: 'Sin cambios este mes', type: 'neutral' };
  if (anterior === 0) return { text: `+${actual} este mes`, type: 'positive' };
  const diff = actual - anterior;
  const pct = Math.round((diff / anterior) * 100);
  if (diff > 0) return { text: `+${pct}% vs mes anterior`, type: 'positive' };
  if (diff < 0) return { text: `${pct}% vs mes anterior`, type: 'negative' };
  return { text: 'Sin cambios vs mes anterior', type: 'neutral' };
}

export async function DashboardStats() {
  const stats = await getCachedDashboardStats();

  const clientesDelta = calcDelta(stats.clientesNuevosMes, stats.clientesNuevosMesAnterior);
  const ventasDelta = calcDelta(stats.ventasMesActual, stats.ventasMesAnterior);

  const pctDisponibles = stats.totalLotes > 0
    ? Math.round((stats.lotesDisponibles / stats.totalLotes) * 100)
    : 0;

  const statsData = [
    {
      title: "Total Clientes",
      value: stats.totalClientes.toLocaleString(),
      subtitle: `+${stats.clientesNuevosMes} nuevos este mes`,
      change: clientesDelta.text,
      changeType: clientesDelta.type,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
        </svg>
      ),
      color: "primary" as const,
    },
    {
      title: "Proyectos Activos",
      value: stats.totalProyectos.toLocaleString(),
      change: "En tiempo real",
      changeType: "neutral" as const,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      color: "success" as const,
    },
    {
      title: "Total Lotes",
      value: stats.totalLotes.toLocaleString(),
      subtitle: `${pctDisponibles}% disponibles`,
      change: `${stats.lotesVendidos} vendidos / ${stats.lotesReservados} reservados`,
      changeType: "neutral" as const,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      ),
      color: "info" as const,
    },
    {
      title: "Ventas del Mes",
      value: stats.ventasMesActual.toLocaleString(),
      change: ventasDelta.text,
      changeType: ventasDelta.type,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: stats.ventasMesActual > 0 ? "success" as const : "warning" as const,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {statsData.map((stat, index) => (
        <StatCard key={index} {...stat} />
      ))}
    </div>
  );
}
