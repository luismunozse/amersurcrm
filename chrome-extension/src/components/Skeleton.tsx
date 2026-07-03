/**
 * Bloque de carga (skeleton) dark-aware. Pulsa con animate-pulse y toma la
 * forma del contenido que va a aparecer, dando una sensación más rápida que un
 * spinner genérico. Pasale el tamaño/forma por className.
 */
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-gray-200 dark:bg-gray-700 ${className}`}
      aria-hidden="true"
    />
  );
}
