"use client";

import { useTransition } from "react";
import { actualizarLote, eliminarLote } from "./_actions";

type Lote = {
  id: string;
  codigo: string;
  sup_m2: number | null;
  precio: number | null;
  moneda: string | null;
  estado: "disponible" | "reservado" | "vendido";
};

export default function LotesList({ proyectoId, lotes }: { proyectoId: string; lotes: Lote[] }) {
  return (
    <ul className="divide-y border rounded">
      {lotes.map((l) => (
        <li key={l.id} className="p-3">
          <EditRow proyectoId={proyectoId} initial={l} />
        </li>
      ))}
      {lotes.length === 0 && <li className="p-3 text-sm opacity-60">Sin lotes.</li>}
    </ul>
  );
}

function EditRow({ proyectoId, initial }: { proyectoId: string; initial: Lote }) {
  const [pending, start] = useTransition();

  return (
    <form
      action={(fd) => start(async () => {
        fd.set("id", initial.id);
        await actualizarLote(proyectoId, fd);
      })}
      className="grid sm:grid-cols-6 gap-2 items-end"
    >
      <div className="sm:col-span-2">
        <label className="block text-sm">Código</label>
        <input name="codigo" defaultValue={initial.codigo} required className="border px-2 py-1 rounded w-full" />
      </div>
      <div>
        <label className="block text-sm">m²</label>
        <input name="sup_m2" type="number" step="0.01" defaultValue={initial.sup_m2 ?? ""} className="border px-2 py-1 rounded w-full" />
      </div>
      <div>
        <label className="block text-sm">Precio</label>
        <input name="precio" type="number" step="0.01" defaultValue={initial.precio ?? ""} className="border px-2 py-1 rounded w-full" />
      </div>
      <div>
        <label className="block text-sm">Moneda</label>
        <input name="moneda" defaultValue={initial.moneda ?? "ARS"} className="border px-2 py-1 rounded w-full" />
      </div>
      <div>
        <label className="block text-sm">Estado</label>
        <select name="estado" defaultValue={initial.estado} className="border px-2 py-1 rounded w-full">
          <option value="disponible">disponible</option>
          <option value="reservado">reservado</option>
          <option value="vendido">vendido</option>
        </select>
      </div>

      <div className="flex gap-2">
        <button className="border px-3 py-1 rounded" disabled={pending}>
          {pending ? "Guardando..." : "Guardar"}
        </button>
        <button
          type="button"
          className="border px-3 py-1 rounded"
          onClick={() => start(async () => { await eliminarLote(proyectoId, initial.id); })}
          disabled={pending}
        >
          {pending ? "Eliminando..." : "Eliminar"}
        </button>
      </div>
    </form>
  );
}
