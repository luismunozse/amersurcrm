'use client';

import { useState } from 'react';
import { MapPin, List } from 'lucide-react';

interface ProjectTabsProps {
  lotesSection: React.ReactNode;
  mapeoSection: React.ReactNode;
}

export default function ProjectTabs({ lotesSection, mapeoSection }: ProjectTabsProps) {
  const [activeTab, setActiveTab] = useState<'lotes' | 'mapeo'>('lotes');

  return (
    <div className="space-y-4">
      {/* Tabs Navigation */}
      <div className="crm-card p-1">
        <div className="flex flex-col gap-1 sm:grid sm:grid-cols-2">
          <button
            key="tab-lotes"
            onClick={() => setActiveTab('lotes')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'lotes'
                ? 'bg-crm-primary text-white shadow-md'
                : 'text-crm-text-secondary hover:bg-crm-card-hover'
            }`}
          >
            <List className="w-4 h-4" />
            <span>Gestión de Lotes</span>
          </button>
          <button
            key="tab-mapeo"
            onClick={() => setActiveTab('mapeo')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'mapeo'
                ? 'bg-crm-primary text-white shadow-md'
                : 'text-crm-text-secondary hover:bg-crm-card-hover'
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>Mapeo de Lotes</span>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="space-y-4 md:space-y-6">
        {activeTab === 'lotes' && lotesSection}
        {activeTab === 'mapeo' && mapeoSection}
      </div>
    </div>
  );
}
