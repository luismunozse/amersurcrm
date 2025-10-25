"use client";

import { createPortal } from "react-dom";
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

function sanitizeList(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatList(list: string[] | undefined): string {
  return (list && list.length > 0 ? list : [""]).join("\n");
}

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
  const [condicionesTexto, setCondicionesTexto] = useState<string>(
    CONDICIONES_COMERCIALES_DEFAULT.join("\n"),
  );
  const [requisitosTexto, setRequisitosTexto] = useState<string>(REQUISITOS_CONTRATO_DEFAULT.join("\n"));
  const [cuentasTexto, setCuentasTexto] = useState<string>(CUENTAS_EMPRESA_DEFAULT.join("\n"));

  useEffect(() => {
    setMounted(true);
  }, []);

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
        setCondicionesTexto(formatList(proformaInicial.datos.condicionesComerciales));
        setRequisitosTexto(formatList(proformaInicial.datos.requisitosContrato));
        setCuentasTexto(formatList(proformaInicial.datos.cuentasEmpresa));
      } else {
        const state = initialFormState(cliente, asesorActual);
        setForm(state);
        setCondicionesTexto(formatList(state.datos.condicionesComerciales));
        setRequisitosTexto(formatList(state.datos.requisitosContrato));
        setCuentasTexto(formatList(state.datos.cuentasEmpresa));
      }
    }
  }, [isOpen, proformaInicial, cliente, asesorActual]);

  const reservasOptions = useMemo(
    () =>
      (reservas || []).map((reserva: any) => ({
        id: reserva.id,
        label: `${reserva.codigo_reserva} · ${reserva?.lote?.proyecto?.nombre ?? "Proyecto"} · Lote ${
          reserva?.lote?.numero_lote ?? "-"
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
          venta?.lote?.numero_lote ?? "-"
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
          lote: reserva.lote?.numero_lote ?? prev.datos.terreno.lote,
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
          lote: venta.lote?.numero_lote ?? prev.datos.terreno.lote,
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
    if (!form.datos.cliente.nombre) {
      toast.error("El nombre del cliente es obligatorio");
      return;
    }

    startTransition(async () => {
      const payload: CrearProformaInput = {
        clienteId: cliente.id,
        loteId: form.loteId ?? null,
        tipoOperacion: form.tipoOperacion,
        moneda: form.moneda,
        total: form.datos.precios?.precioFinal ?? null,
        descuento: form.datos.precios?.descuento ?? null,
        datos: {
          ...form.datos,
          condicionesComerciales: sanitizeList(condicionesTexto),
          requisitosContrato: sanitizeList(requisitosTexto),
          cuentasEmpresa: sanitizeList(cuentasTexto),
        },
      };

      const response = proformaInicial
        ? await actualizarProformaAction(proformaInicial.id, payload)
        : await crearProformaAction(payload);

      if (!response.success || !response.proforma) {
        toast.error(response.error || "No se pudo guardar la proforma");
        return;
      }

      toast.success(proformaInicial ? "Proforma actualizada" : "Proforma creada");
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

      <div className="relative z-10 w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-crm-card border-2 border-crm-border rounded-2xl shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-crm-border bg-crm-card/80 backdrop-blur">
          <div>
            <h2 className="text-xl font-semibold text-crm-text-primary">
              {proformaInicial ? "Editar proforma" : "Nueva proforma"}
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

        <div className="p-6 space-y-6">
          {/* Tipo y moneda */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-crm-text-secondary mb-1">
                Tipo de operación
              </label>
              <select
                className="w-full px-3 py-2 rounded-lg border border-crm-border bg-crm-background text-crm-text focus:outline-none focus:ring-2 focus:ring-crm-primary"
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
                className="w-full px-3 py-2 rounded-lg border border-crm-border bg-crm-background text-crm-text focus:outline-none focus:ring-2 focus:ring-crm-primary"
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
                className="w-full px-3 py-2 rounded-lg border border-crm-border bg-crm-background text-crm-text focus:outline-none focus:ring-2 focus:ring-crm-primary"
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
                className="w-full px-3 py-2 rounded-lg border border-crm-border bg-crm-background text-crm-text focus:outline-none focus:ring-2 focus:ring-crm-primary"
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
                className="w-full px-3 py-2 rounded-lg border border-crm-border bg-crm-background text-crm-text focus:outline-none focus:ring-2 focus:ring-crm-primary"
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

          {/* Datos cliente y asesor */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3 p-4 bg-crm-background rounded-xl border border-crm-border">
              <h3 className="text-sm font-semibold text-crm-text-secondary uppercase tracking-wider">
                Datos del cliente
              </h3>
              <div className="grid grid-cols-1 gap-3">
                {[
                  { label: "Nombre completo", field: "nombre" },
                  { label: "Documento (DNI)", field: "dni" },
                  { label: "Teléfono", field: "telefono" },
                  { label: "Correo electrónico", field: "email" },
                ].map((item) => (
                  <div key={item.field}>
                    <label className="block text-xs font-semibold text-crm-text-muted uppercase mb-1">
                      {item.label}
                    </label>
                    <input
                      className="w-full px-3 py-2 rounded-lg border border-crm-border bg-white text-crm-text focus:outline-none focus:ring-2 focus:ring-crm-primary"
                      value={(form.datos.cliente as any)[item.field] ?? ""}
                      onChange={(e) =>
                        updateDatos((prev) => ({
                          ...prev,
                          cliente: {
                            ...prev.cliente,
                            [item.field]: e.target.value,
                          },
                        }))
                      }
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3 p-4 bg-crm-background rounded-xl border border-crm-border">
              <h3 className="text-sm font-semibold text-crm-text-secondary uppercase tracking-wider">
                Atendido por
              </h3>
              <div className="grid grid-cols-1 gap-3">
                {[
                  { label: "Asesor de ventas", field: "nombre" },
                  { label: "Celular", field: "celular" },
                ].map((item) => (
                  <div key={item.field}>
                    <label className="block text-xs font-semibold text-crm-text-muted uppercase mb-1">
                      {item.label}
                    </label>
                    <input
                      className="w-full px-3 py-2 rounded-lg border border-crm-border bg-white text-crm-text focus:outline-none focus:ring-2 focus:ring-crm-primary"
                      value={(form.datos.asesor as any)[item.field] ?? ""}
                      onChange={(e) =>
                        updateDatos((prev) => ({
                          ...prev,
                          asesor: {
                            ...prev.asesor,
                            [item.field]: e.target.value,
                          },
                        }))
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Características del terreno */}
          <div className="p-4 bg-crm-background rounded-xl border border-crm-border space-y-3">
            <h3 className="text-sm font-semibold text-crm-text-secondary uppercase tracking-wider">
              Características del terreno
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { label: "Proyecto", field: "proyecto" },
                { label: "Lote", field: "lote" },
                { label: "Etapa / Sector", field: "etapa" },
                { label: "Área del terreno", field: "area", placeholder: "Ej. 120 m²" },
              ].map((item) => (
                <div key={item.field}>
                  <label className="block text-xs font-semibold text-crm-text-muted uppercase mb-1">
                    {item.label}
                  </label>
                  <input
                    className="w-full px-3 py-2 rounded-lg border border-crm-border bg-white text-crm-text focus:outline-none focus:ring-2 focus:ring-crm-primary"
                    placeholder={item.placeholder}
                    value={(form.datos.terreno as any)[item.field] ?? ""}
                    onChange={(e) =>
                      updateDatos((prev) => ({
                        ...prev,
                        terreno: {
                          ...prev.terreno,
                          [item.field]: e.target.value,
                        },
                      }))
                    }
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Precios y forma de pago */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-crm-background rounded-xl border border-crm-border space-y-3">
              <h3 className="text-sm font-semibold text-crm-text-secondary uppercase tracking-wider">
                Descuentos y promociones
              </h3>
              <div className="space-y-3">
                {[
                  { label: "Precio en lista", field: "precioLista" },
                  { label: "Descuento", field: "descuento" },
                  { label: "Precio final", field: "precioFinal" },
                ].map((item) => (
                  <div key={item.field}>
                    <label className="block text-xs font-semibold text-crm-text-muted uppercase mb-1">
                      {item.label}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full px-3 py-2 rounded-lg border border-crm-border bg-white text-crm-text focus:outline-none focus:ring-2 focus:ring-crm-primary"
                      value={(form.datos.precios as any)[item.field] ?? ""}
                      onChange={(e) => {
                        const value = e.target.value === "" ? null : Number(e.target.value);
                        updateDatos((prev) => ({
                          ...prev,
                          precios: {
                            ...prev.precios,
                            [item.field]: e.target.value === "" ? null : value,
                          },
                        }));
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 bg-crm-background rounded-xl border border-crm-border space-y-3">
              <h3 className="text-sm font-semibold text-crm-text-secondary uppercase tracking-wider">
                Forma de pago
              </h3>
              <div className="space-y-3">
                {[
                  { label: "Separación", field: "separacion" },
                  { label: "Abono principal", field: "abonoPrincipal" },
                  { label: "Número de cuotas", field: "numeroCuotas" },
                ].map((item) => (
                  <div key={item.field}>
                    <label className="block text-xs font-semibold text-crm-text-muted uppercase mb-1">
                      {item.label}
                    </label>
                    <input
                      type={item.field === "numeroCuotas" ? "number" : "number"}
                      step="0.01"
                      min={item.field === "numeroCuotas" ? 0 : undefined}
                      className="w-full px-3 py-2 rounded-lg border border-crm-border bg-white text-crm-text focus:outline-none focus:ring-2 focus:ring-crm-primary"
                      value={(form.datos.formaPago as any)[item.field] ?? ""}
                      onChange={(e) => {
                        const value =
                          e.target.value === ""
                            ? null
                            : item.field === "numeroCuotas"
                              ? Number.parseInt(e.target.value, 10)
                              : Number(e.target.value);
                        updateDatos((prev) => ({
                          ...prev,
                          formaPago: {
                            ...prev.formaPago,
                            [item.field]: e.target.value === "" ? null : value,
                          },
                        }));
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Condiciones y medios de pago */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-crm-background rounded-xl border border-crm-border">
              <label className="block text-sm font-semibold text-crm-text-secondary uppercase tracking-wider mb-2">
                Condiciones comerciales
              </label>
              <textarea
                rows={6}
                className="w-full px-3 py-2 rounded-lg border border-crm-border bg-white text-crm-text focus:outline-none focus:ring-2 focus:ring-crm-primary"
                value={condicionesTexto}
                onChange={(e) => setCondicionesTexto(e.target.value)}
              />
              <p className="text-xs text-crm-text-muted mt-1">
                Una condición por línea. Se mostrarán como lista en la proforma.
              </p>
            </div>

            <div className="p-4 bg-crm-background rounded-xl border border-crm-border space-y-4">
              <div>
                <label className="block text-sm font-semibold text-crm-text-secondary uppercase tracking-wider mb-2">
                  Medios de pago
                </label>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-crm-text-muted uppercase mb-1">
                      Cuenta en soles
                    </label>
                    <input
                      className="w-full px-3 py-2 rounded-lg border border-crm-border bg-white text-crm-text focus:outline-none focus:ring-2 focus:ring-crm-primary"
                      value={form.datos.mediosPago?.soles ?? ""}
                      onChange={(e) =>
                        updateDatos((prev) => ({
                          ...prev,
                          mediosPago: {
                            ...prev.mediosPago,
                            soles: e.target.value,
                          },
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-crm-text-muted uppercase mb-1">
                      Cuenta en dólares
                    </label>
                    <input
                      className="w-full px-3 py-2 rounded-lg border border-crm-border bg-white text-crm-text focus:outline-none focus:ring-2 focus:ring-crm-primary"
                      value={form.datos.mediosPago?.dolares ?? ""}
                      onChange={(e) =>
                        updateDatos((prev) => ({
                          ...prev,
                          mediosPago: {
                            ...prev.mediosPago,
                            dolares: e.target.value,
                          },
                        }))
                      }
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-crm-text-secondary uppercase tracking-wider mb-2">
                  Requisitos para emisión de contrato
                </label>
                <textarea
                  rows={5}
                  className="w-full px-3 py-2 rounded-lg border border-crm-border bg-white text-crm-text focus:outline-none focus:ring-2 focus:ring-crm-primary"
                  value={requisitosTexto}
                  onChange={(e) => setRequisitosTexto(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Cuentas y comentarios */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-crm-background rounded-xl border border-crm-border">
              <label className="block text-sm font-semibold text-crm-text-secondary uppercase tracking-wider mb-2">
                Cuentas de la empresa
              </label>
              <textarea
                rows={5}
                className="w-full px-3 py-2 rounded-lg border border-crm-border bg-white text-crm-text focus:outline-none focus:ring-2 focus:ring-crm-primary"
                value={cuentasTexto}
                onChange={(e) => setCuentasTexto(e.target.value)}
              />
            </div>

            <div className="p-4 bg-crm-background rounded-xl border border-crm-border">
              <label className="block text-sm font-semibold text-crm-text-secondary uppercase tracking-wider mb-2">
                Comentarios adicionales
              </label>
              <textarea
                rows={5}
                className="w-full px-3 py-2 rounded-lg border border-crm-border bg-white text-crm-text focus:outline-none focus:ring-2 focus:ring-crm-primary"
                value={form.datos.comentariosAdicionales ?? ""}
                onChange={(e) =>
                  updateDatos((prev) => ({
                    ...prev,
                    comentariosAdicionales: e.target.value,
                  }))
                }
              />
              <p className="text-xs text-crm-text-muted mt-1">
                Este texto aparecerá como nota al pie antes de las firmas.
              </p>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-6 py-4 border-t border-crm-border bg-crm-card/80 backdrop-blur">
          <p className="text-xs text-crm-text-muted">
            Las proformas se guardan en el historial del cliente junto con la información del asesor.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm border border-crm-border rounded-lg text-crm-text hover:border-crm-primary transition-colors"
              type="button"
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              onClick={() => handleSubmit(false)}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm bg-crm-primary text-white rounded-lg hover:bg-crm-primary-dark transition-colors disabled:opacity-60"
              type="button"
            >
              Guardar
            </button>
            <button
              onClick={() => handleSubmit(true)}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm bg-crm-accent text-white rounded-lg hover:bg-crm-accent/90 transition-colors disabled:opacity-60 flex items-center gap-2"
              type="button"
            >
              Generar PDF
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
