"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { X, UserPlus, Loader2, Search, Download } from "lucide-react";
import { toast } from "sonner";
import {
  crearReservaConVinculacion,
  obtenerClientesParaSelect,
  obtenerDatosVendedorActual
} from "./_actions";
import ClienteForm from "@/components/ClienteForm";
import { buildProformaPdf } from "@/components/proforma/generarProformaPdf";
import type { ProformaDatos } from "@/types/proforma";
import { CONDICIONES_COMERCIALES_DEFAULT, REQUISITOS_CONTRATO_DEFAULT, CUENTAS_EMPRESA_DEFAULT } from "@/types/proforma";

interface ModalReservaLoteProps {
  open: boolean;
  onClose: () => void;
  lote: {
    id: string;
    codigo: string;
    precio: number | null;
    sup_m2: number | null;
  };
  proyectoId: string;
  onSuccess?: () => void;
}

export default function ModalReservaLote({
  open,
  onClose,
  lote,
  proyectoId,
  onSuccess
}: ModalReservaLoteProps) {
  // Estados del formulario
  const [clientes, setClientes] = useState<Array<{ id: string; nombre: string; email: string | null; telefono: string | null }>>([]);
  const [clienteId, setClienteId] = useState("");
  const [busquedaCliente, setBusquedaCliente] = useState("");
  const [precioVenta, setPrecioVenta] = useState(lote.precio?.toString() || "0");
  const [montoInicial, setMontoInicial] = useState("");
  const [numeroCuotas, setNumeroCuotas] = useState("1");
  const [formaPago, setFormaPago] = useState("contado");
  const [fechaVencimiento, setFechaVencimiento] = useState("");
  const [notas, setNotas] = useState("");

  // Estados UI
  const [loading, setLoading] = useState(false);
  const [loadingClientes, setLoadingClientes] = useState(true);
  const [mostrarFormCliente, setMostrarFormCliente] = useState(false);

  // Estados para PDF de proforma
  const [vendedorNombre, setVendedorNombre] = useState<string>("");
  const [vendedorTelefono, setVendedorTelefono] = useState<string>("");
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Cargar clientes y vendedor al abrir
  useEffect(() => {
    if (open) {
      cargarClientes();
      cargarVendedor();
      // Establecer fecha de vencimiento por defecto (30 días)
      const fechaDefecto = new Date();
      fechaDefecto.setDate(fechaDefecto.getDate() + 30);
      setFechaVencimiento(fechaDefecto.toISOString().split('T')[0]);
    }
  }, [open]);

  // Búsqueda con debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (open) {
        cargarClientes(busquedaCliente);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [busquedaCliente, open]);

  // Bloquear scroll cuando está abierto
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !mostrarFormCliente) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.documentElement.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, mostrarFormCliente, onClose]);

  // Generar PDF de proforma cuando cambien los datos
  useEffect(() => {
    if (!open || !clienteId || !vendedorNombre) {
      setPdfUrl(prev => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      return;
    }

    let cancelled = false;

    const generarProformaPdf = async () => {
      setIsGeneratingPdf(true);

      try {
        const clienteSeleccionado = clientes.find(c => c.id === clienteId);
        if (!clienteSeleccionado) return;

        const precio = parseFloat(precioVenta) || lote.precio || 0;
        const inicial = parseFloat(montoInicial) || 0;
        const cuotas = parseInt(numeroCuotas) || 1;

        const datosProforma: ProformaDatos = {
          cliente: {
            nombre: clienteSeleccionado.nombre,
            dni: "",
            telefono: clienteSeleccionado.telefono || "",
            email: clienteSeleccionado.email || ""
          },
          asesor: {
            nombre: vendedorNombre,
            celular: vendedorTelefono
          },
          terreno: {
            proyecto: "",
            lote: lote.codigo,
            etapa: "",
            area: lote.sup_m2 ? `${lote.sup_m2} m²` : "",
            precioLista: precio
          },
          precios: {
            precioLista: precio,
            descuento: null,
            precioFinal: precio
          },
          formaPago: {
            separacion: inicial,
            abonoPrincipal: null,
            numeroCuotas: cuotas
          },
          condicionesComerciales: CONDICIONES_COMERCIALES_DEFAULT,
          mediosPago: {
            soles: "",
            dolares: ""
          },
          requisitosContrato: REQUISITOS_CONTRATO_DEFAULT,
          cuentasEmpresa: CUENTAS_EMPRESA_DEFAULT,
          comentariosAdicionales: notas || null,
          validezDias: 3
        };

        const { bytes } = await buildProformaPdf({
          numero: null,
          moneda: "PEN",
          total: precio,
          datos: datosProforma,
          created_at: new Date(),
          updated_at: new Date()
        });

        if (cancelled) return;

        const pdfBytesArray = new Uint8Array(bytes);
        setPdfBytes(pdfBytesArray);

        const blob = new Blob([pdfBytesArray], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);

        setPdfUrl(prev => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });

      } catch (error) {
        console.error('Error generando proforma:', error);
        if (!cancelled) {
          toast.error("Error al generar la proforma");
        }
      } finally {
        if (!cancelled) {
          setIsGeneratingPdf(false);
        }
      }
    };

    void generarProformaPdf();

    return () => {
      cancelled = true;
    };
  }, [open, clienteId, clientes, vendedorNombre, vendedorTelefono, precioVenta, montoInicial, numeroCuotas, notas, lote]);

  // Limpiar URL del PDF al cerrar
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  const cargarClientes = async (busqueda?: string) => {
    setLoadingClientes(true);
    const { data, error } = await obtenerClientesParaSelect(busqueda);
    if (error) {
      toast.error("Error cargando clientes");
    } else {
      setClientes(data || []);
    }
    setLoadingClientes(false);
  };

  const cargarVendedor = async () => {
    const { nombre, telefono, error } = await obtenerDatosVendedorActual();
    if (error || !nombre) {
      setVendedorNombre("Vendedor");
      setVendedorTelefono("");
    } else {
      setVendedorNombre(nombre);
      setVendedorTelefono(telefono || "");
    }
  };

  const handleClienteCreado = () => {
    // Recargar clientes
    cargarClientes();
    // Cerrar formulario
    setMostrarFormCliente(false);
    toast.success("Cliente creado. Selecciónalo en la lista.");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validaciones
    if (!clienteId) {
      toast.error("Debe seleccionar un cliente");
      return;
    }

    const precio = parseFloat(precioVenta);
    const inicial = parseFloat(montoInicial) || 0;
    const cuotas = parseInt(numeroCuotas);

    if (isNaN(precio) || precio <= 0) {
      toast.error("El precio de venta debe ser mayor a 0");
      return;
    }

    if (inicial < 0 || inicial > precio) {
      toast.error("El monto inicial no es válido");
      return;
    }

    if (isNaN(cuotas) || cuotas < 0) {
      toast.error("El número de cuotas no es válido");
      return;
    }

    if (!fechaVencimiento) {
      toast.error("Debe especificar una fecha de vencimiento");
      return;
    }

    setLoading(true);

    const { data, error } = await crearReservaConVinculacion({
      loteId: lote.id,
      proyectoId,
      clienteId,
      precioVenta: precio,
      montoInicial: inicial,
      numeroCuotas: cuotas,
      formaPago,
      fechaVencimiento,
      notas
    });

    if (error) {
      toast.error(error);
      setLoading(false);
      return;
    }

    if (data) {
      toast.success(`Reserva ${data.codigo_reserva} creada exitosamente`);
      onSuccess?.();
      onClose();
      // Limpiar formulario
      setClienteId("");
      setBusquedaCliente("");
      setPrecioVenta(lote.precio?.toString() || "");
      setMontoInicial("");
      setNumeroCuotas("1");
      setFormaPago("contado");
      setNotas("");
    }

    setLoading(false);
  };

  if (!open) return null;

  return createPortal(
    <>
      {/* Modal de reserva */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        role="dialog"
        aria-modal="true"
        style={{ display: mostrarFormCliente ? 'none' : 'flex' }}
      >
        <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl bg-crm-card border border-crm-border shadow-2xl">
          {/* Header */}
          <div className="sticky top-0 bg-crm-card border-b border-crm-border px-6 py-4 flex items-center justify-between z-10">
            <div>
              <h2 className="text-xl font-bold text-crm-text-primary">Reservar Lote</h2>
              <p className="text-sm text-crm-text-muted mt-1">
                Lote: {lote.codigo} • {lote.sup_m2 ? `${lote.sup_m2} m²` : 'Sin superficie'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-crm-text-muted hover:text-crm-text-primary transition-colors p-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Cliente */}
            <div>
              <label className="block text-sm font-medium text-crm-text-primary mb-2">
                Cliente *
              </label>

              <div className="space-y-3">
                {/* Búsqueda */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-crm-text-muted" />
                  <Input
                    type="text"
                    placeholder="Buscar por nombre, email o teléfono..."
                    value={busquedaCliente}
                    onChange={(e) => setBusquedaCliente(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Selector */}
                <select
                  value={clienteId}
                  onChange={(e) => setClienteId(e.target.value)}
                  disabled={loadingClientes}
                  className="w-full px-4 py-2 bg-crm-input border border-crm-border rounded-lg text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary disabled:opacity-50"
                >
                  <option value="">
                    {loadingClientes ? 'Cargando clientes...' :
                     clientes.length === 0 ? 'No se encontraron clientes' :
                     `Seleccionar cliente (${clientes.length} encontrados)`}
                  </option>
                  {clientes.map((cliente) => (
                    <option key={cliente.id} value={cliente.id}>
                      {cliente.nombre} {cliente.telefono ? `- ${cliente.telefono}` : ''} {cliente.email ? `- ${cliente.email}` : ''}
                    </option>
                  ))}
                </select>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setMostrarFormCliente(true)}
                  className="w-full"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Crear nuevo cliente (Formulario completo)
                </Button>
              </div>
            </div>

            {/* Configuración de Pago */}
            <div className="border-t border-crm-border pt-6">
              <h3 className="text-lg font-semibold text-crm-text-primary mb-4">Configuración de Pago</h3>

              <div className="grid grid-cols-2 gap-4">
                {/* Monto inicial */}
                <div>
                  <label className="block text-sm font-medium text-crm-text-secondary mb-2">
                    Monto Inicial (S/) *
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={montoInicial}
                    onChange={(e) => setMontoInicial(e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                {/* Forma de pago */}
                <div>
                  <label className="block text-sm font-medium text-crm-text-secondary mb-2">
                    Forma de Pago *
                  </label>
                  <select
                    value={formaPago}
                    onChange={(e) => setFormaPago(e.target.value)}
                    className="w-full px-4 py-2 bg-crm-input border border-crm-border rounded-lg text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary"
                  >
                    <option value="contado">Contado</option>
                    <option value="financiado">Financiado</option>
                    <option value="credito_bancario">Crédito Bancario</option>
                    <option value="mixto">Mixto</option>
                  </select>
                </div>

                {/* Número de cuotas */}
                <div>
                  <label className="block text-sm font-medium text-crm-text-secondary mb-2">
                    Número de Cuotas *
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={numeroCuotas}
                    onChange={(e) => setNumeroCuotas(e.target.value)}
                    placeholder="1"
                  />
                </div>

                {/* Fecha de vencimiento */}
                <div>
                  <label className="block text-sm font-medium text-crm-text-secondary mb-2">
                    Fecha de Vencimiento *
                  </label>
                  <Input
                    type="date"
                    value={fechaVencimiento}
                    onChange={(e) => setFechaVencimiento(e.target.value)}
                  />
                </div>
              </div>

              {/* Notas */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-crm-text-secondary mb-2">
                  Notas / Observaciones
                </label>
                <textarea
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2 bg-crm-input border border-crm-border rounded-lg text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary resize-none"
                  placeholder="Observaciones adicionales..."
                />
              </div>
            </div>

            {/* Proforma PDF */}
            {clienteId && vendedorNombre && (
              <div className="border-t border-crm-border pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-crm-text-primary">Proforma</h3>
                  {pdfUrl && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (pdfBytes) {
                          const blob = new Blob([pdfBytes], { type: 'application/pdf' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `proforma-${lote.codigo}-${Date.now()}.pdf`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }
                      }}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Descargar
                    </Button>
                  )}
                </div>

                <div className="bg-white border border-crm-border rounded-lg overflow-hidden">
                  {isGeneratingPdf ? (
                    <div className="flex items-center justify-center py-16">
                      <Loader2 className="w-8 h-8 animate-spin text-crm-primary" />
                      <span className="ml-3 text-crm-text-muted">Generando proforma...</span>
                    </div>
                  ) : pdfUrl ? (
                    <iframe
                      src={pdfUrl}
                      className="w-full h-[500px]"
                      title="Vista previa de proforma"
                    />
                  ) : (
                    <div className="flex items-center justify-center py-16 text-crm-text-muted">
                      Selecciona un cliente para ver la proforma
                    </div>
                  )}
                </div>

                {pdfUrl && (
                  <p className="text-sm text-crm-text-muted mt-3">
                    Vista previa de la proforma. Esta será guardada automáticamente al crear la reserva.
                  </p>
                )}
              </div>
            )}


            {/* Botones */}
            <div className="flex gap-3 pt-4 border-t border-crm-border">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading || !clienteId}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generando Reserva...
                  </>
                ) : (
                  'Generar Reserva'
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Modal de crear cliente (superpuesto) */}
      {mostrarFormCliente && createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-4xl my-8">
            <div className="bg-crm-card rounded-xl border border-crm-border shadow-2xl">
              {/* Header del modal de cliente */}
              <div className="sticky top-0 bg-crm-card border-b border-crm-border px-6 py-4 flex items-center justify-between z-10 rounded-t-xl">
                <div>
                  <h2 className="text-xl font-bold text-crm-text-primary">Crear Nuevo Cliente</h2>
                  <p className="text-sm text-crm-text-muted mt-1">
                    Completa el formulario y luego selecciona el cliente en la lista
                  </p>
                </div>
                <button
                  onClick={() => setMostrarFormCliente(false)}
                  className="text-crm-text-muted hover:text-crm-text-primary transition-colors p-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Formulario completo de cliente */}
              <div className="p-6">
                <ClienteForm
                  onSuccess={handleClienteCreado}
                  onCancel={() => setMostrarFormCliente(false)}
                />
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>,
    document.body
  );
}
