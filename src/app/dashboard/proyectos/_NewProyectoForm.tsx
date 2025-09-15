"use client";
import { useTransition } from "react";
import { crearProyecto } from "./_actions";

export default function NewProyectoForm() {
  const [pending, start] = useTransition();
  return (
    <div className="crm-card p-6">
      <div className="flex items-center space-x-2 mb-4">
        <div className="w-8 h-8 bg-crm-success rounded-lg flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-crm-text-primary">Agregar Nuevo Proyecto</h2>
      </div>
      
      <form action={(fd) => start(async () => { await crearProyecto(fd); })}
            className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-crm-text-primary">Nombre *</label>
          <input 
            name="nombre" 
            required 
            className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary disabled:opacity-50" 
            disabled={pending}
            placeholder="Nombre del proyecto"
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-crm-text-primary">Estado</label>
          <select 
            name="estado" 
            className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary disabled:opacity-50" 
            defaultValue="activo"
            disabled={pending}
          >
            <option value="activo">Activo</option>
            <option value="pausado">Pausado</option>
            <option value="cerrado">Cerrado</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-crm-text-primary">Ubicación</label>
          <input 
            name="ubicacion" 
            className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary disabled:opacity-50" 
            disabled={pending}
            placeholder="Ciudad, País"
          />
        </div>
        <button 
          className="crm-button-primary px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed" 
          disabled={pending}
        >
          {pending ? "Creando..." : "Agregar Proyecto"}
        </button>
      </form>
    </div>
  );
}
