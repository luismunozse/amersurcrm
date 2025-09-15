"use client";

import { useState } from "react";
import { signOut } from "@/app/_actionsAuth";
import ConfirmDialog from "./ConfirmDialog";

export default function LogoutButton() {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setShowConfirm(true)}
        className="p-2 text-crm-text-secondary hover:text-crm-danger hover:bg-crm-card-hover rounded-lg transition-colors"
        title="Cerrar sesión"
        aria-label="Cerrar sesión"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
        </svg>
      </button>

      <ConfirmDialog
        open={showConfirm}
        title="Cerrar sesión"
        description="¿Estás seguro de que deseas cerrar sesión?"
        confirmText="Sí, salir"
        cancelText="Cancelar"
        onConfirm={handleLogout}
        onClose={() => setShowConfirm(false)}
      />
    </>
  );
}
