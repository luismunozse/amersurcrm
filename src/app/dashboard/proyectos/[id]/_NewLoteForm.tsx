"use client";

import { useState } from "react";
import LoteWizard from "@/components/LoteWizard";

interface Proyecto {
  id: string;
  nombre: string;
  ubicacion: string | null;
  estado: string;
}

export default function NewLoteForm({ 
  proyectoId, 
  proyectos 
}: { 
  proyectoId: string;
  proyectos: Proyecto[];
}) {
  const [showWizard, setShowWizard] = useState(false);
  
  // Encontrar el proyecto actual
  const proyectoActual = proyectos.find(p => p.id === proyectoId);

  return (
    <>
      <div className="flex justify-end gap-3 mb-4">
        <button
          onClick={() => {
            // TODO: Implementar importación masiva
            alert('Funcionalidad de importación masiva en desarrollo');
          }}
          className="crm-button-secondary px-6 py-3 rounded-lg text-sm font-medium flex items-center space-x-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"/>
          </svg>
          <span>Importar Masivamente</span>
        </button>
        <button
          onClick={() => setShowWizard(true)}
          className="crm-button-primary px-6 py-3 rounded-lg text-sm font-medium flex items-center space-x-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
          </svg>
          <span>Crear Lote</span>
        </button>
      </div>

      {showWizard && (
        <LoteWizard
          proyectoId={proyectoId}
          proyectoNombre={proyectoActual?.nombre}
          proyectoUbicacion={proyectoActual?.ubicacion || undefined}
          proyectos={proyectos}
          onClose={() => setShowWizard(false)}
        />
      )}
    </>
  );
}
