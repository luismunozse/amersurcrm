"use client";

import { useState } from "react";
import PerfilTabsContent from "./_PerfilTabsContent";
import { User, Mail, Lock, Activity } from "lucide-react";

interface Tab {
  id: string;
  label: string;
  icon: React.ReactNode;
}

interface PerfilTabsWrapperProps {
  perfil: any;
  isAdmin: boolean;
  currentEmail: string;
  userId: string;
  fechaAlta: string;
  ultimoAcceso?: string | null;
  user: any;
}

export default function PerfilTabsWrapper({
  perfil,
  isAdmin,
  currentEmail,
  userId,
  fechaAlta,
  ultimoAcceso,
  user,
}: PerfilTabsWrapperProps) {
  const tabs: Tab[] = [
    { id: 'informacion', label: 'Información', icon: <User className="w-4 h-4" /> },
    { id: 'editar', label: 'Editar Perfil', icon: <Mail className="w-4 h-4" /> },
    { id: 'seguridad', label: 'Seguridad', icon: <Lock className="w-4 h-4" /> },
    { id: 'estadisticas', label: 'Estadísticas', icon: <Activity className="w-4 h-4" /> },
  ];

  const [activeTab, setActiveTab] = useState('informacion');

  return (
    <div className="space-y-6">
      {/* Tabs Navigation */}
      <div className="border-b border-crm-border">
        <nav className="flex space-x-1 overflow-x-auto" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap
                border-b-2 transition-colors
                ${
                  activeTab === tab.id
                    ? 'border-crm-primary text-crm-primary'
                    : 'border-transparent text-crm-text-muted hover:text-crm-text-primary hover:border-crm-border'
                }
              `}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        <PerfilTabsContent
          activeTab={activeTab}
          perfil={perfil}
          isAdmin={isAdmin}
          currentEmail={currentEmail}
          userId={userId}
          fechaAlta={fechaAlta}
          ultimoAcceso={ultimoAcceso}
          user={user}
        />
      </div>
    </div>
  );
}

