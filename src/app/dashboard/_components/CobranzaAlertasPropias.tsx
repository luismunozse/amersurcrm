import Link from "next/link";
import { AlertTriangle, CheckCircle2, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
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
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-crm-text-primary">Alertas de cobranza</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-crm-text-muted">No se pudo cargar esta sección. Intente nuevamente.</p>
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
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-crm-text-primary">Alertas de cobranza</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 py-1 text-sm font-medium text-crm-success">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            Sin cobranzas vencidas
          </div>
        </CardContent>
      </Card>
    );
  }

  const top = pendientes.slice(0, 3);

  return (
    <Card variant="elevated">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-crm-text-primary">
            <AlertTriangle className="h-4 w-4 text-crm-danger" aria-hidden="true" />
            Alertas de cobranza
          </CardTitle>
          <span className="rounded-full bg-crm-danger/10 px-2.5 py-0.5 text-xs font-semibold text-crm-danger">
            {pendientes.length}
          </span>
        </div>
        <CardDescription className="text-xs">Cuotas propias pendientes de gestión</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
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
