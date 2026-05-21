// src/app/dashboard/proyectos/page.tsx
import { getCachedProyectosPaginados } from "@/lib/cache.server";
import { createServerOnlyClient } from "@/lib/supabase.server";
import NewProyectoForm from "./_NewProyectoForm";
import ProyectosGrid from "./_ProyectosGrid";
import ProyectosSearchBarRealtime from "./_ProyectosSearchBarRealtime";
import type { ProyectoMediaItem } from "@/types/proyectos";
import { Plus, AlertTriangle } from "lucide-react";

type LoteRow = {
  proyecto_id: string;
  estado: "disponible" | "reservado" | "vendido";
  precio: number | null;
  moneda: string | null;
};

const USD_PEN_RATE = 3.8;
const toPEN = (precio: number | null, moneda: string | null): number => {
  if (!precio) return 0;
  return moneda === "USD" ? precio * USD_PEN_RATE : precio;
};

const parseGaleria = (value: unknown): ProyectoMediaItem[] => {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is ProyectoMediaItem =>
      !!item &&
      typeof item === "object" &&
      typeof (item as ProyectoMediaItem).url === "string",
  );
};

type SearchParams = {
  page?: string;
  pageSize?: string;
  q?: string;
  estado?: string;
  tipo?: string;
  sort?: string;
};

interface ProyectosPageProps {
  searchParams: Promise<SearchParams>;
}

export default async function ProyectosPage({ searchParams }: ProyectosPageProps) {
  try {
    const sp = (await searchParams) ?? {};

    const pageParam = Number(sp.page);
    const pageRequested = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1;

    const pageSizeParam = Number(sp.pageSize);
    const pageSizeRequested = Number.isFinite(pageSizeParam) && pageSizeParam > 0
      ? Math.floor(pageSizeParam)
      : 12;

    const { data: proyectos, total, page, pageSize } = await getCachedProyectosPaginados({
      page: pageRequested,
      pageSize: pageSizeRequested,
      q: sp.q,
      estado: sp.estado,
      tipo: sp.tipo,
      sort: sp.sort,
    });

    // --- Métricas de lotes SOLO para los proyectos de la página actual ---
    const supabase = await createServerOnlyClient();
    const ids = proyectos.map((p) => p.id);
    const lotesByProyecto: Record<
      string,
      {
        total: number;
        vendidos: number;
        reservados: number;
        disponibles: number;
        ingresosVendidosPEN: number;
        ingresosProyectadosPEN: number;
      }
    > = {};

    if (ids.length > 0) {
      const { data: lotes, error: lotesErr } = await supabase
        .from("lote")
        .select("proyecto_id,estado,precio,moneda")
        .in("proyecto_id", ids);

      if (lotesErr) throw lotesErr;

      (lotes as LoteRow[]).forEach((l) => {
        const acc = (lotesByProyecto[l.proyecto_id] ??= {
          total: 0,
          vendidos: 0,
          reservados: 0,
          disponibles: 0,
          ingresosVendidosPEN: 0,
          ingresosProyectadosPEN: 0,
        });
        acc.total += 1;
        const enPEN = toPEN(l.precio, l.moneda);
        acc.ingresosProyectadosPEN += enPEN;
        if (l.estado === "vendido") {
          acc.vendidos += 1;
          acc.ingresosVendidosPEN += enPEN;
        }
        if (l.estado === "reservado") acc.reservados += 1;
        if (l.estado === "disponible") acc.disponibles += 1;
      });
    }

    const proyectosConStats = proyectos.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      ubicacion: p.ubicacion,
      estado: p.estado,
      tipo: p.tipo ?? null,
      imagen_url: p.imagen_url,
      logo_url: p.logo_url,
      latitud: p.latitud ?? null,
      longitud: p.longitud ?? null,
      descripcion: p.descripcion ?? null,
      galeria_imagenes: parseGaleria((p as { galeria_imagenes?: unknown }).galeria_imagenes),
      stats: lotesByProyecto[p.id] ?? {
        total: 0,
        vendidos: 0,
        reservados: 0,
        disponibles: 0,
        ingresosVendidosPEN: 0,
        ingresosProyectadosPEN: 0,
      },
    }));

    return (
      <div className="w-full p-3 md:p-6 space-y-4 md:space-y-6">
        {/* Header - Compacto en mobile */}
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-crm-text-primary md:text-3xl truncate">
              Proyectos
            </h1>
            <p className="text-xs text-crm-text-secondary md:text-base hidden md:block">
              Revisa tus proyectos y su avance en cualquier dispositivo.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* Badge contador - siempre visible */}
            <div className="crm-card px-3 py-1.5 md:px-4 md:py-2 bg-crm-primary/5 border-crm-primary/20">
              <span className="text-sm md:text-base font-bold text-crm-primary">{total}</span>
              <span className="text-xs text-crm-text-muted ml-1 hidden sm:inline">
                {total === 1 ? "proyecto" : "proyectos"}
              </span>
            </div>
          </div>
        </div>

        {/* Formulario nuevo proyecto - Solo visible si tiene permisos */}
        <div className="hidden lg:block">
          <NewProyectoForm />
        </div>
        <details className="lg:hidden crm-card rounded-xl border border-crm-border overflow-hidden">
          <summary className="flex items-center justify-between px-3 py-2.5 md:px-4 md:py-3 text-sm font-semibold text-crm-text-primary cursor-pointer select-none">
            <span className="flex items-center gap-2">
              <span className="w-6 h-6 bg-gradient-to-br from-crm-primary to-crm-accent rounded-md flex items-center justify-center">
                <Plus className="w-3.5 h-3.5 text-white" />
              </span>
              Nuevo proyecto
            </span>
            <span className="text-crm-text-muted text-xs">▼</span>
          </summary>
          <div className="px-3 pb-3 md:px-4 md:pb-4">
            <NewProyectoForm />
          </div>
        </details>

        {/* Barra de búsqueda + filtros (server-side via URL params) */}
        <ProyectosSearchBarRealtime
          totalProyectos={total}
          resultCount={proyectosConStats.length}
        />

        {/* Grid con paginación */}
        <ProyectosGrid
          data={proyectosConStats}
          total={total}
          page={page}
          pageSize={pageSize}
        />
      </div>
    );
  } catch (error) {
    console.error('Error cargando proyectos:', error);
    return (
      <div className="w-full p-6">
        <div className="crm-card p-6 border-l-4 border-crm-danger">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-crm-danger/20 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-crm-danger" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-crm-text-primary">Error cargando proyectos</h3>
              <p className="text-xs text-crm-text-muted mt-1">
                {error instanceof Error ? error.message : 'Error desconocido al cargar los proyectos'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
