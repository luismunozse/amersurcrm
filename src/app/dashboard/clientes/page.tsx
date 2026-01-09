import { getCachedClientes } from "@/lib/cache.server";
import NewClienteForm from "./_NewClienteForm";
import ClientesTable from "@/components/ClientesTable";
import ExportButton from "@/components/export/ExportButton";
import { obtenerPermisosUsuario } from "@/lib/permissions/server";

type SP = Promise<{
  q?: string | string[];
  telefono?: string | string[];
  dni?: string | string[];
  estado?: string | string[];
  tipo?: string | string[];
  vendedor?: string | string[];
  origen?: string | string[];
  page?: string | string[];
  sortBy?: string | string[];
  sortOrder?: string | string[];
}>;

export default async function ClientesPage({ searchParams }: { searchParams: SP }) {
  let sp;
  try {
    sp = await searchParams;
  } catch (e) {
    console.error("[ClientesPage] Error parseando searchParams:", e);
    sp = {};
  }

  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q ?? "").trim();
  const telefono = (Array.isArray(sp.telefono) ? sp.telefono[0] : sp.telefono ?? "").trim();
  const dni = (Array.isArray(sp.dni) ? sp.dni[0] : sp.dni ?? "").trim();
  const estado = (Array.isArray(sp.estado) ? sp.estado[0] : sp.estado ?? "").trim();
  const tipo = (Array.isArray(sp.tipo) ? sp.tipo[0] : sp.tipo ?? "").trim();
  const vendedor = (Array.isArray(sp.vendedor) ? sp.vendedor[0] : sp.vendedor ?? "").trim();
  const origen = (Array.isArray(sp.origen) ? sp.origen[0] : sp.origen ?? "").trim();
  const page = parseInt((Array.isArray(sp.page) ? sp.page[0] : sp.page ?? "1"), 10);
  const sortBy = (Array.isArray(sp.sortBy) ? sp.sortBy[0] : sp.sortBy ?? "fecha_alta").trim();
  const sortOrder = (Array.isArray(sp.sortOrder) ? sp.sortOrder[0] : sp.sortOrder ?? "desc").trim() as 'asc' | 'desc';

  let permisosUsuario;
  let clientesResult;

  try {
    // OPTIMIZADO: Ejecutar ambas queries en paralelo (~200ms vs ~400ms secuencial)
    [permisosUsuario, clientesResult] = await Promise.all([
      obtenerPermisosUsuario().catch(e => {
        console.error("[ClientesPage] Error obteniendo permisos:", e);
        return null;
      }),
      getCachedClientes({
        page,
        pageSize: 20,
        searchTerm: q,
        searchTelefono: telefono,
        searchDni: dni,
        estado,
        tipo,
        vendedor,
        origen,
        sortBy,
        sortOrder
      }).catch(e => {
        console.error("[ClientesPage] Error obteniendo clientes:", e);
        return { data: [], total: 0 };
      })
    ]);
  } catch (e) {
    console.error("[ClientesPage] Error en Promise.all:", e);
    permisosUsuario = null;
    clientesResult = { data: [], total: 0 };
  }

  const rol = permisosUsuario?.rol;
  const puedeExportar = rol === 'ROL_ADMIN' || rol === 'ROL_COORDINADOR_VENTAS';
  const { data: clientes, total } = clientesResult;

  const totalPages = Math.ceil(total / 20);

  const exportFilters = {
    q,
    telefono,
    dni,
    estado,
    tipo,
    vendedor,
    origen,
    sortBy,
    sortOrder,
  };

  return (
      <div className="w-full px-4 py-6 space-y-6 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-display font-bold text-crm-text-primary md:text-3xl">Clientes</h1>
            <p className="text-sm text-crm-text-muted md:text-base">Gestiona tu cartera desde el móvil o escritorio.</p>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 self-start md:self-auto">
            {puedeExportar && (
              <ExportButton
                type="clientes"
                data={clientes}
                filters={exportFilters}
                fileName="clientes"
                label="Exportar"
                size="sm"
                variant="secondary"
              />
            )}
            <div className="text-sm text-crm-text-muted">
              {total.toLocaleString()} {total === 1 ? 'cliente' : 'clientes'} total
            </div>
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
          origen={origen}
          sortBy={sortBy}
          sortOrder={sortOrder}
        />
      </div>
    );
}
