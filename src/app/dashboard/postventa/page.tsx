import { Suspense } from "react";
import { requiereAutenticacion } from "@/lib/permissions/middleware";
import PostVentaList from "./_PostVentaList";

export const dynamic = "force-dynamic";

export default async function PostVentaPage() {
  await requiereAutenticacion();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-crm-text">Post-Venta</h1>
        <p className="text-crm-text-muted text-sm mt-1">Gestión de requerimientos, reclamos y garantías</p>
      </div>
      <Suspense fallback={<div className="text-center py-8 text-crm-text-muted">Cargando...</div>}>
        <PostVentaList />
      </Suspense>
    </div>
  );
}
