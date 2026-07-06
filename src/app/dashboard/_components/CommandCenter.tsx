import Link from "next/link";
import { ChevronRight, LayoutDashboard, Package, Users, Wallet } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";

const ENLACES_RAPIDOS = [
  {
    label: "Pipeline de ventas",
    description: "Revise el embudo y las etapas activas.",
    href: "/dashboard/pipeline",
    icon: Users,
  },
  {
    label: "Inventario de lotes",
    description: "Consulte la disponibilidad por proyecto.",
    href: "/dashboard/proyectos",
    icon: Package,
  },
  {
    label: "Cobranza",
    description: "Revise alertas y mora vigente.",
    href: "/dashboard/cobranza",
    icon: Wallet,
  },
] as const;

/**
 * Gerencia/coordinador command center — "¿cómo va el negocio y dónde está
 * el fuego?" (design.md §1, §4).
 *
 * PR1a scope: none of the old global widgets (funnel, ventas chart, lotes
 * donut) survive the rewrite, so this ships a lean, honest placeholder with
 * direct links to each module. PR2 replaces it with the four command-center
 * blocks (funnel + aging, inventario, ventas vs. meta, mora) per ADR-2..5.
 */
export function CommandCenter() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-crm-text-primary">¿Cómo va el negocio?</h1>
      <Card variant="elevated">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-crm-text-primary">
            <LayoutDashboard className="h-5 w-5 text-crm-primary" aria-hidden="true" />
            Panel de gestión en actualización
          </CardTitle>
          <CardDescription>
            Estamos incorporando el funnel con leads en seguimiento, el inventario por proyecto, las ventas
            frente a la meta y la mora directamente en esta vista. Mientras tanto, ingrese a cada módulo desde aquí.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        {ENLACES_RAPIDOS.map((enlace) => {
          const Icon = enlace.icon;
          return (
            <Link
              key={enlace.href}
              href={enlace.href}
              className="group flex flex-col gap-3 rounded-2xl border border-crm-border/60 bg-crm-card p-4 transition-[border-color,box-shadow,transform] duration-200 ease-out-strong hover:border-crm-primary/40 hover:shadow-crm active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-crm-primary/40"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-crm-primary/10 text-crm-primary">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-crm-text-primary">{enlace.label}</p>
                <p className="text-xs leading-snug text-crm-text-muted">{enlace.description}</p>
              </div>
              <span className="mt-auto inline-flex items-center gap-1 text-xs font-semibold text-crm-primary/90 transition-colors group-hover:text-crm-primary">
                Ir ahora
                <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
