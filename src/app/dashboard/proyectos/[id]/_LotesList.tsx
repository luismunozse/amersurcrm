"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { actualizarLote, eliminarLote } from "./_actions";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/errors";
import ConfirmDialog from "@/components/ConfirmDialog";

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
  const [confirm, setConfirm] = useState<{ open: boolean } & Pick<Lote, "id" | "codigo">>({
    open: false,
    id: initial.id,
    codigo: initial.codigo,
  });
  const router = useRouter();

  const doDelete = () => {
    start(async () => {
      try {
        await eliminarLote(proyectoId, initial.id);
        toast.success("Lote eliminado");
        setConfirm((c) => ({ ...c, open: false }));
        router.refresh();
      } catch (err: unknown) {
        toast.error(getErrorMessage(err) || "No se pudo eliminar el lote");
      }
    });
  };

  return (
    <>
      <form
        action={(fd) =>
          start(async () => {
            try {
              fd.set("id", initial.id);
              await actualizarLote(proyectoId, fd);
              toast.success("Lote actualizado");
              router.refresh();
            } catch (err: unknown) {
              toast.error(getErrorMessage(err) || "No se pudo actualizar el lote");
            }
          })
        }
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
            onClick={() => setConfirm((c) => ({ ...c, open: true }))}
            disabled={pending}
          >
            Eliminar
          </button>
        </div>
      </form>

      <ConfirmDialog
        open={confirm.open}
        title="Eliminar lote"
        description={`Vas a eliminar el lote “${confirm.codigo}”. Esta acción no se puede deshacer.`}
        confirmText={pending ? "Eliminando…" : "Eliminar"}
        onConfirm={doDelete}
        onClose={() => setConfirm((c) => ({ ...c, open: false }))}
        disabled={pending}
      />
    </>
  );
}
