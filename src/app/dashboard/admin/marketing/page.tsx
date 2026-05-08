"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  MessageSquare,
  Users,
  BarChart3,
  Send,
  History,
  Bell,
  Sparkles,
} from "lucide-react";
import DashboardMetricas from "@/components/marketing/DashboardMetricas";
import GestionPlantillas from "@/components/marketing/GestionPlantillas";
import GestionCampanas from "@/components/marketing/GestionCampanas";
import GestionAudiencias from "@/components/marketing/GestionAudiencias";
import HistorialEnvios from "@/components/marketing/HistorialEnvios";
import RecordatoriosWhatsApp from "@/components/marketing/RecordatoriosWhatsApp";

type Tab = {
  id: string;
  label: string;
  icon: LucideIcon;
};

const TABS: Tab[] = [
  { id: "dashboard", label: "Dashboard", icon: BarChart3 },
  { id: "plantillas", label: "Plantillas", icon: Send },
  { id: "campanas", label: "Campañas", icon: Users },
  { id: "audiencias", label: "Audiencias", icon: Users },
  { id: "historial", label: "Historial", icon: History },
  { id: "recordatorios", label: "Recordatorios", icon: Bell },
];

const FEATURES = [
  {
    icon: MessageSquare,
    title: "Plantillas WhatsApp",
    subtitle: "Texto + variables",
    description:
      "Crea mensajes reutilizables con campos dinámicos como {{cliente}}, {{proyecto}}.",
  },
  {
    icon: Send,
    title: "Envío Click-to-Chat",
    subtitle: "Sin API ni costo",
    description:
      "Un clic abre WhatsApp Web/App con el mensaje pre-llenado. Vendedor solo presiona Enter.",
  },
  {
    icon: Bell,
    title: "Recordatorios",
    subtitle: "Notif push automática",
    description:
      "Programa envíos futuros. El sistema avisa al vendedor cuando llega la fecha.",
  },
];

const TAB_CONTENT: Record<string, () => React.JSX.Element> = {
  dashboard: () => (
    <div className="space-y-6">
      <DashboardMetricas />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="bg-crm-card border border-crm-border rounded-xl p-5"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-xl bg-crm-primary/10">
                <f.icon className="w-5 h-5 text-crm-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-crm-text-primary text-sm">
                  {f.title}
                </h3>
                <p className="text-xs text-crm-text-muted">{f.subtitle}</p>
              </div>
            </div>
            <p className="text-sm text-crm-text-secondary">{f.description}</p>
          </div>
        ))}
      </div>
    </div>
  ),
  plantillas: () => <GestionPlantillas />,
  campanas: () => <GestionCampanas />,
  audiencias: () => <GestionAudiencias />,
  historial: () => <HistorialEnvios />,
  recordatorios: () => <RecordatoriosWhatsApp />,
};

export default function MarketingPage() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const ActiveContent = TAB_CONTENT[activeTab] ?? TAB_CONTENT.dashboard;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-crm-text-primary font-display flex items-center gap-3">
            <div className="p-2 bg-crm-primary rounded-xl">
              <MessageSquare aria-hidden="true" className="w-6 h-6 text-white" />
            </div>
            Marketing WhatsApp
          </h1>
          <p className="text-crm-text-secondary mt-1 flex items-center gap-1">
            <Sparkles className="w-4 h-4" />
            Plantillas enviables vía WhatsApp Web — sin API, sin costo
          </p>
        </div>
      </div>

      <div className="bg-crm-card border border-crm-border rounded-xl p-2">
        <div className="flex items-center gap-2 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-crm-primary text-white shadow-sm"
                  : "text-crm-text-secondary hover:bg-crm-card-hover"
              }`}
              aria-pressed={activeTab === tab.id}
            >
              <tab.icon aria-hidden="true" className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <ActiveContent />
      </div>
    </div>
  );
}
