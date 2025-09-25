import Link from "next/link";
import { getCachedClientes } from "@/lib/cache.server";
import NewClienteForm from "./_NewClienteForm";
import ClientesTable from "@/components/ClientesTable";
import AdvancedClientSearch from "@/components/AdvancedClientSearch";

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

        {/* Buscador Avanzado */}
        <AdvancedClientSearch clientes={allClientes} />

        <NewClienteForm />

        <ClientesTable clientes={allClientes} />
      </div>
    );
  } catch (error) {
    return <pre className="text-red-600">Error cargando clientes: {String(error)}</pre>;
  }
}
