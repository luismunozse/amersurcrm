"use client";

import Image from "next/image";
import Link from "next/link";
import { Bars3Icon } from "@heroicons/react/24/outline";
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

  return (
    <header className="bg-crm-card shadow-crm-lg border-b border-crm-border sticky top-0 z-30">
      <div className="w-full px-6">
        <div className="flex justify-between items-center h-20">
          {/* Left: menú + logo */}
          <div className="flex items-center space-x-4">
            <button
              type="button"
              onClick={onSidebarToggle}
              className="lg:hidden inline-flex items-center justify-center p-2.5 rounded-xl text-crm-text-secondary hover:text-crm-text-primary hover:bg-crm-card-hover transition-all duration-200 hover:scale-105 active:scale-95"
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
                  className="h-6 w-auto sm:h-8 transition-all duration-200 object-contain"
                  priority
                />
              </span>
              <span className="hidden sm:block text-xl font-bold text-crm-text-primary">
                AMERSUR CRM
              </span>
            </Link>
          </div>

          {/* Right: búsqueda + acciones */}
          <div className="flex items-center space-x-1.5 sm:space-x-2 md:space-x-3">
            <div className="hidden lg:block">
              <GlobalSearch />
            </div>

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
                className="relative p-2 text-crm-text-secondary hover:text-crm-text-primary hover:bg-crm-card-hover rounded-lg transition-colors"
                aria-label="Ver novedades"
                title="Ver novedades del sistema"
              >
                <Gift className="h-5 w-5" />
                {hasNewChangelog && (
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
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
  );
}
