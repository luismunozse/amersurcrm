"use client";

import { useState, useCallback, useRef } from "react";
import { X, Users, Filter, RefreshCw, Loader2 } from "lucide-react";
import { crearAudiencia, calcularAudiencia } from "@/app/dashboard/admin/marketing/_actions";
import toast from "react-hot-toast";

interface ModalCrearAudienciaProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ESTADOS_CLIENTE = [
  { value: "por_contactar", label: "Por contactar" },
  { value: "contactado", label: "Contactado" },
  { value: "en_seguimiento", label: "En seguimiento" },
  { value: "visita_agendada", label: "Visita agendada" },
  { value: "cliente_activo", label: "Cliente activo" },
  { value: "desestimado", label: "Desestimado" },
];

export default function ModalCrearAudiencia({ open, onClose, onSuccess }: ModalCrearAudienciaProps) {
  const [loading, setLoading] = useState(false);
  const [tipo, setTipo] = useState<"DINAMICO" | "ESTATICO">("DINAMICO");
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");

  // Filtros para audiencias dinámicas
  const [estados, setEstados] = useState<string[]>([]);
  const [capacidadMin, setCapacidadMin] = useState("");
  const [capacidadMax, setCapacidadMax] = useState("");
  const [diasSinContacto, setDiasSinContacto] = useState("");
  const [soloConWhatsApp, setSoloConWhatsApp] = useState(true);

  // Preview
  const [preview, setPreview] = useState<{ count: number; preview: string[] } | null>(null);
  const [calculando, setCalculando] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getFiltros = useCallback(() => ({
    estados: estados.length ? estados : undefined,
    capacidadMin: capacidadMin ? parseFloat(capacidadMin) : undefined,
    capacidadMax: capacidadMax ? parseFloat(capacidadMax) : undefined,
    diasSinContacto: diasSinContacto ? parseInt(diasSinContacto) : undefined,
    soloConWhatsApp,
  }), [estados, capacidadMin, capacidadMax, diasSinContacto, soloConWhatsApp]);

  const calcularPreview = useCallback(async () => {
    if (tipo !== "DINAMICO") return;
    setCalculando(true);
    const result = await calcularAudiencia(getFiltros());
    if (result.data) setPreview(result.data);
    setCalculando(false);
  }, [tipo, getFiltros]);

  const schedulePreview = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(calcularPreview, 600);
  };

  const toggleEstado = (val: string) => {
    setEstados((prev) =>
      prev.includes(val) ? prev.filter((e) => e !== val) : [...prev, val]
    );
    schedulePreview();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }
    setLoading(true);
    const result = await crearAudiencia({
      nombre,
      descripcion: descripcion || undefined,
      tipo,
      filtros: tipo === "DINAMICO" ? getFiltros() : undefined,
    });
    setLoading(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Audiencia creada");
      onSuccess();
      onClose();
      resetForm();
    }
  };

  const resetForm = () => {
    setNombre("");
    setDescripcion("");
    setTipo("DINAMICO");
    setEstados([]);
    setCapacidadMin("");
    setCapacidadMax("");
    setDiasSinContacto("");
    setSoloConWhatsApp(true);
    setPreview(null);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose} />
        <div className="relative w-full max-w-xl bg-crm-card rounded-xl shadow-xl border border-crm-border max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-crm-card border-b border-crm-border p-6 flex items-center justify-between z-10">
            <div>
              <h3 className="text-xl font-semibold text-crm-text-primary flex items-center gap-2">
                <Users className="w-5 h-5 text-crm-primary" />
                Nueva Audiencia
              </h3>
              <p className="text-sm text-crm-text-secondary mt-1">
                Crea un segmento de clientes para tus campañas
              </p>
            </div>
            <button onClick={onClose} className="text-crm-text-muted hover:text-crm-text-primary transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Nombre */}
            <div>
              <label className="block text-sm font-medium text-crm-text-primary mb-2">Nombre *</label>
              <input
                type="text"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-bg-primary text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary"
                placeholder="Ej: Clientes activos con capacidad media"
              />
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-sm font-medium text-crm-text-primary mb-2">Descripción</label>
              <textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-bg-primary text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary"
                placeholder="Descripción opcional"
              />
            </div>

            {/* Tipo */}
            <div>
              <label className="block text-sm font-medium text-crm-text-primary mb-2">Tipo</label>
              <div className="flex gap-2">
                {(["DINAMICO", "ESTATICO"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTipo(t)}
                    className={`flex-1 py-2.5 text-sm rounded-xl border transition-colors ${
                      tipo === t
                        ? "bg-crm-primary text-white border-crm-primary"
                        : "border-crm-border text-crm-text-secondary hover:bg-crm-card-hover"
                    }`}
                  >
                    {t === "DINAMICO" ? "🔄 Dinámico (filtros)" : "📋 Estático (lista fija)"}
                  </button>
                ))}
              </div>
              <p className="text-xs text-crm-text-muted mt-1">
                {tipo === "DINAMICO"
                  ? "Los contactos se calculan automáticamente según los filtros. Se puede recalcular."
                  : "Lista fija de contactos. No cambia automáticamente."}
              </p>
            </div>

            {/* Filtros dinámicos */}
            {tipo === "DINAMICO" && (
              <div className="border border-crm-border rounded-xl p-4 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Filter className="w-4 h-4 text-crm-primary" />
                  <span className="text-sm font-medium text-crm-text-primary">Filtros</span>
                  <button
                    type="button"
                    onClick={calcularPreview}
                    className="ml-auto text-xs text-crm-primary flex items-center gap-1 hover:underline"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Calcular
                  </button>
                </div>

                {/* Estados */}
                <div>
                  <label className="text-xs font-medium text-crm-text-secondary mb-2 block">
                    Estado del cliente (selección múltiple)
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {ESTADOS_CLIENTE.map((e) => (
                      <button
                        key={e.value}
                        type="button"
                        onClick={() => toggleEstado(e.value)}
                        className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                          estados.includes(e.value)
                            ? "bg-crm-primary text-white border-crm-primary"
                            : "border-crm-border text-crm-text-muted hover:bg-crm-card-hover"
                        }`}
                      >
                        {e.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Capacidad de compra */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-crm-text-secondary mb-1 block">Capacidad min (S/)</label>
                    <input
                      type="number"
                      value={capacidadMin}
                      onChange={(e) => { setCapacidadMin(e.target.value); schedulePreview(); }}
                      className="w-full px-3 py-2 text-sm border border-crm-border rounded-lg bg-transparent text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary"
                      placeholder="Sin mínimo"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-crm-text-secondary mb-1 block">Capacidad max (S/)</label>
                    <input
                      type="number"
                      value={capacidadMax}
                      onChange={(e) => { setCapacidadMax(e.target.value); schedulePreview(); }}
                      className="w-full px-3 py-2 text-sm border border-crm-border rounded-lg bg-transparent text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary"
                      placeholder="Sin máximo"
                    />
                  </div>
                </div>

                {/* Días sin contacto */}
                <div>
                  <label className="text-xs font-medium text-crm-text-secondary mb-1 block">
                    Días sin contacto (mayor a)
                  </label>
                  <input
                    type="number"
                    value={diasSinContacto}
                    onChange={(e) => { setDiasSinContacto(e.target.value); schedulePreview(); }}
                    className="w-full px-3 py-2 text-sm border border-crm-border rounded-lg bg-transparent text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary"
                    placeholder="Ej: 30 (clientes sin contacto hace más de 30 días)"
                  />
                </div>

                {/* Solo con WhatsApp */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={soloConWhatsApp}
                    onChange={(e) => { setSoloConWhatsApp(e.target.checked); schedulePreview(); }}
                    className="w-4 h-4 text-crm-primary border-crm-border rounded"
                  />
                  <span className="text-sm text-crm-text-secondary">Solo clientes con WhatsApp activo</span>
                </label>

                {/* Preview */}
                <div className={`rounded-xl p-3 border text-sm ${
                  preview ? "bg-crm-success/5 border-crm-success/20" : "bg-crm-card-hover border-crm-border"
                }`}>
                  {calculando ? (
                    <div className="flex items-center gap-2 text-crm-text-muted">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Calculando...
                    </div>
                  ) : preview ? (
                    <div>
                      <p className="font-semibold text-crm-success">{preview.count} contactos coinciden</p>
                      {preview.preview.length > 0 && (
                        <p className="text-xs text-crm-text-muted mt-1">
                          Ej: {preview.preview.join(", ")}
                          {preview.count > preview.preview.length ? "..." : ""}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-crm-text-muted">Haz clic en Calcular para ver el tamaño estimado de la audiencia</p>
                  )}
                </div>
              </div>
            )}

            {/* Audiencia estática — info */}
            {tipo === "ESTATICO" && (
              <div className="bg-crm-card-hover border border-crm-border rounded-xl p-4 text-sm text-crm-text-secondary">
                Las audiencias estáticas se pueden construir importando clientes desde la sección de Clientes del CRM
                usando la opción &quot;Agregar a audiencia&quot;.
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-crm-border">
              <button
                type="button"
                onClick={() => { onClose(); resetForm(); }}
                disabled={loading}
                className="px-4 py-2 text-crm-text-muted hover:text-crm-text-primary border border-crm-border rounded-lg transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-crm-primary text-white rounded-lg hover:bg-crm-primary-hover transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creando...
                  </>
                ) : (
                  <>
                    <Users className="w-4 h-4" />
                    Crear Audiencia
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
