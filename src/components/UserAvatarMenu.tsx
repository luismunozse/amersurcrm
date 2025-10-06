"use client";

import { Fragment, useState } from "react";
import { Menu, Transition } from "@headlessui/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import toast from "react-hot-toast";
import ThemeToggle from "./ThemeToggle";

interface Props {
  userName?: string;
  userUsername?: string;
  userEmail?: string;
}

export default function UserAvatarMenu({ userName, userUsername, userEmail }: Props) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      const supabase = supabaseBrowser();
      await supabase.auth.signOut();
      toast.success("Sesión cerrada exitosamente");
      router.push("/auth/login");
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      toast.error("Error al cerrar sesión");
      setLoggingOut(false);
    }
  };

  const displayName = userName || userEmail?.split('@')[0] || 'Usuario';
  const displayUsername = userUsername || userEmail || '';
  const avatarInitial = userName?.charAt(0).toUpperCase() || userEmail?.charAt(0).toUpperCase() || 'U';

  return (
    <Menu as="div" className="relative">
      {/* Avatar Button */}
      <Menu.Button className="flex items-center gap-3 focus:outline-none">
        {/* User info - desktop */}
        <div className="hidden lg:block text-right">
          <p className="text-sm font-medium text-crm-text-primary">
            {displayName}
          </p>
          <p className="text-xs text-crm-text-muted">
            {displayUsername}
          </p>
        </div>

        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-crm-primary to-crm-accent rounded-full flex items-center justify-center shadow-md ring-2 ring-crm-border hover:ring-crm-primary transition-all cursor-pointer">
            <span className="text-white text-sm font-bold">
              {avatarInitial}
            </span>
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-400 border-2 border-crm-card rounded-full" />
        </div>

        {/* Dropdown icon */}
        <svg
          className="hidden sm:block w-4 h-4 text-crm-text-muted"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </Menu.Button>

      {/* Dropdown Menu */}
      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="absolute right-0 mt-2 w-72 origin-top-right rounded-xl bg-crm-card border border-crm-border shadow-2xl focus:outline-none z-50">
          {/* Header del menú */}
          <div className="px-4 py-3 border-b border-crm-border">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-crm-primary to-crm-accent rounded-full flex items-center justify-center shadow-md">
                <span className="text-white text-lg font-bold">
                  {avatarInitial}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-crm-text-primary truncate">
                  {displayName}
                </p>
                <p className="text-xs text-crm-text-muted truncate">
                  {displayUsername}
                </p>
              </div>
            </div>
          </div>

          {/* Opciones del menú */}
          <div className="py-2">
            {/* Mi Perfil */}
            <Menu.Item>
              {({ active }) => (
                <Link
                  href="/dashboard/perfil"
                  className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                    active
                      ? 'bg-crm-card-hover text-crm-primary'
                      : 'text-crm-text-primary'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>Mi Perfil</span>
                </Link>
              )}
            </Menu.Item>

            {/* Cambiar Contraseña */}
            <Menu.Item>
              {({ active }) => (
                <Link
                  href="/dashboard/cambiar-password"
                  className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                    active
                      ? 'bg-crm-card-hover text-crm-primary'
                      : 'text-crm-text-primary'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                  <span>Cambiar Contraseña</span>
                </Link>
              )}
            </Menu.Item>

            {/* Configuración */}
            <Menu.Item>
              {({ active }) => (
                <Link
                  href="/dashboard/configuracion"
                  className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                    active
                      ? 'bg-crm-card-hover text-crm-primary'
                      : 'text-crm-text-primary'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>Configuración</span>
                </Link>
              )}
            </Menu.Item>
          </div>

          {/* Tema */}
          <div className="px-4 py-2.5 border-t border-crm-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-sm text-crm-text-primary">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
                <span>Modo Oscuro</span>
              </div>
              <ThemeToggle compact />
            </div>
          </div>

          {/* Cerrar Sesión */}
          <div className="py-2 border-t border-crm-border">
            <Menu.Item>
              {({ active }) => (
                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                    active
                      ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                      : 'text-red-600 dark:text-red-400'
                  } ${loggingOut ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>{loggingOut ? 'Cerrando sesión...' : 'Cerrar Sesión'}</span>
                </button>
              )}
            </Menu.Item>
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
}
