"use client";

import { useState, useTransition } from "react";
import { actualizarCliente, eliminarCliente } from "./_actions";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";

type Cliente = { id: string; nombre: string; email: string | null; telefono: string | null; };

export default function ClientesList({ clientes }: { clientes: Cliente[] }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const params = useSearchParams();

  const onDelete = (id: string) => {
    startTransition(async () => {
      await eliminarCliente(id);
      router.refresh();
    });
  };

  return (
    <div className="space-y-2">
      <SearchBox defaultValue={params.get("q") ?? ""} />

      <ul className="divide-y border rounded">
        {clientes.map((c) => (
          <li key={c.id} className="p-3">
            {editing === c.id ? (
              <EditRow
                initial={c}
                onCancel={() => setEditing(null)}
                afterSave={() => { setEditing(null); router.refresh(); }}
              />
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="font-medium">{c.nombre}</div>
                  <div className="text-sm opacity-75">{c.email ?? "—"} · {c.telefono ?? "—"}</div>
                </div>
                <button className="text-sm border px-2 py-1 rounded" onClick={() => setEditing(c.id)}>Editar</button>
                <button className="text-sm border px-2 py-1 rounded"
                        onClick={() => onDelete(c.id)}
                        disabled={isPending}>
                  {isPending ? "Borrando..." : "Eliminar"}
                </button>
              </div>
            )}
          </li>
        ))}
        {clientes.length === 0 && <li className="p-3 text-sm opacity-60">Sin clientes.</li>}
      </ul>
    </div>
  );
}

function EditRow({
  initial,
  onCancel,
  afterSave,
}: {
  initial: { id: string; nombre: string; email: string | null; telefono: string | null };
  onCancel: () => void;
  afterSave: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <form action={(fd) => {
      startTransition(async () => {
        try {
          fd.set("id", initial.id);
          await actualizarCliente(fd);
          toast.success("Cliente actualizado");
          afterSave();
        } catch (err: any) {
          toast.error(err?.message || "No se pudo actualizar");
        }
      });
    }} className="flex flex-wrap items-end gap-2">
      <div>
        <label className="block text-sm">Nombre</label>
        <input name="nombre" defaultValue={initial.nombre} required className="border px-2 py-1 rounded" />
      </div>
      <div>
        <label className="block text-sm">Email</label>
        <input name="email" defaultValue={initial.email ?? ""} className="border px-2 py-1 rounded" />
      </div>
      <div>
        <label className="block text-sm">Teléfono</label>
        <input name="telefono" defaultValue={initial.telefono ?? ""} className="border px-2 py-1 rounded" />
      </div>
      <button className="border px-3 py-1 rounded" disabled={isPending}>
        {isPending ? "Guardando..." : "Guardar"}
      </button>
      <button type="button" className="border px-3 py-1 rounded" onClick={onCancel}>Cancelar</button>
    </form>
  );
}

function SearchBox({ defaultValue }: { defaultValue: string }) {
  const router = useRouter();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const q = new FormData(e.currentTarget).get("q") as string;
        const url = q ? `/dashboard/clientes?q=${encodeURIComponent(q)}` : `/dashboard/clientes`;
        router.push(url);
      }}
      className="flex gap-2 items-center"
    >
      <input name="q" defaultValue={defaultValue} placeholder="Buscar por nombre o email..." className="border px-2 py-1 rounded" />
      <button className="border px-3 py-1 rounded">Buscar</button>
    </form>
  );
}
