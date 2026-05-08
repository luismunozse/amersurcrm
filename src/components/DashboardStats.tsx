import { ChevronUp, ChevronDown, Users, Building2, Package, DollarSign } from 'lucide-react';
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
      <ChevronUp className="w-3 h-3 inline mr-0.5" strokeWidth={2.5} aria-hidden="true" />
    ),
    negative: (
      <ChevronDown className="w-3 h-3 inline mr-0.5" strokeWidth={2.5} aria-hidden="true" />
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
        <Users className="w-4 h-4" />
      ),
      color: "primary" as const,
    },
    {
      title: "Proyectos Activos",
      value: stats.totalProyectos.toLocaleString(),
      change: "En tiempo real",
      changeType: "neutral" as const,
      icon: (
        <Building2 className="w-4 h-4" />
      ),
      color: "success" as const,
    },
    {
      title: "Total Lotes",
      value: stats.totalLotes.toLocaleString(),
      subtitle: `${pctDisponibles}% disponibles`,
      change: `${stats.lotesVendidos} vendidos / ${stats.lotesReservados} separados`,
      changeType: "neutral" as const,
      icon: (
        <Package className="w-4 h-4" />
      ),
      color: "info" as const,
    },
    {
      title: "Ventas del Mes",
      value: stats.ventasMesActual.toLocaleString(),
      change: ventasDelta.text,
      changeType: ventasDelta.type,
      icon: (
        <DollarSign className="w-4 h-4" />
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
