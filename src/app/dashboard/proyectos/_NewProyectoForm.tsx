"use client";
import { useTransition, useState } from "react";
import { crearProyecto } from "./_actions";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import UbicacionSelector from "@/components/UbicacionSelector";

export default function NewProyectoForm() {
  const [pending, start] = useTransition();
  const { isAdmin, loading } = useAdminPermissions();
  const router = useRouter();
  
  // Estado para ubigeo
  const [ubigeoData, setUbigeoData] = useState({
    departamento: "",
    provincia: "",
    distrito: ""
  });

  // Manejar cambios de ubigeo
  const handleUbigeoChange = (departamento: string, provincia: string, distrito: string) => {
    setUbigeoData({ departamento, provincia, distrito });
  };

  // No mostrar el formulario si no es admin
  if (loading) {
    return (
      <div className="crm-card p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-crm-border rounded w-1/4 mb-4"></div>
          <div className="h-10 bg-crm-border rounded"></div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="crm-card p-6 border-l-4 border-crm-warning">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-crm-warning/20 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-crm-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"/>
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-medium text-crm-text-primary">Acceso Restringido</h3>
            <p className="text-xs text-crm-text-muted">Solo los administradores pueden crear proyectos inmobiliarios.</p>
          </div>
        </div>
      </div>
    );
  }

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
      
      <form action={(fd) => start(async () => { 
        try {
          const result = await crearProyecto(fd);
          if (result.success) {
            toast.success("Proyecto creado correctamente");
            router.push(`/dashboard/proyectos/${result.proyecto.id}`);
          }
        } catch (error) {
          console.error("Error creando proyecto:", error);
          toast.error("Error al crear el proyecto");
        }
      })}
            className="space-y-6">
        
        {/* Primera fila: Nombre y Estado */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-crm-text-primary">Nombre del Proyecto *</label>
            <input 
              name="nombre" 
              required 
              className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary disabled:opacity-50" 
              disabled={pending}
              placeholder="Ej: Residencial Los Pinos"
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
        </div>

        {/* Ubicación con Ubigeo */}
        <div className="space-y-4">
          <div className="w-full">
            <label className="block text-sm font-medium text-crm-text-primary mb-2">
              Ubicación (Ubigeo) *
            </label>
            <UbicacionSelector
              departamento={ubigeoData.departamento}
              provincia={ubigeoData.provincia}
              distrito={ubigeoData.distrito}
              onUbigeoChange={handleUbigeoChange}
              className="w-full"
            />
          </div>
          
          {/* Campos ocultos para enviar datos de ubigeo */}
          <input type="hidden" name="departamento" value={ubigeoData.departamento} />
          <input type="hidden" name="provincia" value={ubigeoData.provincia} />
          <input type="hidden" name="distrito" value={ubigeoData.distrito} />
        </div>

        {/* Imagen del Proyecto */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-crm-text-primary">Imagen del Proyecto</label>
          <div className="relative">
            <input 
              type="file"
              name="imagen"
              accept="image/*"
              className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary disabled:opacity-50 file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-crm-primary/10 file:text-crm-primary hover:file:bg-crm-primary/20" 
              disabled={pending}
            />
            <p className="text-xs text-crm-text-muted mt-1">Formatos: JPG, PNG, WEBP. Máx: 5MB</p>
          </div>
        </div>

        {/* Botón de envío */}
        <div className="flex justify-end">
          <button 
            className="crm-button-primary px-6 py-2 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2" 
            disabled={pending}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
            </svg>
            <span>{pending ? "Creando..." : "Agregar Proyecto"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
