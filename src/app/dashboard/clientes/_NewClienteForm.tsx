"use client";

import { useState, FormEvent } from "react";
import { crearCliente } from "./_actions";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/errors";

export default function NewClienteForm() {
  const [pending, setPending] = useState(false);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPending(true);
    const form = e.currentTarget;
    const fd = new FormData(form);
    try {
      await crearCliente(fd);
      form.reset();
      toast.success("Cliente creado");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || "No se pudo crear el cliente");
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="flex gap-2 flex-wrap items-end">
      <div>
        <label className="block text-sm">Nombre</label>
        <input name="nombre" required className="border px-2 py-1 rounded" disabled={pending} />
      </div>
      <div>
        <label className="block text-sm">Email</label>
        <input name="email" type="email" className="border px-2 py-1 rounded" disabled={pending} />
      </div>
      <div>
        <label className="block text-sm">Teléfono</label>
        <input name="telefono" className="border px-2 py-1 rounded" disabled={pending} />
      </div>
      <button disabled={pending} className="border px-3 py-2 rounded">
        {pending ? "Creando..." : "Agregar"}
      </button>
    </form>
  );
}
