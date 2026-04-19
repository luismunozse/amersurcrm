import { soloAdmins } from "@/lib/permissions/middleware";
import MetasManager from "./_MetasManager";

export const dynamic = "force-dynamic";

export default async function MetasPage() {
  await soloAdmins();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-crm-text">Metas por Vendedor</h1>
        <p className="text-crm-text-muted text-sm mt-1">Configura metas mensuales y monitorea el rendimiento del equipo</p>
      </div>
      <MetasManager />
    </div>
  );
}
