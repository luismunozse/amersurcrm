import Link from "next/link";
import { getCachedProyectos } from "@/lib/cache";
import NewProyectoForm from "./_NewProyectoForm";

export default async function ProyectosPage() {
  try {
    const proyectos = await getCachedProyectos();

    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold">Proyectos</h1>
        <NewProyectoForm />
        <ul className="divide-y border rounded">
          {proyectos.map(p => (
            <li key={p.id} className="p-3 flex justify-between items-center">
              <div>
                <div className="font-medium">{p.nombre}</div>
                <div className="text-sm opacity-75">{p.estado} · {p.ubicacion ?? "—"}</div>
              </div>
              <Link className="text-sm border px-2 py-1 rounded"
                    href={`/dashboard/proyectos/${p.id}`}>Ver lotes</Link>
            </li>
          ))}
          {proyectos.length === 0 && <li className="p-3 text-sm opacity-60">Sin proyectos.</li>}
        </ul>
      </div>
    );
  } catch (error) {
    return <pre className="text-red-600">Error cargando proyectos: {String(error)}</pre>;
  }
}
