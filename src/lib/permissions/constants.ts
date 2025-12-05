/**
 * Constantes de permisos para evitar typos y facilitar autocompletado
 * Importa y usa estas constantes en lugar de strings literales
 */

export const PERMISOS = {
  // ========== CLIENTES ==========
  CLIENTES: {
    VER_TODOS: 'clientes.ver_todos' as const,
    VER_ASIGNADOS: 'clientes.ver_asignados' as const,
    CREAR: 'clientes.crear' as const,
    EDITAR_TODOS: 'clientes.editar_todos' as const,
    EDITAR_ASIGNADOS: 'clientes.editar_asignados' as const,
    ELIMINAR: 'clientes.eliminar' as const,
    REASIGNAR: 'clientes.reasignar' as const,
    IMPORTAR_MASIVO: 'clientes.importar_masivo' as const,
    EXPORTAR: 'clientes.exportar' as const,
    VER_HISTORIAL_COMPLETO: 'clientes.ver_historial_completo' as const,
  },

  // ========== PROYECTOS ==========
  PROYECTOS: {
    VER: 'proyectos.ver' as const,
    CREAR: 'proyectos.crear' as const,
    EDITAR: 'proyectos.editar' as const,
    ELIMINAR: 'proyectos.eliminar' as const,
  },

  // ========== LOTES ==========
  LOTES: {
    VER: 'lotes.ver' as const,
    CREAR: 'lotes.crear' as const,
    EDITAR: 'lotes.editar' as const,
    ELIMINAR: 'lotes.eliminar' as const,
  },

  // ========== PRECIOS ==========
  PRECIOS: {
    MODIFICAR: 'precios.modificar' as const,
    VER_COSTO: 'precios.ver_costo' as const,
  },

  // ========== INVENTARIO ==========
  INVENTARIO: {
    GESTIONAR: 'inventario.gestionar' as const,
  },

  // ========== RESERVAS ==========
  RESERVAS: {
    VER_TODAS: 'reservas.ver_todas' as const,
    VER_PROPIAS: 'reservas.ver_propias' as const,
    CREAR: 'reservas.crear' as const,
    APROBAR: 'reservas.aprobar' as const,
    RECHAZAR: 'reservas.rechazar' as const,
    CANCELAR: 'reservas.cancelar' as const,
    CANCELAR_PROPIAS: 'reservas.cancelar_propias' as const,
  },

  // ========== VENTAS ==========
  VENTAS: {
    VER_TODAS: 'ventas.ver_todas' as const,
    VER_PROPIAS: 'ventas.ver_propias' as const,
    CREAR: 'ventas.crear' as const,
    MODIFICAR: 'ventas.modificar' as const,
    ANULAR: 'ventas.anular' as const,
  },

  // ========== DESCUENTOS ==========
  DESCUENTOS: {
    APLICAR: 'descuentos.aplicar' as const,
    APLICAR_LIMITADO: 'descuentos.aplicar_limitado' as const,
  },

  // ========== PAGOS ==========
  PAGOS: {
    VER_TODOS: 'pagos.ver_todos' as const,
    VER_PROPIOS: 'pagos.ver_propios' as const,
    REGISTRAR: 'pagos.registrar' as const,
    MODIFICAR: 'pagos.modificar' as const,
    ANULAR: 'pagos.anular' as const,
  },

  // ========== CUOTAS ==========
  CUOTAS: {
    GESTIONAR: 'cuotas.gestionar' as const,
  },

  // ========== MORA ==========
  MORA: {
    CALCULAR: 'mora.calcular' as const,
  },

  // ========== REPORTES FINANCIEROS ==========
  REPORTES_FINANCIEROS: {
    VER: 'reportes_financieros.ver' as const,
  },

  // ========== COMISIONES ==========
  COMISIONES: {
    VER_TODAS: 'comisiones.ver_todas' as const,
    VER_PROPIAS: 'comisiones.ver_propias' as const,
  },

  // ========== CAMPAÑAS ==========
  CAMPANAS: {
    VER: 'campanas.ver' as const,
    CREAR: 'campanas.crear' as const,
    EDITAR: 'campanas.editar' as const,
    ELIMINAR: 'campanas.eliminar' as const,
  },

  // ========== PLANTILLAS ==========
  PLANTILLAS: {
    VER: 'plantillas.ver' as const,
    CREAR: 'plantillas.crear' as const,
  },

  // ========== WHATSAPP ==========
  WHATSAPP: {
    ENVIAR_MASIVO: 'whatsapp.enviar_masivo' as const,
    ENVIAR_INDIVIDUAL: 'whatsapp.enviar_individual' as const,
  },

  // ========== AUTOMATIZACIONES ==========
  AUTOMATIZACIONES: {
    GESTIONAR: 'automatizaciones.gestionar' as const,
  },

  // ========== LEADS ==========
  LEADS: {
    IMPORTAR: 'leads.importar' as const,
  },

  // ========== REPORTES ==========
  REPORTES: {
    GLOBALES: 'reportes.globales' as const,
    EQUIPO: 'reportes.equipo' as const,
    PERSONALES: 'reportes.personales' as const,
  },

  // ========== DASHBOARD ==========
  DASHBOARD: {
    GLOBAL: 'dashboard.global' as const,
    VENDEDOR: 'dashboard.vendedor' as const,
  },

  // ========== KPIS ==========
  KPIS: {
    VER_TODOS: 'kpis.ver_todos' as const,
    VER_PROPIOS: 'kpis.ver_propios' as const,
  },

  // ========== EXPORTAR ==========
  EXPORTAR: {
    EXCEL: 'exportar.excel' as const,
    PDF: 'exportar.pdf' as const,
  },

  // ========== USUARIOS ==========
  USUARIOS: {
    VER: 'usuarios.ver' as const,
    CREAR: 'usuarios.crear' as const,
    CREAR_VENDEDORES: 'usuarios.crear_vendedores' as const,
    EDITAR: 'usuarios.editar' as const,
    EDITAR_VENDEDORES: 'usuarios.editar_vendedores' as const,
    ELIMINAR: 'usuarios.eliminar' as const,
    ACTIVAR_DESACTIVAR: 'usuarios.activar_desactivar' as const,
  },

  // ========== ROLES ==========
  ROLES: {
    ASIGNAR: 'roles.asignar' as const,
  },

  // ========== METAS ==========
  METAS: {
    ASIGNAR: 'metas.asignar' as const,
    VER_PROPIAS: 'metas.ver_propias' as const,
  },

  // ========== CONFIGURACIÓN ==========
  CONFIGURACION: {
    SISTEMA: 'configuracion.sistema' as const,
    CUENTA: 'configuracion.cuenta' as const,
  },

  // ========== DOCUMENTOS ==========
  DOCUMENTOS: {
    VER_TODOS: 'documentos.ver_todos' as const,
    VER_ASIGNADOS: 'documentos.ver_asignados' as const,
    SUBIR: 'documentos.subir' as const,
    EDITAR: 'documentos.editar' as const,
    EDITAR_PROPIOS: 'documentos.editar_propios' as const,
    ELIMINAR: 'documentos.eliminar' as const,
  },

  // ========== CARPETAS ==========
  CARPETAS: {
    GESTIONAR: 'carpetas.gestionar' as const,
  },

  // ========== DRIVE ==========
  DRIVE: {
    SINCRONIZAR: 'drive.sincronizar' as const,
  },

  // ========== EVENTOS ==========
  EVENTOS: {
    VER_TODOS: 'eventos.ver_todos' as const,
    VER_PROPIOS: 'eventos.ver_propios' as const,
    CREAR: 'eventos.crear' as const,
    EDITAR_PROPIOS: 'eventos.editar_propios' as const,
    ELIMINAR_PROPIOS: 'eventos.eliminar_propios' as const,
  },

  // ========== RECORDATORIOS ==========
  RECORDATORIOS: {
    CONFIGURAR: 'recordatorios.configurar' as const,
  },

  // ========== CALENDARIO ==========
  CALENDARIO: {
    EQUIPO: 'calendario.equipo' as const,
  },
} as const;

/**
 * Roles del sistema
 */
export const ROLES = {
  ADMIN: 'ROL_ADMIN' as const,
  COORDINADOR: 'ROL_COORDINADOR_VENTAS' as const,
  VENDEDOR: 'ROL_VENDEDOR' as const,
  GERENTE: 'ROL_GERENTE' as const,
} as const;

/**
 * Grupos de permisos comunes para facilitar verificaciones
 */
export const GRUPOS_PERMISOS = {
  // Permisos de gestión completa de clientes
  GESTION_COMPLETA_CLIENTES: [
    PERMISOS.CLIENTES.VER_TODOS,
    PERMISOS.CLIENTES.CREAR,
    PERMISOS.CLIENTES.EDITAR_TODOS,
    PERMISOS.CLIENTES.ELIMINAR,
    PERMISOS.CLIENTES.REASIGNAR,
  ],

  // Permisos básicos de vendedor
  VENDEDOR_BASICO: [
    PERMISOS.CLIENTES.VER_ASIGNADOS,
    PERMISOS.CLIENTES.CREAR,
    PERMISOS.CLIENTES.EDITAR_ASIGNADOS,
    PERMISOS.RESERVAS.VER_PROPIAS,
    PERMISOS.RESERVAS.CREAR,
    PERMISOS.VENTAS.VER_PROPIAS,
    PERMISOS.VENTAS.CREAR,
  ],

  // Permisos de coordinador
  COORDINADOR_VENTAS: [
    PERMISOS.CLIENTES.VER_TODOS,
    PERMISOS.CLIENTES.REASIGNAR,
    PERMISOS.RESERVAS.VER_TODAS,
    PERMISOS.RESERVAS.APROBAR,
    PERMISOS.VENTAS.VER_TODAS,
    PERMISOS.REPORTES.EQUIPO,
    PERMISOS.USUARIOS.VER,
  ],

  // Permisos de reportes
  REPORTES_COMPLETOS: [
    PERMISOS.REPORTES.GLOBALES,
    PERMISOS.REPORTES.EQUIPO,
    PERMISOS.REPORTES.PERSONALES,
    PERMISOS.KPIS.VER_TODOS,
  ],
} as const;
