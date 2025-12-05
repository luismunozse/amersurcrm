// Tipos compartidos
export type * from './types';

// Constantes reutilizables (SEGURAS en cliente)
export * from './constants';

// Hooks del cliente (seguros para componentes con "use client")
export {
  usePermissions,
  usePermiso,
  useRol,
} from './client';
