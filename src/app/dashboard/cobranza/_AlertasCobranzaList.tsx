"use client";

import { useCallback, useEffect, useState } from "react";
import { BellRing, MessageCircle, CheckCircle2, Clock } from "lucide-react";
import toast from "react-hot-toast";
import { obtenerAlertasCobranza } from "./_actions-cobranza";
import { buildReminderMessage, tipoAlertaLabel, type TipoAlertaCobranza } from "@/lib/cobranza/tiers";
import { buildWhatsAppUrl } from "@/lib/marketing/whatsapp";
import { formatearMoneda, type Moneda } from "@/lib/types/crm-flujo";
import GestionCobranzaModal from "./_GestionCobranzaModal";

interface AlertaClienteContext {
  id: string;
  nombre: string;
  telefono: string | null;
  telefono_whatsapp: string | null;
  vendedor_username: string | null;
}

interface AlertaCuotaContext {
  id: string;
  numero_cuota: number;
  monto_programado: number;
  moneda: string;
  fecha_vencimiento: string;
  venta: {
    id: string;
    codigo_venta: string;
    cliente: AlertaClienteContext | null;
  } | null;
}

interface AlertaCobranzaRow {
  id: string;
  tipo_alerta: TipoAlertaCobranza;
  fecha_alerta: string;
  canal: string;
  enviada: boolean;
  gestionada: boolean;
  gestionada_at: string | null;
  cuota: AlertaCuotaContext | null;
}

const TIER_BADGE: Record<string, string> = {
  por_vencer_15d: "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300",
  por_vencer_7d: "bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300",
  por_vencer_3d: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200",
  vencida: "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300",
  mora: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200",
};

function SkeletonRow() {
  return (
    <div className="border border-crm-border rounded-lg p-4 animate-pulse" aria-hidden="true">
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 space-y-2">
          <div className="h-4 w-40 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-3 w-64 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
        <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
    </div>
  );
}

export default function AlertasCobranzaList() {
  const [items, setItems] = useState<AlertaCobranzaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [gestionAlerta, setGestionAlerta] = useState<AlertaCobranzaRow | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const result = await obtenerAlertasCobranza();
    if (result.success) {
      setItems((result.data || []) as unknown as AlertaCobranzaRow[]);
    } else {
      toast.error(result.error || "No se pudieron cargar las alertas de cobranza");
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const gestionCliente = gestionAlerta?.cuota?.venta?.cliente ?? null;

  return (
    <div className="space-y-3">
      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => <SkeletonRow key={i} />)}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-crm-text-muted">
          <BellRing className="h-12 w-12 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No hay alertas de cobranza por ahora</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((alerta) => {
            const cuota = alerta.cuota;
            const cliente = cuota?.venta?.cliente ?? null;
            const telefono = cliente?.telefono_whatsapp || cliente?.telefono || null;

            let waUrl: string | null = null;
            if (telefono && cuota) {
              try {
                const mensaje = buildReminderMessage({
                  clienteNombre: cliente?.nombre ?? "cliente",
                  numeroCuota: cuota.numero_cuota,
                  monto: cuota.monto_programado,
                  moneda: cuota.moneda,
                  fechaVencimiento: cuota.fecha_vencimiento,
                });
                waUrl = buildWhatsAppUrl(telefono, mensaje);
              } catch {
                waUrl = null;
              }
            }

            return (
              <div
                key={alerta.id}
                className={`border rounded-lg p-4 ${
                  alerta.gestionada ? "border-crm-border bg-crm-card" : "border-crm-border/70 bg-crm-background"
                }`}
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {cliente ? (
                        <a
                          href={`/dashboard/clientes/${cliente.id}`}
                          className="text-base font-semibold text-crm-primary hover:underline"
                        >
                          {cliente.nombre}
                        </a>
                      ) : (
                        <span className="text-base font-semibold text-crm-text">Cliente no disponible</span>
                      )}
                      {cuota?.venta?.codigo_venta && (
                        <span className="font-mono text-xs text-crm-text-muted">{cuota.venta.codigo_venta}</span>
                      )}
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TIER_BADGE[alerta.tipo_alerta] ?? "bg-gray-100 text-gray-700"}`}>
                        {tipoAlertaLabel(alerta.tipo_alerta)}
                      </span>
                      {alerta.gestionada ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                          <CheckCircle2 className="h-3 w-3" /> Gestionada
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                          <Clock className="h-3 w-3" /> Pendiente
                        </span>
                      )}
                    </div>
                    {cuota && (
                      <div className="text-xs text-crm-text-muted mt-1 flex items-center gap-3 flex-wrap">
                        <span>Cuota #{cuota.numero_cuota}</span>
                        <span>Venc: {new Date(cuota.fecha_vencimiento).toLocaleDateString("es-PE")}</span>
                        <span className="font-medium text-crm-text">
                          {formatearMoneda(cuota.monto_programado, cuota.moneda as Moneda)}
                        </span>
                      </div>
                    )}
                    <div className="text-xs text-crm-text-muted mt-1">
                      Alerta generada el {new Date(alerta.fecha_alerta).toLocaleDateString("es-PE")}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {waUrl && (
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Enviar recordatorio por WhatsApp"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-[background-color,transform] duration-200 ease-out-strong active:scale-[0.97]"
                      >
                        <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                      </a>
                    )}
                    {cuota && cliente && (
                      <button
                        onClick={() => setGestionAlerta(alerta)}
                        className="px-2.5 py-1.5 text-xs font-medium border border-crm-border text-crm-text-muted rounded-lg hover:bg-crm-background transition-[background-color,transform] duration-200 ease-out-strong active:scale-[0.97]"
                      >
                        Registrar gestión
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {gestionAlerta && gestionAlerta.cuota && gestionCliente && (
        <GestionCobranzaModal
          alertaId={gestionAlerta.id}
          cuotaId={gestionAlerta.cuota.id}
          clienteId={gestionCliente.id}
          clienteNombre={gestionCliente.nombre}
          numeroCuota={gestionAlerta.cuota.numero_cuota}
          onClose={() => setGestionAlerta(null)}
          onSuccess={() => loadData()}
        />
      )}
    </div>
  );
}
