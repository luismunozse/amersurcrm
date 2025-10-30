/**
 * Página principal de Proyectos - VERSIÓN MEJORADA con búsqueda y filtros
 *
 * Para usar esta versión:
 * 1. Renombrar page.tsx a page.old.tsx
 * 2. Renombrar page.mejorado.tsx a page.tsx
 */

import Link from "next/link";
import { createServerOnlyClient } from "@/lib/supabase.server";
import NewProyectoForm from "./_NewProyectoForm";
import QuickActions from "./QuickActions";
import ProyectosSearchBar from "./_ProyectosSearchBar";

import {
  BuildingOffice2Icon,
  MapPinIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";

type LoteRow = {
  proyecto_id: string;
  estado: "disponible" | "reservado" | "vendido";
};

type ProyectoEstado = 'activo' | 'pausado' | 'completado' | 'cancelado';
type ProyectoTipo = 'propio' | 'corretaje';

// Tipos para Next 15: searchParams como Promise
type SPP = Promise<{
  q?: string | string[];
  estado?: string | string[];
  tipo?: string | string[];
  sort?: string | string[];
}>;

export default async function ProyectosPage({
  searchParams,
}: {
  searchParams: SPP;
}) {
  try {
    const sp = await searchParams;

    // Extraer parámetros
    const qRaw = sp.q;
    const estadoRaw = sp.estado;
    const tipoRaw = sp.tipo;
    const sortRaw = sp.sort;

    const q = (Array.isArray(qRaw) ? qRaw[0] : qRaw ?? "").trim();
    const estado = (Array.isArray(estadoRaw) ? estadoRaw[0] : estadoRaw ?? "").trim() as ProyectoEstado | "";
    const tipo = (Array.isArray(tipoRaw) ? tipoRaw[0] : tipoRaw ?? "").trim() as ProyectoTipo | "";
    const sort = (Array.isArray(sortRaw) ? sortRaw[0] : sortRaw ?? "nombre-asc").trim();

    const supabase = await createServerOnlyClient();

    // Construir query de proyectos con filtros
    let proyectosQuery = supabase
      .from("proyecto")
      .select("*");

    // Aplicar filtro de búsqueda (nombre o ubicación)
    if (q) {
      proyectosQuery = proyectosQuery.or(`nombre.ilike.%${q}%,ubicacion.ilike.%${q}%`);
    }

    // Aplicar filtro de estado
    if (estado) {
      proyectosQuery = proyectosQuery.eq('estado', estado);
    }

    // Aplicar filtro de tipo
    if (tipo) {
      proyectosQuery = proyectosQuery.eq('tipo', tipo);
    }

    // Aplicar ordenamiento
    const [sortField, sortOrder] = sort.split('-') as [string, 'asc' | 'desc'];
    proyectosQuery = proyectosQuery.order(sortField, { ascending: sortOrder === 'asc' });

    const { data: proyectos, error: eProyectos } = await proyectosQuery;

    if (eProyectos) throw eProyectos;

    // --- Métricas de lotes por proyecto (1 sola consulta) ---
    const ids = (proyectos || []).map((p) => p.id);
    const lotesByProyecto: Record<
      string,
      { total: number; vendidos: number; disponibles: number }
    > = {};

    if (ids.length > 0) {
      const { data: lotes, error: lotesErr } = await supabase
        .from("lote")
        .select("proyecto_id,estado")
        .in("proyecto_id", ids);

      if (lotesErr) throw lotesErr;

      (lotes as LoteRow[]).forEach((l) => {
        const acc = (lotesByProyecto[l.proyecto_id] ??= {
          total: 0,
          vendidos: 0,
          disponibles: 0,
        });
        acc.total += 1;
        if (l.estado === "vendido") acc.vendidos += 1;
        if (l.estado === "disponible") acc.disponibles += 1;
      });
    }

    const hasFilters = q || estado || tipo;

    return (
      <div className="w-full p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-crm-text-primary">
              Proyectos Inmobiliarios
            </h1>
            <p className="text-crm-text-secondary mt-2">
              Gestiona y supervisa todos tus proyectos inmobiliarios
            </p>
          </div>
          <div className="crm-card px-4 py-2">
            <div className="text-sm text-crm-text-muted">
              <span className="font-semibold text-crm-text-primary">
                {proyectos?.length || 0}
              </span>{" "}
              {hasFilters ? "resultados" : proyectos?.length === 1 ? "proyecto" : "proyectos"}
            </div>
          </div>
        </div>

        {/* Buscador y Filtros */}
        <ProyectosSearchBar totalProyectos={proyectos?.length || 0} />

        {/* Form crear proyecto */}
        <NewProyectoForm />

        {/* Grid de proyectos tipo "cards" */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {/* Mensaje cuando no hay resultados de búsqueda */}
          {proyectos?.length === 0 && hasFilters && (
            <div className="col-span-full crm-card text-center py-16 rounded-2xl border-2 border-dashed border-crm-border">
              <div className="w-20 h-20 bg-gradient-to-br from-crm-accent/10 to-crm-accent/5 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <svg
                  className="w-10 h-10 text-crm-accent"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <h4 className="text-xl font-bold text-crm-text-primary mb-3">
                No se encontraron resultados
              </h4>
              <p className="text-crm-text-secondary max-w-md mx-auto mb-6">
                {q ? (
                  <>
                    No se encontraron proyectos que coincidan con <strong>"{q}"</strong>
                  </>
                ) : (
                  <>No hay proyectos que coincidan con los filtros seleccionados</>
                )}
              </p>
              <Link
                href="/dashboard/proyectos"
                className="inline-flex items-center gap-2 px-6 py-3 bg-crm-primary text-white rounded-lg hover:bg-crm-primary/90 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Limpiar filtros
              </Link>
            </div>
          )}

          {/* Mensaje cuando no hay proyectos en absoluto */}
          {proyectos?.length === 0 && !hasFilters && (
            <div className="col-span-full crm-card text-center py-16 rounded-2xl border-2 border-dashed border-crm-border">
              <div className="w-20 h-20 bg-gradient-to-br from-crm-primary/10 to-crm-primary/5 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <BuildingOffice2Icon className="w-10 h-10 text-crm-primary" />
              </div>
              <h4 className="text-xl font-bold text-crm-text-primary mb-3">
                No hay proyectos registrados
              </h4>
              <p className="text-crm-text-secondary max-w-md mx-auto">
                Comienza creando tu primer proyecto inmobiliario usando el formulario de arriba.
              </p>
            </div>
          )}

          {/* Lista de proyectos */}
          {proyectos?.map((p) => {
            const stats = lotesByProyecto[p.id] ?? {
              total: 0,
              vendidos: 0,
              disponibles: 0,
            };
            const vendidoPct =
              stats.total > 0 ? Math.round((stats.vendidos / stats.total) * 100) : 0;

            return (
              <div
                key={p.id}
                className="crm-card rounded-2xl overflow-hidden hover:shadow-crm-xl transition-all duration-300 group relative flex flex-col"
                data-tour="project-card"
              >
                {/* Imagen del proyecto con overlay */}
                <div className="relative w-full h-56 overflow-hidden bg-gradient-to-br from-crm-primary/15 to-crm-primary/8">
                  {p.imagen_url ? (
                    <img
                      src={p.imagen_url}
                      alt={p.nombre}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="h-full w-full grid place-items-center">
                      <BuildingOffice2Icon className="h-20 w-20 text-crm-primary/40" />
                    </div>
                  )}

                  {/* Badges - Estado y Tipo */}
                  <div className="absolute top-4 right-4 flex flex-col gap-2 items-end">
                    <span
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg backdrop-blur-sm border ${
                        p.estado === "activo"
                          ? "bg-green-500/90 text-white border-green-400"
                          : p.estado === "pausado"
                          ? "bg-yellow-500/90 text-white border-yellow-400"
                          : "bg-red-500/90 text-white border-red-400"
                      }`}
                    >
                      {p.estado === "activo"
                        ? "● Activo"
                        : p.estado === "pausado"
                        ? "● Pausado"
                        : "● Cerrado"}
                    </span>
                    {p.tipo && (
                      <span
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg backdrop-blur-sm border ${
                          p.tipo === "propio"
                            ? "bg-blue-500/90 text-white border-blue-400"
                            : "bg-purple-500/90 text-white border-purple-400"
                        }`}
                      >
                        {p.tipo === "propio" ? "📋 Propio" : "🤝 Corretaje"}
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-5 space-y-4 flex-1 flex flex-col">
                  {/* Título y ubicación */}
                  <div className="space-y-2">
                    <h3 className="font-bold text-xl text-crm-text-primary line-clamp-2 group-hover:text-crm-primary transition-colors">
                      {p.nombre}
                    </h3>
                    {p.ubicacion && (
                      <div className="flex items-center gap-2 text-sm text-crm-text-secondary">
                        <MapPinIcon className="h-4 w-4 text-crm-accent flex-shrink-0" />
                        <span className="line-clamp-1">{p.ubicacion}</span>
                      </div>
                    )}
                  </div>

                  {/* Estadísticas en grid */}
                  <div className="grid grid-cols-3 gap-3 py-4 border-y border-crm-border" data-tour="project-stats">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-crm-text-primary">{stats.total}</p>
                      <p className="text-xs text-crm-text-muted font-medium mt-1">Total Lotes</p>
                    </div>
                    <div className="text-center border-x border-crm-border">
                      <p className="text-2xl font-bold text-crm-primary">{stats.vendidos}</p>
                      <p className="text-xs text-crm-text-muted font-medium mt-1">Vendidos</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-crm-accent">{stats.disponibles}</p>
                      <p className="text-xs text-crm-text-muted font-medium mt-1">Disponibles</p>
                    </div>
                  </div>

                  {/* Barra de progreso de ventas */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-crm-text-muted font-medium">Progreso de ventas</span>
                      <span className="text-crm-primary font-bold">{vendidoPct}%</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-crm-border/30 overflow-hidden">
                      <div
                        className="h-2.5 rounded-full bg-gradient-to-r from-crm-primary to-crm-accent transition-all duration-500"
                        style={{ width: `${vendidoPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Acciones - Flex-1 para empujar al final */}
                  <div className="mt-auto space-y-2 pt-2">
                    <QuickActions
                      id={p.id}
                      nombre={p.nombre}
                      ubicacion={p.ubicacion || undefined}
                      lotesCount={stats.total}
                      proyecto={{
                        id: p.id,
                        nombre: p.nombre,
                        estado: p.estado,
                        ubicacion: p.ubicacion,
                        descripcion: p.descripcion,
                        imagen_url: p.imagen_url,
                      }}
                    />
                    <Link
                      className="w-full crm-button-primary inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold group-hover:shadow-lg transition-all duration-300"
                      href={`/dashboard/proyectos/${p.id}`}
                    >
                      Ver Proyecto
                      <ArrowRightIcon className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error cargando proyectos:", error);
    return (
      <div className="w-full p-6">
        <div className="crm-card p-6 border-l-4 border-crm-danger">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-crm-danger/20 rounded-lg flex items-center justify-center">
              <svg
                className="w-4 h-4 text-crm-danger"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-crm-text-primary">
                Error cargando proyectos
              </h3>
              <p className="text-xs text-crm-text-muted mt-1">
                {error instanceof Error ? error.message : "Error desconocido al cargar los proyectos"}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
