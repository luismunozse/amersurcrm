import { Suspense } from 'react';
import { DashboardStats } from './DashboardStats';

// Loading skeleton para las estadísticas
function StatsLoading() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-crm-card border border-crm-border rounded-xl p-6 animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="h-4 bg-crm-border rounded w-24"></div>
            <div className="w-8 h-8 bg-crm-border rounded-lg"></div>
          </div>
          <div className="h-8 bg-crm-border rounded w-16 mb-2"></div>
          <div className="h-3 bg-crm-border rounded w-32"></div>
        </div>
      ))}
    </div>
  );
}

export function LazyDashboardStats() {
  return (
    <Suspense fallback={<StatsLoading />}>
      <DashboardStats />
    </Suspense>
  );
}

