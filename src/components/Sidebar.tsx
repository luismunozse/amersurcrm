"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import * as Tooltip from "@radix-ui/react-tooltip";
import { usePermissions } from "@/lib/permissions";
import { navigation, adminNavigation, type NavItem } from "@/config/navigation";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  collapsed?: boolean;
  onCollapseChange?: (collapsed: boolean) => void;
}

function NavLink({
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
        "group flex items-center rounded-xl text-sm font-medium transition-all duration-300 relative overflow-hidden",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crm-primary focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800",
        collapsed ? "lg:justify-center lg:px-2 lg:py-2 lg:mx-1.5" : "px-4 py-3",
        active
          ? "bg-gradient-to-r from-crm-primary to-crm-primary-hover text-white shadow-lg shadow-crm-primary/30 scale-[1.02]"
          : "text-crm-text-muted hover:bg-crm-sidebar-hover hover:text-white hover:shadow-lg hover:shadow-crm-primary/10 hover:scale-[1.03]"
      )}
    >
      {/* Efecto de brillo en hover */}
      {!active && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
      )}

      {/* Indicador activo más visible */}
      {active && (
        <>
          <div className={cn(
            "absolute top-1/2 -translate-y-1/2 w-1 bg-white rounded-r-full",
            collapsed ? "left-0 h-8" : "left-0 h-10"
          )} />
          {collapsed && (
            <div className="absolute inset-0 bg-white/5 rounded-xl animate-pulse" />
          )}
        </>
      )}

      {/* Glow effect en hover cuando está colapsado */}
      {collapsed && !active && (
        <div className="absolute inset-0 bg-crm-primary/0 group-hover:bg-crm-primary/10 rounded-xl transition-colors duration-300" />
      )}

      <div className={cn("relative z-10 flex items-center w-full", collapsed ? "lg:gap-0 lg:justify-center" : "lg:gap-3 justify-between")}
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
}

export function Sidebar({ isOpen, onClose, collapsed: externalCollapsed = false, onCollapseChange }: SidebarProps) {
  const pathname = usePathname();
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const {
    loading: permisosLoading,
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

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);

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
    if (permisosLoading) return adminNavigation;
    return adminNavigation.filter(canAccessNavItem);
  }, [permisosLoading, canAccessNavItem]);

  const showAdminSection = filteredAdminNavigation.length > 0;

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

  const renderNavItems = (items: NavItem[]) =>
    items.map((item, i) => (
      <NavLink
        key={item.name}
        href={item.href}
        active={isActive(item.href)}
        onClick={onClose}
        collapsed={collapsed}
        label={item.name}
        badge={item.badge}
        style={!collapsed ? { transitionDelay: `${i * 25}ms` } : undefined}
      >
        <span
          className={cn(
            "shrink-0 grid place-items-center transition-all",
            collapsed ? "w-9 h-9" : "w-8 h-8"
          )}
        >
          {item.icon}
        </span>
        <span
          className={cn(
            "transition-all duration-300 ease-out whitespace-nowrap",
            collapsed
              ? "max-w-0 opacity-0 translate-x-2 pointer-events-none"
              : "max-w-[12rem] opacity-100 translate-x-0 truncate"
          )}
        >
          {item.name}
        </span>
      </NavLink>
    ));

  const SkeletonNav = ({ count }: { count: number }) => (
    <div className={cn("space-y-1.5", collapsed && "px-1")} role="status" aria-label="Cargando navegación">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={`sidebar-skeleton-${idx}`}
          className={cn(
            "flex items-center gap-3 rounded-xl overflow-hidden relative",
            collapsed ? "lg:mx-1.5 lg:justify-center lg:px-2 lg:py-2" : "px-4 py-3"
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
      {/* Overlay móvil mejorado con blur */}
      {isOpen && (
        <button
          aria-label="Cerrar menú"
          className="fixed inset-0 bg-gradient-to-r from-black/50 to-black/30 backdrop-blur-md z-40 lg:hidden animate-in fade-in-0 duration-300 cursor-default"
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
          // ancho móvil (expandido)
          "w-80 sm:w-72",
          // Transiciones mejoradas con soporte para reduced motion
          prefersReducedMotion
            ? "transition-none" // Sin animaciones si el usuario lo prefiere
            : cn(
                "transform transition-all duration-300 ease-[cubic-bezier(0.4,0.0,0.2,1)]",
                "lg:transition-[width] lg:duration-300 lg:ease-[cubic-bezier(0.4,0.0,0.2,1)]"
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
            "flex items-center h-20 px-6 border-b border-crm-sidebar-hover bg-gradient-to-r from-crm-sidebar to-crm-sidebar-hover/50",
            collapsed ? "lg:justify-center lg:px-3" : "justify-between"
          )}>
            <div className={cn("flex items-center", collapsed ? "lg:space-x-0" : "space-x-4 w-full")}>
              {/* Logo o botón hamburguesa */}
              {collapsed ? (
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    <button
                      type="button"
                      onClick={() => handleCollapseChange(false)}
                      className="hidden lg:flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-crm-primary/30 to-crm-accent/30 backdrop-blur-sm border-2 border-crm-primary/40 text-white hover:border-crm-primary/60 hover:from-crm-primary/40 hover:to-crm-accent/40 transition-all duration-300 shadow-xl shadow-crm-primary/20 hover:shadow-2xl hover:shadow-crm-primary/30 hover:scale-110 active:scale-95 group relative overflow-hidden"
                      aria-label="Expandir sidebar"
                    >
                      {/* Efecto de brillo animado */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                      <Bars3Icon className="w-7 h-7 relative z-10 transition-transform group-hover:rotate-180 group-hover:scale-110" />
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
                <div className="relative flex-shrink-0">
                  <div className="absolute inset-0 bg-gradient-to-br from-crm-primary/20 to-crm-accent/20 rounded-2xl blur-sm" />
                  <div className="relative bg-white/10 backdrop-blur-sm rounded-2xl p-2 border border-white/20">
                    <Image src="/amersur-logo-b.png" alt="AMERSUR" width={48} height={48} className="h-12 w-12 object-contain" priority />
                  </div>
                  <div className="absolute inset-0 bg-crm-primary/30 rounded-2xl blur-lg -z-10" />
                </div>
              )}

              {/* Títulos (ocultos al colapsar) */}
              <div className={cn("flex-1 min-w-0 flex flex-col justify-center", collapsed && "hidden lg:hidden")}>
                <span className="text-white font-bold text-xl block tracking-wide leading-tight">AMERSUR</span>
                <span className="text-crm-primary font-semibold text-base block tracking-wider leading-tight">CRM</span>
                <p className="text-xs text-crm-text-muted mt-0.5 hidden sm:block font-medium leading-tight">Tu Propiedad, sin fronteras</p>
              </div>
            </div>

            {/* Botón hamburguesa para colapsar (desktop) - Solo visible cuando no está colapsado */}
            {!collapsed && (
              <button
                type="button"
                onClick={() => handleCollapseChange(true)}
                className="hidden lg:flex items-center justify-center ml-3 w-10 h-10 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 text-white/70 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all duration-300 hover:scale-110 active:scale-95 group"
                aria-label="Colapsar sidebar"
                title="Colapsar menú"
              >
                <Bars3Icon className="w-6 h-6 transition-transform group-hover:rotate-180" />
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
              "flex-1 overflow-y-auto",
              collapsed ? "px-2 py-3 space-y-0.5" : "px-4 sm:px-6 py-6 space-y-1.5"
            )}
          >
            {permisosLoading ? (
              <SkeletonNav count={collapsed ? 4 : 7} />
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
                      <div className="w-2 h-2 bg-crm-primary rounded-full mr-2 animate-pulse" />
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
