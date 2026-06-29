"use client";

import { useRef, useState } from "react";
import { pixelANormalizado, poligonoASvgPoints, estadoColor } from "@/lib/masterplan/geometry";
import { guardarPoligonoLote, eliminarPoligonoLote } from "@/app/dashboard/proyectos/_actions";
import type { LoteMarcado } from "./MasterplanViewer";
import type { Poligono } from "@/types/proyectos";

interface MasterplanEditorProps {
  imageUrl: string;
  lotes: LoteMarcado[];
  onSaved: () => void;
}

export function MasterplanEditor({ imageUrl, lotes, onSaved }: MasterplanEditorProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [dibujo, setDibujo] = useState<Poligono>([]);
  const [loteSel, setLoteSel] = useState<string>("");
  const [guardando, setGuardando] = useState(false);

  function onImageClick(e: React.MouseEvent) {
    const img = imgRef.current;
    if (!img) return;
    const rect = img.getBoundingClientRect();
    const p = pixelANormalizado(e.clientX - rect.left, e.clientY - rect.top, rect.width, rect.height);
    setDibujo((prev) => [...prev, p]);
  }

  async function guardarDibujo() {
    if (!loteSel || dibujo.length < 3) return;
    setGuardando(true);
    const res = await guardarPoligonoLote(loteSel, dibujo);
    setGuardando(false);
    if (res.ok) {
      setDibujo([]);
      setLoteSel("");
      onSaved();
    }
  }

  async function borrar(loteId: string) {
    const res = await eliminarPoligonoLote(loteId);
    if (res.ok) onSaved();
  }

  return (
    <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
      <div className="relative inline-block w-full">
        <img
          ref={imgRef}
          src={imageUrl}
          alt="Masterplan (edición)"
          className="block w-full h-auto cursor-crosshair select-none"
          onClick={onImageClick}
        />
        <svg viewBox="0 0 1 1" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 w-full h-full">
          {lotes.filter((l) => l.poly && l.poly.length >= 3).map((l) => {
            const c = estadoColor(l.estado);
            return <polygon key={l.id} points={poligonoASvgPoints(l.poly!)} fill={c.fill} stroke={c.stroke} strokeWidth={0.002} />;
          })}
          {dibujo.length > 0 && (
            <polygon points={poligonoASvgPoints(dibujo)} fill="rgba(59,130,246,0.4)" stroke="rgb(37,99,235)" strokeWidth={0.003} />
          )}
        </svg>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium mb-1">Asignar polígono a lote</label>
          <select
            value={loteSel}
            onChange={(e) => setLoteSel(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-sm"
          >
            <option value="">— Elegí un lote —</option>
            {lotes.map((l) => (
              <option key={l.id} value={l.id}>{l.codigo} ({l.estado})</option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Hacé click en la imagen para marcar los vértices ({dibujo.length} puntos). Mín. 3.
          </p>
          <div className="flex gap-2 mt-2">
            <button
              onClick={guardarDibujo}
              disabled={!loteSel || dibujo.length < 3 || guardando}
              className="px-3 py-2 bg-crm-primary text-white rounded-md text-sm disabled:opacity-50 active:scale-[0.98] transition ease-out-strong"
            >
              {guardando ? "Guardando..." : "Guardar polígono"}
            </button>
            <button onClick={() => setDibujo([])} className="px-3 py-2 border rounded-md text-sm">
              Limpiar
            </button>
          </div>
        </div>

        <ul className="divide-y divide-gray-200 dark:divide-gray-700 text-sm max-h-64 overflow-y-auto">
          {lotes.map((l) => (
            <li key={l.id} className="flex items-center justify-between py-2">
              <span>{l.codigo} {l.poly ? "✓" : <span className="text-gray-400">sin marcar</span>}</span>
              {l.poly && (
                <button
                  data-testid={`borrar-poly-${l.codigo}`}
                  onClick={() => borrar(l.id)}
                  className="text-xs text-red-600 hover:text-red-800 active:scale-95 transition-transform"
                >
                  Borrar
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
