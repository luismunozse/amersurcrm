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
        className="inline-flex items-center justify-center gap-2 px-2.5 sm:px-4 h-10 sm:h-10 rounded-lg text-sm font-medium text-white bg-crm-primary hover:bg-crm-primary-hover transition-colors shadow-sm"
        title="Agendar actividad con este cliente"
        aria-label="Agendar actividad con este cliente"
      >
        <CalendarPlus className="h-4 w-4 shrink-0" aria-hidden />
        <span className="hidden sm:inline">Agendar actividad</span>
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
