"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search as MagnifyingGlassIcon, X as XMarkIcon, Gift } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import ThemeToggle from "./ThemeToggle";
import NotificationsDropdown from "./NotificationsDropdown";
import AgendaQuickPopover from "./AgendaQuickPopover";
import UserAvatarMenu from "./UserAvatarMenu";
import GlobalSearch from "./GlobalSearch";
import type { NotificacionNoLeida } from "@/types/crm";
import type { ExchangeRate } from "@/lib/exchange";
import { useOptionalUserProfileContext } from "@/app/dashboard/UserProfileContext";
import CurrencyConverter from "./CurrencyConverter";

type HeaderProps = {
  userEmail?: string;
  userName?: string;
  userUsername?: string;
  userRole?: string;
  userAvatarUrl?: string;
  lastSignInAt?: string;
  sidebarCollapsed?: boolean;
  notifications?: NotificacionNoLeida[];
  notificationsCount?: number;
  exchangeRates?: ExchangeRate[];
  onOpenChangelog?: () => void;
  hasNewChangelog?: boolean;
};

export default function Header({
  userEmail,
  userName,
  userUsername,
  userRole,
  userAvatarUrl,
  lastSignInAt,
  sidebarCollapsed = false,
  notifications = [],
  notificationsCount = 0,
  exchangeRates = [],
  onOpenChangelog,
  hasNewChangelog = false,
}: HeaderProps) {
  const profileCtx = useOptionalUserProfileContext();
  const effectiveAvatarUrl =
    profileCtx?.avatarUrl ?? userAvatarUrl;

  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);

  // Focus input when mobile search opens
  useEffect(() => {
    if (mobileSearchOpen) {
      // Small delay to allow animation
      const t = setTimeout(() => mobileSearchInputRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [mobileSearchOpen]);

  return (
    <>
      <header className="bg-crm-card shadow-crm-lg border-b border-crm-border sticky top-0 z-30 pt-[env(safe-area-inset-top)]">
        <div className="w-full px-3 sm:px-4 lg:px-6 safe-left safe-right">
          <div className="flex justify-between items-center h-14 sm:h-16 lg:h-20">
            {/* Left: menú + logo */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              <SidebarTrigger
                className="hidden lg:inline-flex w-11 h-11 rounded-xl text-crm-text-secondary hover:text-crm-text-primary hover:bg-crm-card-hover transition-all duration-200 active:scale-95 [&_svg]:size-6"
                aria-label="Alternar menú"
              />

              {/* Logo - Visible en mobile o cuando sidebar está colapsado */}
              <Link
                href="/"
                className={`${sidebarCollapsed ? 'lg:flex' : 'lg:hidden'} flex items-center space-x-3 rounded-lg px-1 py-1 transition-colors hover:bg-crm-card-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-crm-primary/40`}
                aria-label="Ir al inicio"
              >
                <span className="relative flex items-center">
                  <Image
                    src="/logo-amersur-horizontal.png"
                    alt="AMERSUR"
                    width={160}
                    height={40}
                    className="h-5 w-auto sm:h-7 lg:h-8 transition-all duration-200 object-contain"
                    priority
                  />
                </span>
                <span className="hidden md:block text-xl font-bold text-crm-text-primary">
                  AMERSUR CRM
                </span>
              </Link>
            </div>

            {/* Right: búsqueda + acciones */}
            <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2">
              {/* Desktop search */}
              <div className="hidden lg:block">
                <GlobalSearch />
              </div>

              {/* Mobile search button */}
              <button
                type="button"
                onClick={() => setMobileSearchOpen(true)}
                className="lg:hidden inline-flex items-center justify-center w-11 h-11 rounded-xl text-crm-text-secondary hover:text-crm-text-primary hover:bg-crm-card-hover transition-colors"
                aria-label="Buscar"
                title="Buscar"
              >
                <MagnifyingGlassIcon className="h-5 w-5" />
              </button>

              <CurrencyConverter exchangeRates={exchangeRates} />

              {/* Acceso rápido a Agenda con popover de eventos del día */}
              <AgendaQuickPopover />

              {/* Botón de Novedades/Changelog — oculto en mobile para dar aire */}
              {onOpenChangelog && (
                <button
                  type="button"
                  onClick={onOpenChangelog}
                  className="hidden sm:inline-flex relative items-center justify-center w-11 h-11 rounded-xl text-crm-text-secondary hover:text-crm-text-primary hover:bg-crm-card-hover transition-colors"
                  aria-label="Ver novedades"
                  title="Ver novedades del sistema"
                >
                  <Gift className="h-5 w-5" />
                  {hasNewChangelog && (
                    <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
                  )}
                </button>
              )}

              <ThemeToggle />

              <NotificationsDropdown notificaciones={notifications} count={notificationsCount} />

              {/* Avatar y menú del usuario */}
              <UserAvatarMenu
                userName={userName}
                userUsername={userUsername}
                userEmail={userEmail}
                userRole={userRole}
                userAvatarUrl={effectiveAvatarUrl}
                lastSignInAt={lastSignInAt}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Mobile search overlay - fullscreen */}
      {mobileSearchOpen && (
        <div className="fixed inset-0 z-50 bg-crm-card lg:hidden animate-in fade-in duration-200 pt-[env(safe-area-inset-top)]">
          <div className="flex items-center gap-2 px-3 h-14 border-b border-crm-border safe-left safe-right">
            <button
              type="button"
              onClick={() => setMobileSearchOpen(false)}
              className="inline-flex items-center justify-center w-11 h-11 rounded-xl text-crm-text-secondary hover:text-crm-text-primary transition-colors"
              aria-label="Cerrar búsqueda"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
            <div className="flex-1">
              <GlobalSearch
                ref={mobileSearchInputRef}
                className="w-full"
                autoFocus
                onSelect={() => setMobileSearchOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
