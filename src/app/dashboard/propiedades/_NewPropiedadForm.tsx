"use client";

import { useState } from "react";
import PropiedadWizard from "@/components/PropiedadWizard";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { AlertTriangle, Plus } from "lucide-react";

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
            <AlertTriangle className="w-4 h-4 text-crm-warning" />
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
          <Plus className="w-4 h-4" />
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
