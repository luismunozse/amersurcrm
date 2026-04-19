import { getCachedPipelineClientes } from "@/lib/cache.server";
import { obtenerPermisosUsuario } from "@/lib/permissions/server";
import PipelineBoard from "./_PipelineBoard";
import PipelineFilters from "./_PipelineFilters";

type SP = Promise<{
  vendedor?: string | string[];
}>;

export default async function PipelinePage({ searchParams }: { searchParams: SP }) {
  let sp;
  try {
    sp = await searchParams;
  } catch {
    sp = {};
  }

  const vendedor = (Array.isArray(sp.vendedor) ? sp.vendedor[0] : sp.vendedor ?? "").trim();

  const [permisosUsuario, clientes] = await Promise.all([
    obtenerPermisosUsuario().catch(() => null),
    getCachedPipelineClientes({ vendedor }).catch((e) => {
      console.error("[PipelinePage] Error:", e);
      return [];
    }),
  ]);

  const rol = permisosUsuario?.rol;
  const puedeVerTodos =
    rol === "ROL_ADMIN" || rol === "ROL_GERENTE" || rol === "ROL_COORDINADOR_VENTAS";

  return (
    <div className="w-full px-4 py-6 space-y-6 md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-display font-bold text-crm-text-primary md:text-3xl">
            Pipeline
          </h1>
          <p className="text-sm text-crm-text-muted md:text-base">
            Seguimiento visual del embudo comercial.
          </p>
        </div>
        {puedeVerTodos ? <PipelineFilters vendedorActual={vendedor} /> : null}
      </div>

      <PipelineBoard
        clientesIniciales={clientes}
        puedeVerTodos={puedeVerTodos}
        vendedorFiltro={vendedor}
      />
    </div>
  );
}
