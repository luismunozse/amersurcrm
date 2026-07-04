import { requiereAutenticacion } from "@/lib/permissions/middleware";
import { esAdmin } from "@/lib/permissions/server";
import ControlPagosHub, { type ControlPagosTab } from "./_ControlPagosHub";

export const dynamic = "force-dynamic";

const VALID_TABS: ControlPagosTab[] = ['cobranza', 'seguimiento', 'alertas'];

interface PageProps {
  searchParams?: Promise<{ tab?: string }>;
}

export default async function ControlPagosPage({ searchParams }: PageProps) {
  await requiereAutenticacion();
  const isAdmin = await esAdmin();
  const resolvedParams = await searchParams;
  const requestedTab = resolvedParams?.tab;
  const initialTab: ControlPagosTab = VALID_TABS.includes(requestedTab as ControlPagosTab)
    ? (requestedTab as ControlPagosTab)
    : 'cobranza';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-crm-text">Control de Pagos</h1>
        <p className="text-crm-text-muted text-sm mt-1">Cronograma de pagos, cobranza y seguimiento de mora</p>
      </div>
      <ControlPagosHub esAdmin={isAdmin} initialTab={initialTab} />
    </div>
  );
}
