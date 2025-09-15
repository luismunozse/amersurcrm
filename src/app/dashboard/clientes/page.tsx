import Link from "next/link";
import { getCachedClientes } from "@/lib/cache.server";
import NewClienteForm from "./_NewClienteForm";
import ClientesTable from "@/components/ClientesTable";

type SP = Promise<{ q?: string | string[]; page?: string | string[] }>;

export default async function ClientesPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const qRaw = sp.q;
  const q = (Array.isArray(qRaw) ? qRaw[0] : qRaw ?? "").trim();

  try {
    // Usar caché para obtener todos los clientes
    const allClientes = await getCachedClientes(q);
    const total = allClientes.length;

    return (
      <div className="w-full p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-crm-text-primary">Clientes</h1>
            <p className="text-crm-text-muted mt-1">Gestiona tu base de datos de clientes</p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="text-sm text-crm-text-muted">
              {total} {total === 1 ? 'cliente' : 'clientes'} total
            </div>
          </div>
        </div>

        {/* Buscador */}
        <div className="crm-card p-6">
          <form action="/dashboard/clientes" className="flex gap-3 items-center">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-crm-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
              </div>
              <input
                name="q"
                defaultValue={q}
                placeholder="Buscar por nombre o email…"
                className="w-full pl-10 pr-4 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary"
              />
            </div>
            <button className="crm-button-primary px-4 py-2 rounded-lg text-sm font-medium">
              Buscar
            </button>
          </form>
        </div>

        <NewClienteForm />

        <ClientesTable clientes={allClientes} />
      </div>
    );
  } catch (error) {
    return <pre className="text-red-600">Error cargando clientes: {String(error)}</pre>;
  }
}
