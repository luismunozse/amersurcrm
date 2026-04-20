import { Suspense } from "react";
import { Info } from "lucide-react";
import { requiereAutenticacion } from "@/lib/permissions/middleware";
import IndependizacionList from "./_IndependizacionList";

export const dynamic = "force-dynamic";

export default async function IndependizacionPage() {
  await requiereAutenticacion();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-crm-text-primary">Independización</h1>
        <p className="text-crm-text-muted text-sm mt-1">
          Seguimiento de trámites ante SUNARP para inscribir cada lote vendido a nombre del comprador.
        </p>
      </div>

      <details
        className="group rounded-xl border border-crm-border bg-crm-card overflow-hidden"
        open
      >
        <summary className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none hover:bg-crm-card-hover transition-colors">
          <Info className="w-4 h-4 text-crm-primary shrink-0" />
          <span className="flex-1 text-sm font-semibold text-crm-text-primary">
            ¿Qué es una independización?
          </span>
          <span className="text-xs text-crm-text-muted group-open:rotate-180 transition-transform">▾</span>
        </summary>

        <div className="px-5 pb-4 pt-1 space-y-3 text-sm text-crm-text-secondary leading-relaxed border-t border-crm-border">
          <p>
            Al vender un lote, el inmueble todavía figura dentro del terreno matriz
            de la inmobiliaria en SUNARP. La independización es el trámite registral
            que separa ese lote y lo inscribe como propiedad a nombre del cliente.
          </p>

          <p className="text-crm-text-primary font-medium">Desde aquí puede:</p>
          <ul className="list-disc list-outside ml-5 space-y-1">
            <li>Ver el estado del trámite: Pendiente, En trámite, Observada o Completada.</li>
            <li>Cargar los documentos requeridos por SUNARP.</li>
            <li>Registrar fechas clave: inicio, presentación e inscripción.</li>
            <li>Hacer seguimiento de observaciones y subsanaciones.</li>
          </ul>
        </div>
      </details>

      <Suspense fallback={<div className="text-center py-8 text-crm-text-muted">Cargando...</div>}>
        <IndependizacionList />
      </Suspense>
    </div>
  );
}
