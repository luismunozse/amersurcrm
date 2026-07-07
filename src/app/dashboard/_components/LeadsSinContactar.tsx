import Link from "next/link";
import { CheckCircle2, ChevronRight, UserPlus } from "lucide-react";
import { Card, CardContent, CardDescription } from "@/components/ui/Card";
import { getCachedClientes } from "@/lib/cache.server";

/**
 * Vendedor cockpit block (c) — new uncontacted leads (design.md §2, §4).
 * Reuses `getCachedClientes` in dashboard mode, already scoped to the
 * caller's own clients (spec: "Uncontacted-leads block excludes other
 * vendedores").
 */
export async function LeadsSinContactar() {
  let leads: Awaited<ReturnType<typeof getCachedClientes>>["data"];
  let total: number;
  try {
    const result = await getCachedClientes({
      mode: "dashboard",
      estado: "por_contactar",
      pageSize: 6,
      withTotal: true,
    });
    leads = result.data;
    total = result.total;
  } catch (error) {
    console.error("Error cargando leads sin contactar:", error);
    return (
      <Card variant="elevated">
        <CardContent className="flex items-center gap-3 p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-crm-danger/10 text-crm-danger">
            <UserPlus className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold text-crm-text-primary">No se pudo cargar esta sección</p>
            <p className="text-xs text-crm-text-muted">Intente nuevamente en unos momentos.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (total === 0) {
    return (
      <Card variant="elevated">
        <CardContent className="flex items-center gap-3 p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-crm-success/10 text-crm-success">
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold text-crm-text-primary">Todos sus leads tienen seguimiento</p>
            <p className="text-xs text-crm-text-muted">Continúe con el seguimiento habitual.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="elevated">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-crm-primary/10 text-crm-primary">
            <UserPlus className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-3xl font-bold leading-none tabular-nums text-crm-text-primary">{total}</p>
            <p className="mt-1.5 text-xs font-medium text-crm-text-muted">Leads sin contactar</p>
          </div>
        </div>
        <CardDescription className="text-xs">Aún no tienen primer contacto registrado</CardDescription>
        <div className="space-y-2">
          {leads.slice(0, 4).map((lead) => (
            <Link
              key={lead.id}
              href={`/dashboard/clientes/${lead.id}`}
              className="flex items-center justify-between gap-2 rounded-lg border border-crm-border/60 bg-crm-card px-3 py-2 text-sm text-crm-text-primary transition-colors hover:border-crm-primary/40"
            >
              <span className="truncate">{lead.nombre}</span>
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-crm-text-muted" aria-hidden="true" />
            </Link>
          ))}
        </div>
        <Link
          href="/dashboard/clientes"
          className="flex items-center justify-center gap-1 pt-1 text-xs font-semibold text-crm-primary transition-colors hover:text-crm-primary/80"
        >
          Ver todos los leads
          <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
        </Link>
      </CardContent>
    </Card>
  );
}
