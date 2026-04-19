"use client";

import { useState } from "react";
import { LayoutGrid, FileSpreadsheet } from "lucide-react";
import dynamic from "next/dynamic";

const PipelineView = dynamic(() => import("./_PipelineView"), { ssr: false });
const ProformasList = dynamic(() => import("./_ProformasList"), { ssr: false });

type AdquisicionTab = 'procesos' | 'proformas';

export default function AdquisicionHub() {
  const [activeTab, setActiveTab] = useState<AdquisicionTab>('procesos');

  return (
    <div className="space-y-4">
      <div className="bg-crm-card border border-crm-border rounded-lg p-1">
        <div className="grid grid-cols-2 gap-1">
          <button
            onClick={() => setActiveTab('procesos')}
            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'procesos'
                ? 'bg-crm-primary text-white shadow-md'
                : 'text-crm-text-muted hover:bg-crm-background hover:text-crm-text'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>Procesos</span>
          </button>
          <button
            onClick={() => setActiveTab('proformas')}
            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'proformas'
                ? 'bg-crm-primary text-white shadow-md'
                : 'text-crm-text-muted hover:bg-crm-background hover:text-crm-text'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Proformas</span>
          </button>
        </div>
      </div>

      {activeTab === 'procesos' && <PipelineView />}
      {activeTab === 'proformas' && <ProformasList />}
    </div>
  );
}
