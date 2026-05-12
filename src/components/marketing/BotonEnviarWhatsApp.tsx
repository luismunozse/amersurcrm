"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Check, X, Loader2, ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase.client";

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}
import toast from "react-hot-toast";
import {
  obtenerPlantillas,
  registrarApertura,
  actualizarEstadoEnvio,
} from "@/app/dashboard/admin/marketing/_actions";
import {
  renderTemplate,
  extractVariables,
  buildWhatsAppUrl,
  findMissingVariables,
} from "@/lib/marketing/whatsapp";
import type { MarketingTemplate } from "@/types/whatsapp-marketing";

interface BotonEnviarWhatsAppProps {
  telefono: string;
  clienteId: string;
  clienteNombre?: string;
  templateId?: string;
  estadoCliente?: string;
  campanaId?: string;
  recordatorioId?: string;
  variablesAuto?: Record<string, string>;
  className?: string;
  variant?: "primary" | "secondary" | "ghost";
  label?: string;
  onEnviado?: (logId: string) => void;
}

export default function BotonEnviarWhatsApp({
  telefono,
  clienteId,
  clienteNombre,
  templateId,
  estadoCliente,
  campanaId,
  recordatorioId,
  variablesAuto = {},
  className = "",
  variant = "primary",
  label = "Enviar WhatsApp",
  onEnviado,
}: BotonEnviarWhatsAppProps) {
  const [open, setOpen] = useState(false);

  const baseClass =
    variant === "primary"
      ? "bg-crm-primary text-white hover:bg-crm-primary-hover"
      : variant === "secondary"
        ? "bg-crm-card-hover text-crm-text-primary hover:bg-crm-border"
        : "text-crm-primary hover:bg-crm-primary/10";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={!telefono}
        className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${baseClass} ${className}`}
        title={!telefono ? "Cliente sin teléfono" : "Enviar plantilla WhatsApp"}
      >
        <WhatsAppIcon className="w-4 h-4" />
        {label}
      </button>

      {open && (
        <ModalEnviar
          telefono={telefono}
          clienteId={clienteId}
          clienteNombre={clienteNombre}
          templateIdFijo={templateId}
          estadoCliente={estadoCliente}
          campanaId={campanaId}
          recordatorioId={recordatorioId}
          variablesAuto={variablesAuto}
          onClose={() => setOpen(false)}
          onEnviado={onEnviado}
        />
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Modal: selector + preview + abrir wa.me + confirmación
// ─────────────────────────────────────────────────────────────────────────────

interface ModalEnviarProps {
  telefono: string;
  clienteId: string;
  clienteNombre?: string;
  templateIdFijo?: string;
  estadoCliente?: string;
  campanaId?: string;
  recordatorioId?: string;
  variablesAuto: Record<string, string>;
  onClose: () => void;
  onEnviado?: (logId: string) => void;
}

function ModalEnviar({
  telefono,
  clienteId,
  clienteNombre,
  templateIdFijo,
  estadoCliente,
  campanaId,
  recordatorioId,
  variablesAuto,
  onClose,
  onEnviado,
}: ModalEnviarProps) {
  const [plantillas, setPlantillas] = useState<MarketingTemplate[]>([]);
  const [proyectos, setProyectos] = useState<{ id: string; nombre: string }[]>([]);
  const [cargando, setCargando] = useState(true);
  const [seleccionId, setSeleccionId] = useState<string>(templateIdFijo ?? "");
  const [variables, setVariables] = useState<Record<string, string>>({
    ...variablesAuto,
  });
  const [logId, setLogId] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const sortPlantillas = (lista: MarketingTemplate[]) => {
    if (!estadoCliente) return lista;
    return [...lista].sort((a, b) => {
      const aMatch = a.tags?.includes(estadoCliente) ? 0 : 1;
      const bMatch = b.tags?.includes(estadoCliente) ? 0 : 1;
      return aMatch - bMatch;
    });
  };

  useEffect(() => {
    let mounted = true;
    const sb = createClient();
    Promise.all([
      obtenerPlantillas(),
      sb.schema("crm").from("proyecto").select("id, nombre").order("nombre"),
      // Auto-fill proyecto desde la reserva más reciente del cliente
      sb.schema("crm")
        .from("reserva")
        .select("lote:lote_id(proyecto:proyecto_id(nombre))")
        .eq("cliente_id", clienteId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]).then(([resPlant, resProy, resReserva]) => {
      if (!mounted) return;
      if (resPlant.error) { toast.error(resPlant.error); return; }
      const lista = sortPlantillas((resPlant.data ?? []).filter((t) => t.activo));
      setPlantillas(lista);
      if (!templateIdFijo && estadoCliente && lista.length > 0 && lista[0].tags?.includes(estadoCliente)) {
        setSeleccionId(lista[0].id);
      }
      if (resProy.error) console.error("proyectos error:", resProy.error);
      setProyectos(resProy.data ?? []);

      // Pre-llenar proyecto si no vino en variablesAuto y hay reserva
      if (!variablesAuto.proyecto && resReserva?.data) {
        const lote = (resReserva.data as any).lote;
        const proyectoNombre = lote?.proyecto?.nombre;
        if (proyectoNombre) {
          setVariables((p) => ({ ...p, proyecto: proyectoNombre }));
        }
      }

      setCargando(false);
    });
    return () => { mounted = false; };
  }, []);

  const seleccionada = useMemo(
    () => plantillas.find((p) => p.id === seleccionId),
    [plantillas, seleccionId],
  );

  const variablesRequeridas = useMemo(() => {
    if (!seleccionada) return [];
    return seleccionada.variables?.length
      ? seleccionada.variables
      : extractVariables(seleccionada.body_texto);
  }, [seleccionada]);

  const mensajeRender = useMemo(() => {
    if (!seleccionada) return "";
    return renderTemplate(seleccionada.body_texto, {
      cliente: clienteNombre ?? "",
      ...variables,
    });
  }, [seleccionada, variables, clienteNombre]);

  const faltantes = useMemo(() => {
    if (!seleccionada) return [];
    return findMissingVariables(seleccionada.body_texto, {
      cliente: clienteNombre ?? "",
      ...variables,
    });
  }, [seleccionada, variables, clienteNombre]);

  const puedeEnviar = !!seleccionada && !!telefono && faltantes.length === 0;

  const handleAbrirWhatsApp = async () => {
    if (!seleccionada || !puedeEnviar) return;
    setEnviando(true);
    try {
      const result = await registrarApertura({
        templateId: seleccionada.id,
        clienteId,
        telefono,
        variables: { cliente: clienteNombre ?? "", ...Object.fromEntries(Object.entries(variables).filter(([k]) => !k.startsWith("_"))) },
        campanaId: campanaId ?? null,
        recordatorioId: recordatorioId ?? null,
      });

      if (result.error || !result.data) {
        toast.error(result.error ?? "Error al registrar envío");
        return;
      }

      setLogId(result.data.envioLog.id);
      const url = result.data.whatsappUrl;
      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error(err);
      toast.error("Error al abrir WhatsApp");
    } finally {
      setEnviando(false);
    }
  };

  const handleConfirmarEnviado = async () => {
    if (!logId) return;
    const result = await actualizarEstadoEnvio(logId, "enviado");
    if (!result.success) {
      toast.error(result.error ?? "Error al marcar como enviado");
      return;
    }
    toast.success("Marcado como enviado");
    onEnviado?.(logId);
    onClose();
  };

  const handleDescartar = async () => {
    if (!logId) {
      onClose();
      return;
    }
    await actualizarEstadoEnvio(logId, "descartado");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in duration-150">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-crm-card border-t sm:border border-crm-border rounded-t-xl sm:rounded-xl shadow-xl w-full sm:max-w-lg max-h-[92vh] flex flex-col animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
        <div className="sm:hidden flex justify-center pt-2.5 pb-1">
          <span className="h-1 w-10 rounded-full bg-crm-border" />
        </div>

        <div className="flex items-start justify-between p-5 border-b border-crm-border">
          <div>
            <h4 className="text-lg font-semibold text-crm-text-primary flex items-center gap-2">
              <WhatsAppIcon className="w-5 h-5 text-crm-primary" />
              Enviar por WhatsApp
            </h4>
            <p className="text-xs text-crm-text-muted mt-1">
              {clienteNombre ?? "Cliente"} · {telefono || "sin teléfono"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-crm-text-muted hover:text-crm-text-primary"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-4 flex-1">
          {!templateIdFijo && (
            <div>
              <label className="block text-xs font-medium text-crm-text-muted uppercase mb-1">
                Plantilla
              </label>
              {cargando ? (
                <div className="flex items-center gap-2 text-sm text-crm-text-secondary py-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Cargando plantillas…
                </div>
              ) : plantillas.length === 0 ? (
                <p className="text-sm text-crm-text-secondary">
                  No hay plantillas activas. Crea una en Marketing → Plantillas.
                </p>
              ) : (
                <select
                  value={seleccionId}
                  onChange={(e) => setSeleccionId(e.target.value)}
                  className="w-full px-3 py-2 bg-crm-bg-secondary border border-crm-border rounded-lg text-sm text-crm-text-primary"
                >
                  <option value="">Seleccionar plantilla…</option>
                  {plantillas.map((p) => {
                    const sugerida = estadoCliente && p.tags?.includes(estadoCliente);
                    return (
                      <option key={p.id} value={p.id}>
                        {sugerida ? "★ " : ""}{p.nombre}
                        {p.categoria ? ` · ${p.categoria}` : ""}
                      </option>
                    );
                  })}
                </select>
              )}
            </div>
          )}

          {variablesRequeridas.length > 0 && (
            <div className="space-y-3">
              <label className="block text-xs font-medium text-crm-text-muted uppercase">
                Variables
              </label>
              {variablesRequeridas.map((v) => {
                if (v === "cliente") return null;
                const val = variables[v] ?? variablesAuto[v] ?? "";

                // vendedor: read-only si viene pre-llenado
                if (v === "vendedor") {
                  return (
                    <div key={v}>
                      <label className="block text-xs text-crm-text-secondary mb-1">{`{{vendedor}}`}</label>
                      {val ? (
                        <div className="flex items-center gap-2 px-3 py-2 bg-crm-bg-secondary border border-crm-border rounded-lg text-sm text-crm-text-primary">
                          <span className="flex-1">{val}</span>
                          <button
                            type="button"
                            onClick={() => setVariables((p) => ({ ...p, vendedor: "" }))}
                            className="text-xs text-crm-text-muted hover:text-crm-error"
                          >
                            Cambiar
                          </button>
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={val}
                          onChange={(e) => setVariables((p) => ({ ...p, vendedor: e.target.value }))}
                          placeholder="Nombre del asesor"
                          className="w-full px-3 py-2 bg-crm-bg-secondary border border-crm-border rounded-lg text-sm text-crm-text-primary"
                        />
                      )}
                    </div>
                  );
                }

                // proyecto: selector de proyectos
                if (v === "proyecto") {
                  return (
                    <div key={v}>
                      <label className="block text-xs text-crm-text-secondary mb-1">{`{{proyecto}}`}</label>
                      <div className="relative">
                        <select
                          value={val}
                          onChange={(e) => setVariables((p) => ({ ...p, proyecto: e.target.value }))}
                          className="w-full px-3 py-2 pr-8 bg-crm-bg-secondary border border-crm-border rounded-lg text-sm text-crm-text-primary appearance-none"
                        >
                          <option value="">Seleccionar proyecto…</option>
                          {proyectos.map((pr) => (
                            <option key={pr.id} value={pr.nombre}>{pr.nombre}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-crm-text-muted pointer-events-none" />
                      </div>
                    </div>
                  );
                }

                // fecha: date+time picker que formatea en español
                if (v === "fecha") {
                  return (
                    <div key={v}>
                      <label className="block text-xs text-crm-text-secondary mb-1">{`{{fecha}}`}</label>
                      <input
                        type="datetime-local"
                        value={variables["_fecha_raw"] ?? ""}
                        onChange={(e) => {
                          const raw = e.target.value;
                          const formatted = raw
                            ? new Date(raw).toLocaleString("es-PE", {
                                weekday: "long",
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "";
                          setVariables((p) => ({ ...p, _fecha_raw: raw, fecha: formatted }));
                        }}
                        className="w-full px-3 py-2 bg-crm-bg-secondary border border-crm-border rounded-lg text-sm text-crm-text-primary"
                      />
                      {variables["fecha"] && (
                        <p className="text-xs text-crm-text-muted mt-1">{variables["fecha"]}</p>
                      )}
                    </div>
                  );
                }

                // resto: input libre
                return (
                  <div key={v}>
                    <label className="block text-xs text-crm-text-secondary mb-1">{`{{${v}}}`}</label>
                    <input
                      type="text"
                      value={val}
                      onChange={(e) => setVariables((p) => ({ ...p, [v]: e.target.value }))}
                      placeholder={`Valor para ${v}`}
                      className="w-full px-3 py-2 bg-crm-bg-secondary border border-crm-border rounded-lg text-sm text-crm-text-primary"
                    />
                  </div>
                );
              })}
            </div>
          )}

          {seleccionada && (
            <div>
              <label className="block text-xs font-medium text-crm-text-muted uppercase mb-1">
                Vista previa
              </label>
              <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl p-3 text-sm text-green-900 dark:text-green-50 whitespace-pre-wrap">
                {mensajeRender || (
                  <span className="text-crm-text-muted italic">
                    (mensaje vacío)
                  </span>
                )}
              </div>
              {faltantes.length > 0 && (
                <p className="text-xs text-crm-warning mt-2">
                  Faltan variables: {faltantes.join(", ")}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="p-5 border-t border-crm-border flex flex-col gap-2">
          {!logId ? (
            <button
              type="button"
              disabled={!puedeEnviar || enviando}
              onClick={handleAbrirWhatsApp}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {enviando ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ExternalLink className="w-4 h-4" />
              )}
              Abrir WhatsApp
            </button>
          ) : (
            <>
              <p className="text-sm text-crm-text-secondary">
                ¿Enviaste el mensaje desde WhatsApp?
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleConfirmarEnviado}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-crm-success text-white rounded-lg hover:bg-crm-success/90"
                >
                  <Check className="w-4 h-4" />
                  Sí, enviado
                </button>
                <button
                  type="button"
                  onClick={handleDescartar}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-crm-card-hover text-crm-text-primary rounded-lg hover:bg-crm-border"
                >
                  No
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
