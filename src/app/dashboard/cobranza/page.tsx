import { requiereAutenticacion } from "@/lib/permissions/middleware";
import { esAdmin } from "@/lib/permissions/server";
import ControlPagosHub from "./_ControlPagosHub";

export const dynamic = "force-dynamic";

export default async function ControlPagosPage() {
  await requiereAutenticacion();
  const isAdmin = await esAdmin();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-crm-text">Control de Pagos</h1>
        <p className="text-crm-text-muted text-sm mt-1">Cronograma de pagos, cobranza y seguimiento de mora</p>
      </div>
      <ControlPagosHub esAdmin={isAdmin} />
    </div>
  );
}
