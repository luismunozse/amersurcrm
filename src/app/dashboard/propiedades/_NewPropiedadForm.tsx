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
      <div className="crm-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-crm-primary rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-crm-text-primary">Agregar Nueva Propiedad</h2>
          </div>
          <button
            onClick={() => setShowWizard(true)}
            className="crm-button-primary px-4 py-2 rounded-lg text-sm font-medium"
          >
            Nueva Propiedad
          </button>
        </div>

        <div className="text-center py-8">
          <div className="w-16 h-16 bg-crm-card-hover rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-crm-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
            </svg>
          </div>
          <h3 className="text-lg font-medium text-crm-text-primary mb-2">Crear Propiedad con Asistente</h3>
          <p className="text-crm-text-muted mb-4">
            Usa nuestro asistente paso a paso para crear propiedades con información completa
          </p>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 text-sm text-crm-text-muted">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-crm-primary/10 rounded-full flex items-center justify-center">
                <span className="text-xs font-medium text-crm-primary">1</span>
              </div>
              <span>Tipo de Propiedad</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-crm-primary/10 rounded-full flex items-center justify-center">
                <span className="text-xs font-medium text-crm-primary">2</span>
              </div>
              <span>Datos Generales</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-crm-primary/10 rounded-full flex items-center justify-center">
                <span className="text-xs font-medium text-crm-primary">3</span>
              </div>
              <span>Características</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-crm-primary/10 rounded-full flex items-center justify-center">
                <span className="text-xs font-medium text-crm-primary">4</span>
              </div>
              <span>Estado Comercial</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-crm-primary/10 rounded-full flex items-center justify-center">
                <span className="text-xs font-medium text-crm-primary">5</span>
              </div>
              <span>Marketing</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-crm-primary/10 rounded-full flex items-center justify-center">
                <span className="text-xs font-medium text-crm-primary">6</span>
              </div>
              <span>Confirmación</span>
            </div>
          </div>
        </div>
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
