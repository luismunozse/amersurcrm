'use client';

import Image from 'next/image';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Spinner } from './Spinner';

type LoaderSize = 'sm' | 'md' | 'lg';

interface PageLoaderProps {
  /** Texto opcional debajo del isotipo */
  text?: string;
  /** sm=40px, md=56px, lg=72px */
  size?: LoaderSize;
  className?: string;
  /**
   * Si es true ocupa toda la pantalla con backdrop.
   * Si es false (default) se expande para llenar el contenedor padre.
   */
  fullScreen?: boolean;
}

const imgSizeMap: Record<LoaderSize, number> = {
  sm: 40,
  md: 56,
  lg: 72,
};

/**
 * Loader de página/sección con el isotipo Amersur.
 *
 * Comportamiento:
 * - Por defecto se expande al 100 % del padre con `flex-1` (ideal dentro de loading.tsx).
 * - `fullScreen` lo fija sobre toda la pantalla con backdrop.
 * - Si la imagen falla, cae en un Spinner SVG como fallback.
 * - Respeta `prefers-reduced-motion` vía globals.css.
 */
export function PageLoader({
  text,
  size = 'md',
  className,
  fullScreen = false,
}: PageLoaderProps) {
  const [imgError, setImgError] = useState(false);
  const imgSize = imgSizeMap[size];

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3',
        fullScreen
          ? 'fixed inset-0 z-50 bg-crm-bg-primary/80 backdrop-blur-sm'
          : 'w-full flex-1 min-h-[200px]',
        className,
      )}
      role="status"
      aria-label={text || 'Cargando'}
    >
      {imgError ? (
        /* Fallback: si el isotipo no carga, mostrar spinner SVG */
        <Spinner size="lg" color="primary" />
      ) : (
        <div className="animate-loader-pulse">
          <Image
            src="/ISOTIPOOO.png"
            alt=""
            width={imgSize}
            height={imgSize}
            className="drop-shadow-md"
            priority
            onError={() => setImgError(true)}
          />
        </div>
      )}
      {text && (
        <p className="text-sm font-medium text-crm-text-muted">{text}</p>
      )}
      {/* Screen reader: texto accesible oculto */}
      <span className="sr-only">{text || 'Cargando contenido'}</span>
    </div>
  );
}
