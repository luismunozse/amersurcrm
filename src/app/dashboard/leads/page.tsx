import { getCachedClientes, getCachedLeadsStatsByOrigen } from "@/lib/cache.server";
import ClientesTable from "@/components/ClientesTable";
import ExportButton from "@/components/export/ExportButton";
import { esAdmin, esVendedor } from "@/lib/permissions/server";
import { redirect } from "next/navigation";
import { getOrigenLeadLabel } from "@/lib/types/clientes";
import Link from "next/link";

type SearchParams = Promise<{
  q?: string | string[];
  telefono?: string | string[];
  dni?: string | string[];
  vendedor?: string | string[];
  origen?: string | string[];  // Filtro por origen del lead
  page?: string | string[];
  sortBy?: string | string[];
  sortOrder?: string | string[];
}>;

const PAGE_SIZE = 20;

export default async function LeadsPage({ searchParams }: { searchParams: SearchParams }) {
  // Permitir acceso a administradores y vendedores
  const isAdmin = await esAdmin();
  const isVendedor = await esVendedor();

  if (!isAdmin && !isVendedor) {
    redirect("/dashboard");
  }

  const sp = await searchParams;

  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q ?? "").trim();
  const telefono = (Array.isArray(sp.telefono) ? sp.telefono[0] : sp.telefono ?? "").trim();
  const dni = (Array.isArray(sp.dni) ? sp.dni[0] : sp.dni ?? "").trim();
  const vendedor = (Array.isArray(sp.vendedor) ? sp.vendedor[0] : sp.vendedor ?? "").trim();
  const origen = (Array.isArray(sp.origen) ? sp.origen[0] : sp.origen ?? "").trim();
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
    origen,
    sortBy,
    sortOrder,
    estado: "lead",
  });

  // Obtener estadísticas por origen
  const stats = await getCachedLeadsStatsByOrigen();

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const exportFilters = {
    q,
    telefono,
    dni,
    estado: "lead",
    tipo: "",
    vendedor,
    origen,
    sortBy,
    sortOrder,
  };

  return (
    <div className="w-full px-4 py-6 space-y-6 md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-display font-bold text-crm-text-primary md:text-3xl">
            {isVendedor ? 'Mis Leads' : 'Leads'}
          </h1>
          <p className="text-sm text-crm-text-muted md:text-base">
            {isVendedor
              ? `Leads asignados a ti. Total: ${total} ${total === 1 ? "lead" : "leads"}`
              : 'Leads captados desde formularios (Meta, web, importaciones). Asigna y gestiona el primer contacto.'
            }
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

      {/* Estadísticas por origen de lead */}
      {stats.length > 0 && (
        <div className="crm-card p-4">
          <h3 className="text-sm font-semibold text-crm-text-primary mb-3">Leads por origen</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {stats.map((stat) => {
              const isSelected = origen === stat.origen;
              const isFacebookAds = stat.origen === 'facebook_ads';
              return (
                <Link
                  key={stat.origen}
                  href={`/dashboard/leads?origen=${isSelected ? '' : stat.origen}`}
                  className={`
                    relative p-3 rounded-lg border transition-all hover:shadow-md
                    ${isSelected
                      ? 'border-crm-primary bg-crm-primary/10 ring-2 ring-crm-primary/20'
                      : 'border-crm-border bg-crm-card hover:border-crm-primary/50'
                    }
                    ${isFacebookAds ? 'border-blue-500/30 bg-blue-50 dark:bg-blue-950/20' : ''}
                  `}
                >
                  {isFacebookAds && (
                    <div className="absolute top-2 right-2">
                      <span className="inline-flex items-center justify-center w-5 h-5 text-xs bg-blue-500 text-white rounded-full">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                        </svg>
                      </span>
                    </div>
                  )}
                  <div className="text-2xl font-bold text-crm-text-primary mb-1">
                    {stat.count}
                  </div>
                  <div className={`text-xs ${isSelected ? 'text-crm-primary font-medium' : 'text-crm-text-muted'}`}>
                    {getOrigenLeadLabel(stat.origen)}
                  </div>
                  {isSelected && (
                    <div className="mt-2 text-xs text-crm-primary font-medium">
                      ✓ Filtro activo
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
          {origen && (
            <div className="mt-3 text-sm text-crm-text-muted">
              Mostrando {total} {total === 1 ? "lead" : "leads"} de origen: <span className="font-semibold text-crm-text-primary">{getOrigenLeadLabel(origen)}</span>
              {' · '}
              <Link href="/dashboard/leads" className="text-crm-primary hover:underline">
                Ver todos
              </Link>
            </div>
          )}
        </div>
      )}

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
        origen={origen}
        sortBy={sortBy}
        sortOrder={sortOrder}
      />
    </div>
  );
}
