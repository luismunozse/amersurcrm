import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabaseServer";
import NewLoteForm from "./_NewLoteForm";
import LotesList from "./_LotesList";

type SP = Promise<{
  q?: string | string[];
  page?: string | string[];
  estado?: string | string[];
}>;

export default async function ProyLotesPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: SP;
}) {
  const sp = await searchParams;

  const qRaw = sp.q;
  const pageRaw = sp.page;
  const estadoRaw = sp.estado;

  const q = (Array.isArray(qRaw) ? qRaw[0] : qRaw ?? "").trim();
  const estado = (Array.isArray(estadoRaw) ? estadoRaw[0] : estadoRaw ?? "").trim();
  const page = Math.max(
    1,
    parseInt(Array.isArray(pageRaw) ? pageRaw[0] : pageRaw || "1", 10) || 1
  );
  const perPage = 10;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  const supabase = await supabaseServer();

  // Proyecto (para título/404)
  const { data: proyecto } = await supabase
    .from("proyecto")
    .select("id,nombre,estado,ubicacion,created_at")
    .eq("id", params.id)
    .maybeSingle();
  if (!proyecto) return notFound();

  // Lotes: lista (con filtros) + paginación
  const listQuery = supabase
    .from("lote")
    .select("id,codigo,sup_m2,precio,moneda,estado,created_at")
    .eq("proyecto_id", params.id)
    .order("codigo", { ascending: true })
    .range(from, to);

  if (q) listQuery.ilike("codigo", `%${q}%`);
  if (estado && estado !== "all") listQuery.eq("estado", estado);

  const { data: lotes, error } = await listQuery;
  if (error) return <pre className="text-red-600">{error.message}</pre>;

  // Conteo total (mismos filtros)
  const countQuery = supabase
    .from("lote")
    .select("*", { count: "exact", head: true })
    .eq("proyecto_id", params.id);

  if (q) countQuery.ilike("codigo", `%${q}%`);
  if (estado && estado !== "all") countQuery.eq("estado", estado);

  const { count } = await countQuery;
  const total = count ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / perPage));

  // Helper de URLs
  const makeHref = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (estado && estado !== "all") params.set("estado", estado);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/dashboard/proyectos/${proyecto.id}?${qs}` : `/dashboard/proyectos/${proyecto.id}`;
  };

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/proyectos" className="btn">← Volver</Link>
        <h1 className="text-2xl font-display font-semibold">Proyecto: {proyecto.nombre}</h1>
      </div>

      {/* Filtros: búsqueda por código + estado */}
      <form action={`/dashboard/proyectos/${proyecto.id}`} className="card p-4 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
        <div className="sm:col-span-2">
          <label className="block text-sm mb-1">Buscar por código</label>
          <input name="q" defaultValue={q} className="input" placeholder="Ej: MzA-01" />
        </div>
        <div>
          <label className="block text-sm mb-1">Estado</label>
          <select name="estado" defaultValue={estado || "all"} className="input">
            <option value="all">Todos</option>
            <option value="disponible">disponible</option>
            <option value="reservado">reservado</option>
            <option value="vendido">vendido</option>
          </select>
        </div>
        <button className="btn">Filtrar</button>
      </form>

      <NewLoteForm proyectoId={proyecto.id} />

      <LotesList proyectoId={proyecto.id} lotes={lotes ?? []} />

      {/* Paginación */}
      <div className="flex items-center justify-between">
        <Link
          className={`btn ${page <= 1 ? "pointer-events-none opacity-50" : ""}`}
          href={makeHref(page - 1)}
        >
          ← Anterior
        </Link>
        <div className="text-sm text-text-muted">
          Página {page} de {lastPage} · {total} lotes
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
}
