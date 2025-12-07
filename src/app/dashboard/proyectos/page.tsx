// src/app/dashboard/proyectos/page.tsx
import { getCachedProyectos } from "@/lib/cache.server";
import { createServerOnlyClient } from "@/lib/supabase.server";
import NewProyectoForm from "./_NewProyectoForm";
import ProyectosGrid from "./_ProyectosGrid";
import ExportButton from "@/components/export/ExportButton";
import type { ProyectoMediaItem } from "@/types/proyectos";

type LoteRow = {
  proyecto_id: string;
  estado: "disponible" | "reservado" | "vendido";
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

export default async function ProyectosPage() {
  try {
    // Obtener todos los proyectos (sin filtros del servidor - el filtrado es en cliente)
    const proyectos = await getCachedProyectos();
    const totalProyectos = proyectos.length;

    // Ordenar por nombre por defecto
    proyectos.sort((a, b) => a.nombre.localeCompare(b.nombre));

    // --- Métricas de lotes por proyecto (1 sola consulta) ---
    const supabase = await createServerOnlyClient();
    const ids = proyectos.map((p) => p.id);
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

    // Preparar datos para el componente cliente
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
      stats: lotesByProyecto[p.id] ?? { total: 0, vendidos: 0, disponibles: 0 },
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
              <span className="text-sm md:text-base font-bold text-crm-primary">{totalProyectos}</span>
              <span className="text-xs text-crm-text-muted ml-1 hidden sm:inline">
                {totalProyectos === 1 ? "proyecto" : "proyectos"}
              </span>
            </div>
            {/* Export solo en desktop */}
            <div className="hidden md:block">
              <ExportButton
                type="proyectos"
                data={proyectos}
                filters={{}}
                fileName="proyectos"
                label="Exportar"
                size="sm"
              />
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
                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                </svg>
              </span>
              Nuevo proyecto
            </span>
            <span className="text-crm-text-muted text-xs">▼</span>
          </summary>
          <div className="px-3 pb-3 md:px-4 md:pb-4">
            <NewProyectoForm />
          </div>
        </details>

        {/* Grid con búsqueda en vivo */}
        <ProyectosGrid 
          proyectos={proyectosConStats} 
          totalProyectos={totalProyectos} 
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
              <svg className="w-4 h-4 text-crm-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"/>
              </svg>
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
