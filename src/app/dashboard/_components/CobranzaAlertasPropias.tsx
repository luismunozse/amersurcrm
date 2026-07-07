import Link from "next/link";
import { AlertTriangle, CheckCircle2, ChevronRight } from "lucide-react";
import { Card, CardContent, CardDescription } from "@/components/ui/Card";
import { obtenerAlertasCobranza } from "@/app/dashboard/cobranza/_actions-cobranza";
import { formatearMoneda, type Moneda } from "@/lib/types/crm-flujo";

interface AlertaCobranzaCockpit {
  id: string;
  gestionada: boolean;
  cuota: {
    numero_cuota: number;
    monto_programado: number;
    moneda: string;
    fecha_vencimiento: string;
    venta: {
      cliente: { nombre: string } | null;
    } | null;
  } | null;
}

/**
 * Vendedor cockpit block (b) — own collection alerts (design.md §2, §4).
 * Reuses `obtenerAlertasCobranza()`, which already auto-scopes to the
 * caller's own clients when they lack `PAGOS.VER_TODOS`.
 */
export async function CobranzaAlertasPropias() {
  let alertas: AlertaCobranzaCockpit[];
  try {
    const result = await obtenerAlertasCobranza();
    alertas = (result.success ? result.data ?? [] : []) as unknown as AlertaCobranzaCockpit[];
  } catch (error) {
    console.error("Error cargando alertas de cobranza:", error);
    return (
      <Card variant="elevated">
        <CardContent className="flex items-center gap-3 p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-crm-danger/10 text-crm-danger">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold text-crm-text-primary">No se pudo cargar esta sección</p>
            <p className="text-xs text-crm-text-muted">Intente nuevamente en unos momentos.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const pendientes = alertas
    .filter((a) => !a.gestionada)
    .sort((a, b) => {
      const fa = a.cuota?.fecha_vencimiento ? new Date(a.cuota.fecha_vencimiento).getTime() : Infinity;
      const fb = b.cuota?.fecha_vencimiento ? new Date(b.cuota.fecha_vencimiento).getTime() : Infinity;
      return fa - fb;
    });

  if (pendientes.length === 0) {
    return (
      <Card variant="elevated">
        <CardContent className="flex items-center gap-3 p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-crm-success/10 text-crm-success">
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold text-crm-text-primary">Sin cobranzas vencidas</p>
            <p className="text-xs text-crm-text-muted">Sus cuotas propias están al día.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const top = pendientes.slice(0, 3);

  return (
    <Card variant="elevated" className="border-l-4 border-l-crm-danger/70">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-crm-danger/10 text-crm-danger">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-3xl font-bold leading-none tabular-nums text-crm-text-primary">
              {pendientes.length}
            </p>
            <p className="mt-1.5 text-xs font-medium text-crm-text-muted">Alertas de cobranza</p>
          </div>
        </div>
        <CardDescription className="text-xs">Cuotas propias pendientes de gestión</CardDescription>
        <div className="space-y-2">
          {top.map((alerta) => {
            const cliente = alerta.cuota?.venta?.cliente;
            return (
              <div
                key={alerta.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-crm-border/60 bg-crm-card px-3 py-2 text-sm"
              >
                <span className="truncate text-crm-text-primary">{cliente?.nombre ?? "Cliente"}</span>
                {alerta.cuota && (
                  <span className="whitespace-nowrap text-xs font-medium text-crm-text-muted">
                    {formatearMoneda(alerta.cuota.monto_programado, alerta.cuota.moneda as Moneda)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
        <Link
          href="/dashboard/cobranza?tab=alertas"
          className="flex items-center justify-center gap-1 pt-1 text-xs font-semibold text-crm-primary transition-colors hover:text-crm-primary/80"
        >
          Ver todas las alertas
          <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
        </Link>
      </CardContent>
    </Card>
  );
}
