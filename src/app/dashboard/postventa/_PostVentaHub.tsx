"use client";

import { useState } from "react";
import { Truck, Headphones } from "lucide-react";
import dynamic from "next/dynamic";

const EntregasList = dynamic(() => import("../entregas/_EntregasList"), { ssr: false });
const PostVentaList = dynamic(() => import("./_PostVentaList"), { ssr: false });

type PostVentaTab = 'entregas' | 'solicitudes';

const tabs: { id: PostVentaTab; label: string; icon: typeof Truck }[] = [
  { id: 'entregas', label: 'Entregas', icon: Truck },
  { id: 'solicitudes', label: 'Solicitudes', icon: Headphones },
];

export default function PostVentaHub() {
  const [activeTab, setActiveTab] = useState<PostVentaTab>('entregas');

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
      {activeTab === 'entregas' && <EntregasList />}
      {activeTab === 'solicitudes' && <PostVentaList />}
    </div>
  );
}
