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
        <SidebarProvider>
          <SidebarShadcn />
          <SidebarInset className="bg-crm-bg-primary">
            <ShadcnHeaderBridge headerProps={headerProps} />
            <main className="flex-1 p-4 sm:p-6 overflow-auto">{children}</main>
          </SidebarInset>
        </SidebarProvider>
        <NotificationPermissionPrompt onPermissionGranted={handlePermissionGranted} />
        <ChangelogModal isOpen={isChangelogOpen} onClose={closeChangelog} />
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
