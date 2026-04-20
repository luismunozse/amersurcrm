import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg';
type SpinnerColor = 'primary' | 'white' | 'muted' | 'current';

interface SpinnerProps {
  /** xs=12px, sm=16px, md=20px, lg=24px */
  size?: SpinnerSize;
  className?: string;
  /** Color del spinner — por defecto hereda currentColor del padre */
  color?: SpinnerColor;
}

const sizeClasses: Record<SpinnerSize, string> = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
};

const colorClasses: Record<SpinnerColor, string> = {
  primary: 'text-crm-primary',
  white: 'text-white',
  muted: 'text-crm-text-muted',
  current: '',
};

/**
 * Spinner SVG inline reutilizable para botones, tablas y acciones.
 *
 * Respeta `prefers-reduced-motion` vía globals.css (ralentiza la rotación).
 *
 * @example dentro de un botón
 * ```tsx
 * <button disabled={loading}>
 *   {loading && <Spinner size="sm" color="white" />}
 *   Guardar
 * </button>
 * ```
 */
export function Spinner({ size = 'sm', className, color = 'current' }: SpinnerProps) {
  return (
    <Loader2
      className={cn('animate-spin', sizeClasses[size], colorClasses[color], className)}
      role="img"
      aria-hidden="true"
    />
  );
}
