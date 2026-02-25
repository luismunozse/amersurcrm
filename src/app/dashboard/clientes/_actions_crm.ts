/**
 * Barrel re-exports para server actions CRM de clientes.
 *
 * Este archivo NO tiene "use server" — solo re-exporta funciones
 * de sub-modulos que sí tienen "use server".
 * Los helpers compartidos están en ./_actions-crm-helpers.ts
 *
 * Convencion de errores: estas acciones retornan { success: boolean, error?: string, data?: T }.
 * Los consumidores verifican result.success antes de continuar.
 */

export {
  registrarInteraccion,
  obtenerInteracciones,
  actualizarInteraccion,
  eliminarInteraccion,
} from './_actions-interacciones';

export {
  agregarPropiedadInteres,
  actualizarPropiedadInteres,
  eliminarPropiedadInteres,
  registrarVisita,
  crearReserva,
  cancelarReserva,
  eliminarReserva,
} from './_actions-reservas';

export {
  convertirReservaEnVenta,
  registrarPago,
  anularVenta,
  obtenerTimelineCliente,
} from './_actions-ventas';
