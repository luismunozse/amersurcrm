"use client";

import { useRef, useTransition } from "react";
import { crearLote } from "./_actions";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/errors";

export default function NewLoteForm({ proyectoId }: { proyectoId: string }) {
  const [pending, start] = useTransition();
  const ref = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={ref}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(ref.current!);
        start(async () => {
          try {
            await crearLote(proyectoId, fd);
            ref.current?.reset();
            toast.success("Lote creado");
          } catch (err: unknown) {
            toast.error(getErrorMessage(err) || "No se pudo crear el lote");
          }
        });
      }}
      className="flex gap-2 flex-wrap items-end"
    >
      <div>
        <label className="block text-sm">Código</label>
        <input name="codigo" required className="border px-2 py-1 rounded" placeholder="MzA-01" disabled={pending} />
      </div>
      <div>
        <label className="block text-sm">m²</label>
        <input name="sup_m2" type="number" step="0.01" className="border px-2 py-1 rounded" disabled={pending} />
      </div>
      <div>
        <label className="block text-sm">Precio</label>
        <input name="precio" type="number" step="0.01" className="border px-2 py-1 rounded" disabled={pending} />
      </div>
      <div>
        <label className="block text-sm">Moneda</label>
        <input name="moneda" defaultValue="ARS" className="border px-2 py-1 rounded" disabled={pending} />
      </div>
      <div>
        <label className="block text-sm">Estado</label>
        <select name="estado" className="border px-2 py-1 rounded" defaultValue="disponible" disabled={pending}>
          <option value="disponible">disponible</option>
          <option value="reservado">reservado</option>
          <option value="vendido">vendido</option>
        </select>
      </div>
      <button className="border px-3 py-2 rounded" disabled={pending}>
        {pending ? "Creando..." : "Agregar lote"}
      </button>
    </form>
  );
}
