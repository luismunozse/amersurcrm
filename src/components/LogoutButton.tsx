"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
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
        <LogOut className="h-5 w-5" aria-hidden="true" />
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
