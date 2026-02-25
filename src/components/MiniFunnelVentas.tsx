import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { getCachedFunnelClientes } from "@/lib/cache.server";

const funnelStages = [
  { key: "por_contactar", label: "Por contactar", color: "bg-gray-400", description: "Leads nuevos sin primer contacto" },
  { key: "contactado", label: "Contactado", color: "bg-blue-500", description: "Primer acercamiento realizado" },
  { key: "intermedio", label: "En proceso", color: "bg-purple-500", description: "Interesados, negociando" },
  { key: "potencial", label: "Potencial", color: "bg-amber-500", description: "Alta probabilidad de cierre" },
  { key: "transferido", label: "Transferido", color: "bg-green-500", description: "Derivado a cierre" },
  { key: "desestimado", label: "Desestimado", color: "bg-red-400", description: "No viable" },
] as const;

export async function MiniFunnelVentas() {
  const funnel = await getCachedFunnelClientes();
  const total = Object.values(funnel).reduce((a, b) => a + b, 0);

  if (total === 0) {
    return (
      <Card variant="elevated" className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-crm-text-primary">
            <svg className="w-5 h-5 text-crm-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
            </svg>
            Pipeline de ventas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-crm-text-muted text-center py-6">No hay clientes registrados</p>
        </CardContent>
      </Card>
    );
  }

  // Calcular la tasa de avance (excluyendo desestimados)
  const activos = total - (funnel.desestimado ?? 0);
  const avanzados = (funnel.intermedio ?? 0) + (funnel.potencial ?? 0) + (funnel.transferido ?? 0);
  const tasaAvance = activos > 0 ? Math.round((avanzados / activos) * 100) : 0;

  return (
    <Card variant="elevated" className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-crm-text-primary">
            <svg className="w-5 h-5 text-crm-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
            </svg>
            Pipeline de ventas
          </CardTitle>
          <span className="text-xs font-medium text-crm-text-muted">
            {total} clientes
          </span>
        </div>
        <CardDescription className="text-sm">
          Distribución de clientes por etapa del proceso de venta
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {funnelStages.map((stage) => {
          const count = funnel[stage.key] ?? 0;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          const barWidth = total > 0 ? Math.max((count / total) * 100, count > 0 ? 4 : 0) : 0;

          return (
            <div key={stage.key} className="group">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className={`inline-block h-2.5 w-2.5 rounded-full ${stage.color}`} />
                  <span className="text-sm font-medium text-crm-text-primary">{stage.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-crm-text-primary">{count}</span>
                  <span className="text-xs text-crm-text-muted w-8 text-right">{pct}%</span>
                </div>
              </div>
              <div className="h-2 rounded-full bg-crm-border/50 overflow-hidden">
                <div
                  className={`h-full rounded-full ${stage.color} transition-all duration-500`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>
          );
        })}

        {/* Tasa de avance */}
        <div className="mt-4 pt-3 border-t border-crm-border/60">
          <div className="flex items-center justify-between">
            <span className="text-xs text-crm-text-muted">Tasa de avance en pipeline</span>
            <span className={`text-sm font-bold ${tasaAvance >= 30 ? 'text-crm-success' : tasaAvance >= 15 ? 'text-crm-warning' : 'text-crm-danger'}`}>
              {tasaAvance}%
            </span>
          </div>
          <p className="text-[10px] text-crm-text-muted mt-0.5">
            {avanzados} de {activos} clientes activos avanzaron de etapa
          </p>
        </div>

        <Link
          href="/dashboard/clientes"
          className="flex items-center justify-center gap-1 pt-1 text-xs font-semibold text-crm-primary hover:text-crm-primary/80 transition"
        >
          Gestionar pipeline
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </CardContent>
    </Card>
  );
}
