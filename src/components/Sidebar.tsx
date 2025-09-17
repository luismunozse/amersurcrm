"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
}

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: (
      <svg
        className="w-5 h-5"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z" />
      </svg>
    ),
  },
  {
    name: "Clientes",
    href: "/dashboard/clientes",
    icon: (
      <svg
        className="w-5 h-5"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
      </svg>
    ),
  },
  {
    name: "Proyectos",
    href: "/dashboard/proyectos",
    icon: (
      <svg
        className="w-5 h-5"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  {
    name: "Propiedades",
    href: "/dashboard/propiedades",
    icon: (
      <svg
        className="w-5 h-5"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    name: "Agenda",
    href: "/dashboard/agenda",
    icon: (
      <svg
        className="w-5 h-5"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    name: "Reportes",
    href: "/dashboard/reportes",
    icon: (
      <svg
        className="w-5 h-5"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
];

const adminNavigation = [
  {
    name: "Administración",
    href: "/dashboard/admin",
    icon: (
      <svg
        className="w-5 h-5"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    name: "Usuarios",
    href: "/dashboard/admin/usuarios",
    icon: (
      <svg
        className="w-5 h-5"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
      </svg>
    ),
  },
  {
    name: "Configuración",
    href: "/dashboard/admin/configuracion",
    icon: (
      <svg
        className="w-5 h-5"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

function NavLink({
  href,
  active,
  children,
  onClick,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 relative overflow-hidden",
        active
          ? "bg-gradient-to-r from-crm-primary to-crm-primary-hover text-white shadow-lg shadow-crm-primary/25"
          : "text-crm-text-muted hover:bg-crm-sidebar-hover hover:text-white hover:shadow-md hover:scale-[1.02]"
      )}
    >
      {/* Efecto de brillo en hover */}
      {!active && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
      )}
      
      {/* Indicador activo */}
      {active && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-white rounded-r-full"></div>
      )}
      
      <div className="relative z-10 flex items-center space-x-3 w-full">
        {children}
      </div>
    </Link>
  );
}

export function Sidebar({ isOpen, onClose, userEmail }: SidebarProps) {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const response = await fetch('/api/auth/check-admin');
        const data = await response.json();
        setIsAdmin(data.isAdmin || false);
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, []);

  return (
    <>
      {/* Overlay móvil */}
      {isOpen && (
        <button
          aria-label="Cerrar menú"
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-80 sm:w-72 bg-crm-sidebar transform transition-transform duration-300 ease-in-out",
          "lg:translate-x-0 lg:static lg:inset-0 lg:z-auto",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
        aria-label="Barra lateral de navegación"
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between h-20 px-6 border-b border-crm-sidebar-hover bg-gradient-to-r from-crm-sidebar to-crm-sidebar-hover/50">
            <div className="flex items-center space-x-4 w-full">
              <div className="relative flex-shrink-0">
                {/* Fondo del logo con gradiente */}
                <div className="absolute inset-0 bg-gradient-to-br from-crm-primary/20 to-crm-accent/20 rounded-2xl blur-sm"></div>
                <div className="relative bg-white/10 backdrop-blur-sm rounded-2xl p-2 border border-white/20">
                  <Image
                    src="/amersur-logo-b.png"
                    alt="AMERSUR"
                    width={48}
                    height={48}
                    className="h-12 w-12 object-contain"
                    priority
                  />
                </div>
                {/* Efecto de resplandor mejorado */}
                <div className="absolute inset-0 bg-crm-primary/30 rounded-2xl blur-lg -z-10"></div>
              </div>
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <span className="text-white font-bold text-xl block tracking-wide leading-tight">
                  AMERSUR
                </span>
                <span className="text-crm-primary font-semibold text-base block tracking-wider leading-tight">
                  CRM
                </span>
                <p className="text-xs text-crm-text-muted mt-0.5 hidden sm:block font-medium leading-tight">Tu Propiedad, sin fronteras</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="lg:hidden text-crm-text-muted hover:text-white flex-shrink-0"
              aria-label="Cerrar menú"
            >
              <svg
                className="w-6 h-6"
                aria-hidden="true"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 sm:px-6 py-6 space-y-1">
            {navigation.map((item) => {
              const isActive =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href);

              return (
                <NavLink
                  key={item.name}
                  href={item.href}
                  active={isActive}
                  onClick={onClose}
                >
                  {item.icon}
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
            
            {/* Sección de Administración - Solo para admins */}
            {!loading && isAdmin && (
              <>
                <div className="border-t border-crm-sidebar-hover/50 my-6"></div>
                <div className="px-4 py-3">
                  <h3 className="text-xs font-bold text-crm-primary uppercase tracking-widest flex items-center">
                    <div className="w-2 h-2 bg-crm-primary rounded-full mr-2"></div>
                    Administración
                  </h3>
                </div>
                {adminNavigation.map((item) => {
                  const isActive = pathname.startsWith(item.href);

                  return (
                    <NavLink
                      key={item.name}
                      href={item.href}
                      active={isActive}
                      onClick={onClose}
                    >
                      {item.icon}
                      <span>{item.name}</span>
                    </NavLink>
                  );
                })}
              </>
            )}
          </nav>

          {/* Footer - Responsive */}
          <div className="p-4 sm:p-6 border-t border-crm-sidebar-hover/50 bg-gradient-to-r from-crm-sidebar-hover/30 to-transparent">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-crm-primary to-crm-accent rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                  <span className="text-white text-sm sm:text-base font-bold">
                    {userEmail ? userEmail.charAt(0).toUpperCase() : 'U'}
                  </span>
                </div>
                {/* Indicador de estado online */}
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 border-2 border-crm-sidebar rounded-full"></div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                  {userEmail ? userEmail.split('@')[0] : 'Usuario'}
                </p>
                <p className="text-xs text-crm-text-muted truncate hidden sm:block">
                  {userEmail || 'usuario@amersur.com'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
