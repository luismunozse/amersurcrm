"use client";

import { useState } from "react";
import Header from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import type { NotificacionNoLeida } from "@/types/crm";
import type { ExchangeRate } from "@/lib/exchange";

export default function DashboardClient({ 
  children, 
  userEmail,
  notifications = [],
  notificationsCount = 0,
  exchangeRates = [],
}: { 
  children: React.ReactNode;
  userEmail?: string;
  notifications?: NotificacionNoLeida[];
  notificationsCount?: number;
  exchangeRates?: ExchangeRate[];
}) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-dvh flex bg-crm-bg-primary">
      {/* Sidebar único */}
      <Sidebar 
        isOpen={open} 
        onClose={() => setOpen(false)} 
        userEmail={userEmail}
        collapsed={collapsed}
        onCollapseChange={setCollapsed}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header recibe el estado del sidebar */}
        <Header 
          onSidebarToggle={() => setOpen(true)} 
          userEmail={userEmail}
          sidebarCollapsed={collapsed}
          notifications={notifications}
          notificationsCount={notificationsCount}
          exchangeRates={exchangeRates}
        />
        <main className="flex-1 p-4 sm:p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
