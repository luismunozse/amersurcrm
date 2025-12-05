'use client';

import { usePermissions } from '@/lib/permissions/client';
import type { PermisoCodigo } from '@/lib/permissions/types';
import { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ProtectedButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Permiso requerido */
  permiso: PermisoCodigo;
  /** Tooltip a mostrar cuando no tiene permiso */
  tooltipSinPermiso?: string;
  /** Icono o contenido del botón */
  children: ReactNode;
}

/**
 * Botón que se deshabilita automáticamente si el usuario no tiene permiso
 *
 * @example
 * ```tsx
 * <ProtectedButton
 *   permiso="clientes.eliminar"
 *   onClick={handleEliminar}
 *   tooltipSinPermiso="No tienes permiso para eliminar clientes"
 * >
 *   Eliminar Cliente
 * </ProtectedButton>
 * ```
 */
export function ProtectedButton({
  permiso,
  tooltipSinPermiso = 'No tienes permiso para realizar esta acción',
  children,
  className,
  disabled,
  ...props
}: ProtectedButtonProps) {
  const { tienePermiso, loading } = usePermissions();

  const permitido = tienePermiso(permiso);
  const isDisabled = disabled || loading || !permitido;

  return (
    <button
      {...props}
      disabled={isDisabled}
      className={cn(className)}
      title={!permitido ? tooltipSinPermiso : props.title}
      aria-disabled={isDisabled}
    >
      {children}
    </button>
  );
}
