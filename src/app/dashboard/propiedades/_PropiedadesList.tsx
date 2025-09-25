"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cambiarEstadoPropiedad, eliminarPropiedad } from "./_actions";
import { actualizarLote } from "../proyectos/[id]/_actions";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/errors";

type Propiedad = {
  id: string;
  codigo: string;
  tipo: string;
  identificacion_interna: string;
  ubicacion: {
    ciudad?: string;
    direccion?: string;
  } | null;
  superficie: {
    total?: number;
    construida?: number;
  } | null;
  estado_comercial: string;
  precio: number | null;
  moneda: string;
  marketing: {
    fotos?: string[];
    renders?: string[];
    links3D?: string[];
    etiquetas?: string[];
  } | null;
  data: Record<string, unknown> | null;
  created_at: string;
  proyecto_id: string | null;
  proyecto: {
    id: string;
    nombre: string;
    ubicacion: string | null;
    estado: string;
  } | null;
  es_lote?: boolean;
};

export default function PropiedadesList({ propiedades }: { propiedades: Propiedad[] }) {
  const [filtros, setFiltros] = useState({
    busqueda: "",
    tipo: "",
    estado: "",
    proyecto: ""
  });
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Filtrar propiedades
  const propiedadesFiltradas = propiedades.filter(propiedad => {
    const matchBusqueda = !filtros.busqueda || 
      propiedad.codigo.toLowerCase().includes(filtros.busqueda.toLowerCase()) ||
      propiedad.identificacion_interna.toLowerCase().includes(filtros.busqueda.toLowerCase());
    
    const matchTipo = !filtros.tipo || propiedad.tipo === filtros.tipo;
    const matchEstado = !filtros.estado || propiedad.estado_comercial === filtros.estado;
    
    // Manejar filtro de proyecto (incluyendo independientes)
    let matchProyecto = true;
    if (filtros.proyecto) {
      if (filtros.proyecto === "independientes") {
        matchProyecto = !propiedad.proyecto_id; // Propiedades sin proyecto
      } else {
        matchProyecto = propiedad.proyecto?.id === filtros.proyecto;
      }
    }

    return matchBusqueda && matchTipo && matchEstado && matchProyecto;
  });

  const handleCambiarEstado = (propiedad: Propiedad, nuevoEstado: 'disponible' | 'reservado' | 'vendido' | 'bloqueado') => {
    startTransition(async () => {
      try {
        if (propiedad.es_lote) {
          // Para lotes, usar actualizarLote
          const formData = new FormData();
          formData.append("estado", nuevoEstado);
          formData.append("proyecto_id", propiedad.proyecto_id || "");
          await actualizarLote(propiedad.id, formData);
        } else {
          // Para propiedades, usar cambiarEstadoPropiedad
          await cambiarEstadoPropiedad(propiedad.id, nuevoEstado);
        }
        toast.success(`Estado actualizado a ${getEstadoText(nuevoEstado).toLowerCase()}`);
        router.refresh();
      } catch (err: unknown) {
        toast.error(getErrorMessage(err) || "No se pudo cambiar el estado");
      }
    });
  };

  const handleEliminar = (propiedad: Propiedad) => {
    const tipoTexto = propiedad.es_lote ? "lote" : "propiedad";
    if (confirm(`¿Estás seguro de que deseas eliminar este ${tipoTexto}? Esta acción no se puede deshacer.`)) {
      startTransition(async () => {
        try {
          if (propiedad.es_lote) {
            // Para lotes, mostrar mensaje de que no se pueden eliminar desde aquí
            toast.error("Los lotes deben eliminarse desde la sección de proyectos");
          } else {
            // Para propiedades, usar eliminarPropiedad
            await eliminarPropiedad(propiedad.id);
            toast.success("Propiedad eliminada exitosamente");
            router.refresh();
          }
        } catch (err: unknown) {
          toast.error(getErrorMessage(err) || `No se pudo eliminar la ${tipoTexto}`);
        }
      });
    }
  };

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
      case 'disponible': return 'bg-green-100 text-green-700';
      case 'reservado': return 'bg-yellow-100 text-yellow-700';
      case 'vendido': return 'bg-red-100 text-red-700';
      case 'bloqueado': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
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

  const formatPrecio = (precio: number | null, moneda: string) => {
    if (!precio) return "Precio a consultar";
    
    const formatter = new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: moneda,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
    
    return formatter.format(precio);
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
            Comienza agregando tu primera propiedad usando el botón "Nueva Propiedad".
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-crm-border bg-crm-card-hover">
                <th className="text-left py-4 px-4 text-sm font-semibold text-crm-text-primary uppercase tracking-wide">Propiedad</th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-crm-text-primary uppercase tracking-wide">Proyecto</th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-crm-text-primary uppercase tracking-wide">Ubicación</th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-crm-text-primary uppercase tracking-wide">Superficie</th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-crm-text-primary uppercase tracking-wide">Precio</th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-crm-text-primary uppercase tracking-wide">Estado</th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-crm-text-primary uppercase tracking-wide">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {propiedadesFiltradas.map((propiedad) => (
                <tr key={propiedad.id} className="border-b border-crm-border hover:bg-crm-card-hover transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl">{getTipoIcon(propiedad.tipo)}</div>
                      <div>
                        <div className="font-medium text-crm-text-primary">{propiedad.identificacion_interna}</div>
                        <div className="text-sm text-crm-text-muted font-mono">{propiedad.codigo}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-2">
                      {!propiedad.proyecto_id ? (
                        <div className="flex items-center space-x-1">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-crm-primary text-white">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            Independiente
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1">
                          <svg className="w-3 h-3 text-crm-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                          <span className="text-sm font-medium text-crm-text-primary">
                            {propiedad.proyecto.nombre}
                          </span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm text-crm-text-primary">
                      {propiedad.ubicacion?.ciudad || 'No especificada'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm text-crm-text-primary">
                      {propiedad.superficie?.total ? `${propiedad.superficie.total} m²` : 'N/A'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm font-medium text-crm-text-primary">
                      {formatPrecio(propiedad.precio, propiedad.moneda)}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="relative">
                      <select
                        value={propiedad.estado_comercial}
                        onChange={(e) => handleCambiarEstado(propiedad, e.target.value as 'disponible' | 'reservado' | 'vendido' | 'bloqueado')}
                        className={`text-xs px-3 py-1.5 rounded-full font-medium border-0 cursor-pointer appearance-none pr-8 ${
                          propiedad.estado_comercial === 'disponible' ? 'bg-green-100 text-green-700 hover:bg-green-200' :
                          propiedad.estado_comercial === 'reservado' ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' :
                          propiedad.estado_comercial === 'vendido' ? 'bg-red-100 text-red-700 hover:bg-red-200' :
                          'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        } transition-colors`}
                      >
                        <option value="disponible">Disponible</option>
                        <option value="reservado">Reservado</option>
                        <option value="vendido">Vendido</option>
                        <option value="bloqueado">Bloqueado</option>
                      </select>
                      <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => router.push(`/dashboard/propiedades/${propiedad.id}`)}
                        className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium text-crm-primary bg-crm-primary/10 hover:bg-crm-primary/20 rounded-lg transition-colors"
                      >
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Ver
                      </button>
                      <button
                        onClick={() => router.push(`/dashboard/propiedades/${propiedad.id}/editar`)}
                        className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium text-crm-primary bg-crm-primary/10 hover:bg-crm-primary/20 rounded-lg transition-colors"
                      >
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Editar
                      </button>
                      <button
                        onClick={() => handleEliminar(propiedad)}
                        className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium text-crm-danger bg-crm-danger/10 hover:bg-crm-danger/20 rounded-lg transition-colors"
                      >
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
