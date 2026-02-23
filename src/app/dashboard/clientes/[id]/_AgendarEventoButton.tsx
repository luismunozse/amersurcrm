"use client";

import { useState } from "react";
import { CalendarPlus } from "lucide-react";
import EventoModal from "@/app/dashboard/agenda/_EventoModal";
import toast from "react-hot-toast";

interface Props {
  clienteId: string;
  clienteNombre: string;
}

export default function AgendarEventoButton({ clienteId, clienteNombre }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-crm-primary hover:bg-crm-primary-hover rounded-lg transition-colors shadow-sm"
        title="Agendar actividad con este cliente"
      >
        <CalendarPlus className="h-4 w-4" />
        <span className="hidden sm:inline">Agendar actividad</span>
        <span className="sm:hidden">Agendar</span>
      </button>

      <EventoModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSuccess={() => {
          setIsOpen(false);
          toast.success("Actividad agendada correctamente");
        }}
        clienteInicial={{ id: clienteId, nombre: clienteNombre }}
      />
    </>
  );
}
