export default function ProyectosLoading() {
  return (
    <div className="w-full p-3 md:p-6 space-y-4 md:space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-2 flex-1">
          <div className="h-6 md:h-8 w-32 bg-crm-border/40 rounded animate-pulse" />
          <div className="hidden md:block h-4 w-72 bg-crm-border/30 rounded animate-pulse" />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="h-9 w-24 bg-crm-border/40 rounded-lg animate-pulse" />
          <div className="hidden md:block h-9 w-28 bg-crm-border/40 rounded-lg animate-pulse" />
        </div>
      </div>

      {/* Form crear skeleton (desktop only) */}
      <div className="hidden lg:block crm-card p-4 md:p-6">
        <div className="h-14 bg-crm-border/30 rounded-lg animate-pulse" />
      </div>

      {/* Grid cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="crm-card rounded-xl md:rounded-2xl overflow-hidden flex flex-row md:flex-col"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="w-28 h-28 md:w-full md:h-56 shrink-0 bg-crm-border/40 animate-pulse" />
            <div className="flex-1 p-3 md:p-5 space-y-3">
              <div className="space-y-2">
                <div className="h-5 md:h-6 w-3/4 bg-crm-border/40 rounded animate-pulse" />
                <div className="h-3 md:h-4 w-1/2 bg-crm-border/30 rounded animate-pulse" />
              </div>
              <div className="hidden md:grid grid-cols-4 gap-2 py-3 border-y border-crm-border">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="text-center space-y-1">
                    <div className="h-7 w-10 mx-auto bg-crm-border/40 rounded animate-pulse" />
                    <div className="h-2 w-12 mx-auto bg-crm-border/30 rounded animate-pulse" />
                  </div>
                ))}
              </div>
              <div className="h-2 w-full bg-crm-border/30 rounded-full animate-pulse" />
              <div className="hidden md:block h-9 w-full bg-crm-primary/20 rounded-lg animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
