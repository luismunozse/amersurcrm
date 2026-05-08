"use client";

import { useEffect, useState } from "react";
import {
  Bell,
  Plus,
  Calendar,
  User,
  Loader2,
  RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";
import { listarRecordatoriosEnvioTemplate } from "@/app/dashboard/admin/marketing/_actions";
import ModalCrearRecordatorioWhatsApp from "./ModalCrearRecordatorioWhatsApp";
import BotonEnviarWhatsApp from "./BotonEnviarWhatsApp";

interface RecordatorioRow {
  id: string;
  titulo: string;
  descripcion: string | null;
  fecha_recordatorio: string;
  prioridad: string;
  completado: boolean;
  cliente_id: string | null;
  cliente?: { id: string; nombre: string; telefono: string | null } | null;
  data: {
    template_id?: string;
    variables_valores?: Record<string, string>;
    telefono?: string;
  } | null;
}

const PRIO_COLOR: Record<string, string> = {
  baja: "bg-crm-card-hover text-crm-text-secondary",
  media: "bg-crm-info/10 text-crm-info",
  alta: "bg-crm-warning/10 text-crm-warning",
  urgente: "bg-crm-error/10 text-crm-error",
};

export default function RecordatoriosWhatsApp() {
  const [recordatorios, setRecordatorios] = useState<RecordatorioRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalCrear, setModalCrear] = useState(false);

  const cargar = async () => {
    setLoading(true);
    const result = await listarRecordatoriosEnvioTemplate({
      pendientesSolo: true,
    });
    if (result.error) {
      toast.error(result.error);
    } else if (result.data) {
      setRecordatorios(result.data as RecordatorioRow[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    cargar();
  }, []);

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-crm-text-primary flex items-center gap-2">
              <Bell className="w-5 h-5 text-crm-primary" />
              Recordatorios de envío
            </h2>
            <p className="text-sm text-crm-text-secondary mt-1">
              Programa el envío de plantillas. Push automático en la fecha.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={cargar}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-crm-border rounded-lg hover:bg-crm-card-hover disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={() => setModalCrear(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-crm-primary text-white rounded-lg hover:bg-crm-primary-hover"
            >
              <Plus className="w-4 h-4" />
              Programar envío
            </button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div
                key={idx}
                className="bg-crm-card border border-crm-border rounded-lg p-4 animate-pulse h-20"
              />
            ))}
          </div>
        ) : recordatorios.length === 0 ? (
          <div className="bg-crm-card border border-crm-border rounded-xl p-12 text-center">
            <Bell className="w-12 h-12 text-crm-text-muted mx-auto mb-3" />
            <h3 className="text-lg font-medium text-crm-text-primary mb-2">
              Sin recordatorios pendientes
            </h3>
            <p className="text-sm text-crm-text-secondary mb-6">
              Programa envíos futuros para no olvidar.
            </p>
            <button
              onClick={() => setModalCrear(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-crm-primary text-white rounded-lg hover:bg-crm-primary-hover"
            >
              <Plus className="w-4 h-4" />
              Programar primer envío
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {recordatorios.map((r) => {
              const fecha = new Date(r.fecha_recordatorio);
              const ahora = new Date();
              const vencido = fecha < ahora;
              const dias = Math.ceil(
                (fecha.getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24),
              );
              const telefono =
                r.data?.telefono || r.cliente?.telefono || "";
              return (
                <div
                  key={r.id}
                  className="bg-crm-card border border-crm-border rounded-lg p-4 flex items-start justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-crm-text-primary truncate">
                        {r.titulo}
                      </h3>
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded-full ${PRIO_COLOR[r.prioridad] ?? PRIO_COLOR.media}`}
                      >
                        {r.prioridad}
                      </span>
                      {vencido && (
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-crm-error/10 text-crm-error">
                          Vencido
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-crm-text-muted flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {fecha.toLocaleString("es-PE")}
                        {!vencido &&
                          ` · en ${dias === 0 ? "hoy" : `${dias} día${dias === 1 ? "" : "s"}`}`}
                      </span>
                      {r.cliente && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {r.cliente.nombre}
                        </span>
                      )}
                    </div>
                    {r.descripcion && (
                      <p className="text-xs text-crm-text-secondary mt-1 line-clamp-2">
                        {r.descripcion}
                      </p>
                    )}
                  </div>

                  {r.cliente_id &&
                    r.data?.template_id &&
                    telefono && (
                      <BotonEnviarWhatsApp
                        telefono={telefono}
                        clienteId={r.cliente_id}
                        clienteNombre={r.cliente?.nombre}
                        templateId={r.data.template_id}
                        recordatorioId={r.id}
                        variablesAuto={r.data.variables_valores ?? {}}
                        label="Enviar"
                        variant="primary"
                      />
                    )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ModalCrearRecordatorioWhatsApp
        open={modalCrear}
        onClose={() => setModalCrear(false)}
        onSuccess={cargar}
      />
    </>
  );
}
