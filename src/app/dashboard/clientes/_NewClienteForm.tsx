"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ClienteForm from "@/components/ClienteForm";
import ImportarClientes from "@/components/ImportarClientes";
import { ProtectedAction } from "@/components/permissions";
import { PERMISOS } from "@/lib/permissions";
import { Plus, UploadCloud } from "lucide-react";

export default function NewClienteForm() {
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [slideOpen, setSlideOpen] = useState(false);
  const closeTimer = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(max-width: 1023px)");
    const handleChange = () => setIsMobile(media.matches);

    handleChange();
    media.addEventListener("change", handleChange);

    return () => {
      media.removeEventListener("change", handleChange);
    };
  }, []);

  useEffect(() => {
    if (!isMobile || !showForm) {
      setSlideOpen(false);
      return;
    }

    let frame = 0;
    frame = window.requestAnimationFrame(() => setSlideOpen(true));
    return () => window.cancelAnimationFrame(frame);
  }, [isMobile, showForm]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (isMobile && showForm) {
      const previous = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = previous;
      };
    }
    return;
  }, [isMobile, showForm]);

  useEffect(() => {
    return () => {
      if (closeTimer.current !== null) {
        window.clearTimeout(closeTimer.current);
      }
    };
  }, []);

  const router = useRouter();

  const handleOpenForm = () => {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setShowForm(true);
  };

  const handleSuccess = () => {
    router.refresh();
    closeForm();
  };

  const closeForm = () => {
    if (isMobile) {
      setSlideOpen(false);
      closeTimer.current = window.setTimeout(() => {
        setShowForm(false);
        closeTimer.current = null;
      }, 250);
    } else {
      setShowForm(false);
      if (closeTimer.current !== null) {
        window.clearTimeout(closeTimer.current);
        closeTimer.current = null;
      }
    }
  };

  if (!showForm && !showImport) {
    return (
      <div className="crm-card p-4 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-crm-primary rounded-lg flex items-center justify-center flex-shrink-0">
              <Plus className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-base md:text-lg font-semibold text-crm-text-primary">Gestión de Clientes</h2>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            <ProtectedAction permiso={PERMISOS.CLIENTES.IMPORTAR_MASIVO}>
              <button
                onClick={() => setShowImport(true)}
                className="px-4 py-2 text-sm font-medium text-crm-primary bg-crm-primary/10 hover:bg-crm-primary/20 rounded-lg transition-colors flex items-center justify-center space-x-2"
              >
                <UploadCloud className="w-4 h-4" />
                <span className="whitespace-nowrap">Importar Masivamente</span>
              </button>
            </ProtectedAction>
            <ProtectedAction permiso={PERMISOS.CLIENTES.CREAR}>
              <button
                onClick={handleOpenForm}
                className="crm-button-primary px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap"
              >
                Agregar Nuevo Cliente
              </button>
            </ProtectedAction>
          </div>
        </div>
      </div>
    );
  }

  if (showImport) {
    return (
      <ImportarClientes
        onClose={() => setShowImport(false)}
      />
    );
  }

  if (showForm && isMobile) {
    return (
      <div className="fixed inset-0 z-50 flex">
        <div
          className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${slideOpen ? "opacity-100" : "opacity-0"}`}
          onClick={closeForm}
          aria-hidden="true"
        />
        <div
          className={`relative ml-auto flex h-full w-full max-w-lg transform transition-transform duration-300 ease-drawer ${slideOpen ? "translate-x-0" : "translate-x-full"}`}
          role="dialog"
          aria-modal="true"
        >
          <div className="flex-1 overflow-hidden bg-white dark:bg-crm-card shadow-2xl rounded-l-3xl">
            <ClienteForm
              onSuccess={handleSuccess}
              onCancel={closeForm}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <ClienteForm
      onSuccess={handleSuccess}
      onCancel={closeForm}
    />
  );
}
