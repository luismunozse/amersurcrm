import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { getCachedDashboardStats } from '@/lib/cache.server';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
}

function StatCard({ title, value, change, changeType = 'neutral', icon, color = 'primary' }: StatCardProps) {
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
        {change && (
          <p className={`text-xs ${changeClasses[changeType]} mt-1`}>
            {change}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export async function DashboardStats() {
  const stats = await getCachedDashboardStats();
  
  const statsData = [
    {
      title: "Total Clientes",
      value: stats.totalClientes.toLocaleString(),
      change: "Datos en tiempo real",
      changeType: "neutral" as const,
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
      change: "Datos en tiempo real",
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
      change: "Datos en tiempo real",
      changeType: "neutral" as const,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: "success" as const,
    },
    {
      title: "Sistema Activo",
      value: "100%",
      change: "Todos los servicios funcionando",
      changeType: "positive" as const,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: "info" as const,
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

