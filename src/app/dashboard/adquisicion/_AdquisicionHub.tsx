"use client";

import { useState } from "react";
import { LayoutGrid, FileSpreadsheet, Receipt } from "lucide-react";
import dynamic from "next/dynamic";

const PipelineView = dynamic(() => import("./_PipelineView"), { ssr: false });
const SeparacionesList = dynamic(() => import("./_SeparacionesList"), { ssr: false });
const ProformasList = dynamic(() => import("./_ProformasList"), { ssr: false });

type AdquisicionTab = 'procesos' | 'separaciones' | 'proformas';

const TABS: Array<{ id: AdquisicionTab; label: string; icon: typeof LayoutGrid }> = [
  { id: 'procesos', label: 'Procesos', icon: LayoutGrid },
  { id: 'separaciones', label: 'Separaciones', icon: Receipt },
  { id: 'proformas', label: 'Proformas', icon: FileSpreadsheet },
];

export default function AdquisicionHub() {
  const [activeTab, setActiveTab] = useState<AdquisicionTab>('procesos');

  return (
    <div className="space-y-4">
      <div className="bg-crm-card border border-crm-border rounded-lg p-1">
        <div className="grid grid-cols-3 gap-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                activeTab === id
                  ? 'bg-crm-primary text-white shadow-md'
                  : 'text-crm-text-muted hover:bg-crm-background hover:text-crm-text'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'procesos' && <PipelineView />}
      {activeTab === 'separaciones' && <SeparacionesList />}
      {activeTab === 'proformas' && <ProformasList />}
    </div>
  );
}
