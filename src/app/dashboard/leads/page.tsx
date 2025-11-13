import { getCachedClientes } from "@/lib/cache.server";
import ClientesTable from "@/components/ClientesTable";
import ExportButton from "@/components/export/ExportButton";
import { esAdmin } from "@/lib/auth/roles";
import { redirect } from "next/navigation";

type SearchParams = Promise<{
  q?: string | string[];
  telefono?: string | string[];
  dni?: string | string[];
  vendedor?: string | string[];
  page?: string | string[];
  sortBy?: string | string[];
  sortOrder?: string | string[];
}>;

const PAGE_SIZE = 20;

export default async function LeadsPage({ searchParams }: { searchParams: SearchParams }) {
  const isAdmin = await esAdmin();
  if (!isAdmin) {
    redirect("/dashboard");
  }

  const sp = await searchParams;

  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q ?? "").trim();
  const telefono = (Array.isArray(sp.telefono) ? sp.telefono[0] : sp.telefono ?? "").trim();
  const dni = (Array.isArray(sp.dni) ? sp.dni[0] : sp.dni ?? "").trim();
  const vendedor = (Array.isArray(sp.vendedor) ? sp.vendedor[0] : sp.vendedor ?? "").trim();
  const page = parseInt((Array.isArray(sp.page) ? sp.page[0] : sp.page ?? "1"), 10);
  const sortBy = (Array.isArray(sp.sortBy) ? sp.sortBy[0] : sp.sortBy ?? "fecha_alta").trim();
  const sortOrder = (Array.isArray(sp.sortOrder) ? sp.sortOrder[0] : sp.sortOrder ?? "desc").trim() as
    | "asc"
    | "desc";

  const { data: leads, total } = await getCachedClientes({
    page,
    pageSize: PAGE_SIZE,
    searchTerm: q,
    searchTelefono: telefono,
    searchDni: dni,
    vendedor,
    sortBy,
    sortOrder,
    estado: "lead",
  });

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const exportFilters = {
    q,
    telefono,
    dni,
    estado: "lead",
    tipo: "",
    vendedor,
    sortBy,
    sortOrder,
  };

  return (
    <div className="w-full px-4 py-6 space-y-6 md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-display font-bold text-crm-text-primary md:text-3xl">Leads</h1>
          <p className="text-sm text-crm-text-muted md:text-base">
            Leads captados desde formularios (Meta, web, importaciones). Asigna y gestiona el primer contacto.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 self-start md:self-auto">
          <ExportButton
            type="clientes"
            data={leads}
            filters={exportFilters}
            fileName="leads"
            label="Exportar"
            size="sm"
            variant="secondary"
          />
          <div className="text-sm text-crm-text-muted">
            {total.toLocaleString()} {total === 1 ? "lead" : "leads"} en seguimiento
          </div>
        </div>
      </div>

      <ClientesTable
        clientes={leads}
        total={total}
        currentPage={page}
        totalPages={totalPages}
        searchQuery={q}
        searchTelefono={telefono}
        searchDni={dni}
        estado="lead"
        tipo=""
        vendedor={vendedor}
        sortBy={sortBy}
        sortOrder={sortOrder}
      />
    </div>
  );
}
