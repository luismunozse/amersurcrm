export default function ReportesProyectoLoading() {
  return (
    <div className="w-full p-3 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="h-4 w-24 bg-crm-border/30 rounded animate-pulse" />
        <span className="text-crm-text-muted">/</span>
        <div className="h-4 w-32 bg-crm-border/40 rounded animate-pulse" />
      </div>

      {/* Título */}
      <div className="space-y-2">
        <div className="h-7 md:h-9 w-64 bg-crm-border/40 rounded animate-pulse" />
        <div className="h-4 w-48 bg-crm-border/30 rounded animate-pulse" />
      </div>

      {/* KPI cards row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="crm-card p-4 space-y-2">
            <div className="h-3 w-20 bg-crm-border/30 rounded animate-pulse" />
            <div className="h-8 w-24 bg-crm-border/40 rounded animate-pulse" />
            <div className="h-2 w-full bg-crm-border/30 rounded-full animate-pulse" />
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="crm-card p-4 md:p-6 space-y-3">
          <div className="h-5 w-40 bg-crm-border/40 rounded animate-pulse" />
          <div className="h-64 bg-crm-border/30 rounded animate-pulse" />
        </div>
        <div className="crm-card p-4 md:p-6 space-y-3">
          <div className="h-5 w-40 bg-crm-border/40 rounded animate-pulse" />
          <div className="h-64 bg-crm-border/30 rounded animate-pulse" />
        </div>
      </div>

      {/* Tabla vendedores */}
      <div className="crm-card p-4 md:p-6 space-y-3">
        <div className="h-5 w-48 bg-crm-border/40 rounded animate-pulse" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 py-2 border-b border-crm-border/40"
            >
              <div className="h-8 w-8 rounded-full bg-crm-border/40 animate-pulse" />
              <div className="h-4 flex-1 bg-crm-border/30 rounded animate-pulse" />
              <div className="h-4 w-16 bg-crm-border/30 rounded animate-pulse" />
              <div className="h-4 w-24 bg-crm-border/30 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
