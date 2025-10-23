"use client";

import { Fragment, useEffect, useState } from "react";
import { Menu, Transition } from "@headlessui/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import toast from "react-hot-toast";
import ThemeToggle from "./ThemeToggle";
import { ChevronDown, User, Key, Settings, Moon, LogOut, HelpCircle, AlertCircle, Info } from "lucide-react";
import Image from "next/image";

interface Props {
  userName?: string;
  userUsername?: string;
  userEmail?: string;
  userRole?: string;
  userAvatarUrl?: string; // Nuevo: URL de la foto de perfil
  notificationsCount?: number; // Nuevo: contador de notificaciones
  lastSignInAt?: string; // Nuevo: último acceso
}

// Función para formatear el último acceso de forma relativa
function formatLastSignIn(dateString?: string): string {
  if (!dateString) return '';

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Justo ahora';
  if (diffMins < 60) return `Hace ${diffMins} min`;
  if (diffHours < 24) return `Hace ${diffHours}h`;
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) return `Hace ${diffDays} días`;
  return date.toLocaleDateString('es-PE');
}

export default function UserAvatarMenu({ userName, userUsername, userEmail, userRole, userAvatarUrl, notificationsCount = 0, lastSignInAt }: Props) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="h-10 w-32 rounded-full bg-crm-card animate-pulse" aria-hidden="true" />
    );
  }

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
  const displayRole = userRole || 'Usuario';
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
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-crm-primary to-crm-accent rounded-full flex items-center justify-center shadow-md ring-2 ring-crm-border hover:ring-crm-primary transition-all cursor-pointer overflow-hidden">
            {userAvatarUrl ? (
              <Image
                src={userAvatarUrl}
                alt={displayName}
                width={40}
                height={40}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-white text-sm font-bold">
                {avatarInitial}
              </span>
            )}
          </div>
          {/* Badge de notificaciones */}
          {notificationsCount > 0 && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-crm-danger rounded-full flex items-center justify-center shadow-lg animate-bounce">
              <span className="text-[10px] font-bold text-white">
                {notificationsCount > 9 ? '9+' : notificationsCount}
              </span>
            </div>
          )}
          {/* Indicador online con animación pulse */}
          <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-crm-success border-2 border-crm-card rounded-full animate-pulse" />
        </div>

        {/* Dropdown icon */}
        <ChevronDown className="hidden sm:block w-4 h-4 text-crm-text-muted" />
      </Menu.Button>

      {/* Dropdown Menu con animaciones mejoradas */}
      <Transition
        as={Fragment}
        enter="transition ease-out duration-200"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-150"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="fixed sm:absolute bottom-0 sm:bottom-auto left-0 sm:left-auto right-0 sm:right-0 w-full sm:w-72 sm:mt-2 rounded-t-3xl sm:rounded-xl bg-crm-card border-t sm:border border-crm-border shadow-2xl focus:outline-none z-50 max-h-[85vh] sm:max-h-none overflow-y-auto sm:overflow-visible pb-safe sm:pb-0 sm:origin-top-right sm:backdrop-blur-sm">
          {/* Handle para mobile drawer */}
          <div className="flex sm:hidden justify-center pt-3 pb-2">
            <div className="w-12 h-1 bg-crm-border rounded-full"></div>
          </div>

          {/* Header del menú */}
          <div className="px-4 py-3 border-b border-crm-border">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-crm-primary to-crm-accent rounded-full flex items-center justify-center shadow-md overflow-hidden flex-shrink-0">
                {userAvatarUrl ? (
                  <Image
                    src={userAvatarUrl}
                    alt={displayName}
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-white text-lg font-bold">
                    {avatarInitial}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-crm-text-primary truncate">
                  {displayName}
                </p>
                <p className="text-xs text-crm-text-muted truncate">
                  {displayUsername}
                </p>
                {/* Rol del usuario */}
                <div className="mt-1 flex items-center gap-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-crm-primary/10 text-crm-primary border border-crm-primary/20">
                    {displayRole}
                  </span>
                </div>
                {/* Último acceso */}
                {lastSignInAt && (
                  <p className="text-[10px] text-crm-text-muted mt-1">
                    Último acceso: {formatLastSignIn(lastSignInAt)}
                  </p>
                )}
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
                  <User className="w-5 h-5" />
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
                  <Key className="w-5 h-5" />
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
                  <Settings className="w-5 h-5" />
                  <span>Configuración</span>
                </Link>
              )}
            </Menu.Item>

            {/* Ayuda y Soporte */}
            <Menu.Item>
              {({ active }) => (
                <Link
                  href="/dashboard/ayuda"
                  className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                    active
                      ? 'bg-crm-card-hover text-crm-primary'
                      : 'text-crm-text-primary'
                  }`}
                >
                  <HelpCircle className="w-5 h-5" />
                  <span>Ayuda y Soporte</span>
                </Link>
              )}
            </Menu.Item>

            {/* Reportar Problema */}
            <Menu.Item>
              {({ active }) => (
                <Link
                  href="/dashboard/reportar-problema"
                  className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                    active
                      ? 'bg-crm-card-hover text-crm-primary'
                      : 'text-crm-text-primary'
                  }`}
                >
                  <AlertCircle className="w-5 h-5" />
                  <span>Reportar Problema</span>
                </Link>
              )}
            </Menu.Item>
          </div>

          {/* Versión del Sistema */}
          <div className="px-4 py-2 border-t border-crm-border">
            <div className="flex items-center gap-2 text-xs text-crm-text-muted">
              <Info className="w-4 h-4" />
              <span>Versión 1.0.0</span>
            </div>
          </div>

          {/* Tema */}
          <div className="px-4 py-2.5 border-t border-crm-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-sm text-crm-text-primary">
                <Moon className="w-5 h-5" />
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
                  <LogOut className="w-5 h-5" />
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
