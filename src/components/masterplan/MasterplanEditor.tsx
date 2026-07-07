"use client";

import { useRef, useState } from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import {
  pixelANormalizado,
  poligonoASvgPoints,
  estadoColor,
  moverVertice,
  eliminarVertice,
} from "@/lib/masterplan/geometry";
import { guardarPoligonoLote, eliminarPoligonoLote } from "@/app/dashboard/proyectos/_actions";
import type { LoteMarcado } from "./MasterplanViewer";
import type { Poligono } from "@/types/proyectos";

type Modo = "navegar" | "dibujar";

interface MasterplanEditorProps {
  imageUrl: string;
  lotes: LoteMarcado[];
  onSaved: () => void;
}

/** Bookkeeping de un arrastre de vértice en curso. Vive en un ref: no dispara
 * renders por sí mismo, solo lo hace la actualización de `dibujo`. */
interface ArrastreVertice {
  index: number;
  estadoPrevio: Poligono;
  historialGuardado: boolean;
}

export function MasterplanEditor({ imageUrl, lotes, onSaved }: MasterplanEditorProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const arrastreRef = useRef<ArrastreVertice | null>(null);
  const [dibujo, setDibujo] = useState<Poligono>([]);
  const [historial, setHistorial] = useState<Poligono[]>([]);
  const [modo, setModo] = useState<Modo>("navegar");
  const [loteSel, setLoteSel] = useState<string>("");
  const [guardando, setGuardando] = useState(false);

  function registrarHistorial(previo: Poligono) {
    setHistorial((prev) => [...prev, previo]);
  }

  function onImageClick(e: React.MouseEvent) {
    if (modo !== "dibujar") return;
    const img = imgRef.current;
    if (!img) return;
    const rect = img.getBoundingClientRect();
    const p = pixelANormalizado(e.clientX - rect.left, e.clientY - rect.top, rect.width, rect.height);
    registrarHistorial(dibujo);
    setDibujo((prev) => [...prev, p]);
  }

  function onArrastreMove(e: MouseEvent) {
    const arrastre = arrastreRef.current;
    const img = imgRef.current;
    if (!arrastre || !img) return;
    const rect = img.getBoundingClientRect();
    const punto = pixelANormalizado(e.clientX - rect.left, e.clientY - rect.top, rect.width, rect.height);
    if (!arrastre.historialGuardado) {
      registrarHistorial(arrastre.estadoPrevio);
      arrastre.historialGuardado = true;
    }
    setDibujo((prev) => moverVertice(prev, arrastre.index, punto));
  }

  function onArrastreUp() {
    arrastreRef.current = null;
    window.removeEventListener("mousemove", onArrastreMove);
    window.removeEventListener("mouseup", onArrastreUp);
  }

  function onVerticeMouseDown(index: number, e: React.MouseEvent) {
    if (modo !== "dibujar") return;
    e.stopPropagation();
    e.preventDefault();
    arrastreRef.current = { index, estadoPrevio: dibujo, historialGuardado: false };
    window.addEventListener("mousemove", onArrastreMove);
    window.addEventListener("mouseup", onArrastreUp);
  }

  function eliminarVerticeDibujo(index: number) {
    if (dibujo.length <= 3) return; // UI-level guard; eliminarVertice ya lo respeta también
    registrarHistorial(dibujo);
    setDibujo((prev) => eliminarVertice(prev, index));
  }

  function deshacer() {
    setHistorial((prev) => {
      if (prev.length === 0) return prev;
      setDibujo(prev[prev.length - 1]);
      return prev.slice(0, -1);
    });
  }

  function limpiar() {
    registrarHistorial(dibujo);
    setDibujo([]);
  }

  async function guardarDibujo() {
    if (!loteSel || dibujo.length < 3) return;
    setGuardando(true);
    const res = await guardarPoligonoLote(loteSel, dibujo);
    setGuardando(false);
    if (res.ok) {
      setDibujo([]);
      setHistorial([]);
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
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setModo("navegar")}
            aria-pressed={modo === "navegar"}
            className={`px-3 py-1.5 rounded-md text-sm border active:scale-[0.98] transition-colors ease-out-strong ${
              modo === "navegar"
                ? "bg-crm-primary text-white border-crm-primary"
                : "border-crm-border hover:bg-crm-card-hover"
            }`}
          >
            Navegar
          </button>
          <button
            type="button"
            onClick={() => setModo("dibujar")}
            aria-pressed={modo === "dibujar"}
            className={`px-3 py-1.5 rounded-md text-sm border active:scale-[0.98] transition-colors ease-out-strong ${
              modo === "dibujar"
                ? "bg-crm-primary text-white border-crm-primary"
                : "border-crm-border hover:bg-crm-card-hover"
            }`}
          >
            Dibujar
          </button>
          <button
            type="button"
            onClick={deshacer}
            disabled={historial.length === 0}
            className="ml-auto px-3 py-1.5 rounded-md text-sm border border-crm-border hover:bg-crm-card-hover disabled:opacity-50 active:scale-[0.98] transition-colors ease-out-strong"
          >
            Deshacer
          </button>
        </div>

        <TransformWrapper panning={{ disabled: modo === "dibujar" }} doubleClick={{ disabled: true }} minScale={1} maxScale={6}>
          <TransformComponent wrapperStyle={{ width: "100%" }} contentStyle={{ width: "100%" }}>
            <div className="relative inline-block w-full">
              <img
                ref={imgRef}
                src={imageUrl}
                alt="Masterplan (edición)"
                className={`block w-full h-auto select-none ${modo === "dibujar" ? "cursor-crosshair" : "cursor-grab"}`}
                onClick={onImageClick}
              />
              <svg viewBox="0 0 1 1" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 w-full h-full">
                {lotes.filter((l) => l.poly && l.poly.length >= 3).map((l) => {
                  const c = estadoColor(l.estado);
                  return <polygon key={l.id} points={poligonoASvgPoints(l.poly!)} fill={c.fill} stroke={c.stroke} strokeWidth={0.002} />;
                })}
                {dibujo.length > 0 && (
                  <polygon
                    data-testid="dibujo-poligono"
                    points={poligonoASvgPoints(dibujo)}
                    fill="rgba(59,130,246,0.4)"
                    stroke="rgb(37,99,235)"
                    strokeWidth={0.003}
                  />
                )}
                {modo === "dibujar" &&
                  dibujo.map(([x, y], i) => (
                    <circle
                      key={i}
                      data-testid={`vertice-${i}`}
                      cx={x}
                      cy={y}
                      r={0.008}
                      fill="white"
                      stroke="rgb(37,99,235)"
                      strokeWidth={0.003}
                      className="pointer-events-auto cursor-grab"
                      onMouseDown={(e) => onVerticeMouseDown(i, e)}
                      onDoubleClick={() => eliminarVerticeDibujo(i)}
                    />
                  ))}
              </svg>
            </div>
          </TransformComponent>
        </TransformWrapper>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium mb-1">Asignar polígono a lote</label>
          <select
            value={loteSel}
            onChange={(e) => setLoteSel(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-sm"
          >
            <option value="">— Seleccione un lote —</option>
            {lotes.map((l) => (
              <option key={l.id} value={l.id}>{l.codigo} ({l.estado})</option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Modo Dibujar: haga clic en la imagen para marcar los vértices ({dibujo.length} puntos, mín. 3). Arrastre un vértice para moverlo o haga doble clic para eliminarlo.
          </p>
          <div className="flex gap-2 mt-2">
            <button
              onClick={guardarDibujo}
              disabled={!loteSel || dibujo.length < 3 || guardando}
              className="px-3 py-2 bg-crm-primary text-white rounded-md text-sm disabled:opacity-50 active:scale-[0.98] transition ease-out-strong"
            >
              {guardando ? "Guardando..." : "Guardar polígono"}
            </button>
            <button onClick={limpiar} className="px-3 py-2 border rounded-md text-sm active:scale-[0.98] transition ease-out-strong">
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
