"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import LoteWizard from "@/components/LoteWizard";
import ImportarLotesModal from "@/components/ImportarLotesModal";
import EliminarLotesMasivoModal from "@/components/EliminarLotesMasivoModal";

interface Proyecto {
  id: string;
  nombre: string;
  ubicacion: string | null;
  estado: string;
}

interface Lote {
  id: string;
  codigo: string;
  sup_m2: number | null;
  precio: number | null;
  estado: string;
}

export default function NewLoteForm({
  proyectoId,
  proyectos,
  lotes = []
}: {
  proyectoId: string;
  proyectos: Proyecto[];
  lotes?: Lote[];
}) {
  const [showWizard, setShowWizard] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const router = useRouter();

  // Encontrar el proyecto actual
  const proyectoActual = proyectos.find(p => p.id === proyectoId);

  const handleSuccess = () => {
    setShowImportModal(false);
    setShowDeleteModal(false);
    router.refresh();
  };

  return (
    <>
      <div className="flex flex-col gap-2 mb-4 sm:flex-row sm:flex-wrap sm:items-stretch sm:justify-end">
        {lotes.length > 0 && (
          <button
            onClick={() => setShowDeleteModal(true)}
            className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span>Eliminar Masivamente</span>
          </button>
        )}
        <button
          onClick={() => setShowImportModal(true)}
          className="crm-button-secondary px-5 py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 w-full sm:w-auto"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"/>
          </svg>
          <span>Importar Masivamente</span>
        </button>
        <button
          onClick={() => setShowWizard(true)}
          className="crm-button-primary px-5 py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 w-full sm:w-auto"
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

      {showImportModal && proyectoActual && (
        <ImportarLotesModal
          proyectoId={proyectoId}
          proyectoNombre={proyectoActual.nombre}
          onClose={() => setShowImportModal(false)}
          onSuccess={handleSuccess}
        />
      )}

      {showDeleteModal && proyectoActual && (
        <EliminarLotesMasivoModal
          proyectoId={proyectoId}
          proyectoNombre={proyectoActual.nombre}
          lotes={lotes}
          onClose={() => setShowDeleteModal(false)}
          onSuccess={handleSuccess}
        />
      )}
    </>
  );
}
