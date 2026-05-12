"use client";

import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { User, Phone, Clock } from "lucide-react";
import { formatCapacidadCompra } from "@/lib/types/clientes";
import type { PipelineCliente } from "@/lib/cache.server";
import { useClienteQuickView } from "@/components/ClienteQuickViewSheet";
import BotonEnviarWhatsApp from "@/components/marketing/BotonEnviarWhatsApp";

const PROXIMA_ACCION_LABEL: Record<string, string> = {
  llamar: "Llamar",
  enviar_propuesta: "Enviar propuesta",
  reunion: "Reunión",
  visita: "Visita",
  seguimiento: "Seguimiento",
  cierre: "Cierre",
  ninguna: "Sin acción",
  nada: "Sin acción",
};

export type Urgencia = "vencida" | "hoy" | "futura" | "sin_fecha";

const URGENCIA_STYLES: Record<Urgencia, { dot: string; pill: string; label: (txt: string) => string }> = {
  vencida: {
    dot: "bg-red-500",
    pill: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30",
    label: (txt) => `Vencida ${txt}`,
  },
  hoy: {
    dot: "bg-amber-500",
    pill: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
    label: (txt) => txt,
  },
  futura: {
    dot: "bg-emerald-500",
    pill: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    label: (txt) => txt,
  },
  sin_fecha: {
    dot: "bg-gray-400",
    pill: "bg-crm-bg-elevated text-crm-text-muted border-crm-border",
    label: () => "Sin próxima acción",
  },
};

export function getUrgencia(fecha: string | null): Urgencia {
  if (!fecha) return "sin_fecha";
  const ms = new Date(fecha).getTime() - Date.now();
  if (Number.isNaN(ms)) return "sin_fecha";
  if (ms < 0) return "vencida";
  if (ms < 2 * 24 * 3600 * 1000) return "hoy";
  return "futura";
}

interface Props {
  cliente: PipelineCliente;
  urgencia?: Urgencia;
  asLink?: boolean;
}

export default function PipelineCard({ cliente, urgencia, asLink = true }: Props) {
  const { open } = useClienteQuickView();
  const u = urgencia ?? getUrgencia(cliente.fecha_proxima_accion);
  const styles = URGENCIA_STYLES[u];
  const ultimoContacto = cliente.ultimo_contacto
    ? formatDistanceToNow(new Date(cliente.ultimo_contacto), { addSuffix: true, locale: es })
    : "sin contacto";
  const fechaProxima = cliente.fecha_proxima_accion
    ? formatDistanceToNow(new Date(cliente.fecha_proxima_accion), { addSuffix: true, locale: es })
    : "";

  const accionLabel = cliente.proxima_accion
    ? PROXIMA_ACCION_LABEL[cliente.proxima_accion] ?? cliente.proxima_accion
    : null;

  const inner = (
    <div className="rounded-lg border border-crm-border bg-crm-bg-elevated px-3 py-2.5 hover:border-crm-primary/50 hover:shadow-sm transition-all">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} aria-hidden="true" />
            <div className="text-[10px] font-mono text-crm-text-muted uppercase truncate">
              {cliente.codigo_cliente}
            </div>
          </div>
          <div className="text-sm font-semibold text-crm-text-primary truncate">
            {cliente.nombre}
          </div>
        </div>
        {cliente.capacidad_compra_estimada ? (
          <div className="text-xs font-semibold text-crm-primary shrink-0">
            {formatCapacidadCompra(cliente.capacidad_compra_estimada)}
          </div>
        ) : null}
      </div>

      <div className="mt-2 flex items-center gap-1.5 text-xs text-crm-text-muted">
        <User className="w-3 h-3" />
        <span className="truncate">{cliente.vendedor_username ?? "Sin asignar"}</span>
      </div>

      {accionLabel && accionLabel !== "Sin acción" ? (
        <div className="mt-1.5 inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-crm-primary/10 text-crm-primary">
          <Phone className="w-3 h-3" />
          {accionLabel}
        </div>
      ) : null}

      {u !== "sin_fecha" ? (
        <div className={`mt-1.5 inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border ${styles.pill}`}>
          <Clock className="w-3 h-3" />
          {styles.label(fechaProxima)}
        </div>
      ) : null}

      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="text-[11px] text-crm-text-muted truncate">
          Último contacto: {ultimoContacto}
        </div>
        {(cliente.telefono_whatsapp || cliente.telefono) && (
          <div onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}>
            <BotonEnviarWhatsApp
              telefono={cliente.telefono_whatsapp ?? cliente.telefono ?? ""}
              clienteId={cliente.id}
              clienteNombre={cliente.nombre}
              estadoCliente={cliente.estado_cliente ?? undefined}
              variablesAuto={{ vendedor: cliente.vendedor_username ?? "" }}
              label=""
              variant="ghost"
              className="w-7 h-7 !px-0 !py-0 justify-center text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30"
            />
          </div>
        )}
      </div>
    </div>
  );

  if (!asLink) return inner;

  return (
    <button
      type="button"
      onClick={() => open(cliente.id)}
      className="block w-full text-left"
    >
      {inner}
    </button>
  );
}
