import Link from "next/link";
import { differenceInCalendarDays } from "date-fns";
import { ChevronRight, Flame } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { getCachedFunnelClientes } from "@/lib/cache.server";
import { getAgingLeads } from "@/lib/dashboard/command-center.server";
import { getEstadoClienteLabel, type EstadoCliente } from "@/lib/types/clientes";

interface FunnelAgingBlockProps {
  esGlobal: boolean;
}

function contactoLabel(ultimoContacto: string | null): string {
  if (!ultimoContacto) return "Sin contacto registrado";
  const dias = differenceInCalendarDays(new Date(), new Date(ultimoContacto));
  return `${dias}d sin contacto`;
}

function ErrorCard() {
  return (
    <Card variant="elevated">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-crm-text-primary">Funnel y leads en seguimiento</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-crm-text-muted">No se pudo cargar esta sección. Intente nuevamente.</p>
      </CardContent>
    </Card>
  );
}

/**
 * Command center block ① — funnel by stage + aging leads (design.md §2, §4;
 * spec.md "Gerencia/coordinador command center priority order"). The
 * strongest color weight on the page: aging is "dónde está el fuego".
 *
 * Deviation note: design's visual-hierarchy prose says the aging counter
 * links to "the filtered pipeline", but `_PipelineBoard.tsx`'s urgency
 * filter is client-side `useState`, not a URL query param — there is no
 * pipeline URL that pre-filters to aging leads today. Links to the
 * unfiltered `/dashboard/pipeline` instead so the label and destination
 * agree (same reasoning as PR1b's `LeadsSinContactar` link deviation).
 */
export async function FunnelAgingBlock({ esGlobal }: FunnelAgingBlockProps) {
  let funnel: Record<string, number>;
  let aging: Awaited<ReturnType<typeof getAgingLeads>>;
  try {
    [funnel, aging] = await Promise.all([getCachedFunnelClientes(), getAgingLeads(esGlobal)]);
  } catch (error) {
    console.error("Error cargando funnel y leads en seguimiento:", error);
    return <ErrorCard />;
  }

  const distribucion = Object.entries(funnel)
    .filter(([, cantidad]) => cantidad > 0)
    .sort(([, a], [, b]) => b - a);
  const totalLeads = distribucion.reduce((acc, [, cantidad]) => acc + cantidad, 0);
  const maxCantidad = distribucion[0]?.[1] ?? 1;

  return (
    <Card variant="elevated">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-crm-text-primary">Funnel y leads en seguimiento</CardTitle>
        <CardDescription className="text-xs">Distribución de clientes por etapa, {totalLeads} en total</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <Link
          href="/dashboard/pipeline"
          className="flex items-center justify-between gap-3 rounded-xl border border-crm-danger/30 bg-crm-danger/5 px-4 py-3 transition-[border-color,background-color] duration-200 ease-out-strong hover:border-crm-danger/50 active:scale-[0.99]"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-crm-danger/15 text-crm-danger">
              <Flame className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-2xl font-bold leading-none text-crm-danger">
                {aging.count}
                {!aging.isExact && "+"}
              </p>
              <p className="mt-1 text-xs font-medium text-crm-text-muted">
                leads sin gestionar hace más de 3 días
              </p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-crm-text-muted" aria-hidden="true" />
        </Link>

        {aging.top.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {aging.top.map((lead) => (
              <Link
                key={lead.id}
                href={`/dashboard/clientes/${lead.id}`}
                className="flex items-center gap-1.5 rounded-full border border-crm-border/60 bg-crm-card px-3 py-1 text-xs text-crm-text-primary transition-colors hover:border-crm-danger/40"
              >
                <span className="max-w-[9rem] truncate font-medium">{lead.nombre}</span>
                <span className="text-crm-text-muted">· {contactoLabel(lead.ultimo_contacto)}</span>
              </Link>
            ))}
          </div>
        )}

        {distribucion.length === 0 ? (
          <p className="text-sm text-crm-text-muted">Sin clientes registrados todavía.</p>
        ) : (
          <div className="space-y-2.5">
            {distribucion.map(([estado, cantidad]) => {
              const pct = totalLeads > 0 ? Math.round((cantidad / totalLeads) * 100) : 0;
              return (
                <Link
                  key={estado}
                  href={`/dashboard/clientes?estado=${estado}`}
                  className="group flex items-center gap-3 rounded-lg px-1 py-1 transition-colors hover:bg-crm-card-hover"
                >
                  <span className="w-24 shrink-0 truncate text-xs font-medium text-crm-text-secondary">
                    {getEstadoClienteLabel(estado as EstadoCliente)}
                  </span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-crm-border">
                    <div
                      className="h-full rounded-full bg-crm-primary/60 transition-[width] duration-200 ease-out-strong group-hover:bg-crm-primary"
                      style={{ width: `${Math.max((cantidad / maxCantidad) * 100, 4)}%` }}
                    />
                  </div>
                  <span className="w-10 shrink-0 text-right text-xs font-semibold tabular-nums text-crm-text-primary">
                    {cantidad} · {pct}%
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
