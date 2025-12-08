"use client";

import { useState } from "react";

interface Tab {
  id: string;
  label: string;
  icon: React.ReactNode;
}

interface PerfilTabsProps {
  tabs: Tab[];
  defaultTab?: string;
  children: (activeTab: string) => React.ReactNode;
}

export default function PerfilTabs({ tabs, defaultTab, children }: PerfilTabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id || '');

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
        {typeof children === 'function' ? children(activeTab) : children}
      </div>
    </div>
  );
}

