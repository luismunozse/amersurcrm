"use client";

import { useState } from "react";
import { actualizarEstadoCliente } from "@/app/dashboard/clientes/_actions";
import toast from "react-hot-toast";
import { Spinner } from "@/components/ui/Spinner";
import { getErrorMessage } from "@/lib/errors";
import { EstadoCliente } from "@/lib/types/clientes";

interface EstadoClienteButtonProps {
  clienteId: string;
  estadoActual: string;
}

const ESTADO_COLORS: Record<string, string> = {
  por_contactar: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200',
  contactado: 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200',
  transferido: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200',
};
const DEFAULT_ESTADO_COLOR = 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200';

const ESTADO_LABELS: Record<string, string> = {
  por_contactar: 'Por Contactar',
  contactado: 'Contactado',
  transferido: 'Transferido',
};

const SIGUIENTE_ESTADO: Record<string, EstadoCliente> = {
  por_contactar: 'contactado',
  contactado: 'transferido',
  transferido: 'por_contactar',
};

function getEstadoColor(estado: string) {
  return ESTADO_COLORS[estado] ?? DEFAULT_ESTADO_COLOR;
}

function getEstadoLabel(estado: string) {
  return ESTADO_LABELS[estado] ?? 'Sin Estado';
}

function getSiguienteEstado(estado: string): EstadoCliente {
  return SIGUIENTE_ESTADO[estado] ?? 'por_contactar';
}

export default function EstadoClienteButton({
  clienteId,
  estadoActual
}: EstadoClienteButtonProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleEstadoChange = async () => {
    const siguienteEstado = getSiguienteEstado(estadoActual);
    setIsUpdating(true);
    try {
      await actualizarEstadoCliente(clienteId, siguienteEstado);
      toast.success(`Estado cambiado a: ${getEstadoLabel(siguienteEstado)}`);
      
      // Recargar la página para reflejar los cambios
      window.location.reload();
    } catch (error) {
      toast.error(getErrorMessage(error) || "Error al actualizar estado");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <button
      onClick={handleEstadoChange}
      disabled={isUpdating}
      className={`
        px-3 py-1 rounded-full text-xs font-medium border transition-all duration-200
        ${getEstadoColor(estadoActual)}
        ${isUpdating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        flex items-center space-x-1
      `}
      title={`Cambiar de "${getEstadoLabel(estadoActual)}" a "${getEstadoLabel(getSiguienteEstado(estadoActual))}"`}
    >
      {isUpdating ? (
        <>
          <Spinner size="xs" />
          <span>Actualizando...</span>
        </>
      ) : (
        <>
          <span>{getEstadoLabel(estadoActual)}</span>
          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        </>
      )}
    </button>
  );
}
