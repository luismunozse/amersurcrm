export type ProformaEstado = 'borrador' | 'enviada' | 'aprobada' | 'rechazada' | 'anulada' | 'convertida';
export type ProformaTipoOperacion = 'reserva' | 'venta' | 'cotizacion';
export type ProformaMoneda = 'PEN' | 'USD';

export interface ProformaClienteData {
  nombre: string;
  dni?: string | null;
  telefono?: string | null;
  email?: string | null;
}

export interface ProformaAsesorData {
  nombre: string;
  celular?: string | null;
}

export interface ProformaTerrenoData {
  proyecto?: string | null;
  lote?: string | null;
  etapa?: string | null;
  area?: string | null;
  precioLista?: number | null;
}

export interface ProformaPreciosData {
  precioLista?: number | null;
  descuento?: number | null;
  precioFinal?: number | null;
}

export interface ProformaFormaPagoData {
  separacion?: number | null;
  abonoPrincipal?: number | null;
  numeroCuotas?: number | null;
}

export interface ProformaDatos {
  cliente: ProformaClienteData;
  asesor: ProformaAsesorData;
  terreno: ProformaTerrenoData;
  precios: ProformaPreciosData;
  formaPago: ProformaFormaPagoData;
  condicionesComerciales: string[];
  mediosPago: {
    soles?: string | null;
    dolares?: string | null;
  };
  requisitosContrato: string[];
  cuentasEmpresa: string[];
  comentariosAdicionales?: string | null;
  validezDias?: number | null;
}

export interface ProformaRecord {
  id: string;
  numero: string | null;
  cliente_id: string;
  lote_id: string | null;
  asesor_id: string;
  asesor_username: string | null;
  tipo_operacion: ProformaTipoOperacion;
  estado: ProformaEstado;
  moneda: ProformaMoneda;
  total: number | null;
  descuento: number | null;
  datos: ProformaDatos;
  comentarios: string | null;
  pdf_url: string | null;
  enviado_a: string | null;
  enviado_por: string | null;
  enviado_en: string | null;
  reserva_id: string | null;
  created_at: string;
  updated_at: string;
}

export const CONDICIONES_COMERCIALES_DEFAULT: string[] = [
  'Validez de oferta: 3 días hábiles desde su recepción por WhatsApp o correo.',
  'Separación: Sirve para asegurar el lote elegido.',
  'Pagos: Todo voucher o transferencia debe estar firmado por el comprador (nombre, firma y DNI).',
  'Entrega: La fecha varía según el proyecto.',
  'Mantenimiento: Una vez entregado, el propietario es responsable del terreno.',
  'Gastos notariales, registrales y legales son asumidos por el cliente.',
  'Pagos en notaría o municipalidad: Solo en efectivo.',
  'Precio: Incluye delimitación con hitos; no incluye cerco u otro tipo de cerramiento.'
];

export const REQUISITOS_CONTRATO_DEFAULT: string[] = [
  'DNI (anverso y reverso).',
  'Recibo de servicios con dirección actual.',
  'Profesi\u00f3n u ocupación.',
  'Número de celular.',
  'Correo electrónico.'
];

export const CUENTAS_EMPRESA_DEFAULT: string[] = [
  'INVERSIONES DE AMERICA DEL SUR S.A.C. - AMERSUR S.A.C.',
  'Cuenta corriente Dolares BCP: 370-2438307-1-45 | CCI: 00237000243830714553',
  'Cuenta Recaudadora Soles BCP: 370-2540669-0-94 | CCI: 00237000254066909458',
];

export function buildDefaultProformaDatos(params: {
  cliente: ProformaClienteData;
  asesor?: ProformaAsesorData;
  terreno?: ProformaTerrenoData;
  precios?: ProformaPreciosData;
  formaPago?: ProformaFormaPagoData;
  mediosPago?: { soles?: string | null; dolares?: string | null };
}): ProformaDatos {
  return {
    cliente: params.cliente,
    asesor: params.asesor ?? { nombre: '' },
    terreno: params.terreno ?? {},
    precios: params.precios ?? {},
    formaPago: params.formaPago ?? {},
    condicionesComerciales: [...CONDICIONES_COMERCIALES_DEFAULT],
    mediosPago: {
      soles: params.mediosPago?.soles ?? '',
      dolares: params.mediosPago?.dolares ?? ''
    },
    requisitosContrato: [...REQUISITOS_CONTRATO_DEFAULT],
    cuentasEmpresa: [...CUENTAS_EMPRESA_DEFAULT],
    comentariosAdicionales: null,
    validezDias: 3
  };
}
