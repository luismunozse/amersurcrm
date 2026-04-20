"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import * as Collapsible from "@radix-ui/react-collapsible";
import { ChevronDown, ChevronRight, Search, X } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { navigation, adminNavigation, type NavItem } from "@/config/navigation";
import { usePermissions } from "@/lib/permissions";
import { useSidebarBadges } from "@/hooks/useSidebarBadges";
import type { SidebarBadges } from "@/app/dashboard/actions/sidebar-badges";

const BADGE_HREF_MAP: Record<string, keyof SidebarBadges> = {
  "/dashboard/clientes": "clientes",
  "/dashboard/pipeline": "pipeline",
  "/dashboard/agenda": "agenda",
  "/dashboard/cobranza": "pagos",
};

/**
 * Agrupación por ciclo de negocio inmobiliario.
 * Los ítems se referencian por href — la definición (icono, permisos, roles)
 * sigue viviendo en @/config/navigation.
 */
export type NavGroupDef = {
  label?: string;
  hrefs: string[];
};

export const NAV_GROUPS: NavGroupDef[] = [
  { hrefs: ["/dashboard"] },
  {
    label: "Comercial",
    hrefs: ["/dashboard/clientes", "/dashboard/pipeline", "/dashboard/agenda"],
  },
  {
    label: "Inventario",
    hrefs: ["/dashboard/proyectos", "/dashboard/propiedades", "/dashboard/adquisicion"],
  },
  {
    label: "Finanzas",
    hrefs: [
      "/dashboard/cobranza",
      "/dashboard/admin/reportes?tab=comisiones",
      "/dashboard/independizacion",
    ],
  },
  {
    label: "Post-Venta",
    hrefs: ["/dashboard/entregas", "/dashboard/postventa", "/dashboard/documentos"],
  },
  {
    label: "Herramientas",
    hrefs: [
      "/dashboard/extension",
      "/dashboard/ayuda",
      "/dashboard/vendedor/reportes",
    ],
  },
  {
    label: "Administración",
    hrefs: [
      "/dashboard/admin/usuarios",
      "/dashboard/admin/marketing",
      "/dashboard/admin/reportes",
      "/dashboard/admin/metas",
      "/dashboard/admin/configuracion",
    ],
  },
];

export const ALL_NAV_ITEMS: NavItem[] = [...navigation, ...adminNavigation];
export const byHref = (href: string): NavItem | undefined =>
  ALL_NAV_ITEMS.find((i) => i.href === href);

function useIsActive() {
  const pathname = usePathname();
  return React.useCallback(
    (href: string) => {
      const [path, query] = href.split("?");
      if (path === "/dashboard") return pathname === "/dashboard";
      if (query && typeof window !== "undefined") {
        return pathname === path && window.location.search.includes(query);
      }
      return pathname.startsWith(path);
    },
    [pathname]
  );
}

function useIsChildActive() {
  const pathname = usePathname();
  return React.useCallback(
    (href: string) => {
      const [path, query] = href.split("?");
      if (query && typeof window !== "undefined") {
        return pathname === path && window.location.search.includes(query);
      }
      return pathname === href;
    },
    [pathname]
  );
}

export function useCanAccess() {
  const { tieneAlgunoDePermisos, tieneAlgunoDeRoles, esAdmin } = usePermissions();
  const canAccessNavItem = React.useCallback(
    (item: NavItem) => {
      const hasRol = !item.roles?.length || tieneAlgunoDeRoles(item.roles);
      if (esAdmin()) return hasRol;
      const hasPermiso = !item.permisos?.length || tieneAlgunoDePermisos(item.permisos);
      if (item.permisos?.length && item.roles?.length) {
        return hasPermiso || hasRol;
      }
      return hasPermiso && hasRol;
    },
    [esAdmin, tieneAlgunoDePermisos, tieneAlgunoDeRoles]
  );
  return { canAccessNavItem };
}

function NavGroupCollapsible({ item }: { item: NavItem }) {
  const isActive = useIsActive();
  const isChildActive = useIsChildActive();
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const { canAccessNavItem } = useCanAccess();

  const handleChildClick = () => {
    if (isMobile) setOpenMobile(false);
  };

  const visibleChildren = React.useMemo(
    () => (item.children ?? []).filter(canAccessNavItem),
    [item.children, canAccessNavItem]
  );

  const anyChildActive = visibleChildren.some((child) =>
    isActive(child.href.split("?")[0])
  );
  const [open, setOpen] = React.useState(anyChildActive);

  React.useEffect(() => {
    if (anyChildActive) setOpen(true);
  }, [anyChildActive]);

  if (visibleChildren.length === 0) return null;

  if (collapsed) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          isActive={anyChildActive}
          tooltip={item.name}
          className="min-h-11 md:min-h-8"
        >
          <Link href={item.href} onClick={handleChildClick}>
            {item.icon}
            <span>{item.name}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  return (
    <Collapsible.Root open={open} onOpenChange={setOpen} asChild>
      <SidebarMenuItem>
        <Collapsible.Trigger asChild>
          <SidebarMenuButton
            isActive={anyChildActive}
            className="min-h-11 md:min-h-8"
          >
            {item.icon}
            <span>{item.name}</span>
            <ChevronDown
              className={`ml-auto h-4 w-4 shrink-0 transition-transform duration-200 ${
                open ? "rotate-180" : ""
              }`}
            />
          </SidebarMenuButton>
        </Collapsible.Trigger>
        <Collapsible.Content className="overflow-hidden data-[state=open]:animate-[collapsible-down_150ms_ease-out] data-[state=closed]:animate-[collapsible-up_150ms_ease-out]">
          <SidebarMenuSub>
            {visibleChildren.map((child) => (
              <SidebarMenuSubItem key={child.name}>
                <SidebarMenuSubButton
                  asChild
                  isActive={isChildActive(child.href)}
                  className="min-h-10 md:min-h-7"
                >
                  <Link href={child.href} onClick={handleChildClick}>
                    {child.icon}
                    <span>{child.name}</span>
                  </Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </Collapsible.Content>
      </SidebarMenuItem>
    </Collapsible.Root>
  );
}

function NavLeaf({ item, dynamicBadge }: { item: NavItem; dynamicBadge?: number }) {
  const isActive = useIsActive();
  const { isMobile, setOpenMobile } = useSidebar();
  const hasDynamic = typeof dynamicBadge === "number" && dynamicBadge > 0;
  const badgeContent = hasDynamic
    ? dynamicBadge > 99
      ? "99+"
      : String(dynamicBadge)
    : item.badge;

  const handleClick = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isActive(item.href)}
        tooltip={
          hasDynamic ? `${item.name} (${badgeContent})` : item.name
        }
        size="sm"
        className="min-h-11 md:min-h-8 text-sm md:text-xs"
      >
        <Link href={item.href} onClick={handleClick}>
          {item.icon}
          <span>{item.name}</span>
        </Link>
      </SidebarMenuButton>
      {badgeContent && (
        <SidebarMenuBadge
          className={
            hasDynamic
              ? "bg-crm-primary text-white"
              : undefined
          }
        >
          {badgeContent}
        </SidebarMenuBadge>
      )}
    </SidebarMenuItem>
  );
}

function SkeletonList({ count }: { count: number }) {
  return (
    <SidebarMenu>
      {Array.from({ length: count }).map((_, i) => (
        <SidebarMenuItem key={i}>
          <SidebarMenuSkeleton showIcon />
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}

const GROUP_STATE_KEY = "sidebarGroupsOpen";

function useGroupOpenState() {
  const [openMap, setOpenMap] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(GROUP_STATE_KEY);
      if (raw) setOpenMap(JSON.parse(raw));
    } catch {}
  }, []);

  const setOpen = React.useCallback((label: string, open: boolean) => {
    setOpenMap((prev) => {
      const next = { ...prev, [label]: open };
      try {
        localStorage.setItem(GROUP_STATE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const isOpen = React.useCallback(
    (label: string) => openMap[label] ?? true,
    [openMap]
  );

  return { isOpen, setOpen };
}

function CollapsibleNavGroup({
  label,
  children,
  isOpen,
  onOpenChange,
}: {
  label: string;
  children: React.ReactNode;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { state } = useSidebar();
  // En modo icono, forzar abierto: los ítems se muestran como íconos siempre.
  const effectiveOpen = state === "collapsed" ? true : isOpen;
  return (
    <Collapsible.Root open={effectiveOpen} onOpenChange={onOpenChange}>
      <SidebarGroup className="py-1.5">
        <Collapsible.Trigger asChild>
          <SidebarGroupLabel className="group/label cursor-pointer hover:text-sidebar-foreground transition-colors h-10 md:h-8">
            <ChevronRight
              className={`mr-1 h-3.5 w-3.5 md:h-3 md:w-3 shrink-0 transition-transform duration-200 ${
                isOpen ? "rotate-90" : ""
              }`}
            />
            {label}
          </SidebarGroupLabel>
        </Collapsible.Trigger>
        <Collapsible.Content className="overflow-hidden data-[state=open]:animate-[collapsible-down_150ms_ease-out] data-[state=closed]:animate-[collapsible-up_150ms_ease-out]">
          <SidebarGroupContent>{children}</SidebarGroupContent>
        </Collapsible.Content>
      </SidebarGroup>
    </Collapsible.Root>
  );
}

function useAutoScrollActive(deps: unknown[]) {
  const contentRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const node = contentRef.current;
    if (!node) return;
    const active = node.querySelector<HTMLElement>('[data-active="true"]');
    if (active) {
      active.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return contentRef;
}

function SidebarMobileHeaderControls() {
  const { isMobile, setOpenMobile } = useSidebar();
  if (!isMobile) return null;
  return (
    <>
      <div className="flex justify-center pt-1 pb-2 md:hidden">
        <span className="h-1 w-10 rounded-full bg-sidebar-foreground/20" />
      </div>
      <button
        type="button"
        onClick={() => setOpenMobile(false)}
        className="absolute right-2 top-2 grid h-10 w-10 place-items-center rounded-full text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground md:hidden"
        aria-label="Cerrar menú"
      >
        <X className="h-5 w-5" />
      </button>
    </>
  );
}

export function SidebarShadcn() {
  const { loading, error, refetch } = usePermissions();
  const { canAccessNavItem } = useCanAccess();
  const badges = useSidebarBadges();
  const pathname = usePathname();
  const { isOpen: isGroupOpen, setOpen: setGroupOpen } = useGroupOpenState();
  const scrollRef = useAutoScrollActive([pathname, loading]);

  // Resolver cada grupo: mapear hrefs → NavItem → filtrar por permisos.
  // Descartar grupos sin ítems visibles.
  const resolvedGroups = React.useMemo(() => {
    return NAV_GROUPS.map((group) => ({
      label: group.label,
      items: group.hrefs
        .map(byHref)
        .filter((item): item is NavItem => !!item)
        .filter(canAccessNavItem),
    })).filter((group) => group.items.length > 0);
  }, [canAccessNavItem]);

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <SidebarMobileHeaderControls />

        <div className="flex items-center gap-2 px-1 py-1">
          <div className="relative group-data-[collapsible=icon]:hidden">
            <div className="absolute inset-0 bg-crm-primary/25 rounded-lg blur-sm" />
            <Image
              src="/amersur-logo-b.png"
              alt="AMERSUR"
              width={32}
              height={32}
              className="relative h-8 w-8 object-contain"
              priority
            />
          </div>
          <div className="flex items-baseline gap-1.5 group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-bold tracking-wide leading-none">AMERSUR</span>
            <span className="text-xs font-semibold text-crm-primary tracking-wider leading-none">CRM</span>
          </div>

          <Image
            src="/ISOTIPOOO.png"
            alt="AMERSUR"
            width={28}
            height={28}
            className="hidden group-data-[collapsible=icon]:block h-7 w-7 object-contain mx-auto"
            priority
          />
        </div>

        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent("command-palette:open"))}
          className="mx-1 mt-1 flex items-center gap-2 rounded-md border border-sidebar-border/60 bg-sidebar-accent/40 px-3 py-2.5 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-1.5 md:text-xs md:py-1.5"
          aria-label="Buscar"
          title="Buscar (Ctrl/Cmd+K)"
        >
          <Search className="h-4 w-4 shrink-0 md:h-3.5 md:w-3.5" />
          <span className="flex-1 text-left group-data-[collapsible=icon]:hidden">Buscar…</span>
          <kbd className="ml-auto hidden lg:inline-flex items-center gap-0.5 rounded bg-sidebar/50 px-1.5 py-0.5 font-mono text-[10px] text-sidebar-foreground/60 group-data-[collapsible=icon]:hidden">
            ⌘K
          </kbd>
        </button>
      </SidebarHeader>

      <SidebarContent
        ref={scrollRef}
        className="scrollbar-auto-hide group-data-[collapsible=icon]:!overflow-y-auto"
      >
        {loading ? (
          <SidebarGroup className="py-1.5">
            <SidebarGroupContent>
              <SkeletonList count={8} />
            </SidebarGroupContent>
          </SidebarGroup>
        ) : error ? (
          <div className="px-3 py-4 text-center">
            <p className="text-xs text-sidebar-foreground/70 group-data-[collapsible=icon]:hidden">
              Error cargando menú
            </p>
            <button
              onClick={() => refetch()}
              className="mt-2 text-xs text-crm-primary hover:text-crm-primary-hover transition-colors"
            >
              <span className="group-data-[collapsible=icon]:hidden">Reintentar</span>
              <span className="hidden group-data-[collapsible=icon]:inline">↻</span>
            </button>
          </div>
        ) : (
          resolvedGroups.map((group, idx) => {
            const menuContent = (
              <SidebarMenu className="gap-0.5">
                {group.items.map((item) => {
                  if (item.children && item.children.length > 0) {
                    return <NavGroupCollapsible key={item.name} item={item} />;
                  }
                  const badgeKey = BADGE_HREF_MAP[item.href];
                  const dynamicBadge = badgeKey ? badges[badgeKey] : undefined;
                  return (
                    <NavLeaf
                      key={item.name}
                      item={item}
                      dynamicBadge={dynamicBadge}
                    />
                  );
                })}
              </SidebarMenu>
            );

            // Grupo sin label (Principal) — no colapsable
            if (!group.label) {
              return (
                <SidebarGroup key={`principal-${idx}`} className="py-1.5">
                  <SidebarGroupContent>{menuContent}</SidebarGroupContent>
                </SidebarGroup>
              );
            }

            // Grupos con label — colapsables, persistidos en localStorage
            return (
              <CollapsibleNavGroup
                key={group.label}
                label={group.label}
                isOpen={isGroupOpen(group.label)}
                onOpenChange={(open) => setGroupOpen(group.label!, open)}
              >
                {menuContent}
              </CollapsibleNavGroup>
            );
          })
        )}
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}
