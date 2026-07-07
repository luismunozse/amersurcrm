import Link from "next/link";
import { ClipboardCheck, Check, User, ChevronRight } from "lucide-react";
import { Card, CardContent, CardDescription } from "@/components/ui/Card";
import { getCachedSeguimientosHoy } from "@/lib/cache.server";
import type { SeguimientoHoy } from "@/lib/cache.server";
import { differenceInCalendarDays } from "date-fns";

const estadoLabels: Record<string, string> = {
  por_contactar: "Por contactar",
  contactado: "Contactado",
  intermedio: "En proceso",
  potencial: "Potencial",
};

const estadoColors: Record<string, string> = {
  por_contactar: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  contactado: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  intermedio: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  potencial: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
};

// Exported for direct unit testing (mirrors the `_PipelineCard.tsx` pattern).
// Reads `fecha_proxima_accion` (cliente_interaccion, TIMESTAMPTZ) — never
// `proxima_accion`, which is only the enum action label (see ADR-7).
export function getUrgencia(cliente: SeguimientoHoy): { label: string; color: string } {
  if (cliente.fecha_proxima_accion) {
    const dias = differenceInCalendarDays(new Date(cliente.fecha_proxima_accion), new Date());
    if (dias < 0) return { label: `Vencido hace ${Math.abs(dias)}d`, color: "text-crm-danger" };
    if (dias === 0) return { label: "Para hoy", color: "text-crm-warning font-semibold" };
    return { label: `En ${dias}d`, color: "text-crm-text-muted" };
  }
  if (!cliente.ultimo_contacto) {
    return { label: "Sin contacto", color: "text-crm-danger" };
  }
  const dias = differenceInCalendarDays(new Date(), new Date(cliente.ultimo_contacto));
  return { label: `${dias}d sin contacto`, color: dias >= 7 ? "text-crm-danger" : "text-crm-warning" };
}

// Presentation-only helper: maps `getUrgencia().color` (a text-color class,
// asserted verbatim by unit tests) to a matching tinted chip background.
// Never touches the color string itself, so existing `toContain` assertions
// on `urgencia.color` stay valid.
function urgenciaChipBg(color: string): string {
  if (color.includes("crm-danger")) return "bg-crm-danger/10";
  if (color.includes("crm-warning")) return "bg-crm-warning/10";
  return "bg-crm-border/60";
}

export async function SeguimientosHoy() {
  let seguimientos: SeguimientoHoy[];
  try {
    seguimientos = await getCachedSeguimientosHoy();
  } catch (error) {
    console.error("Error cargando seguimientos de hoy:", error);
    return (
      <Card variant="elevated" className="h-full">
        <CardContent className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-crm-danger/10 text-crm-danger">
            <ClipboardCheck className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold text-crm-text-primary">No se pudo cargar esta sección</p>
            <p className="mt-1 text-xs text-crm-text-muted">Intente nuevamente en unos momentos.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (seguimientos.length === 0) {
    return (
      <Card variant="elevated" className="h-full">
        <CardContent className="flex h-full flex-col items-center justify-center gap-3 p-6 py-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-crm-success/10 text-crm-success">
            <Check className="h-7 w-7" aria-hidden="true" />
          </div>
          <div>
            <p className="text-base font-semibold text-crm-text-primary">Todo al día</p>
            <p className="mt-1 text-sm text-crm-text-muted">No hay seguimientos pendientes por hoy</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="elevated" className="h-full">
      <CardContent className="space-y-5 p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-crm-primary/10 text-crm-primary">
              <ClipboardCheck className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-3xl font-bold leading-none tabular-nums text-crm-text-primary">
                {seguimientos.length}
              </p>
              <p className="mt-1.5 text-xs font-medium text-crm-text-muted">Seguimientos de hoy</p>
            </div>
          </div>
          <CardDescription className="hidden text-sm sm:block">
            Clientes que necesitan su atención hoy
          </CardDescription>
        </div>

        <div className="space-y-2">
          {seguimientos.map((cliente) => {
            const urgencia = getUrgencia(cliente);
            return (
              <Link
                key={cliente.id}
                href={`/dashboard/clientes/${cliente.id}`}
                className="flex items-center gap-3 rounded-xl border border-crm-border/60 bg-crm-card p-3 transition-[border-color,box-shadow] duration-200 ease-out-strong hover:border-crm-primary/40 hover:shadow-crm active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-crm-primary/40"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-crm-primary/10 text-crm-primary">
                  <User className="w-4 h-4" aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-crm-text-primary truncate">{cliente.nombre}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${estadoColors[cliente.estado_cliente] ?? "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"}`}>
                      {estadoLabels[cliente.estado_cliente] ?? cliente.estado_cliente}
                    </span>
                    {cliente.telefono && (
                      <span className="text-[11px] text-crm-text-muted truncate">{cliente.telefono}</span>
                    )}
                  </div>
                </div>
                <span
                  className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${urgencia.color} ${urgenciaChipBg(urgencia.color)}`}
                >
                  {urgencia.label}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Block-level module link per spec (rows deep-link to the cliente record). */}
        <Link
          href="/dashboard/pipeline"
          className="flex items-center justify-center gap-1 pt-1 text-xs font-semibold text-crm-primary transition-colors hover:text-crm-primary/80"
        >
          Ver pipeline de acciones
          <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
        </Link>
      </CardContent>
    </Card>
  );
}
