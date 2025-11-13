import type { ProyectoMediaItem } from "./proyectos";

// Tipos que pueden usarse desde cliente o servidor
export type ClienteCached = {
    id: string;
    codigo_cliente: string;
    nombre: string;
    tipo_cliente: string;
    email: string | null;
    telefono: string | null;
    telefono_whatsapp: string | null;
    documento_identidad: string | null;
  estado_civil: string | null;
    estado_cliente: string;
    origen_lead: string | null;
    vendedor_asignado: string | null;
    fecha_alta: string;
    ultimo_contacto: string | null;
    proxima_accion: string | null;
    interes_principal: string | null;
    capacidad_compra_estimada: number | null;
    forma_pago_preferida: string | null;
    propiedades_reservadas: number;
    propiedades_compradas: number;
    propiedades_alquiladas: number;
    saldo_pendiente: number;
    notas: string | null;
    direccion: Record<string, unknown> | null;
    created_at: string;
  };
  
  export type ProyectoCached = {
    id: string;
    nombre: string;
    estado: "activo" | "pausado" | "cerrado";
    ubicacion: string | null;
    latitud?: number | null;
    longitud?: number | null;
    descripcion: string | null;
    imagen_url: string | null;
    logo_url: string | null;
    galeria_imagenes: ProyectoMediaItem[] | null;
    planos_url: string | null;
    created_at: string;
    tipo?: string | null;
  };
  
  export type LoteCached = {
    id: string;
    codigo: string;
    sup_m2: number | null;
    precio: number | null;
    moneda: string | null;
    estado: "disponible" | "reservado" | "vendido";
  };
  
  export type DashboardStats = {
    totalClientes: number;
    totalProyectos: number;
    totalLotes: number;
  };

  export type Notificacion = {
    id: string;
    tipo: 'cliente' | 'proyecto' | 'lote' | 'sistema';
    titulo: string;
    mensaje: string;
    leida: boolean;
    data?: Record<string, unknown>;
    created_at: string;
    updated_at: string;
  };

  export type NotificacionNoLeida = {
    id: string;
    tipo: 'cliente' | 'proyecto' | 'lote' | 'sistema';
    titulo: string;
    mensaje: string;
    data?: Record<string, unknown>;
    created_at: string;
  };
  
