"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Bars3Icon, MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { Gift } from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import NotificationsDropdown from "./NotificationsDropdown";
import UserAvatarMenu from "./UserAvatarMenu";
import GlobalSearch from "./GlobalSearch";
import type { NotificacionNoLeida } from "@/types/crm";
import type { ExchangeRate } from "@/lib/exchange";
import { useOptionalUserProfileContext } from "@/app/dashboard/UserProfileContext";
import CurrencyConverter from "./CurrencyConverter";

type HeaderProps = {
  onSidebarToggle?: () => void;
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
  onSidebarToggle = () => {},
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
      <header className="bg-crm-card shadow-crm-lg border-b border-crm-border sticky top-0 z-30">
        <div className="w-full px-3 sm:px-4 lg:px-6">
          <div className="flex justify-between items-center h-14 sm:h-16 lg:h-20">
            {/* Left: menú + logo */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              <button
                type="button"
                onClick={onSidebarToggle}
                className="lg:hidden inline-flex items-center justify-center w-11 h-11 rounded-xl text-crm-text-secondary hover:text-crm-text-primary hover:bg-crm-card-hover transition-all duration-200 active:scale-95"
                aria-label="Abrir menú"
              >
                <Bars3Icon className="h-6 w-6" />
              </button>

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
              >
                <MagnifyingGlassIcon className="h-5 w-5" />
              </button>

              {exchangeRates.length > 0 && (
                <div className="hidden xl:flex items-center gap-2 rounded-2xl border border-crm-border/60 bg-crm-card-hover px-3 py-1.5 text-xs text-crm-text-muted">
                  {exchangeRates.map((rate) => (
                    <div key={rate.currency} className="flex items-center gap-2 px-2">
                      <span className="font-semibold text-crm-text-primary">{rate.currency}/PEN</span>
                      <div className="flex flex-col leading-tight">
                        <span className="text-[10px] uppercase tracking-wide">Compra</span>
                        <span className="font-semibold text-crm-text-primary">
                          {rate.buy ? rate.buy.toFixed(3) : '--'}
                        </span>
                      </div>
                      <div className="flex flex-col leading-tight">
                        <span className="text-[10px] uppercase tracking-wide">Venta</span>
                        <span className="font-semibold text-crm-text-primary">
                          {rate.sell ? rate.sell.toFixed(3) : '--'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <CurrencyConverter exchangeRates={exchangeRates} />

              {/* Botón de Novedades/Changelog */}
              {onOpenChangelog && (
                <button
                  type="button"
                  onClick={onOpenChangelog}
                  className="relative inline-flex items-center justify-center w-11 h-11 rounded-xl text-crm-text-secondary hover:text-crm-text-primary hover:bg-crm-card-hover transition-colors"
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
        <div className="fixed inset-0 z-50 bg-crm-card lg:hidden animate-in fade-in duration-200">
          <div className="flex items-center gap-2 px-3 h-14 border-b border-crm-border">
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
