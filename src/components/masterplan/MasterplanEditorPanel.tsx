"use client";

import { useState } from "react";
import { uploadProyectoAsset, validateProyectoImage } from "@/lib/storage/proyectoUpload.client";
import { guardarMasterplanProyecto } from "@/app/dashboard/proyectos/_actions";
import { MasterplanEditor } from "@/components/masterplan/MasterplanEditor";
import type { LoteMarcado } from "@/components/masterplan/MasterplanViewer";
import { createClient } from "@/lib/supabase.client";

export function MasterplanEditorPanel({
  proyectoId,
  masterplanUrl,
  lotes,
  onSaved,
}: {
  proyectoId: string;
  masterplanUrl: string | null;
  lotes: LoteMarcado[];
  onSaved: () => void;
}) {
  const [url, setUrl] = useState<string | null>(masterplanUrl);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const invalido = validateProyectoImage(file, "Masterplan");
    if (invalido) {
      setError(invalido);
      return;
    }
    setError(null);
    setSubiendo(true);
    try {
      const dims = await new Promise<{ w: number; h: number }>((res) => {
        const img = new Image();
        img.onload = () => res({ w: img.naturalWidth, h: img.naturalHeight });
        img.src = URL.createObjectURL(file);
      });
      const supabase = createClient();
      const { publicUrl, path } = await uploadProyectoAsset(supabase, proyectoId, file, "masterplan");
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
      setUrl(publicUrl);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error subiendo la imagen");
    } finally {
      setSubiendo(false);
    }
  }

  return (
    <div className="mt-3 space-y-3">
      <label className="inline-flex items-center gap-2 px-3 py-2 border border-crm-border rounded-md text-sm cursor-pointer hover:bg-crm-card-hover transition-colors ease-out active:scale-[0.98]">
        {subiendo ? "Subiendo..." : url ? "Reemplazar imagen base" : "Subir imagen base"}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={onFile}
          disabled={subiendo}
        />
      </label>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      {url && (
        <MasterplanEditor
          proyectoId={proyectoId}
          imageUrl={url}
          lotes={lotes}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}
