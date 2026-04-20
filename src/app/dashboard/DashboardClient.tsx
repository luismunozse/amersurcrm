"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Header from "@/components/Header";
import { SidebarShadcn } from "@/components/SidebarShadcn";
import { SidebarProvider, SidebarInset, useSidebar } from "@/components/ui/sidebar";
import type { NotificacionNoLeida } from "@/types/crm";
import type { ExchangeRate } from "@/lib/exchange";
import { UserProfileProvider } from "./UserProfileContext";
import { PermissionsProvider } from "@/lib/permissions";
import type { UsuarioConPermisos } from "@/lib/permissions/types";
import { registerPushSubscription } from "@/lib/pushClient";
import NotificationPermissionPrompt from "@/components/NotificationPermissionPrompt";
import ChangelogModal, { useChangelog } from "@/components/ChangelogModal";
import { CommandPalette } from "@/components/CommandPalette";
import { ClienteQuickViewProvider } from "@/components/ClienteQuickViewSheet";
import MaintenanceBanner from "@/components/MaintenanceBanner";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import BottomNav from "@/components/BottomNav";

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
  initialUsuarioPermisos = null,
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
  initialUsuarioPermisos?: UsuarioConPermisos | null;
}) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(userAvatarUrl ?? null);
  const hasRegisteredPush = useRef(false);
  const { isOpen: isChangelogOpen, hasNewVersion, openChangelog, closeChangelog } = useChangelog();

  useEffect(() => {
    setAvatarUrl(userAvatarUrl ?? null);
  }, [userAvatarUrl]);

  const handleAvatarUpdate = (url: string | null) => {
    setAvatarUrl(url);
  };

  const tryRegisterPush = useCallback(() => {
    if (
      !pushConfig?.enabled ||
      !pushConfig.vapidPublicKey ||
      typeof window === "undefined" ||
      typeof Notification === "undefined"
    ) {
      return;
    }

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

  useEffect(() => {
    if (hasRegisteredPush.current) return;
    if (typeof Notification === "undefined") return;

    if (Notification.permission === "denied") {
      hasRegisteredPush.current = true;
      return;
    }

    if (Notification.permission === "granted") {
      hasRegisteredPush.current = true;
      tryRegisterPush();
    }
  }, [tryRegisterPush]);

  const handlePermissionGranted = useCallback(() => {
    hasRegisteredPush.current = true;
    tryRegisterPush();
  }, [tryRegisterPush]);

  const headerProps = {
    userEmail,
    userName,
    userUsername,
    userRole,
    userAvatarUrl: avatarUrl || undefined,
    lastSignInAt,
    notifications,
    notificationsCount,
    exchangeRates,
    onOpenChangelog: openChangelog,
    hasNewChangelog: hasNewVersion,
  };

  return (
    <PermissionsProvider initialUsuario={initialUsuarioPermisos}>
      <UserProfileProvider value={{ avatarUrl, setAvatarUrl: handleAvatarUpdate }}>
        <ClienteQuickViewProvider>
          <SidebarProvider>
            <SidebarShadcn />
            <SidebarInset className="bg-crm-bg-primary min-w-0 overflow-x-hidden">
              <MaintenanceBanner />
              <ShadcnHeaderBridge headerProps={headerProps} />
              <main className="flex-1 p-4 sm:p-6 safe-left safe-right pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-[max(env(safe-area-inset-bottom),1rem)]">{children}</main>
            </SidebarInset>
            <BottomNav />
            <PWAInstallPrompt />
          </SidebarProvider>
          <CommandPalette />
          <NotificationPermissionPrompt onPermissionGranted={handlePermissionGranted} />
          <ChangelogModal isOpen={isChangelogOpen} onClose={closeChangelog} />
        </ClienteQuickViewProvider>
      </UserProfileProvider>
    </PermissionsProvider>
  );
}

function ShadcnHeaderBridge({
  headerProps,
}: {
  headerProps: Omit<React.ComponentProps<typeof Header>, "sidebarCollapsed">;
}) {
  const { state } = useSidebar();
  return <Header sidebarCollapsed={state === "collapsed"} {...headerProps} />;
}
