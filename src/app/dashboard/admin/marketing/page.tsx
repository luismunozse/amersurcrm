"use client";

import { useState, useEffect } from "react";
import type { LucideIcon } from "lucide-react";
import { MessageSquare, Users, Zap, BarChart3, Send } from "lucide-react";
import DashboardMetricas from "@/components/marketing/DashboardMetricas";
import GestionPlantillas from "@/components/marketing/GestionPlantillas";
import GestionCampanas from "@/components/marketing/GestionCampanas";
import BandejaConversaciones from "@/components/marketing/BandejaConversaciones";
import GestionAutomatizaciones from "@/components/marketing/GestionAutomatizaciones";
import { verificarCredencialesWhatsApp } from "@/app/dashboard/admin/marketing/_actions";

type MarketingTabConfig = {
  id: string;
  label: string;
  icon: LucideIcon;
};

type MarketingFeature = {
  key: string;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
  description: string;
};

const MARKETING_TABS: MarketingTabConfig[] = [
  { id: "dashboard", label: "Dashboard", icon: BarChart3 },
  { id: "conversaciones", label: "Conversaciones", icon: MessageSquare },
  { id: "plantillas", label: "Plantillas", icon: Send },
  { id: "campanas", label: "Campañas", icon: Users },
  { id: "automatizaciones", label: "Automatizaciones", icon: Zap },
];

const DASHBOARD_FEATURES: MarketingFeature[] = [
  {
    key: "whatsapp",
    icon: MessageSquare,
    iconBg: "bg-crm-primary/10",
    iconColor: "text-crm-primary",
    title: "WhatsApp Business",
    subtitle: "Mensajería directa",
    description: "Envía mensajes personalizados usando plantillas aprobadas por WhatsApp",
  },
  {
    key: "campanas",
    icon: Users,
    iconBg: "bg-crm-secondary/10",
    iconColor: "text-crm-secondary",
    title: "Campañas Masivas",
    subtitle: "Alcance amplio",
    description: "Crea campañas segmentadas para llegar a tu audiencia objetivo",
  },
  {
    key: "automatizaciones",
    icon: Zap,
    iconBg: "bg-crm-accent/10",
    iconColor: "text-crm-accent",
    title: "Automatizaciones",
    subtitle: "Flujos automáticos",
    description: "Configura journeys que se ejecutan automáticamente por eventos",
  },
];

const TAB_CONTENT: Record<string, () => React.JSX.Element> = {
  dashboard: () => (
    <div className="space-y-6">
      <DashboardMetricas />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {DASHBOARD_FEATURES.map((feature) => (
          <div key={feature.key} className="bg-crm-card border border-crm-border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-3 rounded-xl ${feature.iconBg}`}>
                <feature.icon className={`w-6 h-6 ${feature.iconColor}`} />
              </div>
              <div>
                <h3 className="font-semibold text-crm-text-primary">{feature.title}</h3>
                <p className="text-xs text-crm-text-muted">{feature.subtitle}</p>
              </div>
            </div>
            <p className="text-sm text-crm-text-secondary">{feature.description}</p>
          </div>
        ))}
      </div>
    </div>
  ),
  conversaciones: () => <BandejaConversaciones />,
  plantillas: () => <GestionPlantillas />,
  campanas: () => <GestionCampanas />,
  automatizaciones: () => <GestionAutomatizaciones />,
};

function MarketingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-10 w-64 rounded-xl bg-crm-card" />
      <div className="bg-crm-card border border-crm-border rounded-xl p-4">
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 5 }).map((_, idx) => (
            <div key={idx} className="h-9 w-28 rounded-lg bg-crm-border/60" />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={idx} className="rounded-xl border border-crm-border bg-crm-card p-6">
            <div className="h-5 w-32 rounded bg-crm-border mb-3" />
            <div className="h-4 w-full rounded bg-crm-border/80" />
            <div className="h-4 w-2/3 rounded bg-crm-border/70 mt-2" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MarketingPage() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [tieneCredenciales, setTieneCredenciales] = useState(true);
  const [verificandoCredenciales, setVerificandoCredenciales] = useState(true);
  const [credencialesError, setCredencialesError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const verificarConfiguracion = async () => {
      try {
        const result = await verificarCredencialesWhatsApp();
        if (!isMounted) return;
        setTieneCredenciales(result.tieneCredenciales);
        setCredencialesError(null);
      } catch (error) {
        console.error("Error verificando credenciales de WhatsApp:", error);
        if (!isMounted) return;
        setTieneCredenciales(false);
        setCredencialesError(
          "No pudimos confirmar las credenciales de WhatsApp. Reintenta más tarde."
        );
      } finally {
        if (isMounted) {
          setVerificandoCredenciales(false);
        }
      }
    };

    verificarConfiguracion();

    return () => {
      isMounted = false;
    };
  }, []);

  const ActiveTabContent =
    TAB_CONTENT[activeTab as keyof typeof TAB_CONTENT] ?? TAB_CONTENT.dashboard;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-crm-text-primary font-display flex items-center gap-3">
            <div className="p-2 bg-crm-primary rounded-xl">
              <MessageSquare aria-hidden="true" className="w-6 h-6 text-white" />
            </div>
            Marketing WhatsApp
          </h1>
          <p className="text-crm-text-secondary mt-1">
            Gestiona campañas, conversaciones y automatizaciones de WhatsApp
          </p>
        </div>
      </div>

      {verificandoCredenciales ? (
        <MarketingSkeleton />
      ) : (
        <>
          {/* Tabs Navigation */}
          <div className="bg-crm-card border border-crm-border rounded-xl p-2">
            <div className="flex items-center gap-2 overflow-x-auto">
              {MARKETING_TABS.map((tab) => (
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

          {/* Tab Content */}
          <div className="min-h-[500px]">
            <ActiveTabContent />
          </div>
        </>
      )}

      {credencialesError && (
        <div className="bg-crm-error/10 border border-crm-error/30 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-crm-error/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-crm-error text-sm" aria-hidden="true">
                !
              </span>
            </div>
            <div>
              <h4 className="text-sm font-medium text-crm-error mb-1">
                Error al verificar credenciales
              </h4>
              <p className="text-xs text-crm-text-secondary">{credencialesError}</p>
            </div>
          </div>
        </div>
      )}

      {/* Info importante - Solo mostrar si NO tiene credenciales */}
      {!verificandoCredenciales && !tieneCredenciales && !credencialesError && (
        <div className="bg-crm-warning/10 border border-crm-warning/30 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-crm-warning/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-crm-warning text-sm" aria-hidden="true">
                ⚠️
              </span>
            </div>
            <div>
              <h4 className="text-sm font-medium text-crm-warning mb-1">Configuración Requerida</h4>
              <p className="text-xs text-crm-text-secondary">
                Para usar WhatsApp Business API, necesitas configurar tus credenciales en la sección de Configuración.
                Requieres: App ID, Phone Number ID, Access Token y Webhook Verify Token de Meta Business.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Mensaje de éxito si tiene credenciales */}
      {!verificandoCredenciales && tieneCredenciales && !credencialesError && (
        <div className="bg-crm-success/10 border border-crm-success/30 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-crm-success/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-crm-success text-sm" aria-hidden="true">
                ✓
              </span>
            </div>
            <div>
              <h4 className="text-sm font-medium text-crm-success mb-1">WhatsApp Configurado</h4>
              <p className="text-xs text-crm-text-secondary">
                Las credenciales de WhatsApp Business API están configuradas correctamente. Ya puedes enviar mensajes y crear campañas.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
