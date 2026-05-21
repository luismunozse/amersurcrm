export default function ProyectoDetailLoading() {
  return (
    <div className="w-full p-3 md:p-6 space-y-4 md:space-y-6">
      {/* Header con breadcrumb */}
      <div className="flex items-center gap-2">
        <div className="h-4 w-16 bg-crm-border/30 rounded animate-pulse" />
        <span className="text-crm-text-muted">/</span>
        <div className="h-4 w-40 bg-crm-border/40 rounded animate-pulse" />
      </div>

      {/* Galería header */}
      <div className="crm-card p-4 md:p-6">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr),minmax(0,1fr)]">
          <div className="h-48 sm:h-60 rounded-2xl bg-crm-border/40 animate-pulse" />
          <div className="space-y-3">
            <div className="h-4 w-32 bg-crm-border/40 rounded animate-pulse" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-24 rounded-xl bg-crm-border/30 animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs skeleton */}
      <div className="flex gap-2 border-b border-crm-border">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 w-24 bg-crm-border/30 rounded-t-lg animate-pulse" />
        ))}
      </div>

      {/* Tabla lotes skeleton */}
      <div className="space-y-3">
        <div className="grid grid-cols-12 gap-3 px-4 py-3 bg-crm-card-hover rounded-lg">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className={`h-4 bg-crm-border/40 rounded animate-pulse ${
                i === 0 ? "col-span-2" : i === 1 ? "col-span-2" : i === 7 ? "col-span-2" : "col-span-1"
              }`}
            />
          ))}
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="grid grid-cols-12 gap-3 px-4 py-4 bg-crm-card border border-crm-border rounded-lg"
          >
            {Array.from({ length: 8 }).map((_, j) => (
              <div
                key={j}
                className={`h-5 bg-crm-border/30 rounded animate-pulse ${
                  j === 0 ? "col-span-2" : j === 1 ? "col-span-2" : j === 7 ? "col-span-2" : "col-span-1"
                }`}
                style={{ animationDelay: `${(i * 80) + (j * 30)}ms` }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
