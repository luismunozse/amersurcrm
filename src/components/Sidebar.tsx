"use client";

import React from "react";
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
        "flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
        active
          ? "bg-crm-primary text-white"
          : "text-crm-text-muted hover:bg-crm-sidebar-hover hover:text-white"
      )}
    >
      {children}
    </Link>
  );
}

export function Sidebar({ isOpen, onClose, userEmail }: SidebarProps) {
  const pathname = usePathname();

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
          "fixed inset-y-0 left-0 z-50 w-64 bg-crm-sidebar transform transition-transform duration-300 ease-in-out",
          "lg:translate-x-0 lg:static lg:inset-0 lg:z-auto",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
        aria-label="Barra lateral de navegación"
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-crm-sidebar-hover">
            <div className="flex items-center space-x-3">
              <Image
                src="/logo-amersur.png"
                alt="AMERSUR"
                width={32}
                height={32}
                className="h-8 w-auto"
                priority
              />
              <div>
                <span className="text-white font-semibold text-lg">
                  AMERSUR CRM
                </span>
                <p className="text-xs text-crm-text-muted">Tu Propiedad, sin fronteras</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="lg:hidden text-crm-text-muted hover:text-white"
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
          <nav className="flex-1 px-4 py-6 space-y-2">
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
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-crm-sidebar-hover">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-crm-accent rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {userEmail ? userEmail.charAt(0).toUpperCase() : 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {userEmail ? userEmail.split('@')[0] : 'Usuario'}
                </p>
                <p className="text-xs text-crm-text-muted truncate">
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
