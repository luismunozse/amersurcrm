import Link from "next/link";
import { getCachedProyectos } from "@/lib/cache.server";
import NewProyectoForm from "./_NewProyectoForm";

export default async function ProyectosPage() {
  try {
    const proyectos = await getCachedProyectos();

    return (
      <div className="w-full p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-crm-text-primary">Proyectos</h1>
            <p className="text-crm-text-muted mt-1">Gestiona tus proyectos inmobiliarios</p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="text-sm text-crm-text-muted">
              {proyectos.length} {proyectos.length === 1 ? 'proyecto' : 'proyectos'} total
            </div>
          </div>
        </div>

        <NewProyectoForm />

        {/* Lista de proyectos */}
        <div className="crm-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-crm-text-primary">Lista de Proyectos</h3>
            <div className="text-sm text-crm-text-muted">
              {proyectos.length} {proyectos.length === 1 ? 'proyecto' : 'proyectos'}
            </div>
          </div>

          {proyectos.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-crm-card-hover rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-crm-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                </svg>
              </div>
              <h4 className="text-lg font-medium text-crm-text-primary mb-2">No hay proyectos registrados</h4>
              <p className="text-crm-text-muted">Comienza agregando tu primer proyecto usando el formulario de arriba.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {proyectos.map(p => (
                <div key={p.id} className="crm-card-hover p-4 rounded-lg border border-crm-border transition-all duration-200">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 bg-crm-success/10 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-crm-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                      </svg>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      p.estado === 'activo' ? 'bg-crm-success/10 text-crm-success' :
                      p.estado === 'pausado' ? 'bg-crm-warning/10 text-crm-warning' :
                      'bg-crm-danger/10 text-crm-danger'
                    }`}>
                      {p.estado}
                    </span>
                  </div>
                  
                  <h4 className="font-semibold text-crm-text-primary text-lg mb-2">{p.nombre}</h4>
                  
                  {p.ubicacion && (
                    <div className="flex items-center gap-1 text-sm text-crm-text-muted mb-3">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                      </svg>
                      {p.ubicacion}
                    </div>
                  )}
                  
                  <Link 
                    className="w-full crm-button-primary px-4 py-2 rounded-lg text-sm font-medium text-center block"
                    href={`/dashboard/proyectos/${p.id}`}
                  >
                    Ver Lotes
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  } catch (error) {
    return <pre className="text-red-600">Error cargando proyectos: {String(error)}</pre>;
  }
}
