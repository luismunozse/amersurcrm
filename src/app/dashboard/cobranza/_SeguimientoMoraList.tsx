"use client";

import { useEffect, useState, useTransition } from "react";
import {
  AlertTriangle, MessageCircle, Phone, Mail, RefreshCw, CreditCard, History, ExternalLink,
} from "lucide-react";
import { obtenerCobranza, ejecutarActualizacionMora } from "./_actions-cobranza";
import { formatearMoneda } from "@/lib/types/crm-flujo";
import toast from "react-hot-toast";
import RegistrarPagoModal from "./_RegistrarPagoModal";
import HistorialPagosCuota from "./_HistorialPagosCuota";

interface Props {
  esAdmin?: boolean;
}

function normalizarTelefono(telefono?: string | null): string | null {
  if (!telefono) return null;
  const limpio = telefono.replace(/[^\d+]/g, "");
  if (!limpio) return null;
  if (limpio.startsWith("+")) return limpio.slice(1);
  if (limpio.startsWith("51") && limpio.length >= 11) return limpio;
  return `51${limpio}`;
}

function mensajeRecordatorio(item: any): string {
  const saldo = (item.monto_programado ?? 0) - (item.monto_pagado ?? 0) + (item.monto_mora ?? 0);
  const moneda = item.moneda || "PEN";
  const fechaVenc = new Date(item.fecha_vencimiento).toLocaleDateString("es-PE");
  const dias = item.dias_atraso ?? 0;

  return (
    `Buen día ${item.cliente_nombre}, le escribo de Amersur. ` +
    `Le recordamos que la cuota #${item.numero_cuota} de su venta ${item.codigo_venta} ` +
    `por ${formatearMoneda(saldo, moneda)} vencía el ${fechaVenc}` +
    (dias > 0 ? ` y tiene ${dias} día${dias === 1 ? "" : "s"} de atraso. ` : ". ") +
    `Por favor comuníquese con nosotros para regularizar el pago. Gracias.`
  );
}

export default function SeguimientoMoraList({ esAdmin = false }: Props) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const [pagarCuota, setPagarCuota] = useState<any | null>(null);
  const [historialCuota, setHistorialCuota] = useState<any | null>(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const [vencidasRes, moraRes] = await Promise.all([
      obtenerCobranza({ estadoCobranza: "vencida" }),
      obtenerCobranza({ estadoCobranza: "en_mora" }),
    ]);
    const merged: any[] = [];
    if (vencidasRes.success && vencidasRes.data) merged.push(...vencidasRes.data);
    if (moraRes.success && moraRes.data) merged.push(...moraRes.data);
    merged.sort((a, b) => (b.dias_atraso ?? 0) - (a.dias_atraso ?? 0));
    setItems(merged);
    setLoading(false);
  }

  async function handleRecalcular() {
    startTransition(async () => {
      const result = await ejecutarActualizacionMora();
      if (result.success) {
        toast.success(`${result.data?.cuotas_actualizadas || 0} cuotas actualizadas`);
        loadData();
      } else toast.error(result.error || "Error");
    });
  }

  // Resumen calculado sobre items
  const totalSaldoMora = items.reduce(
    (sum, i) => sum + ((i.monto_programado ?? 0) - (i.monto_pagado ?? 0) + (i.monto_mora ?? 0)),
    0,
  );
  const promedioDias = items.length > 0
    ? Math.round(items.reduce((s, i) => s + (i.dias_atraso ?? 0), 0) / items.length)
    : 0;

  return (
    <div className="space-y-4">
      {/* Resumen de mora */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-xs text-red-700 dark:text-red-300 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" /> Cuotas en atraso
          </p>
          <p className="text-2xl font-bold text-red-700 dark:text-red-300">{items.length}</p>
        </div>
        <div className="bg-crm-card border border-crm-border rounded-lg p-4">
          <p className="text-xs text-crm-text-muted">Saldo total en mora</p>
          <p className="text-xl font-bold text-red-700">{formatearMoneda(totalSaldoMora, "PEN")}</p>
        </div>
        <div className="bg-crm-card border border-crm-border rounded-lg p-4">
          <p className="text-xs text-crm-text-muted">Promedio días atraso</p>
          <p className="text-2xl font-bold text-crm-text">{promedioDias}</p>
        </div>
        <div className="bg-crm-card border border-crm-border rounded-lg p-4 flex flex-col">
          <p className="text-xs text-crm-text-muted mb-2">Acciones</p>
          <button
            onClick={handleRecalcular}
            disabled={isPending}
            className="flex items-center justify-center gap-1 px-3 py-1.5 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} /> Recalcular Mora
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-crm-text-muted">Cargando...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-crm-text-muted">
          <AlertTriangle className="h-12 w-12 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No hay cuotas vencidas ni en mora</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item: any) => {
            const saldo = (item.monto_programado ?? 0) - (item.monto_pagado ?? 0);
            const enMora = item.estado_cobranza === "en_mora";
            const tel = normalizarTelefono(item.cliente_whatsapp ?? item.cliente_telefono);
            const msg = encodeURIComponent(mensajeRecordatorio(item));

            return (
              <div
                key={item.cuota_id}
                className={`border rounded-lg p-4 ${
                  enMora ? "border-red-300 bg-red-50/40" : "border-orange-300 bg-orange-50/30"
                }`}
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <a
                        href={`/dashboard/clientes/${item.cliente_id}`}
                        className="text-base font-semibold text-crm-primary hover:underline"
                      >
                        {item.cliente_nombre}
                      </a>
                      <span className="font-mono text-xs text-crm-text-muted">{item.codigo_venta}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        enMora ? "bg-red-200 text-red-800" : "bg-orange-100 text-orange-700"
                      }`}>
                        {enMora ? "En Mora" : "Vencida"}
                      </span>
                      <span className="text-xs text-red-700 font-bold">
                        {item.dias_atraso}d atraso
                      </span>
                    </div>
                    <div className="text-xs text-crm-text-muted mt-1 flex items-center gap-3 flex-wrap">
                      <span>Cuota #{item.numero_cuota}</span>
                      <span>Venc: {new Date(item.fecha_vencimiento).toLocaleDateString("es-PE")}</span>
                      <span>{item.proyecto_nombre}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-4 flex-wrap">
                      <div>
                        <span className="text-xs text-crm-text-muted">Saldo: </span>
                        <span className="font-bold text-red-700">{formatearMoneda(saldo, item.moneda)}</span>
                      </div>
                      {item.monto_mora > 0 && (
                        <div>
                          <span className="text-xs text-crm-text-muted">+ Mora: </span>
                          <span className="font-medium text-red-600">{formatearMoneda(item.monto_mora, item.moneda)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1.5">
                    <div className="flex items-center gap-1">
                      {tel && (
                        <a
                          href={`https://wa.me/${tel}?text=${msg}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Recordatorio por WhatsApp"
                          className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 inline-flex items-center gap-1"
                        >
                          <MessageCircle className="h-3 w-3" /> WhatsApp
                        </a>
                      )}
                      {item.cliente_telefono && (
                        <a
                          href={`tel:${item.cliente_telefono}`}
                          title="Llamar"
                          className="px-2 py-1 text-xs bg-crm-background border border-crm-border text-crm-text-muted rounded hover:bg-crm-card inline-flex items-center gap-1"
                        >
                          <Phone className="h-3 w-3" /> Llamar
                        </a>
                      )}
                      {item.cliente_email && (
                        <a
                          href={`mailto:${item.cliente_email}?subject=${encodeURIComponent(`Recordatorio cuota ${item.codigo_venta}`)}&body=${msg}`}
                          title="Enviar email"
                          className="px-2 py-1 text-xs bg-crm-background border border-crm-border text-crm-text-muted rounded hover:bg-crm-card inline-flex items-center gap-1"
                        >
                          <Mail className="h-3 w-3" /> Email
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {saldo > 0 && (
                        <button
                          onClick={() => setPagarCuota(item)}
                          className="px-2 py-1 text-xs bg-green-50 text-green-700 rounded hover:bg-green-100 inline-flex items-center gap-1"
                        >
                          <CreditCard className="h-3 w-3" /> Pagar
                        </button>
                      )}
                      <button
                        onClick={() => setHistorialCuota(item)}
                        className="px-2 py-1 text-xs bg-crm-background border border-crm-border text-crm-text-muted rounded hover:bg-crm-card inline-flex items-center gap-1"
                      >
                        <History className="h-3 w-3" /> Pagos
                      </button>
                      <a
                        href={`/dashboard/clientes/${item.cliente_id}`}
                        title="Abrir cliente"
                        className="px-2 py-1 text-xs bg-crm-primary/10 text-crm-primary rounded hover:bg-crm-primary/20 inline-flex items-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3" /> Abrir
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {pagarCuota && (
        <RegistrarPagoModal
          cuota={{
            cuotaId: pagarCuota.cuota_id,
            ventaId: pagarCuota.venta_id,
            clienteId: pagarCuota.cliente_id,
            numeroCuota: pagarCuota.numero_cuota,
            estado: pagarCuota.estado_cuota,
            montoProgramado: Number(pagarCuota.monto_programado) || 0,
            montoPagado: Number(pagarCuota.monto_pagado) || 0,
            montoMora: Number(pagarCuota.monto_mora) || 0,
            moneda: pagarCuota.moneda || "PEN",
          }}
          onClose={() => setPagarCuota(null)}
          onSuccess={() => loadData()}
        />
      )}

      {historialCuota && (
        <HistorialPagosCuota
          cuotaId={historialCuota.cuota_id}
          numeroCuota={historialCuota.numero_cuota}
          moneda={historialCuota.moneda || "PEN"}
          esAdmin={esAdmin}
          onClose={() => setHistorialCuota(null)}
          onChange={() => loadData()}
        />
      )}
    </div>
  );
}
