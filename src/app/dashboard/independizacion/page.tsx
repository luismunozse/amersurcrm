import { Suspense } from "react";
import { requiereAutenticacion } from "@/lib/permissions/middleware";
import IndependizacionList from "./_IndependizacionList";

export const dynamic = "force-dynamic";

export default async function IndependizacionPage() {
  await requiereAutenticacion();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-crm-text">Independización</h1>
        <p className="text-crm-text-muted text-sm mt-1">Trámite de independización registral ante SUNARP</p>
      </div>
      <Suspense fallback={<div className="text-center py-8 text-crm-text-muted">Cargando...</div>}>
        <IndependizacionList />
      </Suspense>
    </div>
  );
}
