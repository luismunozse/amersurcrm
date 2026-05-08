"use client";

import { useEffect, useMemo, useState } from "react";
import { X, Bell, Save, Loader2, Search } from "lucide-react";
import toast from "react-hot-toast";
import {
  obtenerPlantillas,
  crearRecordatorioEnvioTemplate,
} from "@/app/dashboard/admin/marketing/_actions";
import { extractVariables, renderTemplate } from "@/lib/marketing/whatsapp";
import type { MarketingTemplate } from "@/types/whatsapp-marketing";
import DateTimePicker from "@/components/ui/DateTimePicker";
import { createClient } from "@/lib/supabase.client";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  clienteIdInicial?: string;
  clienteNombreInicial?: string;
  telefonoInicial?: string;
  templateIdInicial?: string;
}

interface ClienteRow {
  id: string;
  nombre: string;
  telefono: string | null;
}

export default function ModalCrearRecordatorioWhatsApp({
  open,
  onClose,
  onSuccess,
  clienteIdInicial,
  clienteNombreInicial,
  telefonoInicial,
  templateIdInicial,
}: Props) {
  const [plantillas, setPlantillas] = useState<MarketingTemplate[]>([]);
  const [busquedaCliente, setBusquedaCliente] = useState(
    clienteNombreInicial ?? "",
  );
  const [resultadosClientes, setResultadosClientes] = useState<ClienteRow[]>([]);
  const [clienteSeleccionado, setClienteSeleccionado] =
    useState<ClienteRow | null>(
      clienteIdInicial && clienteNombreInicial
        ? {
            id: clienteIdInicial,
            nombre: clienteNombreInicial,
            telefono: telefonoInicial ?? null,
          }
        : null,
    );
  const [templateId, setTemplateId] = useState(templateIdInicial ?? "");
  const [fecha, setFecha] = useState("");
  const [prioridad, setPrioridad] = useState<
    "baja" | "media" | "alta" | "urgente"
  >("media");
  const [notas, setNotas] = useState("");
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [buscandoClientes, setBuscandoClientes] = useState(false);

  useEffect(() => {
    if (!open) return;
    obtenerPlantillas().then((r) => {
      setPlantillas((r.data ?? []).filter((p) => p.activo));
    });
    if (clienteIdInicial && clienteNombreInicial) {
      setClienteSeleccionado({
        id: clienteIdInicial,
        nombre: clienteNombreInicial,
        telefono: telefonoInicial ?? null,
      });
      setBusquedaCliente(clienteNombreInicial);
    }
    if (templateIdInicial) setTemplateId(templateIdInicial);
  }, [open, clienteIdInicial, clienteNombreInicial, telefonoInicial, templateIdInicial]);

  // Búsqueda de clientes con debounce
  useEffect(() => {
    if (!open || clienteSeleccionado) return;
    const q = busquedaCliente.trim();
    if (q.length < 2) {
      setResultadosClientes([]);
      return;
    }
    const timer = setTimeout(async () => {
      setBuscandoClientes(true);
      const supabase = createClient();
      const { data } = await supabase
        .from("cliente")
        .select("id, nombre, telefono, telefono_whatsapp")
        .or(`nombre.ilike.%${q}%,telefono.ilike.%${q}%`)
        .limit(10);
      setResultadosClientes(
        (data ?? []).map((c) => ({
          id: c.id,
          nombre: c.nombre,
          telefono: c.telefono_whatsapp ?? c.telefono ?? null,
        })),
      );
      setBuscandoClientes(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [busquedaCliente, open, clienteSeleccionado]);

  const plantillaSeleccionada = useMemo(
    () => plantillas.find((p) => p.id === templateId),
    [plantillas, templateId],
  );

  const variablesEditables = useMemo(() => {
    if (!plantillaSeleccionada) return [];
    const todas = plantillaSeleccionada.variables?.length
      ? plantillaSeleccionada.variables
      : extractVariables(plantillaSeleccionada.body_texto);
    return todas.filter((v) => v !== "cliente");
  }, [plantillaSeleccionada]);

  const previewSample = plantillaSeleccionada
    ? renderTemplate(plantillaSeleccionada.body_texto, {
        cliente: clienteSeleccionado?.nombre ?? "[cliente]",
        ...variables,
      })
    : "";

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteSeleccionado) {
      toast.error("Selecciona un cliente");
      return;
    }
    if (!templateId) {
      toast.error("Selecciona una plantilla");
      return;
    }
    if (!fecha) {
      toast.error("Selecciona fecha y hora");
      return;
    }
    const tel = clienteSeleccionado.telefono;
    if (!tel) {
      toast.error("El cliente no tiene teléfono registrado");
      return;
    }
    const faltantes = variablesEditables.filter((v) => !variables[v]?.trim());
    if (faltantes.length > 0) {
      toast.error(`Faltan variables: ${faltantes.join(", ")}`);
      return;
    }

    setLoading(true);
    try {
      const result = await crearRecordatorioEnvioTemplate({
        clienteId: clienteSeleccionado.id,
        templateId,
        fechaProgramada: fecha,
        variables: { cliente: clienteSeleccionado.nombre, ...variables },
        telefono: tel,
        notas: notas.trim() || undefined,
        prioridad,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Recordatorio programado");
      onSuccess();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div
          className="fixed inset-0 bg-black/50 transition-opacity"
          onClick={onClose}
        />

        <div className="relative w-full max-w-xl bg-crm-card rounded-xl shadow-xl border border-crm-border max-h-[92vh] overflow-y-auto">
          <div className="sticky top-0 bg-crm-card border-b border-crm-border p-5 flex items-center justify-between z-10">
            <div>
              <h3 className="text-lg font-semibold text-crm-text-primary flex items-center gap-2">
                <Bell className="w-5 h-5 text-crm-primary" />
                Programar envío WhatsApp
              </h3>
              <p className="text-xs text-crm-text-muted mt-1">
                Notif push al vendedor en la fecha programada.
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-crm-text-muted hover:text-crm-text-primary"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* Cliente */}
            <div>
              <label className="block text-sm font-medium text-crm-text-primary mb-1">
                Cliente *
              </label>
              {clienteSeleccionado ? (
                <div className="flex items-center gap-2 px-3 py-2 bg-crm-bg-secondary border border-crm-border rounded-lg">
                  <span className="text-sm text-crm-text-primary flex-1">
                    {clienteSeleccionado.nombre}
                    {clienteSeleccionado.telefono &&
                      ` · ${clienteSeleccionado.telefono}`}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setClienteSeleccionado(null);
                      setBusquedaCliente("");
                    }}
                    className="text-xs text-crm-error"
                  >
                    Cambiar
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-crm-text-muted" />
                  <input
                    type="text"
                    value={busquedaCliente}
                    onChange={(e) => setBusquedaCliente(e.target.value)}
                    placeholder="Buscar por nombre o teléfono…"
                    className="w-full pl-10 pr-3 py-2 bg-crm-bg-primary border border-crm-border rounded-lg text-sm"
                  />
                  {buscandoClientes && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-crm-text-muted" />
                  )}
                  {resultadosClientes.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full bg-crm-card border border-crm-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {resultadosClientes.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setClienteSeleccionado(c);
                            setBusquedaCliente(c.nombre);
                            setResultadosClientes([]);
                          }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-crm-card-hover"
                        >
                          {c.nombre}
                          {c.telefono && (
                            <span className="text-xs text-crm-text-muted ml-2">
                              {c.telefono}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Plantilla */}
            <div>
              <label className="block text-sm font-medium text-crm-text-primary mb-1">
                Plantilla *
              </label>
              <select
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                className="w-full px-3 py-2 bg-crm-bg-primary border border-crm-border rounded-lg text-sm"
              >
                <option value="">-- Seleccionar --</option>
                {plantillas.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </div>

            {variablesEditables.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-crm-text-primary">
                  Variables
                </p>
                {variablesEditables.map((v) => (
                  <div key={v}>
                    <label className="block text-xs text-crm-text-secondary mb-1">
                      {`{{${v}}}`}
                    </label>
                    <input
                      type="text"
                      value={variables[v] ?? ""}
                      onChange={(e) =>
                        setVariables((prev) => ({
                          ...prev,
                          [v]: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 bg-crm-bg-primary border border-crm-border rounded-lg text-sm"
                    />
                  </div>
                ))}
              </div>
            )}

            {plantillaSeleccionada && (
              <div>
                <p className="text-xs font-medium text-crm-text-muted uppercase mb-1">
                  Vista previa
                </p>
                <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl p-3 text-sm text-green-900 dark:text-green-50 whitespace-pre-wrap">
                  {previewSample}
                </div>
              </div>
            )}

            {/* Fecha + prioridad */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-crm-text-primary mb-1">
                  Fecha y hora *
                </label>
                <DateTimePicker
                  value={fecha}
                  onChange={setFecha}
                  placeholder="Seleccionar"
                  minDate={new Date()}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-crm-text-primary mb-1">
                  Prioridad
                </label>
                <select
                  value={prioridad}
                  onChange={(e) =>
                    setPrioridad(
                      e.target.value as "baja" | "media" | "alta" | "urgente",
                    )
                  }
                  className="w-full px-3 py-2 bg-crm-bg-primary border border-crm-border rounded-lg text-sm"
                >
                  <option value="baja">Baja</option>
                  <option value="media">Media</option>
                  <option value="alta">Alta</option>
                  <option value="urgente">Urgente</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-crm-text-primary mb-1">
                Notas (opcional)
              </label>
              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 bg-crm-bg-primary border border-crm-border rounded-lg text-sm"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-crm-border">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-sm text-crm-text-secondary border border-crm-border rounded-lg disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm bg-crm-primary text-white rounded-lg hover:bg-crm-primary-hover flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Programar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
