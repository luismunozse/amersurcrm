/**
 * Página de Proyectos con Exportación de Resultados Filtrados
 *
 * Este archivo muestra cómo integrar el botón de exportación
 * con la búsqueda y filtros de proyectos.
 *
 * CARACTERÍSTICAS:
 * - Exporta solo los resultados visibles
 * - Respeta todos los filtros activos
 * - Múltiples formatos (Excel, CSV, PDF)
 * - Incluye metadatos de los filtros aplicados
 */

import { createServerOnlyClient } from "@/lib/supabase.server";
import ProyectosSearchBarRealtime from './_ProyectosSearchBarRealtime';
import ExportButton from '@/components/export/ExportButton';
import { ProyectoExportFilters } from '@/lib/export/filteredExport';
import Link from 'next/link';
import { Building2, MapPin, Calendar, Package } from 'lucide-react';

interface PageProps {
  searchParams: Promise<{
    q?: string;
    estado?: string;
    tipo?: string;
    sort?: string;
  }>;
}

export default async function ProyectosPageConExport({ searchParams }: PageProps) {
  const params = await searchParams;

  // Extraer parámetros de búsqueda
  const q = params.q?.trim() || '';
  const estado = params.estado?.trim() || '';
  const tipo = params.tipo?.trim() || '';
  const sort = params.sort || 'nombre-asc';

  const [sortField, sortOrder] = sort.split('-');

  // Construir query de Supabase
  const supabase = await createServerOnlyClient();
  let proyectosQuery = supabase
    .from('proyecto')
    .select('*');

  // Aplicar filtros de búsqueda
  if (q) {
    proyectosQuery = proyectosQuery.or(`nombre.ilike.%${q}%,ubicacion.ilike.%${q}%`);
  }

  if (estado) {
    proyectosQuery = proyectosQuery.eq('estado', estado);
  }

  if (tipo) {
    proyectosQuery = proyectosQuery.eq('tipo', tipo);
  }

  // Aplicar ordenamiento
  proyectosQuery = proyectosQuery.order(sortField, {
    ascending: sortOrder === 'asc',
  });

  // Ejecutar query
  const { data: proyectos, error } = await proyectosQuery;

  if (error) {
    console.error('Error fetching proyectos:', error);
  }

  const proyectosList = proyectos || [];

  // Obtener total de proyectos (sin filtros) para el contador
  const { count: totalProyectos } = await supabase
    .from('proyecto')
    .select('*', { count: 'exact', head: true });

  // Preparar filtros para la exportación
  const exportFilters: ProyectoExportFilters = {
    q: q || undefined,
    estado: estado || undefined,
    tipo: tipo || undefined,
    sort: sort !== 'nombre-asc' ? sort : undefined,
  };

  const hasFilters = q || estado || tipo;

  return (
    <div className="space-y-6 p-6">
      {/* Header con título y botón de nuevo proyecto */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Proyectos</h1>
          <p className="text-gray-600 mt-1">
            Gestiona todos tus proyectos inmobiliarios
          </p>
        </div>
        <Link
          href="/dashboard/proyectos/nuevo"
          className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          + Nuevo Proyecto
        </Link>
      </div>

      {/* Barra de búsqueda y exportación */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Barra de búsqueda (toma el espacio principal) */}
        <div className="flex-1">
          <ProyectosSearchBarRealtime
            totalProyectos={totalProyectos || 0}
            resultCount={proyectosList.length}
          />
        </div>

        {/* Botón de exportación */}
        <div className="flex items-start">
          <ExportButton
            type="proyectos"
            data={proyectosList}
            filters={exportFilters}
            fileName={`proyectos${estado ? `-${estado}` : ''}${tipo ? `-${tipo}` : ''}`}
            label="Exportar Resultados"
            size="md"
            variant="secondary"
            showFormatOptions={true}
            includeFiltersSheet={true}
          />
        </div>
      </div>

      {/* Mensaje cuando hay filtros activos */}
      {hasFilters && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg
              className="h-5 w-5 text-blue-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-sm text-blue-900 font-medium">
              Filtros activos: Mostrando {proyectosList.length} de {totalProyectos || 0} proyectos
            </span>
          </div>
          <Link
            href="/dashboard/proyectos"
            className="text-sm text-blue-700 hover:text-blue-800 underline"
          >
            Limpiar filtros
          </Link>
        </div>
      )}

      {/* Grid de proyectos */}
      {proyectosList.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {proyectosList.map((proyecto) => (
            <Link
              key={proyecto.id}
              href={`/dashboard/proyectos/${proyecto.id}`}
              className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg hover:border-blue-300 transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                    {proyecto.nombre}
                  </h3>
                  {proyecto.ubicacion && (
                    <div className="flex items-center gap-1.5 text-sm text-gray-600 mt-1">
                      <MapPin className="h-4 w-4" />
                      <span className="line-clamp-1">{proyecto.ubicacion}</span>
                    </div>
                  )}
                </div>
                <div className="flex-shrink-0 ml-3">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                      proyecto.estado === 'activo'
                        ? 'bg-green-100 text-green-800'
                        : proyecto.estado === 'en_construccion'
                          ? 'bg-blue-100 text-blue-800'
                          : proyecto.estado === 'finalizado'
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {proyecto.estado?.replace('_', ' ')}
                  </span>
                </div>
              </div>

              <div className="space-y-2 mt-4">
                {proyecto.tipo && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Building2 className="h-4 w-4" />
                    <span className="capitalize">{proyecto.tipo}</span>
                  </div>
                )}

                {proyecto.total_lotes !== undefined && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Package className="h-4 w-4" />
                    <span>{proyecto.total_lotes} lotes</span>
                  </div>
                )}

                {proyecto.fecha_inicio && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(proyecto.fecha_inicio).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        // Estado vacío
        <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
              <Building2 className="h-8 w-8 text-gray-400" />
            </div>

            {hasFilters ? (
              <>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    No se encontraron proyectos
                  </h3>
                  <p className="text-gray-600">
                    No hay proyectos que coincidan con los filtros seleccionados.
                  </p>
                </div>
                <Link
                  href="/dashboard/proyectos"
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Ver todos los proyectos
                </Link>
              </>
            ) : (
              <>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    No hay proyectos aún
                  </h3>
                  <p className="text-gray-600">
                    Comienza creando tu primer proyecto inmobiliario.
                  </p>
                </div>
                <Link
                  href="/dashboard/proyectos/nuevo"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Crear primer proyecto
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
