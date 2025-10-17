"use client";

import { useState, useEffect } from "react";
import {
  MessageSquare,
  Users,
  Zap,
  BarChart3,
  Send
} from "lucide-react";
import DashboardMetricas from "@/components/marketing/DashboardMetricas";
import GestionPlantillas from "@/components/marketing/GestionPlantillas";
import GestionCampanas from "@/components/marketing/GestionCampanas";
import BandejaConversaciones from "@/components/marketing/BandejaConversaciones";
import GestionAutomatizaciones from "@/components/marketing/GestionAutomatizaciones";
import { verificarCredencialesWhatsApp } from "@/app/dashboard/admin/marketing/_actions";

export default function MarketingPage() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [tieneCredenciales, setTieneCredenciales] = useState(true);
  const [verificandoCredenciales, setVerificandoCredenciales] = useState(true);

  useEffect(() => {
    verificarConfiguracion();
  }, []);

  const verificarConfiguracion = async () => {
    const result = await verificarCredencialesWhatsApp();
    setTieneCredenciales(result.tieneCredenciales);
    setVerificandoCredenciales(false);
  };

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
    { id: "conversaciones", label: "Conversaciones", icon: MessageSquare },
    { id: "plantillas", label: "Plantillas", icon: Send },
    { id: "campanas", label: "Campañas", icon: Users },
    { id: "automatizaciones", label: "Automatizaciones", icon: Zap }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-crm-text-primary font-display flex items-center gap-3">
            <div className="p-2 bg-crm-primary rounded-xl">
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
            Marketing WhatsApp
          </h1>
          <p className="text-crm-text-secondary mt-1">
            Gestiona campañas, conversaciones y automatizaciones de WhatsApp
          </p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-crm-card border border-crm-border rounded-xl p-2">
        <div className="flex items-center gap-2 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-crm-primary text-white shadow-sm'
                  : 'text-crm-text-secondary hover:bg-crm-card-hover'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[500px]">
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            <DashboardMetricas />
            
            {/* Resumen rápido */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-crm-card border border-crm-border rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-crm-primary/10 rounded-xl">
                    <MessageSquare className="w-6 h-6 text-crm-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-crm-text-primary">WhatsApp Business</h3>
                    <p className="text-xs text-crm-text-muted">Mensajería directa</p>
                  </div>
                </div>
                <p className="text-sm text-crm-text-secondary">
                  Envía mensajes personalizados usando plantillas aprobadas por WhatsApp
                </p>
              </div>

              <div className="bg-crm-card border border-crm-border rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-crm-secondary/10 rounded-xl">
                    <Users className="w-6 h-6 text-crm-secondary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-crm-text-primary">Campañas Masivas</h3>
                    <p className="text-xs text-crm-text-muted">Alcance amplio</p>
                  </div>
                </div>
                <p className="text-sm text-crm-text-secondary">
                  Crea campañas segmentadas para llegar a tu audiencia objetivo
                </p>
              </div>

              <div className="bg-crm-card border border-crm-border rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-crm-accent/10 rounded-xl">
                    <Zap className="w-6 h-6 text-crm-accent" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-crm-text-primary">Automatizaciones</h3>
                    <p className="text-xs text-crm-text-muted">Flujos automáticos</p>
                  </div>
                </div>
                <p className="text-sm text-crm-text-secondary">
                  Configura journeys que se ejecutan automáticamente por eventos
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "conversaciones" && <BandejaConversaciones />}
        {activeTab === "plantillas" && <GestionPlantillas />}
        {activeTab === "campanas" && <GestionCampanas />}
        {activeTab === "automatizaciones" && <GestionAutomatizaciones />}
      </div>

      {/* Info importante - Solo mostrar si NO tiene credenciales */}
      {!verificandoCredenciales && !tieneCredenciales && (
        <div className="bg-crm-warning/10 border border-crm-warning/30 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-crm-warning/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-crm-warning text-sm">⚠️</span>
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
      {!verificandoCredenciales && tieneCredenciales && (
        <div className="bg-crm-success/10 border border-crm-success/30 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-crm-success/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-crm-success text-sm">✓</span>
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