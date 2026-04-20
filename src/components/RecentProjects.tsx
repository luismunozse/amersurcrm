import Link from "next/link";
import { Building2, MapPin, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/Card";
import { getCachedProyectos } from "@/lib/cache.server";
import type { ProyectoCached } from "@/types/crm";

// Props opcionales para evitar re-fetch si los datos ya están disponibles
interface RecentProjectsProps {
  proyectos?: ProyectoCached[];
}

export async function RecentProjects({ proyectos: proyectosProp }: RecentProjectsProps = {}) {
  // Solo hacer fetch si no se pasaron datos como props
  let proyectos: ProyectoCached[];

  if (proyectosProp) {
    // Usar datos pasados como props (evita queries duplicadas)
    proyectos = proyectosProp;
  } else {
    // Fallback: obtener datos si no se pasaron props
    const proyectosData = await getCachedProyectos();
    proyectos = Array.isArray(proyectosData) ? proyectosData : [];
  }

  const recentProjects = proyectos.slice(0, 3);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Building2 className="w-5 h-5 text-crm-primary" aria-hidden="true" />
            <span>Proyectos Recientes</span>
          </div>
          <Link href="/dashboard/proyectos" className="text-sm text-crm-primary hover:text-crm-primary/80 transition-colors">
            Ver todos
          </Link>
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {recentProjects.length > 0 ? (
            recentProjects.map((proyecto) => (
              <Link
                key={proyecto.id}
                href={`/dashboard/proyectos/${proyecto.id}`}
                className="block p-3 rounded-lg hover:bg-crm-card-hover transition-colors border border-crm-border"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-crm-text-primary truncate">
                      {proyecto.nombre}
                    </h4>

                    {proyecto.descripcion ? (
                      <p className="text-xs text-crm-text-muted mt-1 line-clamp-2">
                        {proyecto.descripcion}
                      </p>
                    ) : proyecto.ubicacion ? (
                      <p className="text-xs text-crm-text-muted mt-1 line-clamp-2">
                        {proyecto.ubicacion}
                      </p>
                    ) : null}

                    <div className="mt-2 flex items-center space-x-4">
                      <span className="text-xs text-crm-text-muted">Estado: {proyecto.estado}</span>
                      {proyecto.ubicacion && (
                        <span className="inline-flex items-center gap-1 text-xs text-crm-text-muted">
                          <MapPin className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
                          {proyecto.ubicacion}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-crm-text-muted ml-2 flex-shrink-0" aria-hidden="true" />
                </div>
              </Link>
            ))
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">🏗️</div>
              <p className="text-crm-text-muted">No hay proyectos</p>
              <p className="text-xs text-crm-text-muted mt-1">Crea tu primer proyecto para comenzar</p>
              <Link href="/dashboard/proyectos" className="inline-block mt-3 text-sm text-crm-primary hover:text-crm-primary/80 transition-colors">
                Crear proyecto
              </Link>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
