"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import * as Tooltip from "@radix-ui/react-tooltip";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  collapsed?: boolean;
  onCollapseChange?: (collapsed: boolean) => void;
}

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z" />
      </svg>
  )},
  { name: "Clientes", href: "/dashboard/clientes", icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
  )},
  { name: "Leads", href: "/dashboard/leads", icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3M5 21h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 13h8m-8 4h5" />
      </svg>
  )},
  { name: "Proyectos", href: "/dashboard/proyectos", icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
  )},
  { name: "Propiedades", href: "/dashboard/propiedades", icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
  )},
  { name: "Agenda", href: "/dashboard/agenda", icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
  )},
  { name: "Documentos", href: "/dashboard/documentos", icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>
  )},
  { name: "Centro de Ayuda", href: "/dashboard/ayuda", icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
  )},
];

const adminNavigation = [
  { name: "Usuarios", href: "/dashboard/admin/usuarios", icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
      </svg>
  )},
  { name: "Marketing", href: "/dashboard/admin/marketing", icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
      </svg>
  )},
  { name: "Reportes", href: "/dashboard/admin/reportes", icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
  )},
  { name: "Configuración", href: "/dashboard/admin/configuracion", icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
  )},
];

function NavLink({
  href, active, children, onClick, collapsed = false, label = "", style,
}: {
  href: string; active: boolean; children: React.ReactNode; onClick?: () => void; collapsed?: boolean; label?: string; style?: React.CSSProperties;
}) {
  const content = (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      style={style}
      className={cn(
        "group flex items-center rounded-xl text-sm font-medium transition-all duration-300 relative overflow-hidden",
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

      <div className={cn("relative z-10 flex items-center w-full", collapsed ? "lg:gap-0 lg:justify-center" : "lg:gap-3")}
      >
        {children}
      </div>
    </Link>
  );

  // Si está colapsado en desktop, envolver en Tooltip
  if (collapsed && label) {
    return (
      <Tooltip.Provider delayDuration={200}>
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
      </Tooltip.Provider>
    );
  }

  return content;
}

export function Sidebar({ isOpen, onClose, collapsed: externalCollapsed = false, onCollapseChange }: SidebarProps) {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

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

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const res = await fetch("/api/auth/check-admin");
        const data = await res.json();
        setIsAdmin(!!data.isAdmin);
      } catch {
        setIsAdmin(false);
      } finally { setLoading(false); }
    };
    checkAdminStatus();
  }, []);

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

  return (
    <>
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
                <Tooltip.Provider delayDuration={200}>
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
                </Tooltip.Provider>
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
          <nav className={cn(
            "flex-1 overflow-y-auto",
            collapsed ? "px-2 py-3 space-y-0.5" : "px-4 sm:px-6 py-6 space-y-1.5"
          )}>
            {navigation.map((item, i) => (
              <NavLink
                key={item.name}
                href={item.href}
                active={isActive(item.href)}
                onClick={onClose}
                collapsed={collapsed}
                label={item.name}
                style={!collapsed ? { transitionDelay: `${i * 25}ms` } : undefined}
              >
                <span className={cn(
                  "shrink-0 grid place-items-center transition-all",
                  collapsed ? "w-9 h-9" : "w-8 h-8"
                )}>{item.icon}</span>
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
            ))}

            {!loading && isAdmin && (
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

                {adminNavigation.map((item, i) => (
                  <NavLink
                    key={item.name}
                    href={item.href}
                    active={isActive(item.href)}
                    onClick={onClose}
                    collapsed={collapsed}
                    label={item.name}
                    style={!collapsed ? { transitionDelay: `${i * 25}ms` } : undefined}
                  >
                    <span className={cn(
                  "shrink-0 grid place-items-center transition-all",
                  collapsed ? "w-9 h-9" : "w-8 h-8"
                )}>{item.icon}</span>
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
                ))}
              </>
            )}
          </nav>

        </div>
      </aside>
    </>
  );
}
