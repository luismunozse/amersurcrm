"use client";

import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { Spinner } from '@/components/ui/Spinner';

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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center animate-in fade-in duration-150">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50" onClick={handleClose} />

      {/* Modal — bottom sheet en mobile */}
      <div className="relative w-full sm:max-w-md sm:mx-4 bg-crm-card border-t sm:border border-crm-border rounded-t-xl sm:rounded-xl shadow-crm-lg pb-[env(safe-area-inset-bottom)] sm:pb-0 animate-in slide-in-from-bottom-4 sm:zoom-in-95 sm:slide-in-from-bottom-0 duration-200">
        <div className="sm:hidden flex justify-center pt-2.5 pb-1 shrink-0">
          <span className="h-1 w-10 rounded-full bg-crm-border" aria-hidden />
        </div>
        <div className="flex items-center justify-between px-6 py-4 border-b border-crm-border">
          <h3 className="text-lg font-semibold text-red-600 dark:text-red-400">⚠️ Eliminar Usuario</h3>
          <button
            onClick={handleClose}
            disabled={isLoading}
            aria-label="Cerrar"
            className="text-crm-text-muted hover:text-crm-text-primary disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-400/50 rounded-lg p-4 mb-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-5 w-5 text-red-400 dark:text-red-300" />
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
                    <Spinner size="sm" color="white" />
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
