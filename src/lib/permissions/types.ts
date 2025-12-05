// Tipos de permisos del sistema CRM

export type PermisoModulo =
  | 'clientes'
  | 'proyectos'
  | 'lotes'
  | 'precios'
  | 'inventario'
  | 'reservas'
  | 'ventas'
  | 'pagos'
  | 'descuentos'
  | 'cuotas'
  | 'mora'
  | 'reportes_financieros'
  | 'comisiones'
  | 'campanas'
  | 'plantillas'
  | 'whatsapp'
  | 'automatizaciones'
  | 'leads'
  | 'exportar'
  | 'dashboard'
  | 'kpis'
  | 'usuarios'
  | 'roles'
  | 'metas'
  | 'reportes'
  | 'documentos'
  | 'carpetas'
  | 'eventos'
  | 'configuracion';

export type PermisoAccion =
  | 'ver_todos'
  | 'ver_asignados'
  | 'ver_propios'
  | 'crear'
  | 'editar_todos'
  | 'editar_asignados'
  | 'editar_propios'
  | 'eliminar'
  | 'reasignar'
  | 'importar_masivo'
  | 'exportar'
  | 'aprobar'
  | 'rechazar'
  | 'anular'
  | 'modificar'
  | 'registrar'
  | 'gestionar'
  | 'asignar';

// Permisos en formato "modulo.accion"
export type PermisoCodigo = `${PermisoModulo}.${string}`;

// Roles del sistema
export type RolNombre = 'ROL_ADMIN' | 'ROL_COORDINADOR_VENTAS' | 'ROL_VENDEDOR' | 'ROL_GERENTE';

// Resultado de verificación de permiso
export interface PermisoVerificacion {
  permitido: boolean;
  razon?: string;
  limite?: number;
  valor_actual?: number;
  requiere_aprobacion?: boolean;
  aprobador_rol?: string;
}

// Información del usuario con permisos
export interface UsuarioConPermisos {
  id: string;
  email?: string;
  nombre_completo?: string;
  username?: string;
  rol: RolNombre;
  permisos: PermisoCodigo[];
  activo: boolean;
}

// Metadata para auditoría
export interface AuditoriaMetadata {
  accion: string;
  recurso_tipo?: string;
  recurso_id?: string;
  valor_anterior?: unknown;
  valor_nuevo?: unknown;
  ip_address?: string;
  user_agent?: string;
  [key: string]: unknown;
}

// Opciones para verificación de permisos
export interface VerificarPermisoOpciones {
  lanzarError?: boolean;
  registrarAuditoria?: boolean;
  metadata?: AuditoriaMetadata;
  valorActual?: number | null;
}
