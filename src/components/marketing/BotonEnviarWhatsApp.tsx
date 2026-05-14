"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Check, X, Loader2, ChevronDown, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase.client";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import toast from "react-hot-toast";
import {
  obtenerPlantillas,
  obtenerSnippets,
  registrarApertura,
  actualizarEstadoEnvio,
} from "@/app/dashboard/admin/marketing/_actions";
import {
  renderTemplate,
  extractVariables,
  buildWhatsAppUrl,
  findMissingVariables,
  prependMedia,
} from "@/lib/marketing/whatsapp";
import type { MarketingTemplate, MarketingSnippet } from "@/types/whatsapp-marketing";

interface BotonEnviarWhatsAppProps {
  telefono: string;
  clienteId: string;
  clienteNombre?: string;
  templateId?: string;
  estadoCliente?: string;
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
  recordatorioId,
  variablesAuto,
  onClose,
  onEnviado,
}: ModalEnviarProps) {
  const [plantillas, setPlantillas] = useState<MarketingTemplate[]>([]);
  const [snippetsMap, setSnippetsMap] = useState<Record<string, string>>({});
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
      obtenerSnippets(),
      sb.schema("crm").from("proyecto").select("id, nombre").order("nombre"),
      // Auto-fill proyecto desde la reserva más reciente del cliente
      sb.schema("crm")
        .from("reserva")
        .select("lote:lote_id(proyecto:proyecto_id(nombre))")
        .eq("cliente_id", clienteId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]).then(([resPlant, resSnip, resProy, resReserva]) => {
      if (!mounted) return;
      if (resPlant.error) { toast.error(resPlant.error); return; }
      const lista = sortPlantillas((resPlant.data ?? []).filter((t) => t.activo));
      setPlantillas(lista);
      if (resSnip.data) {
        const map: Record<string, string> = {};
        for (const s of resSnip.data as MarketingSnippet[]) map[s.slug] = s.contenido;
        setSnippetsMap(map);
      }
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

  const sugeridas = useMemo(() => {
    if (!estadoCliente) return [];
    return plantillas.filter((p) => p.tags?.includes(estadoCliente));
  }, [plantillas, estadoCliente]);

  const seleccionEsSugerida = !!(
    seleccionada && estadoCliente && seleccionada.tags?.includes(estadoCliente)
  );

  const variablesRequeridas = useMemo(() => {
    if (!seleccionada) return [];
    return seleccionada.variables?.length
      ? seleccionada.variables
      : extractVariables(seleccionada.body_texto);
  }, [seleccionada]);

  const mensajeRender = useMemo(() => {
    if (!seleccionada) return "";
    const renderizado = renderTemplate(
      seleccionada.body_texto,
      { cliente: clienteNombre ?? "", ...variables },
      { snippets: snippetsMap },
    );
    return prependMedia(renderizado, seleccionada.media_url);
  }, [seleccionada, variables, clienteNombre, snippetsMap]);

  const faltantes = useMemo(() => {
    if (!seleccionada) return [];
    return findMissingVariables(
      seleccionada.body_texto,
      { cliente: clienteNombre ?? "", ...variables },
      { snippets: snippetsMap },
    );
  }, [seleccionada, variables, clienteNombre, snippetsMap]);

  const puedeEnviar = !!seleccionada && !!telefono && faltantes.length === 0;
  const faltaCliente = faltantes.includes("cliente");
  const esFaltante = (v: string) => faltantes.includes(v);
  const inputClassFalta = "border-amber-500 ring-1 ring-amber-500/30 bg-amber-50 dark:bg-amber-950/20";

  const handleAbrirWhatsApp = async () => {
    if (!seleccionada || !puedeEnviar) return;
    setEnviando(true);
    try {
      const result = await registrarApertura({
        templateId: seleccionada.id,
        clienteId,
        telefono,
        variables: { cliente: clienteNombre ?? "", ...Object.fromEntries(Object.entries(variables).filter(([k]) => !k.startsWith("_"))) },
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
                <>
                  {sugeridas.length > 0 && (
                    <div className="mb-2">
                      <p className="text-[11px] text-crm-text-muted mb-1.5 flex items-center gap-1">
                        <span className="text-amber-500">★</span>
                        Sugeridas para estado &quot;{estadoCliente}&quot;
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {sugeridas.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setSeleccionId(p.id)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full border transition-colors ${
                              seleccionId === p.id
                                ? "bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-100 border-amber-400"
                                : "bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/40"
                            }`}
                          >
                            <span className="text-amber-500">★</span>
                            {p.nombre}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
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
                  {seleccionEsSugerida && (
                    <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-1.5 flex items-center gap-1">
                      <span className="text-amber-500">★</span>
                      Plantilla sugerida para este cliente
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {faltaCliente && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900 dark:text-amber-100">
                <strong>Cliente sin nombre.</strong> La plantilla usa <code>{`{{cliente}}`}</code> pero este cliente no tiene nombre registrado. Edite el cliente antes de enviar.
              </div>
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
                const falta = esFaltante(v);
                const labelExtra = falta ? <span className="text-amber-600 ml-1">*</span> : null;

                // vendedor: read-only si viene pre-llenado
                if (v === "vendedor") {
                  return (
                    <div key={v}>
                      <label className="block text-xs text-crm-text-secondary mb-1">{`{{vendedor}}`}{labelExtra}</label>
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
                          className={`w-full px-3 py-2 bg-crm-bg-secondary border rounded-lg text-sm text-crm-text-primary ${falta ? inputClassFalta : "border-crm-border"}`}
                        />
                      )}
                    </div>
                  );
                }

                // proyecto: selector de proyectos
                if (v === "proyecto") {
                  return (
                    <div key={v}>
                      <label className="block text-xs text-crm-text-secondary mb-1">{`{{proyecto}}`}{labelExtra}</label>
                      <div className="relative">
                        <select
                          value={val}
                          onChange={(e) => setVariables((p) => ({ ...p, proyecto: e.target.value }))}
                          className={`w-full px-3 py-2 pr-8 bg-crm-bg-secondary border rounded-lg text-sm text-crm-text-primary appearance-none ${falta ? inputClassFalta : "border-crm-border"}`}
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
                      <label className="block text-xs text-crm-text-secondary mb-1">{`{{fecha}}`}{labelExtra}</label>
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
                        className={`w-full px-3 py-2 bg-crm-bg-secondary border rounded-lg text-sm text-crm-text-primary ${falta ? inputClassFalta : "border-crm-border"}`}
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
                    <label className="block text-xs text-crm-text-secondary mb-1">{`{{${v}}}`}{labelExtra}</label>
                    <input
                      type="text"
                      value={val}
                      onChange={(e) => setVariables((p) => ({ ...p, [v]: e.target.value }))}
                      placeholder={`Valor para ${v}`}
                      className={`w-full px-3 py-2 bg-crm-bg-secondary border rounded-lg text-sm text-crm-text-primary ${falta ? inputClassFalta : "border-crm-border"}`}
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
                <div className="flex items-center gap-2 mt-2 px-3 py-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <p className="text-xs text-amber-900 dark:text-amber-100">
                    Complete {faltantes.length === 1 ? "la variable" : "las variables"}:{" "}
                    {faltantes.map((f) => (
                      <code key={f} className="px-1 mx-0.5 bg-amber-100 dark:bg-amber-900 rounded">
                        {`{{${f}}}`}
                      </code>
                    ))}
                  </p>
                </div>
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
