"use client";

import { useState, useEffect, useCallback, useRef, type WheelEvent, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";

const MIN_ZOOM = 1;
const MAX_ZOOM = 5;
const ZOOM_STEP = 0.25;

interface ImageCarouselProps {
  images: Array<{
    url: string;
    nombre?: string | null;
  }>;
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
}

export default function ImageCarousel({
  images,
  initialIndex = 0,
  isOpen,
  onClose,
}: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isLoading, setIsLoading] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ active: boolean; startX: number; startY: number; baseX: number; baseY: number }>({
    active: false,
    startX: 0,
    startY: 0,
    baseX: 0,
    baseY: 0,
  });

  const resetZoom = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // Resetear índice cuando se abre
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      resetZoom();
    }
  }, [isOpen, initialIndex, resetZoom]);

  // Reset zoom al cambiar de imagen
  useEffect(() => {
    resetZoom();
  }, [currentIndex, resetZoom]);

  // Navegación con teclado + zoom
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case "Escape":
          if (zoom > 1) {
            resetZoom();
          } else {
            onClose();
          }
          break;
        case "ArrowLeft":
          setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
          break;
        case "ArrowRight":
          setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
          break;
        case "+":
        case "=":
          setZoom((z) => Math.min(MAX_ZOOM, z + ZOOM_STEP));
          break;
        case "-":
        case "_":
          setZoom((z) => {
            const next = Math.max(MIN_ZOOM, z - ZOOM_STEP);
            if (next === 1) setPan({ x: 0, y: 0 });
            return next;
          });
          break;
        case "0":
          resetZoom();
          break;
      }
    },
    [isOpen, onClose, images.length, zoom, resetZoom]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
      return () => {
        document.removeEventListener("keydown", handleKeyDown);
        document.body.style.overflow = "unset";
      };
    }
  }, [isOpen, handleKeyDown]);

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
    setIsLoading(true);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
    setIsLoading(true);
  };

  const handleWheel = (e: WheelEvent<HTMLDivElement>) => {
    if (!isOpen) return;
    e.stopPropagation();
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    setZoom((z) => {
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z + delta));
      if (next === 1) setPan({ x: 0, y: 0 });
      return next;
    });
  };

  const handleImageClick = (e: MouseEvent<HTMLImageElement>) => {
    e.stopPropagation();
    if (zoom > 1) {
      resetZoom();
    } else {
      setZoom(2);
    }
  };

  const handlePointerDown = (e: MouseEvent<HTMLDivElement>) => {
    if (zoom <= 1) return;
    e.stopPropagation();
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      baseX: pan.x,
      baseY: pan.y,
    };
  };

  const handlePointerMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;
    e.stopPropagation();
    setPan({
      x: dragRef.current.baseX + (e.clientX - dragRef.current.startX),
      y: dragRef.current.baseY + (e.clientY - dragRef.current.startY),
    });
  };

  const handlePointerUp = () => {
    dragRef.current.active = false;
  };

  if (!isOpen) return null;

  const currentImage = images[currentIndex];

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center animate-in fade-in duration-150"
      onClick={onClose}
    >
      {/* Close Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute z-10 w-12 h-12 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full transition-all backdrop-blur-sm"
        style={{ top: 'calc(env(safe-area-inset-top) + 1rem)', right: 'calc(env(safe-area-inset-right) + 1rem)' }}
        title="Cerrar (Esc)"
        aria-label="Cerrar"
      >
        <X className="w-6 h-6 text-white" />
      </button>

      {/* Counter */}
      <div
        className="absolute left-1/2 -translate-x-1/2 z-10 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full"
        style={{ top: 'calc(env(safe-area-inset-top) + 1rem)' }}
      >
        <span className="text-white text-sm font-medium">
          {currentIndex + 1} / {images.length}
        </span>
      </div>

      {/* Previous Button */}
      {images.length > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            goToPrevious();
          }}
          className="absolute left-4 z-10 w-12 h-12 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full transition-all backdrop-blur-sm"
          title="Anterior (←)"
        >
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>
      )}

      {/* Main Image Container */}
      <div
        className="relative max-w-7xl max-h-[90vh] mx-auto px-4 sm:px-8 lg:px-20 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onWheel={handleWheel}
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        style={{ cursor: zoom > 1 ? (dragRef.current.active ? "grabbing" : "grab") : "zoom-in" }}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        )}

        <img
          src={currentImage.url}
          alt={currentImage.nombre || `Imagen ${currentIndex + 1}`}
          className="max-w-full max-h-[90vh] w-auto h-auto object-contain rounded-lg shadow-2xl select-none transition-transform duration-150"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "center center",
          }}
          onLoad={() => setIsLoading(false)}
          onError={() => setIsLoading(false)}
          onClick={handleImageClick}
          draggable={false}
        />

        {/* Image Caption */}
        {currentImage.nombre && zoom === 1 && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-6 py-4 rounded-b-lg pointer-events-none">
            <p className="text-white text-sm font-medium text-center">
              {currentImage.nombre}
            </p>
          </div>
        )}
      </div>

      {/* Zoom controls */}
      <div
        className="absolute z-10 flex items-center gap-1 bg-white/10 backdrop-blur-sm rounded-full p-1"
        style={{ top: 'calc(env(safe-area-inset-top) + 1rem)', right: 'calc(env(safe-area-inset-right) + 4.5rem)' }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            setZoom((z) => {
              const next = Math.max(MIN_ZOOM, z - ZOOM_STEP);
              if (next === 1) setPan({ x: 0, y: 0 });
              return next;
            });
          }}
          disabled={zoom <= MIN_ZOOM}
          className="w-9 h-9 flex items-center justify-center hover:bg-white/20 rounded-full transition-all disabled:opacity-40"
          title="Alejar (-)"
          aria-label="Alejar"
        >
          <ZoomOut className="w-4 h-4 text-white" />
        </button>
        <span className="text-white text-xs font-medium w-12 text-center tabular-nums">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setZoom((z) => Math.min(MAX_ZOOM, z + ZOOM_STEP));
          }}
          disabled={zoom >= MAX_ZOOM}
          className="w-9 h-9 flex items-center justify-center hover:bg-white/20 rounded-full transition-all disabled:opacity-40"
          title="Acercar (+)"
          aria-label="Acercar"
        >
          <ZoomIn className="w-4 h-4 text-white" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            resetZoom();
          }}
          disabled={zoom === 1 && pan.x === 0 && pan.y === 0}
          className="w-9 h-9 flex items-center justify-center hover:bg-white/20 rounded-full transition-all disabled:opacity-40"
          title="Ajustar a pantalla (0)"
          aria-label="Ajustar"
        >
          <Maximize2 className="w-4 h-4 text-white" />
        </button>
      </div>

      {/* Next Button */}
      {images.length > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            goToNext();
          }}
          className="absolute right-4 z-10 w-12 h-12 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full transition-all backdrop-blur-sm"
          title="Siguiente (→)"
        >
          <ChevronRight className="w-6 h-6 text-white" />
        </button>
      )}

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-2 max-w-full overflow-x-auto px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full">
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(idx);
                setIsLoading(true);
              }}
              className={`flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                idx === currentIndex
                  ? "border-white scale-110"
                  : "border-white/30 hover:border-white/60 opacity-60 hover:opacity-100"
              }`}
            >
              <img
                src={img.url}
                alt={`Miniatura ${idx + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Instructions - hidden on mobile (touch gestures instead) */}
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 text-white/60 text-xs hidden sm:block">
        <p>← → navegar · +/− zoom · 0 reset · clic = zoom · ESC cerrar</p>
      </div>
    </div>,
    document.body
  );
}
