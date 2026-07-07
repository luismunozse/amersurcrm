"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { uploadProyectoAsset, validateProyectoImage, removeProyectoAssets } from "@/lib/storage/proyectoUpload.client";
import { guardarMasterplanProyecto } from "@/app/dashboard/proyectos/_actions";
import type { PlanoLoteDTO } from "@/lib/masterplan/dto";
import { createClient } from "@/lib/supabase.client";
import { rasterizeFirstPageToPng, aspectRatioChanged } from "@/lib/masterplan/rasterize.client";
import ConfirmDialog from "@/components/ConfirmDialog";
import type { Masterplan } from "@/types/proyectos";

// Segundo intento de rasterización cuando la primera pasada supera el límite
// de 5MB (validateProyectoImage). Reduce la resolución objetivo a la mitad.
const RETRY_MAX_DIMENSION = 2000;

// Carga diferida: react-zoom-pan-pinch (única dependencia nueva del editor)
// solo se descarga cuando ya hay un masterplan que editar.
const MasterplanEditor = dynamic(
  () => import("@/components/masterplan/MasterplanEditor").then((m) => m.MasterplanEditor),
  { ssr: false },
);

type Dimensiones = { w: number; h: number };
type CargaPendiente = { archivo: File; dims: Dimensiones };

export function MasterplanEditorPanel({
  proyectoId,
  masterplan,
  lotes,
  onSaved,
}: {
  proyectoId: string;
  masterplan: Masterplan | null;
  lotes: PlanoLoteDTO[];
  onSaved: () => void;
}) {
  const [url, setUrl] = useState<string | null>(masterplan?.url ?? null);
  const [pathActual, setPathActual] = useState<string | null>(masterplan?.path ?? null);
  const [dimsActual, setDimsActual] = useState<Dimensiones | null>(
    masterplan ? { w: masterplan.width, h: masterplan.height } : null,
  );
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, setPendiente] = useState<CargaPendiente | null>(null);

  async function leerDimensiones(archivo: File): Promise<Dimensiones> {
    const objectUrl = URL.createObjectURL(archivo);
    try {
      return await new Promise<Dimensiones>((res, rej) => {
        const img = new Image();
        img.onload = () => res({ w: img.naturalWidth, h: img.naturalHeight });
        img.onerror = () => rej(new Error("No se pudo leer la imagen."));
        img.src = objectUrl;
      });
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  async function persistir(archivo: File, dims: Dimensiones) {
    setSubiendo(true);
    try {
      const supabase = createClient();
      const { publicUrl, path } = await uploadProyectoAsset(supabase, proyectoId, archivo, "masterplan");
      const guardado = await guardarMasterplanProyecto(proyectoId, {
        url: publicUrl,
        path,
        width: dims.w,
        height: dims.h,
      });
      if (!guardado.ok) {
        setError(guardado.error);
        return;
      }
      if (pathActual && pathActual !== path) {
        await removeProyectoAssets(supabase, [pathActual]).catch(() => {});
      }
      setPathActual(path);
      setUrl(publicUrl);
      setDimsActual(dims);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error subiendo la imagen");
    } finally {
      setSubiendo(false);
    }
  }

  async function rasterizarPdf(original: File): Promise<File | null> {
    setSubiendo(true);
    try {
      let archivo = await rasterizeFirstPageToPng(original);
      let invalido = validateProyectoImage(archivo, "Masterplan");
      if (invalido) {
        // El PNG rasterizado supera el límite de 5MB: reintenta una vez a menor resolución.
        archivo = await rasterizeFirstPageToPng(original, { maxDimension: RETRY_MAX_DIMENSION });
        invalido = validateProyectoImage(archivo, "Masterplan");
        if (invalido) {
          setError("El plano es demasiado pesado. Reduzca la resolución del PDF.");
          return null;
        }
      }
      return archivo;
    } catch {
      setError("No se pudo convertir el PDF. Intente con una imagen PNG o JPG.");
      return null;
    } finally {
      setSubiendo(false);
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const original = e.target.files?.[0];
    e.target.value = ""; // permite volver a seleccionar el mismo archivo tras un error o cancelación
    if (!original) return;
    setError(null);

    let archivo: File;
    if (original.type === "application/pdf") {
      const rasterizado = await rasterizarPdf(original);
      if (!rasterizado) return;
      archivo = rasterizado;
    } else {
      const invalido = validateProyectoImage(original, "Masterplan");
      if (invalido) {
        setError(invalido);
        return;
      }
      archivo = original;
    }

    let dims: Dimensiones;
    try {
      dims = await leerDimensiones(archivo);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error leyendo la imagen");
      return;
    }

    if (dimsActual && aspectRatioChanged(dimsActual.w, dimsActual.h, dims.w, dims.h)) {
      setPendiente({ archivo, dims });
      return;
    }

    await persistir(archivo, dims);
  }

  return (
    <div className="mt-3 space-y-3">
      <label className="inline-flex items-center gap-2 px-3 py-2 border border-crm-border rounded-md text-sm cursor-pointer hover:bg-crm-card-hover transition-colors ease-out active:scale-[0.98]">
        {subiendo ? "Subiendo..." : url ? "Reemplazar imagen base" : "Subir imagen base"}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="hidden"
          onChange={onFile}
          disabled={subiendo}
        />
      </label>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      {url && (
        <MasterplanEditor
          imageUrl={url}
          lotes={lotes}
          onSaved={onSaved}
        />
      )}
      <ConfirmDialog
        open={pendiente !== null}
        title="El nuevo plano tiene otra proporción"
        description="Los polígonos existentes podrían quedar desalineados con la nueva imagen. ¿Desea continuar de todas formas?"
        confirmText="Continuar"
        cancelText="Cancelar"
        onConfirm={() => {
          if (!pendiente) return;
          const { archivo, dims } = pendiente;
          setPendiente(null);
          void persistir(archivo, dims);
        }}
        onClose={() => setPendiente(null)}
      />
    </div>
  );
}
