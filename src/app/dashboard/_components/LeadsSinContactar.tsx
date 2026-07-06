import Link from "next/link";
import { CheckCircle2, ChevronRight, UserPlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
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
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-crm-text-primary">Leads sin contactar</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-crm-text-muted">No se pudo cargar esta sección. Intente nuevamente.</p>
        </CardContent>
      </Card>
    );
  }

  if (total === 0) {
    return (
      <Card variant="elevated">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-crm-text-primary">Leads sin contactar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 py-1 text-sm font-medium text-crm-success">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            Todos sus leads tienen seguimiento
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="elevated">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-crm-text-primary">
            <UserPlus className="h-4 w-4 text-crm-warning" aria-hidden="true" />
            Leads sin contactar
          </CardTitle>
          <span className="rounded-full bg-crm-warning/10 px-2.5 py-0.5 text-xs font-semibold text-crm-warning">
            {total}
          </span>
        </div>
        <CardDescription className="text-xs">Aún no tienen primer contacto registrado</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
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
