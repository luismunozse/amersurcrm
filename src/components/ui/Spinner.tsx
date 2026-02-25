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
    <svg
      className={cn('animate-spin', sizeClasses[size], colorClasses[color], className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      role="img"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
