"use client";

import { useState } from "react";
import { Banknote, AlertTriangle, BarChart3 } from "lucide-react";
import dynamic from "next/dynamic";

const CobranzaList = dynamic(() => import("./_CobranzaList"), { ssr: false });

type ControlPagosTab = 'cobranza' | 'seguimiento';

const tabs: { id: ControlPagosTab; label: string; icon: typeof Banknote }[] = [
  { id: 'cobranza', label: 'Cobranza', icon: Banknote },
  { id: 'seguimiento', label: 'Seguimiento de Mora', icon: AlertTriangle },
];

export default function ControlPagosHub() {
  const [activeTab, setActiveTab] = useState<ControlPagosTab>('cobranza');

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="bg-crm-card border border-crm-border rounded-lg p-1">
        <div className="grid grid-cols-2 gap-1">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-crm-primary text-white shadow-md'
                    : 'text-crm-text-muted hover:bg-crm-background hover:text-crm-text'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      {activeTab === 'cobranza' && <CobranzaList />}
      {activeTab === 'seguimiento' && <CobranzaList />}
    </div>
  );
}
