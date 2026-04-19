"use client";

import React, { memo, useState, useEffect, useCallback, useMemo, useRef, Fragment } from "react";
import { ChevronDown as ChevronDownIcon, Menu as Bars3Icon, X as XMarkIcon } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import * as Tooltip from "@radix-ui/react-tooltip";
import { usePermissions } from "@/lib/permissions";
import { navigation, adminNavigation, type NavItem } from "@/config/navigation";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  collapsed?: boolean;
  onCollapseChange?: (collapsed: boolean) => void;
}

const NavLink = memo(function NavLink({
  href, active, children, onClick, collapsed = false, label = "", style, badge,
}: {
  href: string; active: boolean; children: React.ReactNode; onClick?: () => void; collapsed?: boolean; label?: string; style?: React.CSSProperties; badge?: string;
}) {
  const content = (
    <Link
      href={href}
      onClick={onClick}
      role="menuitem"
      aria-current={active ? "page" : undefined}
      style={style}
      className={cn(
        "flex items-center rounded-xl text-sm font-medium transition-colors duration-150 relative",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crm-primary focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800",
        collapsed ? "lg:justify-center lg:px-2 lg:py-2 lg:mx-1.5" : "px-4 py-2",
        active
          ? "bg-crm-primary text-white shadow-md shadow-crm-primary/20"
          : "text-crm-text-muted hover:bg-crm-sidebar-hover hover:text-white"
      )}
    >
      {active && (
        <div className={cn(
          "absolute top-1/2 -translate-y-1/2 w-1 bg-white rounded-r-full",
          collapsed ? "left-0 h-8" : "left-0 h-10"
        )} />
      )}

      <div className={cn("relative flex items-center w-full", collapsed ? "lg:gap-0 lg:justify-center" : "lg:gap-3 justify-between")}
      >
        <div className="flex items-center gap-3">
          {children}
        </div>
        {badge && !collapsed && (
          <span className="px-2 py-0.5 text-[10px] font-semibold bg-green-500 text-white rounded-full">
            {badge}
          </span>
        )}
      </div>
    </Link>
  );

  // Si está colapsado en desktop, envolver en Tooltip (Provider está a nivel del Sidebar)
  if (collapsed && label) {
    return (
      <>
        <Tooltip.Root>
          <Tooltip.Trigger asChild className="hidden lg:block">
            {content}
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content
              side="right"
              sideOffset={12}
              className="z-50 px-4 py-2.5 bg-crm-card border border-crm-border rounded-xl shadow-2xl text-sm font-medium text-crm-text-primary animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
            >
              {label}
              <Tooltip.Arrow className="fill-crm-border" />
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
        {/* Para móvil, mostrar sin tooltip */}
        <div className="lg:hidden">
          {content}
        </div>
      </>
    );
  }

  return content;
});

export function Sidebar({ isOpen, onClose, collapsed: externalCollapsed = false, onCollapseChange }: SidebarProps) {
  const pathname = usePathname();
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const {
    loading: permisosLoading,
    error: permisosError,
    refetch: refetchPermisos,
    tieneAlgunoDePermisos,
    tieneAlgunoDeRoles,
    esAdmin,
  } = usePermissions();

  const collapsed = externalCollapsed !== undefined ? externalCollapsed : internalCollapsed;

  const handleCollapseChange = useCallback((newCollapsed: boolean) => {
    if (onCollapseChange) {
      onCollapseChange(newCollapsed);
    } else {
      setInternalCollapsed(newCollapsed);
    }
  }, [onCollapseChange]);

  // Detectar preferencia de reduced motion
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Swipe-to-close en móvil
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const deltaX = touchEndX - touchStartX.current;
    const deltaY = Math.abs(touchEndY - touchStartY.current);

    // Swipe hacia la izquierda (deltaX negativo) con suficiente distancia y más horizontal que vertical
    if (deltaX < -80 && deltaY < 100) {
      onClose();
    }

    touchStartX.current = null;
    touchStartY.current = null;
  }, [onClose]);

  // Persistencia + variable global para margin del contenido
  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("sidebarCollapsed") : null;
    if (saved === "1") handleCollapseChange(true);
  }, [handleCollapseChange]);
  useEffect(() => {
    try { localStorage.setItem("sidebarCollapsed", collapsed ? "1" : "0"); } catch {}
    // togglear clase en <html> para cambiar --sidebar-w
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("sidebar-collapsed", collapsed);
    }
  }, [collapsed]);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    // Si el href tiene query params, hacer match exacto del path + query
    if (href.includes('?')) {
      const [path, query] = href.split('?');
      return pathname === path && (typeof window !== 'undefined' ? window.location.search.includes(query) : false);
    }
    return pathname.startsWith(href);
  };

  // Para sub-items: solo marcar activo si la URL coincide exactamente (sin que hermanos se activen)
  const isChildActive = (href: string) => {
    if (href.includes('?')) {
      const [path, query] = href.split('?');
      return pathname === path && (typeof window !== 'undefined' ? window.location.search.includes(query) : false);
    }
    return pathname === href;
  };

  const canAccessNavItem = useCallback(
    (item: NavItem) => {
      const hasRol = !item.roles?.length || tieneAlgunoDeRoles(item.roles);

      // Los administradores saltan verificaciones de permisos,
      // pero se respetan las restricciones de roles explícitas
      if (esAdmin()) return hasRol;

      const hasPermiso = !item.permisos?.length || tieneAlgunoDePermisos(item.permisos);

      // Si el ítem define ambos, permitir si cumple al menos uno
      if (item.permisos?.length && item.roles?.length) {
        return hasPermiso || hasRol;
      }

      // Caso contrario, debe cumplir el requisito definido
      return hasPermiso && hasRol;
    },
    [esAdmin, tieneAlgunoDePermisos, tieneAlgunoDeRoles]
  );

  const filteredNavigation = useMemo(() => {
    if (permisosLoading) return [];
    return navigation.filter(canAccessNavItem);
  }, [permisosLoading, canAccessNavItem]);

  const filteredAdminNavigation = useMemo(() => {
    if (permisosLoading) return [];
    return adminNavigation.filter(canAccessNavItem);
  }, [permisosLoading, canAccessNavItem]);

  const showAdminSection = !permisosLoading && filteredAdminNavigation.length > 0;

  // Keyboard navigation handler
  const handleNavKeyDown = useCallback((e: React.KeyboardEvent<HTMLElement>) => {
    const nav = e.currentTarget;
    const items = nav.querySelectorAll<HTMLAnchorElement>('a[role="menuitem"]');
    const currentIndex = Array.from(items).findIndex(item => item === document.activeElement);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
      items[nextIndex]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
      items[prevIndex]?.focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      items[0]?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      items[items.length - 1]?.focus();
    }
  }, []);

  // Estado para sub-menús expandidos
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Auto-expandir grupo si algún hijo está activo
  useEffect(() => {
    const newExpanded: Record<string, boolean> = {};
    navigation.forEach(item => {
      if (item.children?.some(child => isActive(child.href.split('?')[0]))) {
        newExpanded[item.name] = true;
      }
    });
    if (isActive('/dashboard/cobranza')) newExpanded['Control de Pagos'] = true;

    const keys = Object.keys(newExpanded);
    if (keys.length === 0) return;

    setExpandedGroups(prev => {
      if (keys.every(k => prev[k] === true)) return prev;
      return { ...prev, ...newExpanded };
    });
  }, [pathname]);

  const toggleGroup = useCallback((name: string) => {
    setExpandedGroups(prev => ({ ...prev, [name]: !prev[name] }));
  }, []);

  const renderNavItems = (items: NavItem[]) =>
    items.map((item, i) => {
      // Item con sub-items (grupo expandible)
      if (item.children && item.children.length > 0 && !collapsed) {
        const isExpanded = expandedGroups[item.name] || false;
        const anyChildActive = item.children.some(child => isActive(child.href.split('?')[0]));

        return (
          <Fragment key={item.name}>
            <button
              onClick={() => toggleGroup(item.name)}
              className={cn(
                "flex items-center w-full rounded-xl text-sm font-medium transition-colors duration-150 px-4 py-2",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crm-primary",
                anyChildActive
                  ? "text-white"
                  : "text-crm-text-muted hover:bg-crm-sidebar-hover hover:text-white"
              )}
            >
              <div className="flex items-center w-full justify-between">
                <div className="flex items-center gap-3">
                  <span className="shrink-0 grid place-items-center w-8 h-8">
                    {item.icon}
                  </span>
                  <span className="whitespace-nowrap truncate">{item.name}</span>
                </div>
                <ChevronDownIcon className={cn(
                  "w-4 h-4 transition-transform duration-200",
                  isExpanded ? "rotate-180" : ""
                )} />
              </div>
            </button>

            {/* Sub-items */}
            <div className={cn(
              "overflow-hidden transition-all duration-200",
              isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
            )}>
              <div className="ml-6 pl-3 border-l border-crm-sidebar-hover/30 space-y-0.5 py-1">
                {item.children.filter(canAccessNavItem).map((child) => {
                  const childActive = isChildActive(child.href);
                  return (
                    <Link
                      key={child.name}
                      href={child.href}
                      onClick={onClose}
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
                        childActive
                          ? "text-white bg-white/10 font-medium"
                          : "text-crm-text-muted hover:text-white hover:bg-white/5"
                      )}
                    >
                      <span className="shrink-0 w-5 h-5 grid place-items-center opacity-70">
                        {child.icon}
                      </span>
                      <span className="truncate">{child.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </Fragment>
        );
      }

      // Item simple (sin hijos)
      return (
        <NavLink
          key={item.name}
          href={item.href}
          active={isActive(item.href)}
          onClick={onClose}
          collapsed={collapsed}
          label={item.name}
          badge={item.badge}
        >
          <span
            className={cn(
              "shrink-0 grid place-items-center",
              collapsed ? "w-9 h-9" : "w-8 h-8"
            )}
          >
            {item.icon}
          </span>
          <span
            className={cn(
              "whitespace-nowrap",
              collapsed
                ? "hidden"
                : "max-w-[12rem] truncate"
            )}
          >
            {item.name}
          </span>
        </NavLink>
      );
    });

  const SkeletonNav = ({ count }: { count: number }) => (
    <div className={cn("space-y-1.5", collapsed && "px-1")} role="status" aria-label="Cargando navegación">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={`sidebar-skeleton-${idx}`}
          className={cn(
            "flex items-center gap-3 rounded-xl overflow-hidden relative",
            collapsed ? "lg:mx-1.5 lg:justify-center lg:px-2 lg:py-2" : "px-4 py-2"
          )}
        >
          {/* Shimmer effect */}
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent" />

          {/* Icono skeleton */}
          <div className={cn(
            "rounded-lg bg-crm-sidebar-hover/50",
            collapsed ? "w-9 h-9" : "w-8 h-8"
          )} />

          {/* Texto skeleton (solo si no está colapsado) */}
          {!collapsed && (
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-crm-sidebar-hover/50 rounded w-3/4" />
            </div>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <Tooltip.Provider delayDuration={200}>
      {/* Overlay móvil */}
      {isOpen && (
        <button
          aria-label="Cerrar menú"
          className="fixed inset-0 bg-black/50 z-40 lg:hidden animate-in fade-in-0 duration-150 cursor-default"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        aria-label="Barra lateral de navegación"
        data-collapsed={collapsed}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={cn(
          "fixed inset-y-0 left-0 z-50 bg-crm-sidebar",
          // Sombra profunda para efecto flotante
          "shadow-2xl shadow-black/30",
          "lg:border-r lg:border-crm-sidebar-hover/30",
          // En desktop, sidebar es fixed flotante
          "lg:fixed lg:top-0 lg:h-screen lg:z-40",
          // ancho desktop controlado por variable
          "lg:w-[var(--sidebar-w)]",
          // ancho móvil (expandido) - 85vw para dejar espacio visible del overlay
          "w-[85vw] max-w-80 sm:w-72",
          // Transiciones mejoradas con soporte para reduced motion
          prefersReducedMotion
            ? "transition-none" // Sin animaciones si el usuario lo prefiere
            : cn(
                "transform transition-all duration-300 ease-in-out",
                "lg:transition-[width] lg:duration-300 lg:ease-in-out"
              ),
          // Animación mejorada con scale en móvil
          isOpen
            ? "translate-x-0 scale-100 opacity-100"
            : "-translate-x-full scale-95 opacity-0",
          // En desktop siempre visible
          "lg:translate-x-0 lg:scale-100 lg:opacity-100"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className={cn(
            "flex items-center h-16 px-5 border-b border-crm-sidebar-hover bg-gradient-to-r from-crm-sidebar to-crm-sidebar-hover/50",
            collapsed ? "lg:justify-center lg:px-3" : "justify-between"
          )}>
            <div className={cn("flex items-center", collapsed ? "lg:space-x-0" : "space-x-3 w-full")}>
              {/* Logo o botón hamburguesa */}
              {collapsed ? (
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    <button
                      type="button"
                      onClick={() => handleCollapseChange(false)}
                      className="hidden lg:flex items-center justify-center w-12 h-12 rounded-xl bg-crm-primary/25 border-2 border-crm-primary/40 text-white hover:border-crm-primary/60 hover:bg-crm-primary/35 transition-colors duration-150 shadow-md shadow-crm-primary/20"
                      aria-label="Expandir sidebar"
                    >
                      <Bars3Icon className="w-6 h-6" />
                    </button>
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Content
                      side="right"
                      sideOffset={12}
                      className="z-50 px-4 py-2.5 bg-crm-card border border-crm-border rounded-xl shadow-2xl text-sm font-medium text-crm-text-primary animate-in fade-in-0 zoom-in-95"
                    >
                      Expandir menú
                      <Tooltip.Arrow className="fill-crm-border" />
                    </Tooltip.Content>
                  </Tooltip.Portal>
                </Tooltip.Root>
              ) : (
                <div className="relative flex-shrink-0 bg-white/10 rounded-xl p-1.5 border border-white/20">
                  <Image src="/amersur-logo-b.png" alt="AMERSUR" width={36} height={36} className="h-9 w-9 object-contain" priority />
                </div>
              )}

              {/* Títulos (ocultos al colapsar) */}
              <div className={cn("flex-1 min-w-0 flex items-baseline gap-2", collapsed && "hidden lg:hidden")}>
                <span className="text-white font-bold text-lg tracking-wide leading-none">AMERSUR</span>
                <span className="text-crm-primary font-semibold text-sm tracking-wider leading-none">CRM</span>
              </div>
            </div>

            {/* Botón hamburguesa para colapsar (desktop) - Solo visible cuando no está colapsado */}
            {!collapsed && (
              <button
                type="button"
                onClick={() => handleCollapseChange(true)}
                className="hidden lg:flex items-center justify-center ml-3 w-10 h-10 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 hover:border-white/20 transition-colors duration-150"
                aria-label="Colapsar sidebar"
                title="Colapsar menú"
              >
                <Bars3Icon className="w-6 h-6" />
              </button>
            )}

            {/* Close (mobile) */}
            <button
              onClick={onClose}
              className="lg:hidden text-crm-text-muted hover:text-white flex-shrink-0 transition-colors"
              aria-label="Cerrar menú"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>

          </div>

          {/* Navigation */}
          <nav
            role="menu"
            aria-label="Navegación principal"
            onKeyDown={handleNavKeyDown}
            className={cn(
              "flex-1 overflow-y-auto scrollbar-auto-hide",
              collapsed ? "px-2 py-3 space-y-0.5" : "px-4 sm:px-6 py-4 space-y-1"
            )}
          >
            {permisosLoading ? (
              <SkeletonNav count={collapsed ? 4 : 7} />
            ) : permisosError ? (
              <div className={cn("text-center", collapsed ? "px-1 py-4" : "px-4 py-6")}>
                <p className={cn("text-crm-text-muted text-xs", collapsed && "hidden")}>
                  Error cargando menú
                </p>
                <button
                  onClick={() => refetchPermisos()}
                  className="mt-2 text-xs text-crm-primary hover:text-crm-primary-hover transition-colors"
                >
                  {collapsed ? "↻" : "Reintentar"}
                </button>
              </div>
            ) : (
              renderNavItems(filteredNavigation)
            )}

            {showAdminSection && (
              <>
                {/* Separador mejorado */}
                <div className={cn(
                  "relative flex items-center justify-center",
                  collapsed ? "my-3 px-2" : "my-6"
                )}>
                  {collapsed ? (
                    // Versión colapsada: solo línea vertical sutil
                    <div className="relative w-8 flex items-center justify-center">
                      <div className="h-8 w-px bg-gradient-to-b from-transparent via-crm-sidebar-hover/50 to-transparent" />
                    </div>
                  ) : (
                    // Versión expandida: línea horizontal elegante
                    <div className="relative w-full flex items-center">
                      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-crm-sidebar-hover to-transparent" />
                    </div>
                  )}
                </div>

                {/* Título de sección admin */}
                {!collapsed && (
                  <div className="px-4 py-2 mb-2">
                    <h3 className="text-xs font-bold text-crm-primary uppercase tracking-widest flex items-center">
                      <div className="w-2 h-2 bg-crm-primary rounded-full mr-2" />
                      Sistema
                    </h3>
                  </div>
                )}

                {renderNavItems(filteredAdminNavigation)}
              </>
            )}

            {/* Mensaje informativo eliminado para simplificar la vista cuando no hay secciones admin visibles */}
          </nav>

        </div>
      </aside>
    </Tooltip.Provider>
  );
}
