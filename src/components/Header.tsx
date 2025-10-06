"use client";

import Image from "next/image";
import ThemeToggle from "./ThemeToggle";
import NotificationsDropdown from "./NotificationsDropdown";
import UserAvatarMenu from "./UserAvatarMenu";
import type { NotificacionNoLeida } from "@/types/crm";
import type { ExchangeRate } from "@/lib/exchange";
import CurrencyConverter from "./CurrencyConverter";

type HeaderProps = {
  onSidebarToggle?: () => void;
  userEmail?: string;
  userName?: string;
  userUsername?: string;
  sidebarCollapsed?: boolean;
  notifications?: NotificacionNoLeida[];
  notificationsCount?: number;
  exchangeRates?: ExchangeRate[];
};

export default function Header({
  onSidebarToggle = () => {},
  userEmail,
  userName,
  userUsername,
  sidebarCollapsed = false,
  notifications = [],
  notificationsCount = 0,
  exchangeRates = [],
}: HeaderProps) {
  return (
    <header className="bg-crm-card shadow-crm-lg border-b border-crm-border sticky top-0 z-30">
      <div className="w-full px-6">
        <div className="flex justify-between items-center h-20">
          {/* Left: menú + logo */}
          <div className="flex items-center space-x-4">
            <button
              type="button"
              onClick={onSidebarToggle}
              className="lg:hidden inline-flex items-center justify-center p-2 rounded-lg text-crm-text-secondary hover:text-crm-text-primary hover:bg-crm-card-hover transition-colors"
              aria-label="Abrir menú"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/>
              </svg>
            </button>

            {/* Logo - Visible en mobile o cuando sidebar está colapsado */}
            <div className={`${sidebarCollapsed ? 'lg:flex' : 'lg:hidden'} flex items-center space-x-3`}>
              <div className="relative">
                <Image
                  src="/logo-amersur.png"
                  alt="AMERSUR"
                  width={48}
                  height={48}
                  className="h-10 w-10 sm:h-12 sm:w-12 object-contain"
                  priority
                />
                {/* Efecto de resplandor sutil */}
                <div className="absolute inset-0 bg-crm-primary/15 rounded-full blur-md -z-10"></div>
              </div>
              <div className="hidden sm:block">
                <span className="text-xl font-bold text-crm-text-primary">AMERSUR CRM</span>
              </div>
            </div>
          </div>

          {/* Right: búsqueda + acciones */}
          <div className="flex items-center space-x-1.5 sm:space-x-2 md:space-x-3">
            <div className="hidden lg:block">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 text-crm-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Buscar..."
                  className="w-64 pl-10 pr-4 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent"
                />
              </div>
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

            <ThemeToggle />

            <CurrencyConverter exchangeRates={exchangeRates} />

            <NotificationsDropdown notificaciones={notifications} count={notificationsCount} />

            {/* Avatar y menú del usuario */}
            <UserAvatarMenu
              userName={userName}
              userUsername={userUsername}
              userEmail={userEmail}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
