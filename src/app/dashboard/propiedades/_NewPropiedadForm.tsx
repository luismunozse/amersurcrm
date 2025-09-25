"use client";

import { useState } from "react";
import PropiedadWizard from "@/components/PropiedadWizard";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";

interface Proyecto {
  id: string;
  nombre: string;
  ubicacion: string | null;
  estado: string;
}

export default function NewPropiedadForm({ proyectos }: { proyectos: Proyecto[] }) {
  const [showWizard, setShowWizard] = useState(false);
  const { isAdmin, loading } = useAdminPermissions();

  // No mostrar el formulario si no es admin
  if (loading) {
    return (
      <div className="crm-card p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-crm-border rounded w-1/4 mb-4"></div>
          <div className="h-10 bg-crm-border rounded"></div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="crm-card p-6 border-l-4 border-crm-warning">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-crm-warning/20 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-crm-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"/>
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-medium text-crm-text-primary">Acceso Restringido</h3>
            <p className="text-xs text-crm-text-muted">Solo los administradores pueden crear propiedades inmobiliarias.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-end mb-6">
        <button
          onClick={() => setShowWizard(true)}
          className="crm-button-primary px-6 py-3 rounded-lg text-sm font-medium flex items-center space-x-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
          </svg>
          <span>Nueva Propiedad</span>
        </button>
      </div>

      {showWizard && (
        <PropiedadWizard
          proyectos={proyectos}
          onClose={() => setShowWizard(false)}
        />
      )}
    </>
  );
}
