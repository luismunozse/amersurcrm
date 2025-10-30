/**
 * Página de Detalle de Proyecto con Exportación de Lotes Filtrados
 *
 * Este archivo muestra cómo integrar el botón de exportación
 * con la búsqueda y filtros avanzados de lotes.
 *
 * CARACTERÍSTICAS:
 * - Exporta solo los lotes visibles según filtros
 * - Respeta búsqueda multi-campo (código, manzana, etapa)
 * - Respeta filtros de rangos (precio, área)
 * - Múltiples formatos de exportación
 * - Incluye información del proyecto en la exportación
 */

import { createServerOnlyClient } from "@/lib/supabase.server";
import { notFound } from 'next/navigation';
import LotesSearchBarRealtime from './_LotesSearchBarRealtime';
import ExportButton from '@/components/export/ExportButton';
import { LoteExportFilters } from '@/lib/export/filteredExport';
import Link from 'next/link';
import { ArrowLeft, MapPin, Calendar } from 'lucide-react';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    q?: string;
    estado?: string;
    sort?: string;
    precio_min?: string;
    precio_max?: string;
    area_min?: string;
    area_max?: string;
  }>;
}

export default async function ProyectoDetailPageConExport({ params, searchParams }: PageProps) {
  const { id } = await params;
  const search = await searchParams;

  // Extraer parámetros de búsqueda
  const q = search.q?.trim() || '';
  const estado = search.estado?.trim() || '';
  const sort = search.sort || 'codigo-asc';
  const precioMin = parseFloat(search.precio_min || '0');
  const precioMax = parseFloat(search.precio_max || '0');
  const areaMin = parseFloat(search.area_min || '0');
  const areaMax = parseFloat(search.area_max || '0');

  const [sortField, sortOrder] = sort.split('-');

  const supabase = await createServerOnlyClient();

  // Obtener el proyecto
  const { data: proyecto, error: proyectoError } = await supabase
    .from('proyecto')
    .select('*')
    .eq('id', id)
    .single();

  if (proyectoError || !proyecto) {
    notFound();
  }

  // Construir query para lotes
  let lotesQuery = supabase
    .from('lote')
    .select('*')
    .eq('proyecto_id', id);

  // Aplicar búsqueda multi-campo
  if (q) {
    // Búsqueda en código, manzana y etapa
    lotesQuery = lotesQuery.or(
      `codigo.ilike.%${q}%,numero_lote.ilike.%${q}%,data->>manzana.ilike.%${q}%,data->>etapa.ilike.%${q}%`
    );
  }

  // Filtrar por estado
  if (estado) {
    lotesQuery = lotesQuery.eq('estado', estado);
  }

  // Filtros de rango de precio
  if (precioMin > 0) {
    lotesQuery = lotesQuery.gte('precio', precioMin);
  }
  if (precioMax > 0) {
    lotesQuery = lotesQuery.lte('precio', precioMax);
  }

  // Filtros de rango de área
  if (areaMin > 0) {
    lotesQuery = lotesQuery.gte('sup_m2', areaMin);
  }
  if (areaMax > 0) {
    lotesQuery = lotesQuery.lte('sup_m2', areaMax);
  }

  // Aplicar ordenamiento
  lotesQuery = lotesQuery.order(sortField, {
    ascending: sortOrder === 'asc',
  });

  // Ejecutar query
  const { data: lotes, error: lotesError } = await lotesQuery;

  if (lotesError) {
    console.error('Error fetching lotes:', lotesError);
  }

  const lotesList = lotes || [];

  // Transformar lotes para incluir campos del objeto data
  const lotesTransformados = lotesList.map((lote) => ({
    ...lote,
    manzana: lote.data?.manzana || null,
    etapa: lote.data?.etapa || null,
  }));

  // Obtener total de lotes (sin filtros)
  const { count: totalLotes } = await supabase
    .from('lote')
    .select('*', { count: 'exact', head: true })
    .eq('proyecto_id', id);

  // Preparar filtros para la exportación
  const exportFilters: LoteExportFilters = {
    q: q || undefined,
    estado: estado || undefined,
    sort: sort !== 'codigo-asc' ? sort : undefined,
    precio_min: precioMin > 0 ? String(precioMin) : undefined,
    precio_max: precioMax > 0 ? String(precioMax) : undefined,
    area_min: areaMin > 0 ? String(areaMin) : undefined,
    area_max: areaMax > 0 ? String(areaMax) : undefined,
  };

  const hasFilters = q || estado || precioMin > 0 || precioMax > 0 || areaMin > 0 || areaMax > 0;

  return (
    <div className="space-y-6 p-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link
          href="/dashboard/proyectos"
          className="text-gray-600 hover:text-gray-900 flex items-center gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
          Proyectos
        </Link>
        <span className="text-gray-400">/</span>
        <span className="text-gray-900 font-medium">{proyecto.nombre}</span>
      </div>

      {/* Header del proyecto */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">{proyecto.nombre}</h1>
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                  proyecto.estado === 'activo'
                    ? 'bg-green-100 text-green-800'
                    : proyecto.estado === 'en_construccion'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                }`}
              >
                {proyecto.estado?.replace('_', ' ')}
              </span>
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
              {proyecto.ubicacion && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  <span>{proyecto.ubicacion}</span>
                </div>
              )}
              {proyecto.fecha_inicio && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  <span>{new Date(proyecto.fecha_inicio).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>

          <Link
            href={`/dashboard/proyectos/${id}/nuevo-lote`}
            className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            + Nuevo Lote
          </Link>
        </div>
      </div>

      {/* Barra de búsqueda y exportación */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Barra de búsqueda (toma el espacio principal) */}
        <div className="flex-1">
          <LotesSearchBarRealtime
            proyectoId={id}
            totalLotes={totalLotes || 0}
            lotesCount={lotesList.length}
          />
        </div>

        {/* Botón de exportación */}
        <div className="flex items-start">
          <ExportButton
            type="lotes"
            data={lotesTransformados}
            filters={exportFilters}
            fileName={`lotes-${proyecto.nombre.toLowerCase().replace(/\s+/g, '-')}${estado ? `-${estado}` : ''}`}
            label="Exportar Lotes"
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
              Filtros activos: Mostrando {lotesList.length} de {totalLotes || 0} lotes
            </span>
          </div>
          <Link
            href={`/dashboard/proyectos/${id}`}
            className="text-sm text-blue-700 hover:text-blue-800 underline"
          >
            Limpiar filtros
          </Link>
        </div>
      )}

      {/* Tabla de lotes */}
      {lotesList.length > 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Código
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Manzana
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Etapa
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Área (m²)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Precio
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {lotesList.map((lote) => (
                  <tr key={lote.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {lote.codigo}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {lote.data?.manzana || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {lote.data?.etapa || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {lote.sup_m2 ? `${lote.sup_m2.toFixed(2)} m²` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                      {lote.precio ? `$${lote.precio.toLocaleString()}` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          lote.estado === 'disponible'
                            ? 'bg-green-100 text-green-800'
                            : lote.estado === 'reservado'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {lote.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <Link
                        href={`/dashboard/proyectos/${id}/lotes/${lote.id}`}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Ver detalles
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        // Estado vacío
        <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
              <svg
                className="h-8 w-8 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>

            {hasFilters ? (
              <>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    No se encontraron lotes
                  </h3>
                  <p className="text-gray-600">
                    No hay lotes que coincidan con los filtros seleccionados
                    {q && ` para "${q}"`}.
                  </p>
                </div>
                <Link
                  href={`/dashboard/proyectos/${id}`}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Ver todos los lotes
                </Link>
              </>
            ) : (
              <>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    No hay lotes aún
                  </h3>
                  <p className="text-gray-600">
                    Comienza agregando lotes a este proyecto.
                  </p>
                </div>
                <Link
                  href={`/dashboard/proyectos/${id}/nuevo-lote`}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Agregar primer lote
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
