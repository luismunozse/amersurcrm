// src/app/dashboard/proyectos/page.tsx
import Link from "next/link";
import { getCachedProyectos } from "@/lib/cache.server";
import { createServerOnlyClient } from "@/lib/supabase.server";
import NewProyectoForm from "./_NewProyectoForm";
import QuickActions from "./QuickActions";

import {
  BuildingOffice2Icon,
  MapPinIcon,
  ChartBarIcon,
  PresentationChartLineIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";

type LoteRow = {
  proyecto_id: string;
  estado: "disponible" | "reservado" | "vendido";
};

export default async function ProyectosPage() {
  try {
    const proyectos = await getCachedProyectos();

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
              <span className="font-semibold text-crm-text-primary">{proyectos.length}</span>{" "}
              {proyectos.length === 1 ? "proyecto" : "proyectos"} total
            </div>
          </div>
        </div>

        {/* Form crear proyecto */}
        <NewProyectoForm />

        {/* Grid de proyectos tipo “cards” */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {proyectos.length === 0 && (
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

          {proyectos.map((p) => {
            const stats = lotesByProyecto[p.id] ?? {
              total: 0,
              vendidos: 0,
              disponibles: 0,
            };
            const vendidoPct =
              stats.total > 0 ? Math.round((stats.vendidos / stats.total) * 100) : 0;
            const dispPct =
              stats.total > 0 ? Math.round((stats.disponibles / stats.total) * 100) : 0;

            return (
              <div
                key={p.id}
                className="crm-card rounded-2xl overflow-hidden hover:shadow-crm-xl transition-all duration-300 group relative flex flex-col"
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
                      {p.estado === "activo" ? "● Activo" : p.estado === "pausado" ? "● Pausado" : "● Cerrado"}
                    </span>
                    <span
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg backdrop-blur-sm border ${
                        p.tipo === "propio"
                          ? "bg-blue-500/90 text-white border-blue-400"
                          : "bg-purple-500/90 text-white border-purple-400"
                      }`}
                    >
                      {p.tipo === "propio" ? "📋 Propio" : "🤝 Corretaje"}
                    </span>
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
                  <div className="grid grid-cols-3 gap-3 py-4 border-y border-crm-border">
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
                        imagen_url: p.imagen_url
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
              <details className="mt-2">
                <summary className="text-xs text-crm-text-muted cursor-pointer hover:text-crm-text-primary">
                  Ver detalles técnicos
                </summary>
                <pre className="text-xs text-crm-text-muted mt-2 whitespace-pre-wrap bg-crm-card p-2 rounded border">
                  {JSON.stringify(error, null, 2)}
                </pre>
              </details>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
