import Link from "next/link";
import { getCachedClientes } from "@/lib/cache";
import NewClienteForm from "./_NewClienteForm";
import ClientesList from "./_ClientesList";

type SP = Promise<{ q?: string | string[]; page?: string | string[] }>;

export default async function ClientesPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;

  const qRaw = sp.q;
  const pageRaw = sp.page;

  const q = (Array.isArray(qRaw) ? qRaw[0] : qRaw ?? "").trim();
  const page = Math.max(
    1,
    parseInt(Array.isArray(pageRaw) ? pageRaw[0] : pageRaw || "1", 10) || 1
  );
  const perPage = 10;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  try {
    // Usar caché para obtener todos los clientes
    const allClientes = await getCachedClientes(q);
    
    // Aplicar paginación en memoria (más rápido para datasets pequeños)
    const clientes = allClientes.slice(from, to + 1);
    const total = allClientes.length;
    const lastPage = Math.max(1, Math.ceil(total / perPage));

  const makeHref = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/dashboard/clientes?${qs}` : `/dashboard/clientes`;
    // Ajustá el prefijo si tu ruta fuese distinta.
  };

    return (
      <div className="mx-auto max-w-6xl p-6 space-y-6">
        <h1 className="text-2xl font-display font-semibold">Clientes</h1>

        {/* Buscador simple */}
        <form action="/dashboard/clientes" className="flex gap-2 items-center">
          <input
            name="q"
            defaultValue={q}
            placeholder="Buscar por nombre o email…"
            className="input w-80"
          />
          <button className="btn">Buscar</button>
        </form>

        <NewClienteForm />

        <ClientesList clientes={clientes} />

        {/* Paginación */}
        <div className="flex items-center justify-between">
          <Link
            className={`btn ${page <= 1 ? "pointer-events-none opacity-50" : ""}`}
            href={makeHref(page - 1)}
          >
            ← Anterior
          </Link>
          <div className="text-sm text-text-muted">
            Página {page} de {lastPage} · {total} totales
          </div>
          <Link
            className={`btn ${page >= lastPage ? "pointer-events-none opacity-50" : ""}`}
            href={makeHref(page + 1)}
          >
            Siguiente →
          </Link>
        </div>
      </div>
    );
  } catch (error) {
    return <pre className="text-red-600">Error cargando clientes: {String(error)}</pre>;
  }
}
