"use client";

import { useState } from "react";
import { actualizarEstadoCliente } from "@/app/dashboard/clientes/_actions";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/errors";
import { EstadoCliente } from "@/lib/types/clientes";

interface EstadoClienteButtonProps {
  clienteId: string;
  estadoActual: string;
}

export default function EstadoClienteButton({ 
  clienteId, 
  estadoActual
}: EstadoClienteButtonProps) {
  const [isUpdating, setIsUpdating] = useState(false);


  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'por_contactar': return 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200';
      case 'contactado': return 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200';
      case 'transferido': return 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200';
    }
  };

  const getEstadoLabel = (estado: string) => {
    switch (estado) {
      case 'por_contactar': return 'Por Contactar';
      case 'contactado': return 'Contactado';
      case 'transferido': return 'Transferido';
      default: return 'Sin Estado';
    }
  };

  const getSiguienteEstado = (estado: string): EstadoCliente | null => {
    switch (estado) {
      case 'por_contactar': return 'contactado';
      case 'contactado': return 'transferido';
      case 'transferido': return 'por_contactar'; // Ciclo completo
      default: return 'por_contactar';
    }
  };

  const handleEstadoChange = async () => {
    const siguienteEstado = getSiguienteEstado(estadoActual);
    if (!siguienteEstado) return;

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
      title={`Cambiar de "${getEstadoLabel(estadoActual)}" a "${getEstadoLabel(getSiguienteEstado(estadoActual) || 'por_contactar')}"`}
    >
      {isUpdating ? (
        <>
          <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
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
