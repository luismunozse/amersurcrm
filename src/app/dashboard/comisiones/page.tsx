import { requiereAutenticacion } from "@/lib/permissions/middleware";
import { esAdmin } from "@/lib/permissions/server";
import ComisionesList from "./_ComisionesList";

export const dynamic = "force-dynamic";

export default async function ComisionesPage() {
  await requiereAutenticacion();
  const isAdmin = await esAdmin();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-crm-text">Comisiones</h1>
        <p className="text-crm-text-muted text-sm mt-1">
          Comisiones generadas por venta. Ciclo: Pendiente → Aprobada → Pagada.
        </p>
      </div>
      <ComisionesList esAdmin={isAdmin} />
    </div>
  );
}
