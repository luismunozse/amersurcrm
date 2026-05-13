"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Eraser, PenLine } from "lucide-react";

interface Props {
  value?: string | null;
  onChange: (dataUrl: string | null) => void;
  label?: string;
  helpText?: string;
  height?: number;
  required?: boolean;
}

/**
 * Canvas para capturar firma digital. Devuelve PNG data URL en onChange.
 * Soporta mouse y touch. Vacía -> onChange(null).
 */
export default function FirmaDigitalCanvas({
  value,
  onChange,
  label = "Firma digital",
  helpText = "Firme con el mouse o el dedo dentro del recuadro.",
  height = 140,
  required = false,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const dirtyRef = useRef(false);
  const [hasInk, setHasInk] = useState<boolean>(Boolean(value));

  const getCtx = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return null;
    return c.getContext("2d");
  }, []);

  // Inicializa fondo + restaura value si viene
  useEffect(() => {
    const c = canvasRef.current;
    const ctx = getCtx();
    if (!c || !ctx) return;
    // Scale para nitidez en retina
    const dpr = window.devicePixelRatio || 1;
    const rect = c.getBoundingClientRect();
    c.width = rect.width * dpr;
    c.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Fondo blanco
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.strokeStyle = "#1f2937";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (value) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
        setHasInk(true);
      };
      img.src = value;
    }
  }, [getCtx, value]);

  const getXY = (e: PointerEvent | React.PointerEvent) => {
    const c = canvasRef.current!;
    const rect = c.getBoundingClientRect();
    return {
      x: (e as PointerEvent).clientX - rect.left,
      y: (e as PointerEvent).clientY - rect.top,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const ctx = getCtx();
    if (!ctx) return;
    drawingRef.current = true;
    const { x, y } = getXY(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    (e.currentTarget as HTMLCanvasElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const ctx = getCtx();
    if (!ctx) return;
    const { x, y } = getXY(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    dirtyRef.current = true;
  };

  const finalizar = useCallback(() => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const c = canvasRef.current;
    if (!c) return;
    if (dirtyRef.current) {
      setHasInk(true);
      onChange(c.toDataURL("image/png"));
    }
  }, [onChange]);

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    try {
      (e.currentTarget as HTMLCanvasElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    finalizar();
  };

  const limpiar = () => {
    const c = canvasRef.current;
    const ctx = getCtx();
    if (!c || !ctx) return;
    const rect = c.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
    dirtyRef.current = false;
    setHasInk(false);
    onChange(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-sm font-medium text-crm-text-primary">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <button
          type="button"
          onClick={limpiar}
          disabled={!hasInk}
          className="inline-flex items-center gap-1 text-xs text-crm-text-muted hover:text-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Limpiar firma"
        >
          <Eraser className="h-3.5 w-3.5" />
          Limpiar
        </button>
      </div>

      <div
        className="border border-crm-border rounded-lg bg-white relative overflow-hidden"
        style={{ height }}
      >
        {!hasInk && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-crm-text-muted text-xs gap-1.5">
            <PenLine className="h-4 w-4" />
            Firme aquí
          </div>
        )}
        <canvas
          ref={canvasRef}
          className="w-full h-full touch-none cursor-crosshair"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
      </div>

      <p className="text-xs text-crm-text-muted mt-1">{helpText}</p>
    </div>
  );
}
