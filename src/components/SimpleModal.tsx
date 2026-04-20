"use client";

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface SimpleModalProps {
  isOpen: boolean;
  onClose: () => void;
  cliente: {
    nombre: string;
    email: string | null;
  } | null;
}

export default function SimpleModal({ isOpen, onClose, cliente }: SimpleModalProps) {
  const [_isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !cliente) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in duration-150">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      {/* Modal — bottom sheet en mobile */}
      <div role="dialog" aria-modal="true" aria-labelledby="simple-modal-title" className="relative bg-white dark:bg-slate-800 rounded-t-lg sm:rounded-lg p-5 sm:p-6 w-full sm:max-w-md pb-[max(env(safe-area-inset-bottom),1.25rem)] sm:pb-6 animate-in slide-in-from-bottom-4 sm:zoom-in-95 sm:slide-in-from-bottom-0 duration-200">
        <div className="sm:hidden flex justify-center -mt-1 mb-3">
          <span className="h-1 w-10 rounded-full bg-crm-border" aria-hidden />
        </div>
        <div className="flex justify-between items-center mb-4">
          <h2 id="simple-modal-title" className="text-xl font-bold">Detalles del Cliente</h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div>
          <p><strong>Nombre:</strong> {cliente.nombre}</p>
          <p><strong>Email:</strong> {cliente.email || 'No especificado'}</p>
        </div>
        
        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
