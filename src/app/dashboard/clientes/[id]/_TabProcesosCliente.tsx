"use client";

import { useEffect, useState, useTransition, useRef } from "react";
import {
  ShoppingCart, CheckCircle2, Circle, MinusCircle, AlertCircle, Clock,
  ChevronDown, HelpCircle, Upload, FileText, Trash2, Eye, Loader2, ShieldCheck, AlertOctagon,
  DollarSign, X,
} from "lucide-react";
import CerrarVentaModal from "./_CerrarVentaModal";
import {
  obtenerProcesosCliente,
  toggleChecklistItem,
  avanzarEtapa,
  cambiarEstadoRevision,
  guardarObservacionesEtapa,
  eliminarDocumentoChecklist,
  eliminarProceso,
  obtenerUrlDocumento,
} from "../../adquisicion/_actions-proceso";
import {
  ETAPAS_PROCESO,
  ESTADOS_REVISION,
  puedeAvanzarEtapa,
} from "@/lib/types/proceso-adquisicion";
import type {
  ProcesoConRelaciones,
  ProcesoChecklistItem,
  EstadoRevision,
} from "@/lib/types/proceso-adquisicion";
import { getAyudaChecklist } from "@/lib/data/checklist-ayudas";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import ConfirmDialog from "@/components/ConfirmDialog";
import toast from "react-hot-toast";

interface Props {
  clienteId: string;
  esPrivilegiado?: boolean;
}

const REVISION_BADGE: Record<EstadoRevision, string> = {
  pendiente: "bg-gray-50 border-gray-200 text-gray-600 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300",
  en_revision: "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/30 dark:border-amber-800 dark:text-amber-300",
  aprobado: "bg-green-50 border-green-200 text-green-700 dark:bg-green-900/30 dark:border-green-800 dark:text-green-300",
  observado: "bg-red-50 border-red-200 text-red-700 dark:bg-red-900/30 dark:border-red-800 dark:text-red-300",
};

function formatearTamano(bytes?: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function TabProcesosCliente({ clienteId, esPrivilegiado = false }: Props) {
  const [procesos, setProcesos] = useState<ProcesoConRelaciones[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [observacionesDraft, setObservacionesDraft] = useState<Record<string, string>>({});
  const [uploadingItemId, setUploadingItemId] = useState<string | null>(null);
  const [cerrarVentaProcesoId, setCerrarVentaProcesoId] = useState<string | null>(null);
  const [eliminarProcesoData, setEliminarProcesoData] = useState<{ id: string; codigo: string } | null>(null);
  const [eliminarDocItemId, setEliminarDocItemId] = useState<string | null>(null);

  useEffect(() => { loadData(); }, [clienteId]);

  async function loadData() {
    const result = await obtenerProcesosCliente(clienteId);
    if (result.success) {
      const procs = result.data as ProcesoConRelaciones[];
      setProcesos(procs);
      // Sembrar drafts de observaciones con el valor actual de cada etapa.
      const drafts: Record<string, string> = {};
      procs.forEach((p) =>
        p.etapas?.forEach((e) => { drafts[e.id] = e.observaciones ?? ""; }),
      );
      setObservacionesDraft(drafts);
      if (procs.length === 1) setExpandedId(procs[0].id);
    }
    setLoading(false);
  }

  async function handleToggleCheck(itemId: string, completado: boolean) {
    startTransition(async () => {
      const result = await toggleChecklistItem(itemId, completado);
      if (result.success) loadData();
      else toast.error(result.error || "Error");
    });
  }

  async function handleAvanzar(procesoId: string) {
    startTransition(async () => {
      const result = await avanzarEtapa(procesoId);
      if (result.success) {
        toast.success("Etapa completada");
        loadData();
      } else toast.error(result.error || "Error");
    });
  }

  async function handleCambiarRevision(etapaId: string, nuevo: EstadoRevision, obs?: string) {
    startTransition(async () => {
      const result = await cambiarEstadoRevision(etapaId, nuevo, obs);
      if (result.success) {
        toast.success(`Estado: ${ESTADOS_REVISION.find((e) => e.value === nuevo)?.label}`);
        loadData();
      } else toast.error(result.error || "Error");
    });
  }

  async function handleGuardarObservaciones(etapaId: string) {
    const obs = observacionesDraft[etapaId] ?? "";
    startTransition(async () => {
      const result = await guardarObservacionesEtapa(etapaId, obs);
      if (result.success) {
        toast.success("Observaciones guardadas");
        loadData();
      } else toast.error(result.error || "Error");
    });
  }

  async function handleSubirDocumento(itemId: string, file: File) {
    setUploadingItemId(itemId);
    try {
      const fd = new FormData();
      fd.append("archivo", file);
      fd.append("itemId", itemId);

      const res = await fetch("/api/proceso/checklist/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error || "Error subiendo archivo");
        return;
      }
      toast.success("Documento subido");
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || "Error subiendo archivo");
    } finally {
      setUploadingItemId(null);
    }
  }

  function handleEliminarDocumento(itemId: string) {
    setEliminarDocItemId(itemId);
  }

  function confirmarEliminarDocumento() {
    if (!eliminarDocItemId) return;
    const id = eliminarDocItemId;
    setEliminarDocItemId(null);
    startTransition(async () => {
      const result = await eliminarDocumentoChecklist(id);
      if (result.success) {
        toast.success("Documento eliminado");
        loadData();
      } else toast.error(result.error || "Error");
    });
  }

  async function handleVerDocumento(itemId: string) {
    const result = await obtenerUrlDocumento(itemId);
    if (result.success) {
      window.open(result.data.url, "_blank", "noopener,noreferrer");
    } else {
      toast.error(result.error || "Error");
    }
  }

  async function handleEliminarProceso() {
    if (!eliminarProcesoData) return;
    startTransition(async () => {
      const result = await eliminarProceso(eliminarProcesoData.id);
      if (result.success) {
        toast.success(`Proceso ${eliminarProcesoData.codigo} eliminado`);
        setEliminarProcesoData(null);
        loadData();
      } else {
        toast.error(result.error || "Error eliminando proceso");
      }
    });
  }

  const etapaColor: Record<string, string> = {
    blue: "bg-blue-500", purple: "bg-purple-500", orange: "bg-orange-500", green: "bg-green-500",
  };

  if (loading) return <div className="text-center py-8 text-crm-text-muted">Cargando procesos...</div>;

  if (procesos.length === 0) {
    return (
      <div className="text-center py-8 text-crm-text-muted">
        <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-30" />
        <p>No hay procesos de adquisición</p>
        <p className="text-xs mt-1">Se crean automáticamente al registrar una separación</p>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-4">
        {procesos.map((proceso) => {
          const isExpanded = expandedId === proceso.id;
          const etapaInfo = ETAPAS_PROCESO.find((e) => e.value === proceso.etapa_actual);

          return (
            <div key={proceso.id} className="border border-crm-border rounded-lg overflow-hidden">
              <div className="relative flex items-center bg-crm-card hover:bg-crm-card-hover transition-colors">
              <button
                onClick={() => setExpandedId(isExpanded ? null : proceso.id)}
                className="flex-1 min-w-0 flex items-center justify-between p-4 text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-mono text-xs font-semibold text-crm-text-primary">{proceso.codigo}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                    etapaInfo?.color === "blue" ? "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300" :
                    etapaInfo?.color === "purple" ? "bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-900/30 dark:border-purple-800 dark:text-purple-300" :
                    etapaInfo?.color === "orange" ? "bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-900/30 dark:border-orange-800 dark:text-orange-300" :
                    "bg-green-50 border-green-200 text-green-700 dark:bg-green-900/30 dark:border-green-800 dark:text-green-300"
                  }`}>{etapaInfo?.label ?? proceso.etapa_actual}</span>
                  {proceso.estado === "completado" && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium border bg-green-50 border-green-200 text-green-700 dark:bg-green-900/30 dark:border-green-800 dark:text-green-300 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Completado
                    </span>
                  )}
                  {proceso.estado === "cancelado" && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium border bg-red-50 border-red-200 text-red-700 dark:bg-red-900/30 dark:border-red-800 dark:text-red-300">
                      Cancelado
                    </span>
                  )}
                  {proceso.estado === "pausado" && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium border bg-gray-50 border-gray-200 text-gray-600 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300">
                      Pausado
                    </span>
                  )}
                  {proceso.lote && (
                    <span className="text-xs text-crm-text-muted">{proceso.lote.proyecto?.nombre} / {proceso.lote.codigo}</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-0.5">
                    {proceso.etapas?.map((etapa) => {
                      const eInfo = ETAPAS_PROCESO.find((e) => e.value === etapa.etapa);
                      return (
                        <div
                          key={etapa.id}
                          className={`w-6 h-1.5 rounded-full ${
                            etapa.estado === "completada" ? etapaColor[eInfo?.color || "blue"] :
                            etapa.estado === "en_progreso" ? `${etapaColor[eInfo?.color || "blue"]} opacity-40` :
                            etapa.estado === "omitida" ? "bg-gray-400 opacity-40" :
                            "bg-gray-200"
                          }`}
                          title={etapa.estado === "omitida" ? "Etapa omitida" : undefined}
                        />
                      );
                    })}
                  </div>
                  <ChevronDown className={`h-4 w-4 text-crm-text-muted transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                </div>
              </button>
              {esPrivilegiado && (
                <button
                  onClick={(e) => { e.stopPropagation(); setEliminarProcesoData({ id: proceso.id, codigo: proceso.codigo }); }}
                  disabled={isPending}
                  title="Eliminar proceso (admin)"
                  className="shrink-0 p-2 mr-3 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
              </div>

              {isExpanded && (
                <div className="border-t border-crm-border p-4 space-y-3 bg-crm-card-hover/40">
                  {proceso.etapas?.map((etapa) => {
                    const eInfo = ETAPAS_PROCESO.find((e) => e.value === etapa.etapa);
                    const esActual = etapa.etapa === proceso.etapa_actual && proceso.estado === "activo";
                    const completada = etapa.estado === "completada";
                    const omitida = etapa.estado === "omitida";
                    const checklistOk = puedeAvanzarEtapa(etapa.checklist || []);
                    const revision = (etapa.estado_revision ?? "pendiente") as EstadoRevision;
                    const mostrarRevision = !omitida && (esActual || completada);

                    return (
                      <div key={etapa.id} className={`rounded-lg border p-3 ${
                        completada ? "bg-green-50/50 dark:bg-green-900/15 border-green-200 dark:border-green-800/50" :
                        omitida ? "bg-crm-card-hover border-crm-border border-dashed" :
                        esActual ? "bg-crm-card border-crm-primary/40 shadow-sm" :
                        "bg-crm-card border-crm-border opacity-50"
                      }`}>
                        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            {completada ? <CheckCircle2 className="h-4 w-4 text-green-500 dark:text-green-400" /> :
                              omitida ? <MinusCircle className="h-4 w-4 text-gray-400 dark:text-gray-500" /> :
                                esActual ? <div className={`w-4 h-4 rounded-full ${etapaColor[eInfo?.color || "blue"]} flex items-center justify-center`}><span className="text-white text-[10px] font-bold">{eInfo?.icon}</span></div> :
                                  <Circle className="h-4 w-4 text-gray-300 dark:text-gray-600" />}
                            <span className={`font-medium text-sm ${completada ? "text-green-700 dark:text-green-300" : omitida ? "text-gray-500 dark:text-gray-400 italic" : "text-crm-text-primary"}`}>{etapa.nombre}</span>
                            {omitida && (
                              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-gray-200 text-gray-600 border border-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600" title={etapa.notas || "Etapa omitida"}>
                                Omitida
                              </span>
                            )}
                            {mostrarRevision && (
                              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${REVISION_BADGE[revision]}`}>
                                {ESTADOS_REVISION.find((e) => e.value === revision)?.label}
                              </span>
                            )}
                            {etapa.fecha_limite && esActual && (
                              <span className="text-xs text-crm-text-muted flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(etapa.fecha_limite).toLocaleDateString("es-PE")}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {mostrarRevision && (
                              <ControlRevision
                                revision={revision}
                                esPrivilegiado={esPrivilegiado}
                                isPending={isPending}
                                onCambiar={(nuevo, obs) => handleCambiarRevision(etapa.id, nuevo, obs)}
                              />
                            )}
                            {esActual && checklistOk && etapa.etapa === "desembolso" && (
                              <button
                                onClick={() => setCerrarVentaProcesoId(proceso.id)}
                                disabled={isPending}
                                className="px-2.5 py-1 text-xs font-medium text-white rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
                              >
                                <DollarSign className="h-3.5 w-3.5" /> Cerrar venta
                              </button>
                            )}
                            {esActual && checklistOk && etapa.etapa !== "desembolso" && (
                              <button onClick={() => handleAvanzar(proceso.id)} disabled={isPending}
                                className={`px-2.5 py-1 text-xs font-medium text-white rounded-lg ${etapaColor[eInfo?.color || "blue"]} hover:opacity-90 disabled:opacity-50`}>
                                {isPending ? "..." : "Completar"}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Checklist con uploader */}
                        {(esActual || completada) && (etapa.checklist?.length ?? 0) > 0 && (
                          <div className="space-y-1.5 ml-6 mt-2">
                            {etapa.checklist!.map((item) => (
                              <ChecklistItemRow
                                key={item.id}
                                item={item}
                                editable={esActual && !isPending}
                                uploading={uploadingItemId === item.id}
                                onToggle={(c) => handleToggleCheck(item.id, c)}
                                onSubir={(file) => handleSubirDocumento(item.id, file)}
                                onEliminar={() => handleEliminarDocumento(item.id)}
                                onVer={() => handleVerDocumento(item.id)}
                              />
                            ))}
                          </div>
                        )}

                        {/* Observaciones */}
                        {mostrarRevision && (
                          <div className="ml-6 mt-3 pt-3 border-t border-crm-border/50">
                            <label className="block text-xs font-medium text-crm-text-secondary mb-1">
                              Observaciones
                            </label>
                            <textarea
                              value={observacionesDraft[etapa.id] ?? ""}
                              onChange={(e) =>
                                setObservacionesDraft((d) => ({ ...d, [etapa.id]: e.target.value }))
                              }
                              rows={2}
                              placeholder="Notas, hallazgos, pendientes…"
                              className="w-full text-sm border border-crm-border rounded-lg px-2 py-1.5 bg-crm-card text-crm-text-primary focus:outline-none focus:ring-1 focus:ring-crm-primary"
                            />
                            <div className="flex justify-between items-center mt-1.5">
                              <span className="text-[11px] text-crm-text-muted">
                                {etapa.revisado_por ? `Revisado por ${etapa.revisado_por}` : ""}
                                {etapa.fecha_revision ? ` · ${new Date(etapa.fecha_revision).toLocaleDateString("es-PE")}` : ""}
                              </span>
                              <button
                                onClick={() => handleGuardarObservaciones(etapa.id)}
                                disabled={isPending || (observacionesDraft[etapa.id] ?? "") === (etapa.observaciones ?? "")}
                                className="px-2.5 py-1 text-xs font-medium text-crm-primary border border-crm-primary/30 rounded-lg hover:bg-crm-primary/10 disabled:opacity-40"
                              >
                                Guardar
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {cerrarVentaProcesoId && (
        <CerrarVentaModal
          procesoId={cerrarVentaProcesoId}
          onClose={() => setCerrarVentaProcesoId(null)}
          onSuccess={() => loadData()}
        />
      )}

      {eliminarProcesoData && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in duration-150"
          onClick={() => !isPending && setEliminarProcesoData(null)}
        >
          <div
            className="bg-crm-card rounded-t-xl sm:rounded-xl shadow-2xl w-full sm:max-w-md pb-[env(safe-area-inset-bottom)] sm:pb-0 animate-in slide-in-from-bottom-4 sm:zoom-in-95 sm:slide-in-from-bottom-0 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sm:hidden flex justify-center pt-2.5 pb-1 shrink-0">
              <span className="h-1 w-10 rounded-full bg-crm-border" aria-hidden />
            </div>
            <div className="flex items-center justify-between px-5 py-3 border-b border-crm-border">
              <div className="flex items-center gap-2">
                <AlertOctagon className="h-5 w-5 text-red-600" />
                <h3 className="font-semibold text-crm-text-primary">Eliminar proceso</h3>
              </div>
              <button
                onClick={() => !isPending && setEliminarProcesoData(null)}
                className="text-crm-text-muted hover:text-crm-text-primary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <p className="text-sm text-crm-text-primary">
                Va a eliminar permanentemente el proceso{" "}
                <span className="font-mono font-semibold">{eliminarProcesoData.codigo}</span>.
              </p>
              <p className="text-xs text-crm-text-muted">
                Se borran etapas, checklist y documentos adjuntos. La separación, el lote y el estado
                del cliente <strong>no</strong> se modifican: si necesita revertir todo el flujo,
                use <em>Anular separación</em> desde la pestaña Separaciones.
              </p>
              <p className="text-xs text-red-600 dark:text-red-400">
                Esta acción no se puede deshacer.
              </p>
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 border-t border-crm-border">
              <button
                onClick={() => !isPending && setEliminarProcesoData(null)}
                className="px-3 py-2 text-sm text-crm-text-secondary hover:text-crm-text-primary"
              >
                Cancelar
              </button>
              <button
                onClick={handleEliminarProceso}
                disabled={isPending}
                className="px-3 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
              >
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Eliminar definitivamente
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!eliminarDocItemId}
        title="Eliminar documento"
        description="¿Eliminar el documento adjunto? El item del checklist quedará sin archivo."
        confirmText="Eliminar"
        cancelText="Cancelar"
        disabled={isPending}
        onConfirm={confirmarEliminarDocumento}
        onClose={() => setEliminarDocItemId(null)}
      />
    </TooltipProvider>
  );
}

// ============================================================
// ControlRevision: selector de estado de revisión
// ============================================================
function ModalObservacion({
  onConfirmar,
  onCancelar,
}: {
  onConfirmar: (obs: string) => void;
  onCancelar: () => void;
}) {
  const [obs, setObs] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onCancelar} />
      <div className="relative bg-crm-card border border-crm-border rounded-xl shadow-xl w-full max-w-sm p-5 space-y-4">
        <div className="flex items-center gap-2">
          <AlertOctagon className="h-5 w-5 text-red-500 shrink-0" />
          <h4 className="text-sm font-semibold text-crm-text-primary">Marcar como observado</h4>
        </div>
        <div>
          <label className="block text-xs font-medium text-crm-text-muted mb-1">
            Observaciones <span className="text-red-500">*</span>
          </label>
          <textarea
            autoFocus
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            rows={3}
            placeholder="Describe el hallazgo o pendiente…"
            className="w-full px-3 py-2 bg-crm-bg-secondary border border-crm-border rounded-lg text-sm text-crm-text-primary resize-none focus:outline-none focus:ring-2 focus:ring-crm-primary/40"
          />
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancelar}
            className="px-3 py-1.5 text-sm text-crm-text-secondary border border-crm-border rounded-lg hover:bg-crm-card-hover"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!obs.trim()}
            onClick={() => onConfirmar(obs.trim())}
            className="px-3 py-1.5 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

function ControlRevision({
  revision,
  esPrivilegiado,
  isPending,
  onCambiar,
}: {
  revision: EstadoRevision;
  esPrivilegiado: boolean;
  isPending: boolean;
  onCambiar: (nuevo: EstadoRevision, observaciones?: string) => void;
}) {
  const [modalObs, setModalObs] = useState(false);

  if (!esPrivilegiado) {
    if (revision === "pendiente") {
      return (
        <button
          onClick={() => onCambiar("en_revision")}
          disabled={isPending}
          className="px-2 py-0.5 text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full hover:bg-amber-100 dark:bg-amber-900/30 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-900/50 disabled:opacity-50"
        >
          Marcar en revisión
        </button>
      );
    }
    return null;
  }

  return (
    <>
      <div className="flex items-center gap-1">
        {revision !== "aprobado" && (
          <button
            onClick={() => onCambiar("aprobado")}
            disabled={isPending}
            title="Aprobar etapa"
            className="px-2 py-0.5 text-[11px] font-medium text-green-700 bg-green-50 border border-green-200 rounded-full hover:bg-green-100 dark:bg-green-900/30 dark:border-green-800 dark:text-green-300 dark:hover:bg-green-900/50 disabled:opacity-50 flex items-center gap-1"
          >
            <ShieldCheck className="h-3 w-3" /> Aprobar
          </button>
        )}
        {revision !== "observado" && (
          <button
            onClick={() => setModalObs(true)}
            disabled={isPending}
            title="Marcar como observado"
            className="px-2 py-0.5 text-[11px] font-medium text-red-700 bg-red-50 border border-red-200 rounded-full hover:bg-red-100 dark:bg-red-900/30 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-900/50 disabled:opacity-50 flex items-center gap-1"
          >
            <AlertOctagon className="h-3 w-3" /> Observar
          </button>
        )}
        {revision !== "pendiente" && (
          <button
            onClick={() => onCambiar("pendiente")}
            disabled={isPending}
            title="Revertir a pendiente"
            className="px-2 py-0.5 text-[11px] font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-full hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            Revertir
          </button>
        )}
      </div>

      {modalObs && (
        <ModalObservacion
          onConfirmar={(obs) => { setModalObs(false); onCambiar("observado", obs); }}
          onCancelar={() => setModalObs(false)}
        />
      )}
    </>
  );
}

// ============================================================
// ChecklistItemRow: fila con upload de documento
// ============================================================
function ChecklistItemRow({
  item,
  editable,
  uploading,
  onToggle,
  onSubir,
  onEliminar,
  onVer,
}: {
  item: ProcesoChecklistItem;
  editable: boolean;
  uploading: boolean;
  onToggle: (completado: boolean) => void;
  onSubir: (file: File) => void;
  onEliminar: () => void;
  onVer: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ayuda = getAyudaChecklist(item.descripcion);
  const tieneDoc = !!item.documento_url;

  return (
    <div className={`flex items-start gap-2 py-1.5 px-2 rounded text-sm ${tieneDoc ? "bg-green-50/40 dark:bg-green-900/15" : ""}`}>
      <input
        type="checkbox"
        checked={item.completado}
        onChange={() => editable && onToggle(!item.completado)}
        disabled={!editable}
        className="mt-1 w-3.5 h-3.5 rounded border-gray-300 dark:border-gray-600 text-crm-primary focus:ring-crm-primary disabled:opacity-50"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`${item.completado ? "line-through text-green-700 dark:text-green-400" : "text-crm-text-primary"}`}>
            {item.descripcion}
          </span>
          {ayuda && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" onClick={(e) => e.preventDefault()} className="text-crm-text-muted hover:text-crm-primary shrink-0" aria-label={`Ayuda: ${item.descripcion}`}>
                  <HelpCircle className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs text-left leading-snug">
                {ayuda}
              </TooltipContent>
            </Tooltip>
          )}
          {item.obligatorio && !item.completado && !tieneDoc && (
            <AlertCircle className="h-3 w-3 text-red-400 shrink-0" />
          )}
        </div>

        {tieneDoc && (
          <div className="flex items-center gap-2 mt-1 text-xs">
            <FileText className="h-3.5 w-3.5 text-crm-primary shrink-0" />
            <span className="text-crm-text-muted truncate">
              {item.documento_nombre ?? "Documento"}
              {item.documento_size ? ` · ${formatearTamano(item.documento_size)}` : ""}
              {item.documento_subido_por ? ` · por ${item.documento_subido_por}` : ""}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {tieneDoc && (
          <>
            <button
              type="button"
              onClick={onVer}
              title="Ver documento"
              className="p-1 text-crm-text-muted hover:text-crm-primary hover:bg-crm-primary/10 rounded"
            >
              <Eye className="h-3.5 w-3.5" />
            </button>
            {editable && (
              <button
                type="button"
                onClick={onEliminar}
                title="Eliminar documento"
                className="p-1 text-crm-text-muted hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </>
        )}
        {!tieneDoc && editable && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onSubir(file);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              title="Subir documento"
              className="p-1 text-crm-text-muted hover:text-crm-primary hover:bg-crm-primary/10 rounded disabled:opacity-50"
            >
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
