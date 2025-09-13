"use client";
import { useState, FormEvent } from "react";
import { crearCliente } from "./_actions";

export default function NewClienteForm() {
  const [pending, setPending] = useState(false);
  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPending(true);
    const fd = new FormData(e.currentTarget);
    try { await crearCliente(fd); e.currentTarget.reset(); }
    finally { setPending(false); }
  };

  return (
    <form onSubmit={onSubmit} className="flex gap-2 flex-wrap items-end">
      <div>
        <label className="block text-sm">Nombre</label>
        <input name="nombre" required className="border px-2 py-1 rounded" />
      </div>
      <div>
        <label className="block text-sm">Email</label>
        <input name="email" type="email" className="border px-2 py-1 rounded" />
      </div>
      <div>
        <label className="block text-sm">Teléfono</label>
        <input name="telefono" className="border px-2 py-1 rounded" />
      </div>
      <button disabled={pending} className="border px-3 py-2 rounded">
        {pending ? "Creando..." : "Agregar"}
      </button>
    </form>
  );
}
