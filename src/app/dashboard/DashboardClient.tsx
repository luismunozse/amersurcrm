"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import Header from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import type { NotificacionNoLeida } from "@/types/crm";
import type { ExchangeRate } from "@/lib/exchange";
import { UserProfileProvider } from "./UserProfileContext";
import { registerPushSubscription } from "@/lib/pushClient";
import NotificationPermissionPrompt from "@/components/NotificationPermissionPrompt";
import ChangelogModal, { useChangelog } from "@/components/ChangelogModal";

export default function DashboardClient({
  children,
  userEmail,
  userName,
  userUsername,
  userRole,
  userAvatarUrl,
  lastSignInAt,
  notifications = [],
  notificationsCount = 0,
  exchangeRates = [],
  pushConfig,
}: {
  children: React.ReactNode;
  userEmail?: string;
  userName?: string;
  userUsername?: string;
  userRole?: string;
  userAvatarUrl?: string;
  lastSignInAt?: string;
  notifications?: NotificacionNoLeida[];
  notificationsCount?: number;
  exchangeRates?: ExchangeRate[];
  pushConfig?: {
    enabled: boolean;
    vapidPublicKey: string | null;
  };
}) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(userAvatarUrl ?? null);
  const hasRegisteredPush = useRef(false);
  const { isOpen: isChangelogOpen, hasNewVersion, openChangelog, closeChangelog } = useChangelog();

  useEffect(() => {
    setAvatarUrl(userAvatarUrl ?? null);
  }, [userAvatarUrl]);

  const handleAvatarUpdate = (url: string | null) => {
    setAvatarUrl(url);
  };

  useEffect(() => {
    if (
      hasRegisteredPush.current ||
      !pushConfig?.enabled ||
      !pushConfig.vapidPublicKey ||
      typeof window === "undefined"
    ) {
      return;
    }

    // Safari iOS no soporta Web Push Notifications
    if (typeof Notification === "undefined") {
      return;
    }

    if (Notification.permission === "denied") {
      hasRegisteredPush.current = true;
      return;
    }

    hasRegisteredPush.current = true;

    void registerPushSubscription({
      vapidPublicKey: pushConfig.vapidPublicKey,
      onPermissionDenied: () => {
        hasRegisteredPush.current = false;
      },
    }).catch((error) => {
      console.error("Error registrando push subscription:", error);
      hasRegisteredPush.current = false;
    });
  }, [pushConfig?.enabled, pushConfig?.vapidPublicKey]);

  return (
    <UserProfileProvider value={{ avatarUrl, setAvatarUrl: handleAvatarUpdate }}>
      <div className="relative min-h-dvh bg-crm-bg-primary">
        {/* Sidebar flotante - ahora es fixed en lugar de flex item */}
        <Sidebar
          isOpen={open}
          onClose={() => setOpen(false)}
          collapsed={collapsed}
          onCollapseChange={setCollapsed}
        />

        {/* Contenido principal con padding dinámico según estado del sidebar */}
        <div
          className={cn(
            "min-h-dvh flex flex-col transition-all duration-300 ease-out",
            // En desktop, agregar margen izquierdo según el ancho del sidebar
            "lg:ml-[var(--sidebar-w)]"
          )}
        >
          {/* Header */}
          <Header
            onSidebarToggle={() => setOpen(true)}
            userEmail={userEmail}
            userName={userName}
            userUsername={userUsername}
            userRole={userRole}
            userAvatarUrl={avatarUrl || undefined}
            lastSignInAt={lastSignInAt}
            sidebarCollapsed={collapsed}
            notifications={notifications}
            notificationsCount={notificationsCount}
            exchangeRates={exchangeRates}
            onOpenChangelog={openChangelog}
            hasNewChangelog={hasNewVersion}
          />

          {/* Main content */}
          <main className="flex-1 p-4 sm:p-6 overflow-auto">{children}</main>
        </div>
      </div>
      <NotificationPermissionPrompt />
      <ChangelogModal isOpen={isChangelogOpen} onClose={closeChangelog} />
    </UserProfileProvider>
  );
}
