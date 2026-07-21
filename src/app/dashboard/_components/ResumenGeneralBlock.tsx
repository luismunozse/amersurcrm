import Link from "next/link";
import { LayoutGrid, UserPlus, Users, Building2, Package, UserCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { getResumenGeneral } from "@/lib/dashboard/command-center.server";
import type { EquipoScope } from "@/lib/auth/equipo-scope.server";

interface ResumenGeneralBlockProps {
  scope: EquipoScope;
}

// Static class-name map — Tailwind's JIT scans source for literal class
// strings, so a template-interpolated `bg-crm-${color}/10` would get purged
// from the production build (same reasoning as the old DashboardStats.tsx
// `colorClasses` lookup, git show 7d5cf39~1).
const TILE_COLOR_CLASSES = {
  primary: "bg-crm-primary/10 text-crm-primary",
  success: "bg-crm-success/10 text-crm-success",
  info: "bg-crm-info/10 text-crm-info",
} as const;

function KpiTile({
  icon,
  value,
  label,
  sub,
  color,
  href,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  sub?: string;
  color: keyof typeof TILE_COLOR_CLASSES;
  href: string;
}) {
  return (
    <Link href={href} className="block h-full rounded-xl">
      <Card
        variant="elevated"
        className="h-full hover:bg-crm-card-hover active:scale-[0.99]"
      >
        {/* Stacked stat-tile layout: label wraps freely instead of truncating —
            in the previous icon-beside-number layout the text column shrank to
            the number's width and ellipsized every label. */}
        <CardContent className="flex h-full flex-col justify-center gap-2.5 p-5">
          <div className="flex items-center gap-2.5">
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${TILE_COLOR_CLASSES[color]}`}>
              {icon}
            </span>
            <p className="text-xs font-medium leading-snug text-crm-text-muted">{label}</p>
          </div>
          <p className="text-3xl font-bold leading-none tabular-nums text-crm-text-primary">
            {value.toLocaleString("es-PE")}
          </p>
          {sub && <p className="text-xs text-crm-text-muted">{sub}</p>}
        </CardContent>
      </Card>
    </Link>
  );
}

/**
 * Command center zone ① "Resumen" — org-wide KPI tiles (clientes nuevos del
 * mes, clientes totales, proyectos activos, lotes totales, and — for
 * admin/gerente/coordinador only — vendedores activos) mirroring the
 * icon-tile + big-number card pattern used by
 * `InventarioLotesBlock`/`VentasVsMetaBlock`. Data comes from
 * `getResumenGeneral`, which reuses `getInventarioLotesPorProyecto`'s totals
 * for the lotes tile instead of running a redundant `lote` scan.
 *
 * Every tile doubles as a shortcut into its section (product direction: the
 * dashboard is a navigation hub, not just a readout) — see each tile's
 * `href` below for the destination and why.
 */
export async function ResumenGeneralBlock({ scope }: ResumenGeneralBlockProps) {
  let resumen: Awaited<ReturnType<typeof getResumenGeneral>>;
  try {
    resumen = await getResumenGeneral(scope);
  } catch (error) {
    console.error("Error cargando resumen general:", error);
    return (
      <Card variant="elevated">
        <CardContent className="flex items-center gap-3 p-6">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-crm-danger/10 text-crm-danger">
            <LayoutGrid className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold text-crm-text-primary">No se pudo cargar esta sección</p>
            <p className="text-xs text-crm-text-muted">Intente nuevamente en unos momentos.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Both privileged tiers now render real (non-empty) data from
  // getResumenGeneral — the grid layout and the "vendedores activos" tile
  // should show for coordinador too, not just admin/gerente.
  const puedeVerDatosPrivilegiados = scope.tier === "global" || scope.tier === "equipo";

  return (
    <div
      className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${puedeVerDatosPrivilegiados ? "lg:grid-cols-3 xl:grid-cols-5" : "lg:grid-cols-4"}`}
    >
      <KpiTile
        icon={<UserPlus className="h-4 w-4" aria-hidden="true" />}
        value={resumen.clientesNuevosMes}
        label="Clientes nuevos este mes"
        color="primary"
        href="/dashboard/clientes"
      />
      <KpiTile
        icon={<Users className="h-4 w-4" aria-hidden="true" />}
        value={resumen.clientesTotales}
        label="Clientes totales"
        color="info"
        href="/dashboard/clientes"
      />
      <KpiTile
        icon={<Building2 className="h-4 w-4" aria-hidden="true" />}
        value={resumen.proyectosActivos}
        label="Proyectos activos"
        color="success"
        href="/dashboard/proyectos"
      />
      <KpiTile
        icon={<Package className="h-4 w-4" aria-hidden="true" />}
        value={resumen.lotesTotales}
        label="Lotes totales"
        sub={`${resumen.lotesPctDisponible}% disponible · ${resumen.lotesPctVendido}% vendido`}
        color="primary"
        href="/dashboard/proyectos"
      />
      {puedeVerDatosPrivilegiados && (
        <KpiTile
          icon={<UserCheck className="h-4 w-4" aria-hidden="true" />}
          value={resumen.vendedoresActivos}
          label="Vendedores activos"
          color="info"
          href="/dashboard/admin/usuarios"
        />
      )}
    </div>
  );
}
