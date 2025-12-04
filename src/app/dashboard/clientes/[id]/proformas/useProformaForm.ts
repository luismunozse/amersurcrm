import { useState, useCallback, useMemo } from "react";
import {
  ProformaDatos,
  ProformaMoneda,
  ProformaTipoOperacion,
  buildDefaultProformaDatos,
  CUENTAS_EMPRESA_DEFAULT,
  CONDICIONES_COMERCIALES_DEFAULT,
  REQUISITOS_CONTRATO_DEFAULT,
} from "@/types/proforma";

interface Cliente {
  id: string;
  nombre?: string;
  documento_identidad?: string;
  dni?: string;
  telefono?: string;
  telefono_whatsapp?: string;
  email?: string;
}

interface AsesorActual {
  nombre_completo?: string;
  username?: string;
  telefono?: string;
}

interface Reserva {
  id: string;
  codigo_reserva?: string;
  lote_id?: string;
  moneda?: string;
  monto_reserva?: number;
  lote?: {
    id: string;
    numero_lote?: string;
    proyecto?: {
      nombre?: string;
    };
  };
}

interface Venta {
  id: string;
  codigo_venta?: string;
  lote_id?: string;
  moneda?: string;
  precio_total?: number;
  monto_inicial?: number;
  numero_cuotas?: number;
  lote?: {
    id: string;
    numero_lote?: string;
    proyecto?: {
      nombre?: string;
    };
  };
}

interface ProformaFormState {
  tipoOperacion: ProformaTipoOperacion;
  moneda: ProformaMoneda;
  loteId?: string | null;
  reservaId?: string | null;
  ventaId?: string | null;
  datos: ProformaDatos;
}

interface UseProformaFormOptions {
  cliente: Cliente;
  asesorActual: AsesorActual | null;
  reservas: Reserva[];
  ventas: Venta[];
  proformaInicial?: {
    tipo_operacion: ProformaTipoOperacion;
    moneda: ProformaMoneda;
    lote_id?: string | null;
    datos: ProformaDatos;
  } | null;
}

export function useProformaForm({
  cliente,
  asesorActual,
  reservas,
  ventas,
  proformaInicial,
}: UseProformaFormOptions) {
  const initialFormState = useMemo((): ProformaFormState => {
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
  }, [cliente, asesorActual]);

  const [form, setForm] = useState<ProformaFormState>(initialFormState);
  const [cuentasEmpresa, setCuentasEmpresa] = useState<string[]>([...CUENTAS_EMPRESA_DEFAULT]);

  // Calcular precio final
  const precioFinalCalculado = useMemo(() => {
    const precioLista = form.datos.precios?.precioLista ?? 0;
    const descuento = form.datos.precios?.descuento ?? 0;
    return precioLista - descuento;
  }, [form.datos.precios?.precioLista, form.datos.precios?.descuento]);

  // Opciones para selects
  const reservasOptions = useMemo(
    () =>
      (reservas || []).map((reserva) => ({
        id: reserva.id,
        label: `${reserva.codigo_reserva ?? "Reserva"} · ${reserva?.lote?.proyecto?.nombre ?? "Proyecto"} · Lote ${
          reserva?.lote?.numero_lote ?? "-"
        }`,
        data: reserva,
      })),
    [reservas],
  );

  const ventasOptions = useMemo(
    () =>
      (ventas || []).map((venta) => ({
        id: venta.id,
        label: `${venta.codigo_venta ?? "Venta"} · ${venta?.lote?.proyecto?.nombre ?? "Proyecto"} · Lote ${
          venta?.lote?.numero_lote ?? "-"
        }`,
        data: venta,
      })),
    [ventas],
  );

  // Funciones de actualización
  const updateDatos = useCallback((updater: (prev: ProformaDatos) => ProformaDatos) => {
    setForm((prev) => ({
      ...prev,
      datos: updater(prev.datos),
    }));
  }, []);

  const applyReserva = useCallback(
    (reservaId: string | null) => {
      if (!reservaId) {
        setForm((prev) => ({ ...prev, reservaId: null }));
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
    },
    [reservasOptions],
  );

  const applyVenta = useCallback(
    (ventaId: string | null) => {
      if (!ventaId) {
        setForm((prev) => ({ ...prev, ventaId: null }));
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
    },
    [ventasOptions],
  );

  const resetForm = useCallback(() => {
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
      setCuentasEmpresa(
        proformaInicial.datos.cuentasEmpresa?.length
          ? proformaInicial.datos.cuentasEmpresa
          : [...CUENTAS_EMPRESA_DEFAULT]
      );
    } else {
      setForm(initialFormState);
      setCuentasEmpresa([...CUENTAS_EMPRESA_DEFAULT]);
    }
  }, [proformaInicial, initialFormState]);

  return {
    form,
    setForm,
    cuentasEmpresa,
    setCuentasEmpresa,
    precioFinalCalculado,
    reservasOptions,
    ventasOptions,
    updateDatos,
    applyReserva,
    applyVenta,
    resetForm,
  };
}
