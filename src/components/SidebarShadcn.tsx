"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import * as Collapsible from "@radix-ui/react-collapsible";
import { ChevronDown } from "lucide-react";
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
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { navigation, adminNavigation, type NavItem } from "@/config/navigation";
import { usePermissions } from "@/lib/permissions";

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

function NavGroup({ item }: { item: NavItem }) {
  const isActive = useIsActive();
  const isChildActive = useIsChildActive();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  const { canAccessNavItem } = useCanAccess();
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

  // En modo colapsado, el grupo se renderiza como botón plano al padre
  if (collapsed) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton asChild isActive={anyChildActive} tooltip={item.name}>
          <Link href={item.href}>
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
          <SidebarMenuButton isActive={anyChildActive}>
            {item.icon}
            <span>{item.name}</span>
            <ChevronDown
              className={cnChev(open)}
            />
          </SidebarMenuButton>
        </Collapsible.Trigger>
        <Collapsible.Content className="overflow-hidden data-[state=open]:animate-[collapsible-down_150ms_ease-out] data-[state=closed]:animate-[collapsible-up_150ms_ease-out]">
          <SidebarMenuSub>
            {visibleChildren.map((child) => (
              <SidebarMenuSubItem key={child.name}>
                <SidebarMenuSubButton asChild isActive={isChildActive(child.href)}>
                  <Link href={child.href}>
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

function cnChev(open: boolean) {
  return `ml-auto h-4 w-4 shrink-0 transition-transform duration-200 ${
    open ? "rotate-180" : ""
  }`;
}

function NavLeaf({ item }: { item: NavItem }) {
  const isActive = useIsActive();
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isActive(item.href)}
        tooltip={item.name}
      >
        <Link href={item.href}>
          {item.icon}
          <span>{item.name}</span>
        </Link>
      </SidebarMenuButton>
      {item.badge && <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>}
    </SidebarMenuItem>
  );
}

function NavList({ items }: { items: NavItem[] }) {
  const { canAccessNavItem } = useCanAccess();
  const visible = items.filter(canAccessNavItem);

  return (
    <SidebarMenu>
      {visible.map((item) =>
        item.children && item.children.length > 0 ? (
          <NavGroup key={item.name} item={item} />
        ) : (
          <NavLeaf key={item.name} item={item} />
        )
      )}
    </SidebarMenu>
  );
}

function useCanAccess() {
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

export function SidebarShadcn() {
  const { loading, error, refetch } = usePermissions();
  const { canAccessNavItem } = useCanAccess();

  const showAdmin =
    !loading && adminNavigation.some((i) => canAccessNavItem(i));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-1 py-1">
          <div className="relative">
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
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            {loading ? (
              <SkeletonList count={7} />
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
              <NavList items={navigation} />
            )}
          </SidebarGroupContent>
        </SidebarGroup>

        {showAdmin && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel>Sistema</SidebarGroupLabel>
              <SidebarGroupContent>
                <NavList items={adminNavigation} />
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}
