import { requiereAutenticacion } from "@/lib/permissions/middleware";
import AdquisicionHub from "./_AdquisicionHub";

export const dynamic = "force-dynamic";

export default async function AdquisicionPage() {
  await requiereAutenticacion();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-crm-text">Adquisición</h1>
        <p className="text-crm-text-muted text-sm mt-1">Seguimiento de separaciones, ventas y proformas</p>
      </div>
      <AdquisicionHub />
    </div>
  );
}
