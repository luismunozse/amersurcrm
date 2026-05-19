'use client';

import { useState } from 'react';
import { MapPin, List, Settings2, History } from 'lucide-react';
import dynamic from 'next/dynamic';

const ConfigFinancieraTab = dynamic(() => import('./_ConfigFinancieraTab'), { ssr: false });
const AuditoriaTab = dynamic(() => import('./_AuditoriaTab'), { ssr: false });

interface ProjectTabsProps {
  lotesSection: React.ReactNode;
  mapeoSection: React.ReactNode;
  proyectoId?: string;
  isAdmin?: boolean;
  puedeVerAuditoria?: boolean;
}

type TabId = 'lotes' | 'mapeo' | 'config_financiera' | 'auditoria';

export default function ProjectTabs({
  lotesSection,
  mapeoSection,
  proyectoId,
  isAdmin,
  puedeVerAuditoria,
}: ProjectTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('lotes');

  const tabs = [
    { id: 'lotes' as const, label: 'Gestión de Lotes', icon: List },
    { id: 'mapeo' as const, label: 'Mapeo de Lotes', icon: MapPin },
    ...(isAdmin && proyectoId
      ? [{ id: 'config_financiera' as const, label: 'Config. Financiera', icon: Settings2 }]
      : []),
    ...(puedeVerAuditoria && proyectoId
      ? [{ id: 'auditoria' as const, label: 'Auditoría', icon: History }]
      : []),
  ];

  return (
    <div className="space-y-4">
      {/* Tabs Navigation */}
      <div className="crm-card p-1">
        <div className={`flex flex-col gap-1 sm:grid sm:grid-cols-${tabs.length}`}>
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={`tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-crm-primary text-white shadow-md'
                    : 'text-crm-text-secondary hover:bg-crm-card-hover'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="space-y-4 md:space-y-6">
        {activeTab === 'lotes' && lotesSection}
        {activeTab === 'mapeo' && mapeoSection}
        {activeTab === 'config_financiera' && proyectoId && <ConfigFinancieraTab proyectoId={proyectoId} />}
        {activeTab === 'auditoria' && proyectoId && <AuditoriaTab proyectoId={proyectoId} />}
      </div>
    </div>
  );
}
