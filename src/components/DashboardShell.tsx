"use client";
import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import Topbar from "@/components/Topbar";

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-dvh flex bg-bg">
      <Sidebar isOpen={open} onClose={() => setOpen(false)} />
      <div className="flex-1 flex flex-col">
        <Topbar onMenu={() => setOpen(true)} />
        <main className="mx-auto max-w-6xl w-full p-6">{children}</main>
      </div>
    </div>
  );
}
