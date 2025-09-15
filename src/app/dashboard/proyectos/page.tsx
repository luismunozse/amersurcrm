// src/app/dashboard/proyectos/page.tsx
import Link from "next/link";
import { getCachedProyectos } from "@/lib/cache.server";
import { createServerOnlyClient } from "@/lib/supabase.server";
import NewProyectoForm from "./_NewProyectoForm";

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
                className="crm-card rounded-2xl overflow-hidden hover:shadow-crm-xl transition-all duration-300 group"
              >
                {/* Header con gradiente */}
                <div className="bg-gradient-to-r from-crm-primary to-crm-primary/80 text-white px-6 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-bold text-lg truncate">{p.nombre}</h3>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        p.estado === "activo"
                          ? "bg-white/20 text-white"
                          : p.estado === "pausado"
                          ? "bg-yellow-400/30 text-yellow-100"
                          : "bg-red-400/30 text-red-100"
                      }`}
                      title="Estado"
                    >
                      {p.estado}
                    </span>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* Avatar/ícono mejorado */}
                  <div className="w-24 h-24 rounded-2xl overflow-hidden mx-auto ring-4 ring-crm-primary/20 bg-gradient-to-br from-crm-primary/10 to-crm-primary/5">
                    <div className="h-full w-full grid place-items-center">
                      <BuildingOffice2Icon className="h-10 w-10 text-crm-primary" />
                    </div>
                  </div>

                  {/* Información del proyecto */}
                  <div className="text-center space-y-2">
                    <p className="text-sm text-crm-text-muted font-medium uppercase tracking-wide">
                      Proyecto Inmobiliario
                    </p>
                    {p.ubicacion && (
                      <p className="text-sm text-crm-text-secondary flex items-center gap-2 justify-center">
                        <MapPinIcon className="h-4 w-4 text-crm-accent" /> 
                        <span className="truncate">{p.ubicacion}</span>
                      </p>
                    )}
                  </div>

                  {/* Métricas de ventas */}
                  <div className="space-y-4">
                    {/* Vendidos */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-crm-text-primary">
                          <ChartBarIcon className="h-4 w-4 text-crm-success" />
                          <span className="font-medium">Vendidas</span>
                        </div>
                        <div className="text-sm text-crm-text-primary font-bold">
                          {vendidoPct}%
                        </div>
                      </div>
                      <div className="h-3 rounded-full bg-crm-border/30 overflow-hidden">
                        <div
                          className="h-3 rounded-full bg-gradient-to-r from-crm-success to-green-500 transition-all duration-500"
                          style={{ width: `${vendidoPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Disponibles */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-crm-text-primary">
                          <PresentationChartLineIcon className="h-4 w-4 text-crm-info" />
                          <span className="font-medium">Disponibles</span>
                        </div>
                        <div className="text-sm text-crm-text-primary font-bold">
                          {dispPct}%
                        </div>
                      </div>
                      <div className="h-3 rounded-full bg-crm-border/30 overflow-hidden">
                        <div
                          className="h-3 rounded-full bg-gradient-to-r from-crm-info to-blue-500 transition-all duration-500"
                          style={{ width: `${dispPct}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Estadísticas */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="crm-card p-4 text-center">
                      <p className="text-xs text-crm-text-muted font-medium uppercase tracking-wide mb-1">
                        Total
                      </p>
                      <p className="text-2xl font-bold text-crm-text-primary">{stats.total}</p>
                    </div>
                    <div className="crm-card p-4 text-center">
                      <p className="text-xs text-crm-text-muted font-medium uppercase tracking-wide mb-1">
                        Disponibles
                      </p>
                      <p className="text-2xl font-bold text-crm-info">{stats.disponibles}</p>
                    </div>
                  </div>

                  {/* Botón de acción */}
                  <Link
                    className="w-full crm-button-primary inline-flex items-center justify-center gap-2 py-3 rounded-xl font-semibold group-hover:shadow-crm-xl transition-all duration-300"
                    href={`/dashboard/proyectos/${p.id}`}
                  >
                    Ver Proyecto
                    <ArrowRightIcon className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  } catch (error) {
    return (
      <pre className="text-red-600 whitespace-pre-wrap p-4">
        Error cargando proyectos: {String(error)}
      </pre>
    );
  }
}
