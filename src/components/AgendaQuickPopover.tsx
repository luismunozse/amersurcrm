"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  MapPin,
  Phone,
  Mail,
  Users,
  ListChecks,
  Bell,
  FileText,
  MessageSquare,
  type LucideIcon,
} from "lucide-react";
import { useSidebarBadges } from "@/hooks/useSidebarBadges";
import {
  obtenerResumenAgendaHoy,
  type ItemAgendaResumen,
} from "@/app/dashboard/agenda/actions-resumen";

const POLL_PROXIMO_MS = 60_000;
const VENTANA_PROXIMO_MIN = 60;

const tipoIcono: Record<string, LucideIcon> = {
  // eventos
  cita: Users,
  llamada: Phone,
  email: Mail,
  visita: MapPin,
  seguimiento: ListChecks,
  recordatorio: Bell,
  tarea: ListChecks,
  // recordatorios
  seguimiento_cliente: ListChecks,
  llamada_prospecto: Phone,
  envio_documentos: FileText,
  visita_propiedad: MapPin,
  reunion_equipo: Users,
  personalizado: Bell,
  envio_template_whatsapp: MessageSquare,
};

const prioridadColor: Record<string, string> = {
  baja: "text-slate-500",
  media: "text-blue-500",
  alta: "text-orange-500",
  urgente: "text-red-500",
};

function formatHora(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });
}

export default function AgendaQuickPopover() {
  const [isOpen, setIsOpen] = useState(false);
  const [eventos, setEventos] = useState<ItemAgendaResumen[]>([]);
  const [loading, setLoading] = useState(false);
  const [proximoEnMinutos, setProximoEnMinutos] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const badges = useSidebarBadges();
  const count = badges.agenda ?? 0;

  const tienePulso =
    proximoEnMinutos !== null &&
    proximoEnMinutos >= 0 &&
    proximoEnMinutos <= VENTANA_PROXIMO_MIN;

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await obtenerResumenAgendaHoy();
      setEventos(data.eventos);
      setProximoEnMinutos(data.proximoEnMinutos);
    } finally {
      setLoading(false);
    }
  }, []);

  // Carga inicial liviana solo para detectar pulso (no abre dropdown).
  useEffect(() => {
    void cargar();
    const interval = window.setInterval(cargar, POLL_PROXIMO_MS);
    return () => window.clearInterval(interval);
  }, [cargar]);

  // Refetch al abrir (datos frescos).
  useEffect(() => {
    if (isOpen) void cargar();
  }, [isOpen, cargar]);

  // Cerrar al click fuera.
  useEffect(() => {
    if (!isOpen) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [isOpen]);

  const tooltip = (() => {
    if (count === 0) return "Agenda — sin eventos hoy";
    if (proximoEnMinutos === null) return `Agenda — ${count} hoy`;
    if (proximoEnMinutos <= 0) return "Agenda — evento en curso";
    if (proximoEnMinutos < 60)
      return `Agenda — próximo en ${proximoEnMinutos} min`;
    return `Agenda — ${count} hoy`;
  })();

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="relative inline-flex items-center justify-center w-11 h-11 rounded-xl text-crm-text-secondary hover:text-crm-text-primary hover:bg-crm-card-hover transition-colors"
        aria-label="Agenda de hoy"
        title={tooltip}
      >
        <Calendar className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[18px] px-1 h-[18px] bg-crm-primary text-white rounded-full text-[10px] leading-[18px] font-semibold text-center">
            {count > 9 ? "9+" : count}
          </span>
        )}
        {tienePulso && count === 0 && (
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
        )}
      </button>

      {isOpen && (
        <div className="fixed inset-x-3 top-16 sm:inset-x-auto sm:top-auto sm:absolute sm:right-0 sm:mt-2 w-auto sm:w-80 bg-crm-card rounded-lg shadow-lg border border-crm-border z-50">
          <div className="p-4 border-b border-crm-border flex items-center justify-between">
            <h3 className="text-lg font-semibold text-crm-text-primary">Agenda de hoy</h3>
            <span className="text-xs text-crm-text-muted">
              {new Date().toLocaleDateString("es-PE", {
                weekday: "short",
                day: "numeric",
                month: "short",
              })}
            </span>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading && eventos.length === 0 ? (
              <div className="p-6 text-center text-sm text-crm-text-muted">
                Cargando…
              </div>
            ) : eventos.length > 0 ? (
              <div className="divide-y divide-crm-border">
                {eventos.map((e) => {
                  const Icono = tipoIcono[e.tipo] ?? (e.origen === "recordatorio" ? Bell : Calendar);
                  const esFuturo = new Date(e.fecha).getTime() > Date.now();
                  return (
                    <Link
                      key={`${e.origen}-${e.id}`}
                      href="/dashboard/agenda"
                      onClick={() => setIsOpen(false)}
                      className="flex items-start gap-3 p-3 hover:bg-crm-card-hover transition-colors"
                    >
                      <span className="flex-shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-full bg-crm-card-hover text-crm-primary">
                        <Icono className="w-4 h-4" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p
                            className={`text-sm font-medium truncate ${
                              esFuturo
                                ? "text-crm-text-primary"
                                : "text-crm-text-secondary line-through"
                            }`}
                          >
                            {e.titulo}
                          </p>
                          <span className="flex items-center gap-1 text-xs text-crm-text-muted shrink-0">
                            <Clock className="w-3 h-3" />
                            {formatHora(e.fecha)}
                          </span>
                        </div>
                        {(e.cliente_nombre || e.ubicacion) && (
                          <p className="text-xs text-crm-text-secondary mt-0.5 truncate">
                            {e.cliente_nombre ?? e.ubicacion}
                          </p>
                        )}
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {e.origen === "recordatorio" && (
                            <span className="text-[10px] uppercase tracking-wide font-semibold text-crm-primary">
                              Recordatorio
                            </span>
                          )}
                          <span
                            className={`text-[10px] uppercase tracking-wide font-semibold ${
                              prioridadColor[e.prioridad] ?? "text-crm-text-muted"
                            }`}
                          >
                            {e.prioridad}
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center">
                <Calendar
                  className="w-10 h-10 mx-auto mb-2 text-crm-text-muted opacity-50"
                  aria-hidden
                />
                <p className="text-sm text-crm-text-muted">Sin eventos hoy</p>
                <p className="text-xs text-crm-text-muted mt-1">
                  Agenda libre para nuevas oportunidades
                </p>
              </div>
            )}
          </div>

          <div className="p-3 border-t border-crm-border bg-crm-card-hover/40">
            <Link
              href="/dashboard/agenda"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-center w-full text-sm font-medium text-crm-primary hover:text-white hover:bg-crm-primary rounded-lg px-3 py-2 transition-colors"
            >
              Ver agenda completa
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
