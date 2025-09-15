"use client";

import { useState } from "react";
import PropiedadCard from "@/components/PropiedadCard";

type Propiedad = {
  id: string;
  codigo: string;
  tipo: string;
  identificacion_interna: string;
  ubicacion: any;
  superficie: any;
  estado_comercial: string;
  precio: number | null;
  moneda: string;
  marketing: any;
  data: any;
  created_at: string;
  proyecto: {
    id: string;
    nombre: string;
    ubicacion: string | null;
    estado: string;
  } | null;
};

export default function PropiedadesList({ propiedades }: { propiedades: Propiedad[] }) {
  const [filtros, setFiltros] = useState({
    busqueda: "",
    tipo: "",
    estado: "",
    proyecto: ""
  });

  // Filtrar propiedades
  const propiedadesFiltradas = propiedades.filter(propiedad => {
    const matchBusqueda = !filtros.busqueda || 
      propiedad.codigo.toLowerCase().includes(filtros.busqueda.toLowerCase()) ||
      propiedad.identificacion_interna.toLowerCase().includes(filtros.busqueda.toLowerCase());
    
    const matchTipo = !filtros.tipo || propiedad.tipo === filtros.tipo;
    const matchEstado = !filtros.estado || propiedad.estado_comercial === filtros.estado;
    const matchProyecto = !filtros.proyecto || propiedad.proyecto.id === filtros.proyecto;

    return matchBusqueda && matchTipo && matchEstado && matchProyecto;
  });

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'lote': return '🏗️';
      case 'casa': return '🏠';
      case 'departamento': return '🏢';
      case 'oficina': return '🏢';
      case 'otro': return '📋';
      default: return '🏠';
    }
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case 'lote': return 'Lote';
      case 'casa': return 'Casa';
      case 'departamento': return 'Departamento';
      case 'oficina': return 'Oficina';
      case 'otro': return 'Otro';
      default: return 'Propiedad';
    }
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'disponible': return 'bg-crm-success text-white';
      case 'reservado': return 'bg-crm-warning text-white';
      case 'vendido': return 'bg-crm-danger text-white';
      case 'bloqueado': return 'bg-crm-text-muted text-white';
      default: return 'bg-crm-border text-crm-text-primary';
    }
  };

  const getEstadoText = (estado: string) => {
    switch (estado) {
      case 'disponible': return 'Disponible';
      case 'reservado': return 'Reservado';
      case 'vendido': return 'Vendido';
      case 'bloqueado': return 'Bloqueado';
      default: return estado;
    }
  };

  return (
    <div className="crm-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-crm-text-primary">Propiedades</h3>
          <p className="text-sm text-crm-text-muted mt-1">
            {propiedadesFiltradas.length} de {propiedades.length} propiedades
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-crm-primary/10 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-crm-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
            </svg>
          </div>
        </div>
      </div>

      {propiedadesFiltradas.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-20 h-20 bg-crm-card-hover rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-crm-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
            </svg>
          </div>
          <h4 className="text-xl font-medium text-crm-text-primary mb-3">No hay propiedades registradas</h4>
          <p className="text-crm-text-muted mb-6 max-w-md mx-auto">
            Comienza agregando tu primera propiedad usando el asistente paso a paso de arriba.
          </p>
          <div className="inline-flex items-center space-x-2 px-4 py-2 bg-crm-primary/10 text-crm-primary rounded-lg">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span className="text-sm font-medium">Usa el botón "Nueva Propiedad" para comenzar</span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {propiedadesFiltradas.map((propiedad) => (
            <PropiedadCard key={propiedad.id} propiedad={propiedad} />
          ))}
        </div>
      )}
    </div>
  );
}
