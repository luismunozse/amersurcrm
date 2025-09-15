import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/Card";
import { getCachedProyectos } from "@/lib/cache.server";
import type { ProyectoCached } from "@/types/crm";

export async function RecentProjects() {
  const proyectos: ProyectoCached[] = await getCachedProyectos();
  const recentProjects = proyectos.slice(0, 3);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-crm-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
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

                    <div className="flex items-center space-x-4 mt-2">
                      <span className="text-xs text-crm-text-muted">Estado: {proyecto.estado}</span>
                      {proyecto.ubicacion && <span className="text-xs text-crm-text-muted">📍 {proyecto.ubicacion}</span>}
                    </div>
                  </div>
                  <svg className="w-4 h-4 text-crm-text-muted ml-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
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

