"use client";

import { createPortal } from "react-dom";
import { Spinner } from "@/components/ui/Spinner";
import { useEffect, useMemo, useState, useTransition } from "react";
import toast from "react-hot-toast";
import {
  buildDefaultProformaDatos,
  CONDICIONES_COMERCIALES_DEFAULT,
  CUENTAS_EMPRESA_DEFAULT,
  ProformaDatos,
  ProformaMoneda,
  ProformaRecord,
  ProformaTipoOperacion,
  REQUISITOS_CONTRATO_DEFAULT,
} from "@/types/proforma";
import {
  crearProformaAction,
  actualizarProformaAction,
  type CrearProformaInput,
} from "./proformas/_actions";
import { buildProformaPdf } from "@/components/proforma/generarProformaPdf";
import { FormInput } from "@/components/form/FormInput";
import { FormTextarea } from "@/components/form/FormTextarea";
import { LoadingButton } from "@/components/form/LoadingButton";
import { useProformaValidation } from "./proformas/useProformaValidation";

interface CrearProformaModalProps {
  isOpen: boolean;
  onClose: () => void;
  cliente: any;
  reservas: any[];
  ventas: any[];
  asesorActual: any | null;
  proformaInicial?: ProformaRecord | null;
  onCreated: (proforma: ProformaRecord, downloadPdf: boolean) => void;
}

interface ProformaFormState {
  tipoOperacion: ProformaTipoOperacion;
  moneda: ProformaMoneda;
  loteId?: string | null;
  reservaId?: string | null;
  ventaId?: string | null;
  datos: ProformaDatos;
}

const MONEDAS: { value: ProformaMoneda; label: string }[] = [
  { value: "PEN", label: "Soles" },
  { value: "USD", label: "Dólares" },
];

const TIPOS_OPERACION: { value: ProformaTipoOperacion; label: string }[] = [
  { value: "cotizacion", label: "Cotización" },
  { value: "reserva", label: "Reserva" },
  { value: "venta", label: "Venta" },
];

function initialFormState(cliente: any, asesorActual: any | null): ProformaFormState {
  const datosCliente = {
    nombre: cliente?.nombre ?? "",
    dni: cliente?.documento_identidad ?? cliente?.dni ?? "",
    telefono: cliente?.telefono ?? cliente?.telefono_whatsapp ?? "",
    email: cliente?.email ?? "",
  };

  const asesor = {
    nombre: asesorActual?.nombre_completo ?? asesorActual?.username ?? "",
    celular: asesorActual?.telefono ?? "",
  };

  const datos = buildDefaultProformaDatos({
    cliente: datosCliente,
    asesor,
  });

  return {
    tipoOperacion: "cotizacion",
    moneda: "PEN",
    loteId: undefined,
    reservaId: undefined,
    ventaId: undefined,
    datos,
  };
}

export default function CrearProformaModal({
  isOpen,
  onClose,
  cliente,
  reservas,
  ventas,
  asesorActual,
  proformaInicial,
  onCreated,
}: CrearProformaModalProps) {
  const [mounted, setMounted] = useState(false);
  const [isSubmitting, startTransition] = useTransition();
  const [form, setForm] = useState<ProformaFormState>(() => initialFormState(cliente, asesorActual));
  const [cuentasEmpresa, setCuentasEmpresa] = useState<string[]>([...CUENTAS_EMPRESA_DEFAULT]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewVersion, setPreviewVersion] = useState(0);
  const { errors, validateForm, clearError } = useProformaValidation();

  // Estados para proyectos y lotes
  const [proyectos, setProyectos] = useState<any[]>([]);
  const [lotes, setLotes] = useState<any[]>([]);
  const [selectedProyectoId, setSelectedProyectoId] = useState<string>("");
  const [loadingProyectos, setLoadingProyectos] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Cargar proyectos cuando se abre el modal
  useEffect(() => {
    if (!isOpen) return;

    const cargarProyectos = async () => {
      setLoadingProyectos(true);
      try {
        const response = await fetch('/api/reservas/opciones');
        if (!response.ok) throw new Error('Error al cargar proyectos');
        const data = await response.json();
        setProyectos(data.proyectos || []);
      } catch (error) {
        console.error('Error cargando proyectos:', error);
        toast.error('No se pudieron cargar los proyectos');
      } finally {
        setLoadingProyectos(false);
      }
    };

    void cargarProyectos();
  }, [isOpen]);

  // Cargar lotes cuando se selecciona un proyecto
  useEffect(() => {
    if (!selectedProyectoId) {
      setLotes([]);
      return;
    }

    const proyecto = proyectos.find((p) => p.id === selectedProyectoId);
    if (proyecto) {
      setLotes(proyecto.lotes || []);
    }
  }, [selectedProyectoId, proyectos]);

  // Calcular precio final automáticamente
  const precioFinalCalculado = useMemo(() => {
    const precioLista = form.datos.precios?.precioLista ?? 0;
    const descuento = form.datos.precios?.descuento ?? 0;
    return precioLista - descuento;
  }, [form.datos.precios?.precioLista, form.datos.precios?.descuento]);

  useEffect(() => {
    if (isOpen) {
      if (proformaInicial) {
        setForm({
          tipoOperacion: proformaInicial.tipo_operacion,
          moneda: proformaInicial.moneda,
          loteId: proformaInicial.lote_id,
          reservaId: undefined,
          ventaId: undefined,
          datos: {
            ...buildDefaultProformaDatos({
              cliente: proformaInicial.datos.cliente,
              asesor: proformaInicial.datos.asesor,
              terreno: proformaInicial.datos.terreno,
              precios: proformaInicial.datos.precios,
              formaPago: proformaInicial.datos.formaPago,
              mediosPago: proformaInicial.datos.mediosPago,
            }),
            condicionesComerciales:
              proformaInicial.datos.condicionesComerciales?.length
                ? proformaInicial.datos.condicionesComerciales
                : [...CONDICIONES_COMERCIALES_DEFAULT],
            requisitosContrato:
              proformaInicial.datos.requisitosContrato?.length
                ? proformaInicial.datos.requisitosContrato
                : [...REQUISITOS_CONTRATO_DEFAULT],
            cuentasEmpresa:
              proformaInicial.datos.cuentasEmpresa?.length
                ? proformaInicial.datos.cuentasEmpresa
                : [...CUENTAS_EMPRESA_DEFAULT],
            comentariosAdicionales: proformaInicial.datos.comentariosAdicionales,
            validezDias: proformaInicial.datos.validezDias ?? 3,
          },
        });
        setCuentasEmpresa(proformaInicial.datos.cuentasEmpresa?.length ? proformaInicial.datos.cuentasEmpresa : [...CUENTAS_EMPRESA_DEFAULT]);

        // Inicializar proyecto seleccionado si existe lote_id en la proforma
        if (proformaInicial.lote_id && proyectos.length > 0) {
          // Buscar el proyecto del lote
          const proyectoDelLote = proyectos.find((p) =>
            p.lotes?.some((l: any) => l.id === proformaInicial.lote_id)
          );
          if (proyectoDelLote) {
            setSelectedProyectoId(proyectoDelLote.id);
          }
        }
      } else {
        const state = initialFormState(cliente, asesorActual);
        setForm(state);
        setCuentasEmpresa(state.datos.cuentasEmpresa?.length ? state.datos.cuentasEmpresa : [...CUENTAS_EMPRESA_DEFAULT]);
        setSelectedProyectoId("");
      }
    }
  }, [isOpen, proformaInicial, cliente, asesorActual, proyectos]);

  // Generar PDF con debounce
  useEffect(() => {
    if (!isOpen) {
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      return;
    }

    let cancelled = false;

    // Debounce de 500ms
    const debounceTimer = setTimeout(() => {
      const generarPreview = async () => {
        setIsPreviewLoading(true);
        setPreviewError(null);

        try {
          const datosPreview: ProformaDatos = {
            cliente: { ...form.datos.cliente },
            asesor: { ...form.datos.asesor },
            terreno: { ...form.datos.terreno },
            precios: { ...form.datos.precios, precioFinal: precioFinalCalculado },
            formaPago: { ...form.datos.formaPago },
            condicionesComerciales: [...(form.datos.condicionesComerciales ?? CONDICIONES_COMERCIALES_DEFAULT)],
            mediosPago: {
              soles: form.datos.mediosPago?.soles ?? "",
              dolares: form.datos.mediosPago?.dolares ?? "",
            },
            requisitosContrato: [...(form.datos.requisitosContrato ?? REQUISITOS_CONTRATO_DEFAULT)],
            cuentasEmpresa: [...cuentasEmpresa],
            comentariosAdicionales: form.datos.comentariosAdicionales ?? "",
            validezDias: form.datos.validezDias ?? 3,
          };

          const { bytes } = await buildProformaPdf({
            numero: proformaInicial?.numero ?? null,
            moneda: form.moneda,
            total: form.datos.precios?.precioFinal ?? null,
            datos: datosPreview,
            created_at: proformaInicial?.created_at ?? new Date(),
            updated_at: proformaInicial?.updated_at ?? new Date(),
          });

          if (cancelled) return;

          const arrayBuffer = new Uint8Array(bytes).buffer;
          const blob = new Blob([arrayBuffer], { type: "application/pdf" });
          const nextUrl = URL.createObjectURL(blob);
          setPreviewUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return nextUrl;
          });
        } catch (error) {
        console.error("Error generando vista previa de cotización:", error);
          if (!cancelled) {
            setPreviewError("No se pudo generar la vista previa");
          }
        } finally {
          if (!cancelled) {
            setIsPreviewLoading(false);
          }
        }
      };

      void generarPreview();
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(debounceTimer);
    };
  }, [
    isOpen,
    form,
    cuentasEmpresa,
    proformaInicial?.numero,
    proformaInicial?.created_at,
    proformaInicial?.updated_at,
    previewVersion,
    precioFinalCalculado,
  ]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const reservasOptions = useMemo(
    () =>
      (reservas || []).map((reserva: any) => ({
        id: reserva.id,
        label: `${reserva.codigo_reserva} · ${reserva?.lote?.proyecto?.nombre ?? "Proyecto"} · Lote ${
          reserva?.lote?.codigo ?? "-"
        }`,
        data: reserva,
      })),
    [reservas],
  );

  const ventasOptions = useMemo(
    () =>
      (ventas || []).map((venta: any) => ({
        id: venta.id,
        label: `${venta.codigo_venta} · ${venta?.lote?.proyecto?.nombre ?? "Proyecto"} · Lote ${
          venta?.lote?.codigo ?? "-"
        }`,
        data: venta,
      })),
    [ventas],
  );

  const applyReserva = (reservaId: string | null) => {
    if (!reservaId) {
      setForm((prev) => ({
        ...prev,
        reservaId: null,
      }));
      return;
    }

    const option = reservasOptions.find((opt) => opt.id === reservaId);
    if (!option) return;
    const reserva = option.data;

    // Actualizar selector de proyecto si existe
    if (reserva.lote?.proyecto?.id) {
      setSelectedProyectoId(reserva.lote.proyecto.id);
    }

    setForm((prev) => ({
      ...prev,
      reservaId,
      tipoOperacion: "reserva",
      moneda: (reserva.moneda ?? "PEN") as ProformaMoneda,
      loteId: reserva.lote_id ?? prev.loteId,
      datos: {
        ...prev.datos,
        terreno: {
          ...prev.datos.terreno,
          proyecto: reserva.lote?.proyecto?.nombre ?? prev.datos.terreno.proyecto,
          lote: reserva.lote?.codigo ?? prev.datos.terreno.lote,
        },
        precios: {
          ...prev.datos.precios,
          precioLista: reserva.monto_reserva ?? prev.datos.precios.precioLista,
          precioFinal: prev.datos.precios.precioFinal ?? reserva.monto_reserva,
        },
        formaPago: {
          ...prev.datos.formaPago,
          separacion: reserva.monto_reserva ?? prev.datos.formaPago.separacion,
        },
      },
    }));
  };

  const applyVenta = (ventaId: string | null) => {
    if (!ventaId) {
      setForm((prev) => ({
        ...prev,
        ventaId: null,
      }));
      return;
    }
    const option = ventasOptions.find((opt) => opt.id === ventaId);
    if (!option) return;
    const venta = option.data;

    // Actualizar selector de proyecto si existe
    if (venta.lote?.proyecto?.id) {
      setSelectedProyectoId(venta.lote.proyecto.id);
    }

    setForm((prev) => ({
      ...prev,
      ventaId,
      tipoOperacion: "venta",
      moneda: (venta.moneda ?? "PEN") as ProformaMoneda,
      loteId: venta.lote_id ?? prev.loteId,
      datos: {
        ...prev.datos,
        terreno: {
          ...prev.datos.terreno,
          proyecto: venta.lote?.proyecto?.nombre ?? prev.datos.terreno.proyecto,
          lote: venta.lote?.codigo ?? prev.datos.terreno.lote,
        },
        precios: {
          ...prev.datos.precios,
          precioLista: venta.precio_total ?? prev.datos.precios.precioLista,
          precioFinal: venta.precio_total ?? prev.datos.precios.precioFinal,
        },
        formaPago: {
          ...prev.datos.formaPago,
          abonoPrincipal: venta.monto_inicial ?? prev.datos.formaPago.abonoPrincipal,
          numeroCuotas: venta.numero_cuotas ?? prev.datos.formaPago.numeroCuotas,
        },
      },
    }));
  };

  const updateDatos = (updater: (prev: ProformaDatos) => ProformaDatos) => {
    setForm((prev) => ({
      ...prev,
      datos: updater(prev.datos),
    }));
  };

  const handleSubmit = (downloadPdf: boolean) => {
    // Validar formulario
    const isValid = validateForm(form.datos, precioFinalCalculado);

    if (!isValid) {
      toast.error("Por favor, completa los campos obligatorios");
      return;
    }

    startTransition(async () => {
      const payload: CrearProformaInput = {
        clienteId: cliente.id,
        loteId: form.loteId ?? null,
        tipoOperacion: form.tipoOperacion,
        moneda: form.moneda,
        total: precioFinalCalculado,
        descuento: form.datos.precios?.descuento ?? null,
        datos: {
          ...form.datos,
          precios: {
            ...form.datos.precios,
            precioFinal: precioFinalCalculado
          },
          cuentasEmpresa: [...cuentasEmpresa],
        },
      };

      const response = proformaInicial
        ? await actualizarProformaAction(proformaInicial.id, payload)
        : await crearProformaAction(payload);

      if (!response.success || !response.proforma) {
        toast.error(response.error || "No se pudo guardar la cotización");
        return;
      }

      toast.success(proformaInicial ? "Cotización actualizada" : "Cotización creada");
      onCreated(response.proforma, downloadPdf);
      onClose();
    });
  };

  if (!mounted || !isOpen) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div className="relative z-10 w-full max-w-7xl max-h-[90vh] overflow-y-auto bg-crm-card border-2 border-crm-border rounded-2xl shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-crm-border bg-crm-card/80 backdrop-blur">
          <div>
            <h2 className="text-xl font-semibold text-crm-text-primary">
              {proformaInicial ? "Editar cotización" : "Nueva cotización"}
            </h2>
            <p className="text-sm text-crm-text-secondary">
              Cliente: {cliente?.nombre} · {cliente?.codigo_cliente ?? ""}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-crm-text-muted hover:text-crm-text transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1 space-y-6">
          {/* Tipo y moneda */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-crm-text-secondary mb-1">
                Tipo de operación
              </label>
              <select
                className="w-full px-3 py-2 rounded-lg border border-crm-border dark:border-gray-700 bg-white dark:bg-gray-900 text-crm-text dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-crm-primary"
                value={form.tipoOperacion}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    tipoOperacion: e.target.value as ProformaTipoOperacion,
                  }))
                }
              >
                {TIPOS_OPERACION.map((opcion) => (
                  <option key={opcion.value} value={opcion.value}>
                    {opcion.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-crm-text-secondary mb-1">
                Moneda
              </label>
              <select
                className="w-full px-3 py-2 rounded-lg border border-crm-border dark:border-gray-700 bg-white dark:bg-gray-900 text-crm-text dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-crm-primary"
                value={form.moneda}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    moneda: e.target.value as ProformaMoneda,
                  }))
                }
              >
                {MONEDAS.map((moneda) => (
                  <option key={moneda.value} value={moneda.value}>
                    {moneda.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-crm-text-secondary mb-1">
                Validez (días)
              </label>
              <input
                type="number"
                min={1}
                className="w-full px-3 py-2 rounded-lg border border-crm-border dark:border-gray-700 bg-white dark:bg-gray-900 text-crm-text dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-crm-primary"
                value={form.datos.validezDias ?? 3}
                onChange={(e) =>
                  updateDatos((prev) => ({
                    ...prev,
                    validezDias: e.target.value ? Number(e.target.value) : null,
                  }))
                }
              />
            </div>
          </div>

          {/* Asociaciones */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-crm-text-secondary mb-1">
                Asociar con reserva
              </label>
              <select
                className="w-full px-3 py-2 rounded-lg border border-crm-border dark:border-gray-700 bg-white dark:bg-gray-900 text-crm-text dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-crm-primary"
                value={form.reservaId ?? ""}
                onChange={(e) => applyReserva(e.target.value || null)}
              >
                <option value="">Sin asociación</option>
                {reservasOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-crm-text-secondary mb-1">
                Asociar con venta
              </label>
              <select
                className="w-full px-3 py-2 rounded-lg border border-crm-border dark:border-gray-700 bg-white dark:bg-gray-900 text-crm-text dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-crm-primary"
                value={form.ventaId ?? ""}
                onChange={(e) => applyVenta(e.target.value || null)}
              >
                <option value="">Sin asociación</option>
                {ventasOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Datos cliente y asesor (readonly) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-xl border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 uppercase tracking-wider">
                  Datos del cliente
                </h3>
              </div>
              <div className="grid grid-cols-1 gap-2">
                <div>
                  <label className="block text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">
                    Nombre completo
                  </label>
                  <div className="px-3 py-2 rounded-lg bg-white dark:bg-gray-900 text-crm-text text-sm border border-blue-100 dark:border-blue-900">
                    {form.datos.cliente?.nombre || <span className="text-crm-text-muted italic">No especificado</span>}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">
                    DNI
                  </label>
                  <div className="px-3 py-2 rounded-lg bg-white dark:bg-gray-900 text-crm-text text-sm border border-blue-100 dark:border-blue-900">
                    {form.datos.cliente?.dni || <span className="text-crm-text-muted italic">No especificado</span>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">
                      Teléfono
                    </label>
                    <div className="px-3 py-2 rounded-lg bg-white dark:bg-gray-900 text-crm-text text-sm border border-blue-100 dark:border-blue-900">
                      {form.datos.cliente?.telefono || "-"}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">
                      Email
                    </label>
                    <div className="px-3 py-2 rounded-lg bg-white dark:bg-gray-900 text-crm-text text-sm border border-blue-100 dark:border-blue-900 truncate">
                      {form.datos.cliente?.email || "-"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3 p-4 bg-green-50 dark:bg-green-950/20 rounded-xl border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <h3 className="text-sm font-semibold text-green-900 dark:text-green-100 uppercase tracking-wider">
                  Atendido por
                </h3>
              </div>
              <div className="grid grid-cols-1 gap-2">
                <div>
                  <label className="block text-xs font-medium text-green-700 dark:text-green-300 mb-1">
                    Asesor de ventas
                  </label>
                  <div className="px-3 py-2 rounded-lg bg-white dark:bg-gray-900 text-crm-text text-sm border border-green-100 dark:border-green-900">
                    {form.datos.asesor?.nombre || <span className="text-crm-text-muted italic">No especificado</span>}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-green-700 dark:text-green-300 mb-1">
                    Celular
                  </label>
                  <div className="px-3 py-2 rounded-lg bg-white dark:bg-gray-900 text-crm-text text-sm border border-green-100 dark:border-green-900">
                    {form.datos.asesor?.celular || <span className="text-crm-text-muted italic">No especificado</span>}
                  </div>
                </div>
              </div>
              <p className="text-xs text-green-700 dark:text-green-300 italic">
                Los datos del cliente y asesor se obtienen automáticamente
              </p>
            </div>
          </div>

          {/* Características del terreno */}
          <div className="p-4 bg-crm-background rounded-xl border border-crm-border space-y-3">
            <h3 className="text-sm font-semibold text-crm-text-secondary uppercase tracking-wider">
              Características del terreno
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label htmlFor="proyecto" className="block text-sm font-medium text-crm-text mb-1">
                  Proyecto *
                </label>
                <select
                  id="proyecto"
                  className="w-full px-3 py-2 rounded-lg border border-crm-border dark:border-gray-700 bg-white dark:bg-gray-900 text-crm-text dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-crm-primary"
                  value={selectedProyectoId}
                  disabled={loadingProyectos}
                  onChange={(e) => {
                    const proyectoId = e.target.value;
                    setSelectedProyectoId(proyectoId);
                    const proyecto = proyectos.find((p) => p.id === proyectoId);
                    updateDatos((prev) => ({
                      ...prev,
                      terreno: { ...prev.terreno, proyecto: proyecto?.nombre || "" },
                    }));
                    clearError("proyecto");
                  }}
                >
                  <option value="">Seleccionar proyecto</option>
                  {proyectos.map((proyecto) => (
                    <option key={proyecto.id} value={proyecto.id}>
                      {proyecto.nombre}
                    </option>
                  ))}
                </select>
                {errors.proyecto && (
                  <p className="mt-1 text-xs text-red-500">{errors.proyecto}</p>
                )}
              </div>
              <div>
                <label htmlFor="lote" className="block text-sm font-medium text-crm-text mb-1">
                  Lote *
                </label>
                <select
                  id="lote"
                  className="w-full px-3 py-2 rounded-lg border border-crm-border dark:border-gray-700 bg-white dark:bg-gray-900 text-crm-text dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-crm-primary disabled:opacity-50"
                  value={form.loteId || ""}
                  disabled={!selectedProyectoId || lotes.length === 0}
                  onChange={(e) => {
                    const loteId = e.target.value;
                    const lote = lotes.find((l) => l.id === loteId);
                    setForm((prev) => ({
                      ...prev,
                      loteId: loteId || null,
                      datos: {
                        ...prev.datos,
                        terreno: {
                          ...prev.datos.terreno,
                          lote: lote?.codigo || "",
                          area: lote?.sup_m2 ? `${lote.sup_m2} m²` : prev.datos.terreno.area,
                        },
                        precios: {
                          ...prev.datos.precios,
                          precioLista: lote?.precio || prev.datos.precios.precioLista,
                        },
                      },
                    }));
                    clearError("lote");
                  }}
                >
                  <option value="">Seleccionar lote</option>
                  {lotes.map((lote) => (
                    <option key={lote.id} value={lote.id}>
                      Lote {lote.codigo} {lote.sup_m2 ? `• ${lote.sup_m2} m²` : ""} {lote.precio ? `• S/ ${lote.precio.toLocaleString("es-PE")}` : ""}
                    </option>
                  ))}
                </select>
                {errors.lote && (
                  <p className="mt-1 text-xs text-red-500">{errors.lote}</p>
                )}
                {selectedProyectoId && lotes.length === 0 && (
                  <p className="mt-1 text-xs text-crm-text-muted">
                    Este proyecto no tiene lotes disponibles
                  </p>
                )}
              </div>
              <FormInput
                id="etapa"
                label="Etapa / Sector"
                value={form.datos.terreno?.etapa ?? ""}
                onChange={(e) =>
                  updateDatos((prev) => ({
                    ...prev,
                    terreno: { ...prev.terreno, etapa: e.target.value },
                  }))
                }
              />
              <FormInput
                id="area"
                label="Área del terreno"
                placeholder="Ej. 120 m²"
                value={form.datos.terreno?.area ?? ""}
                onChange={(e) =>
                  updateDatos((prev) => ({
                    ...prev,
                    terreno: { ...prev.terreno, area: e.target.value },
                  }))
                }
              />
            </div>
          </div>

          {/* Precios y forma de pago */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-crm-background rounded-xl border border-crm-border space-y-3">
              <h3 className="text-sm font-semibold text-crm-text-secondary uppercase tracking-wider">
                Descuentos y promociones
              </h3>
              <div className="space-y-3">
                <FormInput
                  id="precioLista"
                  label="Precio en lista"
                  type="number"
                  step="0.01"
                  required
                  value={form.datos.precios?.precioLista ?? ""}
                  onChange={(e) => {
                    const value = e.target.value === "" ? null : Number(e.target.value);
                    updateDatos((prev) => ({
                      ...prev,
                      precios: {
                        ...prev.precios,
                        precioLista: value,
                      },
                    }));
                    clearError("precioLista");
                  }}
                  error={errors.precioLista}
                />

                <FormInput
                  id="descuento"
                  label="Descuento"
                  type="number"
                  step="0.01"
                  value={form.datos.precios?.descuento ?? ""}
                  onChange={(e) => {
                    const value = e.target.value === "" ? null : Number(e.target.value);
                    updateDatos((prev) => ({
                      ...prev,
                      precios: {
                        ...prev.precios,
                        descuento: value,
                      },
                    }));
                  }}
                />

                {/* Precio final (readonly, calculado) */}
                <div>
                  <label className="block text-xs font-semibold text-crm-text-muted uppercase mb-1">
                    Precio final (calculado)
                  </label>
                  <div className="w-full px-3 py-2 rounded-lg border border-crm-border bg-crm-background text-crm-text font-semibold text-lg">
                    {form.moneda === "USD" ? "$" : "S/"} {precioFinalCalculado.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-crm-background rounded-xl border border-crm-border space-y-3">
              <h3 className="text-sm font-semibold text-crm-text-secondary uppercase tracking-wider">
                Forma de pago
              </h3>
              <div className="space-y-3">
                <FormInput
                  id="abonoPrincipal"
                  label="Abono principal"
                  type="number"
                  step="0.01"
                  value={form.datos.formaPago?.abonoPrincipal ?? ""}
                  onChange={(e) => {
                    const value = e.target.value === "" ? null : Number(e.target.value);
                    updateDatos((prev) => ({
                      ...prev,
                      formaPago: {
                        ...prev.formaPago,
                        abonoPrincipal: value,
                      },
                    }));
                  }}
                />

                <FormInput
                  id="numeroCuotas"
                  label="Número de cuotas"
                  type="number"
                  min={0}
                  value={form.datos.formaPago?.numeroCuotas ?? ""}
                  onChange={(e) => {
                    const value = e.target.value === "" ? null : Number.parseInt(e.target.value, 10);
                    updateDatos((prev) => ({
                      ...prev,
                      formaPago: {
                        ...prev.formaPago,
                        numeroCuotas: value,
                      },
                    }));
                  }}
                />
              </div>

              {/* Resumen de cuotas */}
              {precioFinalCalculado > 0 && (
                <div className="mt-4 p-3 bg-white rounded-lg border border-crm-primary/20">
                  <h4 className="text-xs font-semibold text-crm-text-muted uppercase mb-2">Resumen</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-crm-text-muted">Precio total:</span>
                      <span className="font-semibold text-crm-text">
                        {form.moneda === "USD" ? "$" : "S/"} {precioFinalCalculado.toFixed(2)}
                      </span>
                    </div>
                    {(form.datos.formaPago?.separacion ?? 0) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-crm-text-muted">- Separación:</span>
                        <span className="text-crm-text">
                          {form.moneda === "USD" ? "$" : "S/"} {(form.datos.formaPago?.separacion ?? 0).toFixed(2)}
                        </span>
                      </div>
                    )}
                    {(form.datos.formaPago?.abonoPrincipal ?? 0) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-crm-text-muted">- Abono:</span>
                        <span className="text-crm-text">
                          {form.moneda === "USD" ? "$" : "S/"} {(form.datos.formaPago?.abonoPrincipal ?? 0).toFixed(2)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t border-crm-border">
                      <span className="text-crm-text-muted font-semibold">Saldo:</span>
                      <span className="font-bold text-crm-primary">
                        {form.moneda === "USD" ? "$" : "S/"}{" "}
                        {(precioFinalCalculado - (form.datos.formaPago?.separacion ?? 0) - (form.datos.formaPago?.abonoPrincipal ?? 0)).toFixed(2)}
                      </span>
                    </div>
                    {(form.datos.formaPago?.numeroCuotas ?? 0) > 0 && (
                      <div className="flex justify-between text-xs pt-1">
                        <span className="text-crm-text-muted">
                          {form.datos.formaPago?.numeroCuotas} cuota{(form.datos.formaPago?.numeroCuotas ?? 0) > 1 ? "s" : ""} de:
                        </span>
                        <span className="font-semibold text-crm-accent">
                          {form.moneda === "USD" ? "$" : "S/"}{" "}
                          {((precioFinalCalculado - (form.datos.formaPago?.separacion ?? 0) - (form.datos.formaPago?.abonoPrincipal ?? 0)) / (form.datos.formaPago?.numeroCuotas ?? 1)).toFixed(2)}
                          /mes
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Cuentas y comentarios */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-crm-background rounded-xl border border-crm-border">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-semibold text-crm-text-secondary uppercase tracking-wider">
                  Cuentas de la empresa
                </label>
                <button
                  type="button"
                  onClick={() => setCuentasEmpresa([...cuentasEmpresa, ""])}
                  className="p-1.5 text-crm-primary hover:bg-crm-primary/10 rounded-lg transition-colors"
                  title="Agregar cuenta"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {cuentasEmpresa.map((cuenta, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={cuenta}
                      onChange={(e) => {
                        const nuevasCuentas = [...cuentasEmpresa];
                        nuevasCuentas[index] = e.target.value;
                        setCuentasEmpresa(nuevasCuentas);
                      }}
                      placeholder="Ej: BCP Soles: 123-456-789"
                      className="flex-1 px-3 py-2 text-sm rounded-lg border border-crm-border bg-crm-card text-crm-text focus:outline-none focus:ring-2 focus:ring-crm-primary"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const nuevasCuentas = cuentasEmpresa.filter((_, i) => i !== index);
                        setCuentasEmpresa(nuevasCuentas.length > 0 ? nuevasCuentas : [""]);
                      }}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Eliminar cuenta"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-crm-text-muted mt-2">
                Las cuentas aparecerán en el PDF de la cotización
              </p>
            </div>

            <div className="p-4 bg-crm-background rounded-xl border border-crm-border">
              <h3 className="text-sm font-semibold text-crm-text-secondary uppercase tracking-wider mb-3">
                Comentarios adicionales
              </h3>
              <FormTextarea
                id="comentariosAdicionales"
                label="Comentarios"
                rows={5}
                value={form.datos.comentariosAdicionales ?? ""}
                onChange={(e) =>
                  updateDatos((prev) => ({
                    ...prev,
                    comentariosAdicionales: e.target.value,
                  }))
                }
                helperText="Este texto aparecerá como nota al pie antes de las firmas."
              />
            </div>
          </div>
            </div>
            <aside className="mt-6 lg:mt-0 lg:w-[500px] flex-shrink-0 space-y-3">
              <div className="p-4 bg-crm-background rounded-xl border border-crm-border shadow-sm sticky top-20">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-crm-text-secondary uppercase tracking-wider">
                    Vista previa
                  </h3>
                  <div className="flex items-center gap-2">
                    {isPreviewLoading && (
                      <div className="flex items-center gap-2 text-xs text-crm-text-muted">
                        <Spinner size="sm" color="primary" />
                        <span>Generando…</span>
                      </div>
                    )}
                    {previewUrl && !isPreviewLoading && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            if (previewUrl) {
                              const a = document.createElement('a');
                              a.href = previewUrl;
                              a.download = `proforma-${cliente?.codigo_cliente || 'draft'}-${Date.now()}.pdf`;
                              a.click();
                            }
                          }}
                          className="p-1.5 text-crm-text-muted hover:text-crm-primary hover:bg-crm-primary/10 rounded-lg transition-colors"
                          title="Descargar PDF"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const modal = document.getElementById('proforma-fullscreen-modal');
                            if (modal) {
                              modal.style.display = 'flex';
                            }
                          }}
                          className="p-1.5 text-crm-text-muted hover:text-crm-primary hover:bg-crm-primary/10 rounded-lg transition-colors"
                          title="Ver en pantalla completa"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <div className="relative w-full h-[700px] bg-white border border-crm-border rounded-lg overflow-hidden flex items-center justify-center">
                  {previewError ? (
                    <div className="flex flex-col items-center justify-center gap-3 px-4 text-center">
                      <svg className="w-12 h-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-sm text-red-600 font-medium">{previewError}</p>
                      <button
                        type="button"
                        onClick={() => setPreviewVersion((prev) => prev + 1)}
                        className="px-4 py-2 text-sm font-medium rounded-lg bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 transition-colors"
                      >
                        Reintentar
                      </button>
                    </div>
                  ) : previewUrl ? (
                    <iframe
                      title="Vista previa cotización"
                      src={previewUrl}
                      className="absolute inset-0 h-full w-full"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-3 px-4 text-center">
                      <svg className="w-16 h-16 text-crm-text-muted opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-sm text-crm-text-muted">
                        Completa los datos para ver la cotización en tiempo real
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </aside>
          </div>
        </div>

        <div className="sticky bottom-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-6 py-4 border-t border-crm-border bg-crm-card/80 backdrop-blur">
          <p className="text-xs text-crm-text-muted">
            Las cotizaciones se guardan en el historial del cliente junto con la información del asesor.
          </p>
          <div className="flex items-center gap-3">
            <LoadingButton
              onClick={onClose}
              variant="secondary"
              type="button"
              disabled={isSubmitting}
            >
              Cancelar
            </LoadingButton>
            <LoadingButton
              onClick={() => handleSubmit(false)}
              variant="primary"
              type="button"
              isLoading={isSubmitting}
              loadingText="Guardando..."
            >
              Guardar
            </LoadingButton>
            <LoadingButton
              onClick={() => handleSubmit(true)}
              variant="accent"
              type="button"
              isLoading={isSubmitting}
              loadingText="Generando PDF..."
            >
              Generar PDF
            </LoadingButton>
          </div>
        </div>
      </div>

      {/* Modal de pantalla completa */}
      <div
        id="proforma-fullscreen-modal"
        className="fixed inset-0 z-[100] hidden items-center justify-center bg-black/90 backdrop-blur-sm p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            e.currentTarget.style.display = 'none';
          }
        }}
      >
        <div className="relative w-full h-full flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">
              Vista previa - Proforma
            </h3>
            <div className="flex items-center gap-2">
              {previewUrl && (
                <button
                  type="button"
                  onClick={() => {
                    if (previewUrl) {
                      const a = document.createElement('a');
                      a.href = previewUrl;
                      a.download = `proforma-${cliente?.codigo_cliente || 'draft'}-${Date.now()}.pdf`;
                      a.click();
                    }
                  }}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Descargar
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  const modal = document.getElementById('proforma-fullscreen-modal');
                  if (modal) {
                    modal.style.display = 'none';
                  }
                }}
                className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          <div className="flex-1 bg-white rounded-lg overflow-hidden">
            {previewUrl && (
              <iframe
                title="Vista previa cotización fullscreen"
                src={previewUrl}
                className="w-full h-full"
              />
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
