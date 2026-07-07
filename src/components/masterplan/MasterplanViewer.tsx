"use client";

import { estadoColor, poligonoASvgPoints } from "@/lib/masterplan/geometry";
import type { PlanoLoteDTO } from "@/lib/masterplan/dto";

interface MasterplanViewerProps {
  imageUrl: string;
  lotes: PlanoLoteDTO[];
  onLoteClick: (loteId: string) => void;
}

export function MasterplanViewer({ imageUrl, lotes, onLoteClick }: MasterplanViewerProps) {
  const marcados = lotes.filter((l) => l.poly && l.poly.length >= 3);
  return (
    <div className="relative inline-block w-full">
      <img src={imageUrl} alt="Masterplan del proyecto" className="block w-full h-auto select-none" />
      <svg viewBox="0 0 1 1" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
        {marcados.map((l) => {
          const { fill, stroke } = estadoColor(l.estado);
          return (
            <polygon
              key={l.id}
              data-testid={`lote-poly-${l.codigo}`}
              points={poligonoASvgPoints(l.poly!)}
              fill={fill}
              stroke={stroke}
              strokeWidth={0.002}
              className="cursor-pointer transition-opacity ease-out-strong hover:opacity-80"
              onClick={() => onLoteClick(l.id)}
            >
              <title>{`${l.codigo} — ${l.estado}`}</title>
            </polygon>
          );
        })}
      </svg>
    </div>
  );
}
