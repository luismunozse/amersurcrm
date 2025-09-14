"use client";
import { useTransition } from "react";
import { crearProyecto } from "./_actions";

export default function NewProyectoForm() {
  const [pending, start] = useTransition();
  return (
    <form action={(fd) => start(async () => { await crearProyecto(fd); })}
          className="flex gap-2 flex-wrap items-end">
      <div>
        <label className="block text-sm">Nombre</label>
        <input name="nombre" required className="border px-2 py-1 rounded" />
      </div>
      <div>
        <label className="block text-sm">Estado</label>
        <select name="estado" className="border px-2 py-1 rounded" defaultValue="activo">
          <option value="activo">activo</option>
          <option value="pausado">pausado</option>
          <option value="cerrado">cerrado</option>
        </select>
      </div>
      <div>
        <label className="block text-sm">Ubicación</label>
        <input name="ubicacion" className="border px-2 py-1 rounded" />
      </div>
      <button className="border px-3 py-2 rounded" disabled={pending}>
        {pending ? "Creando..." : "Agregar proyecto"}
      </button>
    </form>
  );
}
