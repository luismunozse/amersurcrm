"use client";

import { useState, useTransition, memo, useMemo } from "react";
import { actualizarCliente, eliminarCliente } from "./_actions";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/errors";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Pagination } from "@/components/Pagination";
import { usePagination } from "@/hooks/usePagination";

type Cliente = { id: string; nombre: string; email: string | null; telefono: string | null };

export default function ClientesList({ clientes }: { clientes: Cliente[] }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState<{ open: boolean; id: string | null; nombre?: string }>({
    open: false,
    id: null,
  });
  const router = useRouter();
  const params = useSearchParams();

  // Paginación
  const {
    currentPage,
    totalPages,
    paginatedItems,
    goToPage,
  } = usePagination({
    items: clientes,
    itemsPerPage: 10,
  });

  // Memoizar funciones para evitar re-renders innecesarios
  const handleEdit = useMemo(() => (id: string) => setEditing(id), []);
  const handleCancelEdit = useMemo(() => () => setEditing(null), []);
  const handleAfterSave = useMemo(() => () => {
    setEditing(null);
    router.refresh();
  }, [router]);

  const askDelete = (c: Cliente) => setConfirm({ open: true, id: c.id, nombre: c.nombre });

  const doDelete = () => {
    if (!confirm.id) return;
    startTransition(async () => {
      try {
        await eliminarCliente(confirm.id!);
        toast.success("Cliente eliminado");
        setConfirm({ open: false, id: null });
        router.refresh();
      } catch (err: unknown) {
        toast.error(getErrorMessage(err) || "No se pudo eliminar");
      }
    });
  };

  return (
    <div className="space-y-4">
      <SearchBox defaultValue={params.get("q") ?? ""} />

      <div className="space-y-2">
        <ul className="divide-y border rounded">
          {paginatedItems.map((c) => (
            <ClienteItem
              key={c.id}
              cliente={c}
              isEditing={editing === c.id}
              isPending={isPending}
              onEdit={handleEdit}
              onCancelEdit={handleCancelEdit}
              onAfterSave={handleAfterSave}
              onDelete={askDelete}
            />
          ))}
          {clientes.length === 0 && <li className="p-3 text-sm opacity-60">Sin clientes.</li>}
        </ul>

        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={goToPage}
            className="mt-4"
          />
        )}
      </div>

      <ConfirmDialog
        open={confirm.open}
        title="Eliminar cliente"
        description={`Vas a eliminar a "${confirm.nombre ?? ""}". Esta acción no se puede deshacer.`}
        confirmText={isPending ? "Eliminando…" : "Eliminar"}
        onConfirm={doDelete}
        onClose={() => setConfirm({ open: false, id: null })}
        disabled={isPending}
      />
    </div>
  );
}

// Componente memoizado para cada item de cliente
const ClienteItem = memo(function ClienteItem({
  cliente,
  isEditing,
  isPending,
  onEdit,
  onCancelEdit,
  onAfterSave,
  onDelete,
}: {
  cliente: Cliente;
  isEditing: boolean;
  isPending: boolean;
  onEdit: (id: string) => void;
  onCancelEdit: () => void;
  onAfterSave: () => void;
  onDelete: (c: Cliente) => void;
}) {
  if (isEditing) {
    return (
      <li className="p-3">
        <EditRow
          initial={cliente}
          onCancel={onCancelEdit}
          afterSave={onAfterSave}
        />
      </li>
    );
  }

  return (
    <li className="p-3">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="font-medium">{cliente.nombre}</div>
          <div className="text-sm opacity-75">{cliente.email ?? "—"} · {cliente.telefono ?? "—"}</div>
        </div>
        <button 
          className="text-sm border px-2 py-1 rounded" 
          onClick={() => onEdit(cliente.id)}
        >
          Editar
        </button>
        <button
          className="text-sm border px-2 py-1 rounded"
          onClick={() => onDelete(cliente)}
          disabled={isPending}
        >
          Eliminar
        </button>
      </div>
    </li>
  );
});

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
    <form
      action={(fd) => {
        startTransition(async () => {
          try {
            fd.set("id", initial.id);
            await actualizarCliente(fd);
            toast.success("Cliente actualizado");
            afterSave();
          } catch (err: unknown) {
            toast.error(getErrorMessage(err) || "No se pudo actualizar");
          }
        });
      }}
      className="flex flex-wrap items-end gap-2"
    >
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
      <button type="button" className="border px-3 py-1 rounded" onClick={onCancel}>
        Cancelar
      </button>
    </form>
  );
}

const SearchBox = memo(function SearchBox({ defaultValue }: { defaultValue: string }) {
  const router = useRouter();

  const handleSubmit = useMemo(() => (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const q = new FormData(e.currentTarget).get("q") as string;
    const url = q ? `/dashboard/clientes?q=${encodeURIComponent(q)}` : `/dashboard/clientes`;
    router.push(url);
  }, [router]);

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 items-center">
      <input
        name="q"
        defaultValue={defaultValue}
        placeholder="Buscar por nombre o email..."
        className="border px-2 py-1 rounded"
      />
      <button className="border px-3 py-1 rounded">Buscar</button>
    </form>
  );
});
