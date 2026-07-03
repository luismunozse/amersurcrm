type Variant = 'error' | 'warning' | 'success' | 'info';

const STYLES: Record<Variant, { box: string; text: string; icon: string }> = {
  error: {
    box: 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700',
    text: 'text-red-800 dark:text-red-200',
    icon: '✕',
  },
  warning: {
    box: 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-700',
    text: 'text-yellow-800 dark:text-yellow-200',
    icon: '!',
  },
  success: {
    box: 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700',
    text: 'text-green-800 dark:text-green-200',
    icon: '✓',
  },
  info: {
    box: 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700',
    text: 'text-blue-800 dark:text-blue-200',
    icon: 'i',
  },
};

interface InlineAlertProps {
  variant?: Variant;
  message: string;
  /** Si se pasa, muestra un botón "Reintentar". */
  onRetry?: () => void;
  /** Si se pasa, muestra una "×" para descartar. */
  onDismiss?: () => void;
  className?: string;
}

/**
 * Alerta inline reutilizable (error/warning/success/info) con la estética de la
 * extensión y dark mode. Reemplaza alert()/confirm() nativos y los errores mudos.
 */
export function InlineAlert({ variant = 'error', message, onRetry, onDismiss, className = '' }: InlineAlertProps) {
  const s = STYLES[variant];
  return (
    <div className={`flex items-start gap-2 rounded-md border p-3 ${s.box} ${className}`} role="alert">
      <span className={`mt-0.5 text-xs font-bold ${s.text}`} aria-hidden>
        {s.icon}
      </span>
      <p className={`flex-1 text-sm ${s.text}`}>{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className={`shrink-0 text-sm font-medium underline-offset-2 hover:underline active:scale-95 transition-transform ${s.text}`}
        >
          Reintentar
        </button>
      )}
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Cerrar"
          className={`shrink-0 text-base leading-none opacity-70 hover:opacity-100 ${s.text}`}
        >
          ×
        </button>
      )}
    </div>
  );
}
