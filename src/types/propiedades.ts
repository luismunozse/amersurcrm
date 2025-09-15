// Tipos para el sistema de propiedades inmobiliarias mejorado
export type TipoPropiedad = 'lote' | 'casa' | 'departamento' | 'oficina' | 'otro';
export type TipoOperacion = 'venta' | 'alquiler' | 'ambos';
export type EstadoComercial = 'disponible' | 'reservado' | 'vendido' | 'alquilado' | 'bloqueado';
export type Moneda = 'PEN' | 'USD' | 'EUR';
export type Orientacion = 'N' | 'S' | 'E' | 'O' | 'NE' | 'NO' | 'SE' | 'SO';
export type UsoPermitido = 'residencial' | 'comercial' | 'mixto' | 'industrial';

// Estructura de ubicación mejorada
export interface Ubicacion {
  direccion_completa: string;
  pais: string;
  provincia: string;
  ciudad: string;
  barrio: string;
  calle: string;
  numero: string;
  geolocalizacion: {
    lat: number;
    lng: number;
  } | null;
}

// Estructura de superficie mejorada
export interface Superficie {
  total: number;
  terreno?: number;
  cubierta?: number;
  semicubierta?: number;
  descubierta?: number;
}

// Estructura de servicios
export interface Servicios {
  agua: boolean;
  luz: boolean;
  gas: boolean;
  cloacas: boolean;
  internet: boolean;
  cable: boolean;
  telefono: boolean;
}

// Estructura de opciones de financiación para VENTA
export interface OpcionesFinanciacionVenta {
  anticipo_porcentaje?: number;
  cuotas?: number;
  interes_anual?: number;
  plazo_meses?: number;
  banco?: string;
  gastos_escritura?: number;
  gastos_impuestos?: number;
  observaciones?: string;
}

// Estructura de opciones de financiación para ALQUILER
export interface OpcionesFinanciacionAlquiler {
  duracion_minima_meses?: number;
  ajuste_tipo?: 'inflacion' | 'semestral' | 'anual' | 'fijo';
  expensas_incluidas?: boolean;
  garantias_aceptadas?: string[];
  deposito_meses?: number;
  observaciones?: string;
}

// Estructura de marketing mejorada
export interface Marketing {
  fotos: string[];
  renders: string[];
  plano: string | null;
  videos: string[];
  links3D: string[];
  etiquetas: string[];
  descripcion: string;
  fecha_publicacion: string;
  destacado: boolean;
  premium: boolean;
}

// Atributos específicos para LOTES
export interface AtributosLote {
  frente: number;
  fondo: number;
  orientacion: Orientacion;
  uso_permitido: UsoPermitido;
  servicios: Servicios;
}

// Atributos específicos para CASAS
export interface AtributosCasa {
  dormitorios: number;
  banos: number;
  ambientes_totales: number;
  cochera_cantidad: number;
  patio_jardin: boolean;
  pileta: boolean;
  quincho_parrilla: boolean;
  pisos_totales: number;
  servicios: Servicios;
}

// Atributos específicos para DEPARTAMENTOS
export interface AtributosDepartamento {
  piso: number;
  numero: string;
  ambientes_totales: number;
  dormitorios: number;
  banos: number;
  cochera: boolean;
  amenities: string[];
  expensas_mensual: number;
  ascensor: boolean;
  orientacion: Orientacion;
}

// Atributos específicos para OFICINAS
export interface AtributosOficina {
  piso: number;
  numero: string;
  superficie_divisible: boolean;
  ambientes_salas: number;
  banos: number;
  cocheras: number;
  recepcion: boolean;
  kitchenette: boolean;
  seguridad_vigilancia: boolean;
  expensas_mensual?: number;
}

// Atributos específicos para OTROS
export interface AtributosOtros {
  nombre_propiedad: string;
  categoria_custom: string;
  caracteristicas_personalizadas: Record<string, any>;
}

// Estructura principal de propiedad mejorada
export interface Propiedad {
  id: string;
  codigo: string;
  tipo: TipoPropiedad;
  tipo_operacion: TipoOperacion;
  proyecto_id: string | null;
  identificacion_interna: string;
  ubicacion: Ubicacion;
  superficie: Superficie;
  antiguedad_anos: number;
  estado_comercial: EstadoComercial;
  precio_venta?: number;
  precio_alquiler?: number;
  moneda: Moneda;
  disponibilidad_inmediata: boolean;
  disponibilidad_desde?: string;
  opciones_financiacion_venta?: OpcionesFinanciacionVenta;
  opciones_financiacion_alquiler?: OpcionesFinanciacionAlquiler;
  marketing: Marketing;
  atributos_especificos: AtributosLote | AtributosCasa | AtributosDepartamento | AtributosOficina | AtributosOtros;
  data: Record<string, any>;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Datos del wizard (formulario)
export interface PropiedadWizardData {
  // Paso 1: Tipo de operación y propiedad
  tipo: TipoPropiedad;
  tipo_operacion: TipoOperacion;
  
  // Paso 2: Datos generales
  proyecto: string;
  identificador: string;
  ubicacion: string;
  calle: string;
  numero: string;
  barrio: string;
  geolocalizacion: { lat: number; lng: number } | null;
  superficie_total: number;
  antiguedad_anos: number;
  disponibilidad_inmediata: boolean;
  disponibilidad_desde: string;
  
  // Paso 3: Características específicas (dinámicas según tipo)
  caracteristicas: Record<string, any>;
  
  // Paso 4: Precios y condiciones comerciales
  precio_venta: number;
  precio_alquiler: number;
  condiciones_venta: OpcionesFinanciacionVenta;
  condiciones_alquiler: OpcionesFinanciacionAlquiler;
  
  // Paso 5: Marketing y multimedia
  fotos: File[];
  renders: File[];
  plano: File | null;
  videos: File[];
  links3D: string[];
  etiquetas: string[];
  descripcion: string;
  destacado: boolean;
  premium: boolean;
  
  // Paso 6: Confirmación
  confirmado: boolean;
}

// Esquemas de validación para cada tipo
export const ESQUEMAS_CARACTERISTICAS: Record<TipoPropiedad, string[]> = {
  lote: ['frente', 'fondo', 'orientacion', 'uso_permitido', 'servicios'],
  casa: ['dormitorios', 'banos', 'ambientes_totales', 'cochera_cantidad', 'patio_jardin', 'pileta', 'quincho_parrilla', 'pisos_totales', 'servicios'],
  departamento: ['piso', 'numero', 'ambientes_totales', 'dormitorios', 'banos', 'cochera', 'amenities', 'expensas_mensual', 'ascensor', 'orientacion'],
  oficina: ['piso', 'numero', 'superficie_divisible', 'ambientes_salas', 'banos', 'cocheras', 'recepcion', 'kitchenette', 'seguridad_vigilancia', 'expensas_mensual'],
  otro: ['nombre_propiedad', 'categoria_custom', 'caracteristicas_personalizadas']
};

// Etiquetas predefinidas
export const ETIQUETAS_PREDEFINIDAS = [
  'Premium',
  'Destacado',
  'En promoción',
  'Oportunidad',
  'Nuevo',
  'Remodelado',
  'Vista al mar',
  'Vista a la montaña',
  'Centro',
  'Zona residencial',
  'Zona comercial',
  'Cerca del transporte',
  'Seguridad 24/7',
  'Amenities',
  'Financiación disponible',
  'A estrenar',
  'Listo para habitar',
  'Oportunidad de inversión'
];

// Amenities predefinidos para departamentos
export const AMENITIES_PREDEFINIDOS = [
  'SUM (Salón de Usos Múltiples)',
  'Gimnasio',
  'Pileta',
  'Seguridad 24h',
  'Conserjería',
  'Lavaderos',
  'Terraza',
  'Jardín',
  'Playground',
  'Sala de eventos',
  'Spa',
  'Sauna',
  'Cancha de tenis',
  'Cancha de fútbol',
  'Quincho',
  'Parrilla',
  'Ascensor',
  'Cochera cubierta',
  'Cochera descubierta',
  'Bicicletero'
];

// Garantías aceptadas para alquiler
export const GARANTIAS_ALQUILER = [
  'Recibo de sueldo',
  'Garantía propietaria',
  'Garantía bancaria',
  'Seguro de caución',
  'Fiador con propiedad',
  'Fiador con recibo de sueldo'
];