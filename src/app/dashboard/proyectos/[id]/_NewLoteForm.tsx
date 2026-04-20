"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import LoteWizard from "@/components/LoteWizard";
import ImportarLotesModal from "@/components/ImportarLotesModal";
import EliminarLotesMasivoModal from "@/components/EliminarLotesMasivoModal";
import { usePermissions, PERMISOS } from "@/lib/permissions";
import { Trash2, UploadCloud, Plus } from "lucide-react";

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
  const { esAdminOCoordinador, tienePermiso } = usePermissions();
  const puedeGestionarLotes =
    esAdminOCoordinador() || tienePermiso(PERMISOS.LOTES.CREAR);

  // Encontrar el proyecto actual
  const proyectoActual = proyectos.find(p => p.id === proyectoId);

  const handleSuccess = () => {
    setShowImportModal(false);
    setShowDeleteModal(false);
    router.refresh();
  };

  return (
    puedeGestionarLotes && (
    <>
      <div className="flex flex-col gap-2 mb-4 sm:flex-row sm:flex-wrap sm:items-stretch sm:justify-end">
        {lotes.length > 0 && (
          <button
            onClick={() => setShowDeleteModal(true)}
            className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            <Trash2 className="w-4 h-4" />
            <span>Eliminar Masivamente</span>
          </button>
        )}
        <button
          onClick={() => setShowImportModal(true)}
          className="crm-button-secondary px-5 py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 w-full sm:w-auto"
        >
          <UploadCloud className="w-4 h-4" />
          <span>Importar Masivamente</span>
        </button>
        <button
          onClick={() => setShowWizard(true)}
          className="crm-button-primary px-5 py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" />
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
    )
  );
}
