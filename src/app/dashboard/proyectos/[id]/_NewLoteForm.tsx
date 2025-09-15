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

  return (
    <>
      <div className="crm-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-crm-warning rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-crm-text-primary">Agregar Nuevo Lote</h2>
          </div>
          <button
            onClick={() => setShowWizard(true)}
            className="crm-button-primary px-4 py-2 rounded-lg text-sm font-medium"
          >
            Crear Lote
          </button>
        </div>
        
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-crm-card-hover rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-crm-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
            </svg>
          </div>
          <h3 className="text-lg font-medium text-crm-text-primary mb-2">Crear Lote con Asistente</h3>
          <p className="text-crm-text-muted mb-4">
            Usa nuestro asistente paso a paso para crear lotes con información completa
          </p>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-sm text-crm-text-muted">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-crm-primary/10 rounded-full flex items-center justify-center">
                <span className="text-xs font-medium text-crm-primary">1</span>
              </div>
              <span>Datos del Proyecto</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-crm-primary/10 rounded-full flex items-center justify-center">
                <span className="text-xs font-medium text-crm-primary">2</span>
              </div>
              <span>Información del Lote</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-crm-primary/10 rounded-full flex items-center justify-center">
                <span className="text-xs font-medium text-crm-primary">3</span>
              </div>
              <span>Precio y Condiciones</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-crm-primary/10 rounded-full flex items-center justify-center">
                <span className="text-xs font-medium text-crm-primary">4</span>
              </div>
              <span>Multimedia</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-crm-primary/10 rounded-full flex items-center justify-center">
                <span className="text-xs font-medium text-crm-primary">5</span>
              </div>
              <span>Confirmación</span>
            </div>
          </div>
        </div>
      </div>

      {showWizard && (
        <LoteWizard
          proyectoId={proyectoId}
          proyectos={proyectos}
          onClose={() => setShowWizard(false)}
        />
      )}
    </>
  );
}
