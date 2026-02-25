"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import ClienteForm from "./ClienteForm";
import type { ClienteCompleto } from "@/lib/types/clientes";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  cliente: ClienteCompleto;
}

export default function EditarClienteModal({ isOpen, onClose, cliente }: Props) {
  // Scroll lock + escape key
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);

    return () => {
      document.documentElement.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Map ClienteCompleto to the shape ClienteForm expects
  const clienteForForm = {
    id: cliente.id,
    nombre: cliente.nombre,
    tipo_cliente: cliente.tipo_cliente,
    ...(cliente.email ? { email: cliente.email } : {}),
    ...(cliente.telefono ? { telefono: cliente.telefono } : {}),
    ...(cliente.tipo_documento ? { tipo_documento: cliente.tipo_documento } : {}),
    ...(cliente.documento_identidad ? { documento_identidad: cliente.documento_identidad } : {}),
    ...(cliente.telefono_whatsapp ? { telefono_whatsapp: cliente.telefono_whatsapp } : {}),
    ...(cliente.direccion ? { direccion: cliente.direccion } : {}),
    estado_cliente: cliente.estado_cliente,
    ...(cliente.origen_lead ? { origen_lead: cliente.origen_lead } : {}),
    ...(cliente.vendedor_asignado ? { vendedor_asignado: cliente.vendedor_asignado } : {}),
    ...(cliente.interes_principal ? { interes_principal: cliente.interes_principal } : {}),
    ...(cliente.notas ? { notas: cliente.notas } : {}),
    ...(cliente.estado_civil ? { estado_civil: cliente.estado_civil } : {}),
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="editar-cliente-title">
      <span className="sr-only" id="editar-cliente-title">Editar cliente</span>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal content */}
      <div className="relative w-full max-w-5xl my-8 mx-4">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 text-crm-text-muted hover:text-crm-text bg-crm-card rounded-full shadow-md hover:shadow-lg transition-all"
          title="Cerrar"
          aria-label="Cerrar"
        >
          <X className="h-5 w-5" />
        </button>

        <ClienteForm
          cliente={clienteForForm}
          isEditing={true}
          onSuccess={onClose}
          onCancel={onClose}
        />
      </div>
    </div>,
    document.body,
  );
}
