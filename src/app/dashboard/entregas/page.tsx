import { Suspense } from "react";
import { requiereAutenticacion } from "@/lib/permissions/middleware";
import EntregasList from "./_EntregasList";

export const dynamic = "force-dynamic";

export default async function EntregasPage() {
  await requiereAutenticacion();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-crm-text">Entregas</h1>
        <p className="text-crm-text-muted text-sm mt-1">Gestión de entregas de unidades inmobiliarias</p>
      </div>
      <Suspense fallback={<div className="text-center py-8 text-crm-text-muted">Cargando entregas...</div>}>
        <EntregasList />
      </Suspense>
    </div>
  );
}
