import { Card, CardContent, CardHeader, CardTitle } from "./ui/Card";
import { getCachedClientes, getCachedProyectos } from "@/lib/cache.server";
import type { ClienteCached, ProyectoCached } from "@/types/crm";

// ---- Tipos (discriminated union) ----
type BaseActivity = {
  id: string;
  message: string;
  time: string;
  icon: string;
};

type ClienteActivity = BaseActivity & {
  type: "cliente";
  email: string | null;
};

type ProyectoActivity = BaseActivity & {
  type: "proyecto";
  descripcion?: string | null;
};

type Activity = ClienteActivity | ProyectoActivity;

// Usar los tipos de @/types/crm
type ClienteMin = Pick<ClienteCached, 'id' | 'nombre' | 'email'>;
type ProyectoMin = Pick<ProyectoCached, 'id' | 'nombre' | 'descripcion'>;

export async function RecentActivities() {
  // Obtener datos recientes
  const [clientes, proyectos] = await Promise.all([
    getCachedClientes(),     // Ideal: que devuelva Promise<ClienteMin[]>
    getCachedProyectos(),    // Ideal: que devuelva Promise<ProyectoMin[]>
  ]);

  // Crear actividades recientes basadas en datos reales (máx 4)
  const activities: Activity[] = [
    ...clientes.slice(0, 2).map((cliente: ClienteMin) => ({
      id: `cliente-${cliente.id}`,
      type: "cliente" as const,
      message: `Cliente: ${cliente.nombre}`,
      time: "Reciente",
      icon: "👤",
      email: cliente.email,
    })),
    ...proyectos.slice(0, 2).map((proyecto: ProyectoMin) => ({
      id: `proyecto-${proyecto.id}`,
      type: "proyecto" as const,
      message: `Proyecto: ${proyecto.nombre}`,
      time: "Reciente",
      icon: "🏢",
      descripcion: proyecto.descripcion,
    })),
  ].slice(0, 4);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <svg className="w-5 h-5 text-crm-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Actividad Reciente</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.length > 0 ? (
            activities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start space-x-3 p-3 rounded-lg hover:bg-crm-card-hover transition-colors"
              >
                <div className="text-2xl">{activity.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-crm-text-primary truncate">
                    {activity.message}
                  </p>

                  {activity.type === "cliente" && activity.email && (
                    <p className="text-xs text-crm-text-muted truncate">{activity.email}</p>
                  )}

                  {activity.type === "proyecto" && activity.descripcion && (
                    <p className="text-xs text-crm-text-muted truncate">{activity.descripcion}</p>
                  )}

                  <p className="text-xs text-crm-text-muted mt-1">{activity.time}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">📊</div>
              <p className="text-crm-text-muted">No hay actividades recientes</p>
              <p className="text-xs text-crm-text-muted mt-1">
                Los datos aparecerán aquí cuando agregues contenido
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
