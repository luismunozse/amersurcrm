"use client";

import { useState } from "react";
import Header from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";

export default function DashboardClient({ 
  children, 
  userEmail 
}: { 
  children: React.ReactNode;
  userEmail?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-dvh flex bg-crm-bg-primary">
      {/* Sidebar único */}
      <Sidebar isOpen={open} onClose={() => setOpen(false)} userEmail={userEmail} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header solo recibe onSidebarToggle */}
        <Header onSidebarToggle={() => setOpen(true)} userEmail={userEmail} />
        <main className="flex-1 p-4 sm:p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
