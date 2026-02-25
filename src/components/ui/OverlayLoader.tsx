'use client';

import Image from 'next/image';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Spinner } from './Spinner';

interface OverlayLoaderProps {
  /** Texto debajo del isotipo */
  text?: string;
  className?: string;
}

/**
 * Overlay de carga semi-transparente para modales y secciones.
 *
 * Requisito: el contenedor padre debe tener `position: relative`.
 *
 * @example
 * ```tsx
 * <div className="relative">
 *   {loading && <OverlayLoader text="Guardando..." />}
 *   <Form />
 * </div>
 * ```
 */
export function OverlayLoader({ text, className }: OverlayLoaderProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <div
      className={cn(
        'absolute inset-0 z-40 flex flex-col items-center justify-center gap-3',
        'bg-crm-card/80 backdrop-blur-[2px] rounded-xl',
        className,
      )}
      role="status"
      aria-label={text || 'Procesando'}
    >
      {imgError ? (
        <Spinner size="lg" color="primary" />
      ) : (
        <div className="animate-loader-pulse">
          <Image
            src="/ISOTIPOOO.png"
            alt=""
            width={40}
            height={40}
            className="drop-shadow-md"
            priority
            onError={() => setImgError(true)}
          />
        </div>
      )}
      {text && (
        <p className="text-xs font-medium text-crm-text-secondary">{text}</p>
      )}
      <span className="sr-only">{text || 'Procesando'}</span>
    </div>
  );
}
