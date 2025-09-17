"use client";

import { useEffect, useState } from 'react';

interface SimpleModalProps {
  isOpen: boolean;
  onClose: () => void;
  cliente: {
    nombre: string;
    email: string | null;
  } | null;
}

export default function SimpleModal({ isOpen, onClose, cliente }: SimpleModalProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    console.log('SimpleModal isOpen changed:', isOpen);
    if (isOpen) {
      setIsVisible(true);
    } else {
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  console.log('SimpleModal render - isOpen:', isOpen, 'cliente:', cliente?.nombre);

  if (!isOpen || !cliente) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Detalles del Cliente</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
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
