"use client";
import { useTransition } from "react";
import { crearLote } from "./_actions";

export default function NewLoteForm({ proyectoId }: { proyectoId: string }) {
  const [pending, start] = useTransition();

  return (
    <form
      action={(fd) => start(async () => { await crearLote(proyectoId, fd); })}
      className="flex gap-2 flex-wrap items-end"
    >
      <div>
        <label className="block text-sm">Código</label>
        <input name="codigo" required className="border px-2 py-1 rounded" placeholder="MzA-01" />
      </div>
      <div>
        <label className="block text-sm">m²</label>
        <input name="sup_m2" type="number" step="0.01" className="border px-2 py-1 rounded" />
      </div>
      <div>
        <label className="block text-sm">Precio</label>
        <input name="precio" type="number" step="0.01" className="border px-2 py-1 rounded" />
      </div>
      <div>
        <label className="block text-sm">Moneda</label>
        <input name="moneda" defaultValue="ARS" className="border px-2 py-1 rounded" />
      </div>
      <div>
        <label className="block text-sm">Estado</label>
        <select name="estado" className="border px-2 py-1 rounded" defaultValue="disponible">
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
