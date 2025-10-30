import { getCachedClientes } from "@/lib/cache.server";
import NewClienteForm from "./_NewClienteForm";
import ClientesTable from "@/components/ClientesTable";

type SP = Promise<{
  q?: string | string[];
  telefono?: string | string[];
  dni?: string | string[];
  estado?: string | string[];
  tipo?: string | string[];
  vendedor?: string | string[];
  page?: string | string[];
  sortBy?: string | string[];
  sortOrder?: string | string[];
}>;

export default async function ClientesPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;

  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q ?? "").trim();
  const telefono = (Array.isArray(sp.telefono) ? sp.telefono[0] : sp.telefono ?? "").trim();
  const dni = (Array.isArray(sp.dni) ? sp.dni[0] : sp.dni ?? "").trim();
  const estado = (Array.isArray(sp.estado) ? sp.estado[0] : sp.estado ?? "").trim();
  const tipo = (Array.isArray(sp.tipo) ? sp.tipo[0] : sp.tipo ?? "").trim();
  const vendedor = (Array.isArray(sp.vendedor) ? sp.vendedor[0] : sp.vendedor ?? "").trim();
  const page = parseInt((Array.isArray(sp.page) ? sp.page[0] : sp.page ?? "1"), 10);
  const sortBy = (Array.isArray(sp.sortBy) ? sp.sortBy[0] : sp.sortBy ?? "fecha_alta").trim();
  const sortOrder = (Array.isArray(sp.sortOrder) ? sp.sortOrder[0] : sp.sortOrder ?? "desc").trim() as 'asc' | 'desc';

  try {
    // Obtener clientes paginados con filtros
    const { data: clientes, total } = await getCachedClientes({
      page,
      pageSize: 20,
      searchTerm: q,
      searchTelefono: telefono,
      searchDni: dni,
      estado,
      tipo,
      vendedor,
      sortBy,
      sortOrder
    });

    const totalPages = Math.ceil(total / 20);

    return (
      <div className="w-full px-4 py-6 space-y-6 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-display font-bold text-crm-text-primary md:text-3xl">Clientes</h1>
            <p className="text-sm text-crm-text-muted md:text-base">Gestiona tu cartera desde el móvil o escritorio.</p>
          </div>
          <div className="text-sm text-crm-text-muted self-start md:self-auto">
            {total.toLocaleString()} {total === 1 ? 'cliente' : 'clientes'} total
          </div>
        </div>

        <div className="hidden lg:block">
          <NewClienteForm />
        </div>
        <details className="lg:hidden crm-card rounded-xl border border-crm-border overflow-hidden">
          <summary className="flex items-center justify-between px-4 py-3 text-sm font-semibold text-crm-text-primary cursor-pointer select-none">
            Registrar nuevo cliente
            <span className="text-crm-text-muted text-xs">▼</span>
          </summary>
          <div className="px-4 pb-4">
            <NewClienteForm />
          </div>
        </details>

        <ClientesTable
          clientes={clientes}
          total={total}
          currentPage={page}
          totalPages={totalPages}
          searchQuery={q}
          searchTelefono={telefono}
          searchDni={dni}
          estado={estado}
          tipo={tipo}
          vendedor={vendedor}
          sortBy={sortBy}
          sortOrder={sortOrder}
        />
      </div>
    );
  } catch (error) {
    return <pre className="text-red-600">Error cargando clientes: {String(error)}</pre>;
  }
}
