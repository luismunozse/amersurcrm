"use client";

import { useState } from "react";

interface DeleteUserModalProps {
  open: boolean;
  onClose: () => void;
  user: {
    id: string;
    username?: string;
    nombre_completo?: string;
  } | null;
  onConfirm: (userId: string) => Promise<{ success: boolean; error?: string; message?: string }>;
}

export default function DeleteUserModal({ open, onClose, user, onConfirm }: DeleteUserModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  if (!open || !user) return null;

  const expectedConfirmText = "ELIMINAR";
  const isConfirmValid = confirmText === expectedConfirmText;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isConfirmValid) return;

    setIsLoading(true);
    try {
      const result = await onConfirm(user.id);
      if (result.success) {
        onClose();
        setConfirmText("");
      } else {
        // El error se maneja en el componente padre
        console.error('Error eliminando usuario:', result.error);
      }
    } catch (error) {
      console.error('Error eliminando usuario:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
      setConfirmText("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50" onClick={handleClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-crm-card border border-crm-border rounded-xl shadow-crm-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-crm-border">
          <h3 className="text-lg font-semibold text-red-600 dark:text-red-400">⚠️ Eliminar Usuario</h3>
          <button 
            onClick={handleClose} 
            disabled={isLoading}
            className="text-crm-text-muted hover:text-crm-text-primary disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-400/50 rounded-lg p-4 mb-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400 dark:text-red-300" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-red-800 dark:text-red-200">
                    Esta acción es irreversible
                  </h4>
                  <p className="mt-1 text-sm text-red-700 dark:text-red-100">
                    El usuario será eliminado permanentemente del sistema.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg p-4">
              <h4 className="font-medium text-crm-text-primary mb-2">Usuario a eliminar:</h4>
              <div className="space-y-1">
                <p className="text-sm text-crm-text-secondary">
                  <span className="font-medium">Nombre:</span> {user.nombre_completo || 'Sin nombre'}
                </p>
                <p className="text-sm text-crm-text-secondary">
                  <span className="font-medium">Username:</span> @{user.username || 'Sin username'}
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-crm-text-primary mb-2">
                Para confirmar, escribe <span className="font-mono bg-gray-100 dark:bg-white/10 text-crm-text-primary dark:text-white px-2 py-1 rounded">ELIMINAR</span>:
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary placeholder-crm-text-muted focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="ELIMINAR"
                disabled={isLoading}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button 
                type="button" 
                onClick={handleClose} 
                disabled={isLoading}
                className="px-4 py-2 text-crm-text-muted hover:text-crm-text-primary border border-crm-border rounded-lg transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                disabled={!isConfirmValid || isLoading}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    Eliminando...
                  </div>
                ) : (
                  'Eliminar Usuario'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
