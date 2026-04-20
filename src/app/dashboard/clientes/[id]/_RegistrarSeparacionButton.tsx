"use client";

import { useState } from "react";
import { FileSignature } from "lucide-react";
import SeparacionModal from "./_SeparacionModal";

interface Props {
  clienteId: string;
}

export default function RegistrarSeparacionButton({ clienteId }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 transition-colors"
      >
        <FileSignature className="h-4 w-4" />
        <span className="hidden sm:inline">Registrar Separación</span>
        <span className="sm:hidden">Separación</span>
      </button>
      {open && (
        <SeparacionModal
          clienteId={clienteId}
          onClose={() => setOpen(false)}
          onSuccess={() => {
            // La acción hace revalidatePath; el RSC re-renderiza con el nuevo estado.
          }}
        />
      )}
    </>
  );
}
