"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Calendar,
  KanbanSquare,
  Menu,
  type LucideIcon,
} from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import { usePermissions, PERMISOS } from "@/lib/permissions";
import type { PermisoCodigo } from "@/lib/permissions/types";

interface BottomNavItem {
  label: string;
  href: string;
  Icon: LucideIcon;
  permisos?: PermisoCodigo[];
}

const NAV_ITEMS: BottomNavItem[] = [
  { label: "Inicio", href: "/dashboard", Icon: LayoutDashboard },
  {
    label: "Clientes",
    href: "/dashboard/clientes",
    Icon: Users,
    permisos: [PERMISOS.CLIENTES.VER_TODOS, PERMISOS.CLIENTES.VER_ASIGNADOS],
  },
  {
    label: "Pipeline",
    href: "/dashboard/pipeline",
    Icon: KanbanSquare,
    permisos: [PERMISOS.CLIENTES.VER_TODOS, PERMISOS.CLIENTES.VER_ASIGNADOS],
  },
  { label: "Agenda", href: "/dashboard/agenda", Icon: Calendar },
];

function isPathActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function BottomNav() {
  const pathname = usePathname();
  const { tieneAlgunoDePermisos, esAdmin } = usePermissions();
  const sidebar = useSidebar();

  const visibles = NAV_ITEMS.filter((item) => {
    if (!item.permisos || item.permisos.length === 0) return true;
    if (esAdmin()) return true;
    return tieneAlgunoDePermisos(item.permisos);
  });

  return (
    <nav
      aria-label="Navegación principal"
      className="lg:hidden fixed inset-x-0 bottom-0 z-40 bg-crm-card/95 backdrop-blur border-t border-crm-border shadow-[0_-4px_12px_rgba(0,0,0,0.04)] dark:shadow-[0_-4px_12px_rgba(0,0,0,0.25)] pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="flex items-stretch justify-around px-1">
        {visibles.map((item) => {
          const Ic = item.Icon;
          const activo = isPathActive(pathname, item.href);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={`flex flex-col items-center justify-center gap-0.5 min-h-[56px] py-1.5 text-[10px] font-medium transition-colors ${
                  activo
                    ? "text-crm-primary"
                    : "text-crm-text-muted hover:text-crm-text-primary"
                }`}
                aria-current={activo ? "page" : undefined}
              >
                <span
                  className={`grid place-items-center w-10 h-7 rounded-full transition-colors ${
                    activo ? "bg-crm-primary/10" : ""
                  }`}
                >
                  <Ic className="w-5 h-5" aria-hidden />
                </span>
                <span className="leading-tight">{item.label}</span>
              </Link>
            </li>
          );
        })}

        {/* Botón Más — abre el sidebar */}
        <li className="flex-1">
          <button
            type="button"
            onClick={() => sidebar.setOpenMobile(true)}
            className="w-full flex flex-col items-center justify-center gap-0.5 min-h-[56px] py-1.5 text-[10px] font-medium text-crm-text-muted hover:text-crm-text-primary transition-colors"
            aria-label="Abrir menú completo"
          >
            <span className="grid place-items-center w-10 h-7 rounded-full">
              <Menu className="w-5 h-5" aria-hidden />
            </span>
            <span className="leading-tight">Más</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}
