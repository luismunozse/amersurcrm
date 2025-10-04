"use client";

import { useState } from "react";
import ClienteForm from "@/components/ClienteForm";
import ImportarClientes from "@/components/ImportarClientes";

export default function NewClienteForm() {
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);

  if (!showForm && !showImport) {
    return (
      <div className="crm-card p-4 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-crm-primary rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
              </svg>
            </div>
            <h2 className="text-base md:text-lg font-semibold text-crm-text-primary">Gestión de Clientes</h2>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            <button
              onClick={() => setShowImport(true)}
              className="px-4 py-2 text-sm font-medium text-crm-primary bg-crm-primary/10 hover:bg-crm-primary/20 rounded-lg transition-colors flex items-center justify-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"/>
              </svg>
              <span className="whitespace-nowrap">Importar Masivamente</span>
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="crm-button-primary px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap"
            >
              Agregar Nuevo Cliente
            </button>
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

  return (
    <ClienteForm
      onSuccess={() => setShowForm(false)}
      onCancel={() => setShowForm(false)}
    />
  );
}
