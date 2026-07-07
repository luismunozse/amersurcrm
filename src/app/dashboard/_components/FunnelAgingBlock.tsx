import Link from "next/link";
import { differenceInCalendarDays } from "date-fns";
import { Archive, ChevronRight, Flame, Funnel } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { getCachedFunnelClientes, getCachedImportadosSinTrabajar } from "@/lib/cache.server";
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
      <CardContent className="flex items-center gap-3 p-6">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-crm-danger/10 text-crm-danger">
          <Funnel className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <p className="text-sm font-semibold text-crm-text-primary">No se pudo cargar esta sección</p>
          <p className="text-xs text-crm-text-muted">Intente nuevamente en unos momentos.</p>
        </div>
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
  let importadosSinTrabajar: number;
  try {
    [funnel, aging, importadosSinTrabajar] = await Promise.all([
      getCachedFunnelClientes(),
      getAgingLeads(esGlobal),
      getCachedImportadosSinTrabajar(),
    ]);
  } catch (error) {
    console.error("Error cargando funnel y leads en seguimiento:", error);
    return <ErrorCard />;
  }

  const distribucion = Object.entries(funnel)
    .filter(([, cantidad]) => cantidad > 0)
    .sort(([, a], [, b]) => b - a);
  const totalLeads = distribucion.reduce((acc, [, cantidad]) => acc + cantidad, 0);

  return (
    <Card variant="elevated" className="flex h-full flex-col border-l-4 border-l-crm-danger/70">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-crm-text-primary">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-crm-primary/10 text-crm-primary">
            <Funnel className="h-4 w-4" aria-hidden="true" />
          </span>
          Funnel y leads en seguimiento
        </CardTitle>
        <CardDescription className="text-xs">
          Distribución de clientes por etapa, {totalLeads.toLocaleString("es-PE")} en total
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 space-y-5">
        <Link
          href="/dashboard/pipeline"
          className="flex items-center justify-between gap-3 rounded-xl border border-crm-danger/30 bg-crm-danger/5 px-4 py-4 transition-[border-color,background-color] duration-200 ease-out-strong hover:border-crm-danger/50 active:scale-[0.99]"
        >
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-crm-danger/15 text-crm-danger">
              <Flame className="h-6 w-6" aria-hidden="true" />
            </span>
            <div>
              <p className="text-4xl font-bold leading-none tabular-nums text-crm-danger">
                {aging.count}
                {!aging.isExact && "+"}
              </p>
              <p className="mt-1.5 text-xs font-medium text-crm-text-muted">
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
          <div className="flex items-center gap-3 rounded-xl border border-crm-border/60 bg-crm-card px-4 py-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-crm-border/60 text-crm-text-muted">
              <Funnel className="h-4 w-4" aria-hidden="true" />
            </div>
            <p className="text-sm text-crm-text-muted">Sin clientes registrados todavía.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-crm-text-muted">
              Distribución por etapa
            </p>
            {distribucion.map(([estado, cantidad]) => {
              const pct = totalLeads > 0 ? (cantidad / totalLeads) * 100 : 0;
              // Rounding to 0% would misstate small-but-present stages.
              const pctLabel = pct >= 1 ? `${Math.round(pct)}%` : "<1%";
              return (
                <Link
                  key={estado}
                  href={`/dashboard/clientes?estado=${estado}`}
                  className="group block rounded-lg px-1 py-1.5 transition-colors hover:bg-crm-card-hover"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-xs font-medium text-crm-text-secondary">
                      {getEstadoClienteLabel(estado as EstadoCliente)}
                    </span>
                    <span className="shrink-0 text-xs tabular-nums">
                      <span className="font-semibold text-crm-text-primary">
                        {cantidad.toLocaleString("es-PE")}
                      </span>
                      <span className="text-crm-text-muted"> · {pctLabel}</span>
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-crm-border">
                    <div
                      className="h-full rounded-full bg-crm-primary/60 transition-colors duration-200 ease-out-strong group-hover:bg-crm-primary"
                      // Bars are share-of-total (part-to-whole), not scaled to the
                      // largest stage; 3px floor keeps tiny stages visible without
                      // overstating them.
                      style={{ width: `max(${pct.toFixed(2)}%, 3px)` }}
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Quiet "stock" stat — imported backlog never contacted, kept
            separate from the "flow" distribution above (product decision:
            bulk-imported contacts are backlog, not active pipeline). */}
        {importadosSinTrabajar > 0 && (
          <Link
            href="/dashboard/clientes?origen=importacion"
            className="flex items-center justify-between gap-3 border-t border-crm-border/60 px-1 pt-3 text-xs transition-colors duration-200 ease-out-strong hover:text-crm-text-primary"
          >
            <span className="flex items-center gap-2 text-crm-text-muted">
              <Archive className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Base importada sin trabajar
            </span>
            <span className="shrink-0 font-semibold tabular-nums text-crm-text-primary">
              {importadosSinTrabajar.toLocaleString("es-PE")}
            </span>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
