"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Play,
  Pause,
  Eye,
  Trash2,
  AlertTriangle,
  X,
  CheckCircle,
  Clock,
  Users,
  Send,
  ChevronRight,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  obtenerCampanas,
  actualizarEstadoCampana,
  eliminarCampana,
  obtenerContactosCampana,
  registrarApertura,
  actualizarEstadoEnvio,
  obtenerEnviosCampana,
} from "@/app/dashboard/admin/marketing/_actions";
import type {
  MarketingCampana,
  MarketingEnvioLog,
  EstadoCampana,
} from "@/types/whatsapp-marketing";
import { renderTemplate } from "@/lib/marketing/whatsapp";
import ModalCrearCampana from "./ModalCrearCampana";

const ESTADO_BADGE: Record<EstadoCampana, { label: string; cls: string }> = {
  DRAFT: { label: "Borrador", cls: "bg-crm-card-hover text-crm-text-secondary" },
  SCHEDULED: { label: "Programada", cls: "bg-crm-info/10 text-crm-info" },
  RUNNING: { label: "En curso", cls: "bg-crm-success/10 text-crm-success" },
  PAUSED: { label: "Pausada", cls: "bg-crm-warning/10 text-crm-warning" },
  COMPLETED: { label: "Completada", cls: "bg-crm-primary/10 text-crm-primary" },
  CANCELLED: { label: "Cancelada", cls: "bg-crm-error/10 text-crm-error" },
};

function ModalConfirmarEliminar({
  nombre,
  onConfirmar,
  onCancelar,
}: {
  nombre: string;
  onConfirmar: () => void;
  onCancelar: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onCancelar} />
      <div className="relative bg-crm-card border border-crm-border rounded-xl shadow-xl p-6 w-full sm:max-w-sm">
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle className="w-5 h-5 text-crm-error flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-base font-semibold text-crm-text-primary">
              Eliminar campaña
            </h4>
            <p className="text-sm text-crm-text-secondary mt-1">
              ¿Eliminar <strong>&quot;{nombre}&quot;</strong>?
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancelar}
            className="px-4 py-2 text-sm text-crm-text-secondary border border-crm-border rounded-lg hover:bg-crm-card-hover"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirmar}
            className="px-4 py-2 text-sm bg-crm-error text-white rounded-lg hover:bg-crm-error/90"
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Asistente de envío uno-a-uno
// ─────────────────────────────────────────────────────────────────────────────

interface Contacto {
  id: string;
  nombre: string;
  telefono_whatsapp: string | null;
  telefono: string | null;
  email: string | null;
  estado_cliente: string | null;
}

type CampanaConPlantilla = Omit<MarketingCampana, "template" | "audiencia"> & {
  template?: { id: string; nombre: string; body_texto?: string; variables?: string[] };
  audiencia?: { id: string; nombre: string; contactos_count: number };
};

function AsistenteCampana({
  campana,
  onCerrar,
}: {
  campana: CampanaConPlantilla;
  onCerrar: () => void;
}) {
  const [contactos, setContactos] = useState<Contacto[]>([]);
  const [bodyTexto, setBodyTexto] = useState<string>("");
  const [enviadosIds, setEnviadosIds] = useState<Set<string>>(new Set());
  const [indice, setIndice] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actualLogId, setActualLogId] = useState<string | null>(null);
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    if (campana.template?.body_texto) {
      setBodyTexto(campana.template.body_texto);
    }
  }, [campana.template?.body_texto]);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      obtenerContactosCampana(campana.id),
      obtenerEnviosCampana(campana.id),
    ]).then(([resCont, resEnv]) => {
      if (!mounted) return;
      if (resCont.error || !resCont.data) {
        toast.error(resCont.error ?? "Error cargando contactos");
        setLoading(false);
        return;
      }
      const lista = (resCont.data.contactos ?? []) as Contacto[];
      setContactos(lista);

      const previos = new Set<string>(
        (resEnv.data ?? [])
          .map((e: MarketingEnvioLog) => e.cliente_id ?? "")
          .filter(Boolean),
      );
      setEnviadosIds(previos);

      const idx = lista.findIndex((c) => !previos.has(c.id));
      setIndice(idx >= 0 ? idx : 0);
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, [campana.id]);

  const contactoActual = contactos[indice];
  const totalContactos = contactos.length;
  const totalEnviados = enviadosIds.size;

  const variablesAuto = useMemo(() => {
    if (!contactoActual) return {};
    return {
      cliente: contactoActual.nombre,
      ...campana.variables_valores,
    };
  }, [contactoActual, campana.variables_valores]);

  const mensajeRender = useMemo(() => {
    if (!bodyTexto || !contactoActual) return "";
    return renderTemplate(bodyTexto, variablesAuto);
  }, [bodyTexto, contactoActual, variablesAuto]);

  const telefonoActual =
    contactoActual?.telefono_whatsapp || contactoActual?.telefono || "";

  const handleAbrirWhatsApp = async () => {
    if (!contactoActual || !telefonoActual) return;
    setProcesando(true);
    try {
      const result = await registrarApertura({
        templateId: campana.template_id,
        clienteId: contactoActual.id,
        telefono: telefonoActual,
        variables: variablesAuto,
        campanaId: campana.id,
      });
      if (result.error || !result.data) {
        toast.error(result.error ?? "Error registrando envío");
        return;
      }
      setActualLogId(result.data.envioLog.id);
      const win = window.open(
        result.data.whatsappUrl,
        "_blank",
        "noopener,noreferrer",
      );
      if (!win) {
        try {
          window.location.href = result.data.whatsappUrl;
        } catch {
          toast.error("Permite popups o haz clic manualmente.");
        }
      }
    } finally {
      setProcesando(false);
    }
  };

  const handleSiguiente = async (estado: "enviado" | "descartado") => {
    if (actualLogId) {
      await actualizarEstadoEnvio(actualLogId, estado);
      if (contactoActual) {
        setEnviadosIds((prev) => new Set(prev).add(contactoActual.id));
      }
    }
    setActualLogId(null);
    if (indice < totalContactos - 1) {
      setIndice(indice + 1);
    } else {
      toast.success("Campaña completada");
      await actualizarEstadoCampana(campana.id, "COMPLETED");
      onCerrar();
    }
  };

  const handleSaltar = () => {
    if (indice < totalContactos - 1) {
      setIndice(indice + 1);
      setActualLogId(null);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-crm-card rounded-xl p-8 flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-crm-primary" />
          <span className="text-sm text-crm-text-primary">
            Cargando contactos…
          </span>
        </div>
      </div>
    );
  }

  if (totalContactos === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-crm-card rounded-xl p-6 max-w-sm">
          <h3 className="text-lg font-semibold text-crm-text-primary mb-2">
            Sin contactos
          </h3>
          <p className="text-sm text-crm-text-secondary mb-4">
            La audiencia de esta campaña no tiene contactos disponibles.
          </p>
          <button
            onClick={onCerrar}
            className="w-full px-4 py-2 bg-crm-primary text-white rounded-lg"
          >
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-crm-card border border-crm-border rounded-xl shadow-xl w-full max-w-2xl max-h-[92vh] flex flex-col">
        <div className="flex items-start justify-between p-5 border-b border-crm-border">
          <div>
            <h4 className="text-lg font-semibold text-crm-text-primary">
              {campana.nombre}
            </h4>
            <p className="text-xs text-crm-text-muted mt-1">
              Contacto {indice + 1} de {totalContactos} · {totalEnviados}{" "}
              registrados
            </p>
          </div>
          <button
            onClick={onCerrar}
            className="text-crm-text-muted hover:text-crm-text-primary"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Progreso */}
          <div className="w-full bg-crm-border rounded-full h-2">
            <div
              className="bg-crm-primary h-2 rounded-full transition-all"
              style={{
                width: `${((indice + 1) / totalContactos) * 100}%`,
              }}
            />
          </div>

          {contactoActual && (
            <>
              <div className="bg-crm-bg-secondary border border-crm-border rounded-xl p-4">
                <p className="text-xs text-crm-text-muted uppercase mb-1">
                  Contacto actual
                </p>
                <p className="text-base font-semibold text-crm-text-primary">
                  {contactoActual.nombre}
                </p>
                <p className="text-sm text-crm-text-secondary">
                  {telefonoActual || (
                    <span className="text-crm-warning">Sin teléfono</span>
                  )}
                </p>
                {enviadosIds.has(contactoActual.id) && (
                  <p className="text-xs text-crm-success mt-2 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Ya enviado anteriormente
                  </p>
                )}
              </div>

              {bodyTexto ? (
                <div>
                  <p className="text-xs text-crm-text-muted uppercase mb-1">
                    Mensaje
                  </p>
                  <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl p-3 text-sm text-green-900 dark:text-green-50 whitespace-pre-wrap">
                    {mensajeRender}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-crm-text-muted">
                  Cargando plantilla…
                </p>
              )}
            </>
          )}
        </div>

        <div className="border-t border-crm-border p-5 flex flex-col gap-2">
          {!actualLogId ? (
            <>
              <button
                type="button"
                disabled={procesando || !telefonoActual}
                onClick={handleAbrirWhatsApp}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {procesando ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Abrir WhatsApp
              </button>
              <button
                type="button"
                onClick={handleSaltar}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-crm-text-secondary border border-crm-border rounded-lg hover:bg-crm-card-hover"
              >
                Saltar este contacto
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <p className="text-sm text-center text-crm-text-secondary">
                ¿Enviaste el mensaje?
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleSiguiente("enviado")}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-crm-success text-white rounded-lg"
                >
                  <CheckCircle className="w-4 h-4" />
                  Sí, siguiente
                </button>
                <button
                  type="button"
                  onClick={() => handleSiguiente("descartado")}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-crm-card-hover text-crm-text-primary rounded-lg"
                >
                  No, siguiente
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────────────────────

export default function GestionCampanas() {
  const [campanas, setCampanas] = useState<CampanaConPlantilla[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalCrear, setModalCrear] = useState(false);
  const [confirmarEliminar, setConfirmarEliminar] = useState<{
    id: string;
    nombre: string;
  } | null>(null);
  const [asistenteCampana, setAsistenteCampana] =
    useState<CampanaConPlantilla | null>(null);

  const cargar = async () => {
    setLoading(true);
    const result = await obtenerCampanas();
    if (result.error) {
      toast.error(result.error);
    } else if (result.data) {
      setCampanas(result.data as CampanaConPlantilla[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    cargar();
  }, []);

  const handleEliminar = async () => {
    if (!confirmarEliminar) return;
    const result = await eliminarCampana(confirmarEliminar.id);
    if (result.success) {
      toast.success("Campaña eliminada");
      setConfirmarEliminar(null);
      cargar();
    } else {
      toast.error(result.error || "Error eliminando");
    }
  };

  const handleEstado = async (id: string, estado: EstadoCampana) => {
    const result = await actualizarEstadoCampana(id, estado);
    if (result.success) {
      toast.success("Estado actualizado");
      cargar();
    } else {
      toast.error(result.error || "Error");
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div
            key={idx}
            className="bg-crm-card border border-crm-border rounded-xl p-6 animate-pulse"
          >
            <div className="h-6 bg-crm-border rounded w-48 mb-4" />
            <div className="h-4 bg-crm-border rounded w-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-crm-text-primary">
              Campañas WhatsApp
            </h2>
            <p className="text-sm text-crm-text-secondary mt-1">
              Envío asistido contacto por contacto vía WhatsApp Web.
            </p>
          </div>
          <button
            onClick={() => setModalCrear(true)}
            className="flex items-center gap-2 px-4 py-2 bg-crm-primary text-white rounded-lg hover:bg-crm-primary-hover"
          >
            <Plus className="w-4 h-4" />
            Nueva Campaña
          </button>
        </div>

        {campanas.length === 0 ? (
          <div className="bg-crm-card border border-crm-border rounded-xl p-12 text-center">
            <Users className="w-12 h-12 text-crm-primary mx-auto mb-3" />
            <h3 className="text-lg font-medium text-crm-text-primary mb-2">
              Sin campañas
            </h3>
            <p className="text-sm text-crm-text-secondary mb-6">
              Crea una campaña para enviar plantillas a tu audiencia.
            </p>
            <button
              onClick={() => setModalCrear(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-crm-primary text-white rounded-lg hover:bg-crm-primary-hover"
            >
              <Plus className="w-4 h-4" />
              Crear Primera Campaña
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {campanas.map((c) => {
              const badge = ESTADO_BADGE[c.estado] ?? ESTADO_BADGE.DRAFT;
              const total = c.audiencia?.contactos_count ?? 0;
              const abiertos = c.total_abiertos ?? 0;
              const enviados = c.total_marcados_enviados ?? 0;
              const respondidos = c.total_respondidos ?? 0;
              return (
                <div
                  key={c.id}
                  className="bg-crm-card border border-crm-border rounded-xl p-5 hover:shadow transition-shadow"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold text-crm-text-primary">
                          {c.nombre}
                        </h3>
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded-full ${badge.cls}`}
                        >
                          {badge.label}
                        </span>
                      </div>
                      <p className="text-xs text-crm-text-muted mt-1">
                        {c.template?.nombre ?? "Plantilla eliminada"} ·{" "}
                        {c.audiencia?.nombre ?? "Audiencia eliminada"}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-3 mb-3 text-center">
                    <div className="bg-crm-bg-secondary rounded-lg p-2">
                      <p className="text-xs text-crm-text-muted">Audiencia</p>
                      <p className="text-base font-semibold text-crm-text-primary">
                        {total}
                      </p>
                    </div>
                    <div className="bg-crm-bg-secondary rounded-lg p-2">
                      <p className="text-xs text-crm-text-muted">Abiertos</p>
                      <p className="text-base font-semibold text-crm-info">
                        {abiertos}
                      </p>
                    </div>
                    <div className="bg-crm-bg-secondary rounded-lg p-2">
                      <p className="text-xs text-crm-text-muted">Enviados</p>
                      <p className="text-base font-semibold text-crm-success">
                        {enviados}
                      </p>
                    </div>
                    <div className="bg-crm-bg-secondary rounded-lg p-2">
                      <p className="text-xs text-crm-text-muted">
                        Respondidos
                      </p>
                      <p className="text-base font-semibold text-crm-primary">
                        {respondidos}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-3 border-t border-crm-border">
                    {(c.estado === "RUNNING" ||
                      c.estado === "DRAFT" ||
                      c.estado === "SCHEDULED" ||
                      c.estado === "PAUSED") && (
                      <button
                        onClick={() => setAsistenteCampana(c)}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-crm-primary text-white rounded-lg hover:bg-crm-primary-hover text-sm"
                      >
                        <Send className="w-4 h-4" />
                        Continuar envío
                      </button>
                    )}
                    {c.estado === "RUNNING" && (
                      <button
                        onClick={() => handleEstado(c.id, "PAUSED")}
                        className="inline-flex items-center gap-2 px-3 py-1.5 text-crm-warning border border-crm-warning/30 rounded-lg hover:bg-crm-warning/10 text-sm"
                      >
                        <Pause className="w-4 h-4" />
                        Pausar
                      </button>
                    )}
                    {c.estado === "PAUSED" && (
                      <button
                        onClick={() => handleEstado(c.id, "RUNNING")}
                        className="inline-flex items-center gap-2 px-3 py-1.5 text-crm-success border border-crm-success/30 rounded-lg hover:bg-crm-success/10 text-sm"
                      >
                        <Play className="w-4 h-4" />
                        Reanudar
                      </button>
                    )}
                    <button
                      onClick={() =>
                        setConfirmarEliminar({ id: c.id, nombre: c.nombre })
                      }
                      className="ml-auto inline-flex items-center justify-center w-8 h-8 text-crm-error hover:bg-crm-error/10 rounded-lg"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ModalCrearCampana
        open={modalCrear}
        onClose={() => setModalCrear(false)}
        onSuccess={cargar}
      />

      {confirmarEliminar && (
        <ModalConfirmarEliminar
          nombre={confirmarEliminar.nombre}
          onConfirmar={handleEliminar}
          onCancelar={() => setConfirmarEliminar(null)}
        />
      )}

      {asistenteCampana && (
        <AsistenteCampana
          campana={asistenteCampana}
          onCerrar={() => {
            setAsistenteCampana(null);
            cargar();
          }}
        />
      )}
    </>
  );
}
