"use client";

import { useState } from "react";
import { Info, MessageSquare, Heart, Eye, FileText, DollarSign, Clock } from "lucide-react";
import TabInformacionBasica from "./_TabInformacionBasica";
import TabInteracciones from "./_TabInteracciones";
import TabPropiedadesInteres from "./_TabPropiedadesInteres";
import TabVisitas from "./_TabVisitas";
import TabReservas from "./_TabReservas";
import TabVentas from "./_TabVentas";
import TabTimeline from "./_TabTimeline";

interface Props {
  cliente: any;
  interacciones: any[];
  propiedadesInteres: any[];
  visitas: any[];
  reservas: any[];
  ventas: any[];
}

type TabType = 'info' | 'interacciones' | 'propiedades' | 'visitas' | 'reservas' | 'ventas' | 'timeline';

export default function ClienteDetailTabs({
  cliente,
  interacciones,
  propiedadesInteres,
  visitas,
  reservas,
  ventas
}: Props) {
  const [activeTab, setActiveTab] = useState<TabType>('info');

  const tabs = [
    {
      id: 'info' as TabType,
      label: 'Información',
      icon: Info,
      count: null,
    },
    {
      id: 'timeline' as TabType,
      label: 'Historial',
      icon: Clock,
      count: null,
    },
    {
      id: 'interacciones' as TabType,
      label: 'Interacciones',
      icon: MessageSquare,
      count: interacciones.length,
    },
    {
      id: 'propiedades' as TabType,
      label: 'Propiedades de Interés',
      icon: Heart,
      count: propiedadesInteres.length,
    },
    {
      id: 'visitas' as TabType,
      label: 'Visitas',
      icon: Eye,
      count: visitas.length,
    },
    {
      id: 'reservas' as TabType,
      label: 'Reservas',
      icon: FileText,
      count: reservas.length,
    },
    {
      id: 'ventas' as TabType,
      label: 'Ventas',
      icon: DollarSign,
      count: ventas.length,
    },
  ];

  return (
    <div className="bg-crm-card border border-crm-border rounded-lg shadow-sm">
      {/* Tab Headers */}
      <div className="border-b border-crm-border overflow-x-auto">
        <div className="flex">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-6 py-4 text-sm font-medium whitespace-nowrap
                  transition-colors border-b-2 -mb-px
                  ${isActive
                    ? 'border-crm-primary text-crm-primary'
                    : 'border-transparent text-crm-text-muted hover:text-crm-text hover:border-crm-border'
                  }
                `}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
                {tab.count !== null && tab.count > 0 && (
                  <span className={`
                    px-2 py-0.5 text-xs font-semibold rounded-full
                    ${isActive
                      ? 'bg-crm-primary text-white'
                      : 'bg-crm-background text-crm-text-muted'
                    }
                  `}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'info' && <TabInformacionBasica cliente={cliente} />}
        {activeTab === 'timeline' && <TabTimeline clienteId={cliente.id} />}
        {activeTab === 'interacciones' && <TabInteracciones clienteId={cliente.id} clienteNombre={cliente.nombre} interacciones={interacciones} />}
        {activeTab === 'propiedades' && <TabPropiedadesInteres clienteId={cliente.id} propiedades={propiedadesInteres} />}
        {activeTab === 'visitas' && <TabVisitas clienteId={cliente.id} visitas={visitas} />}
        {activeTab === 'reservas' && <TabReservas clienteId={cliente.id} clienteNombre={cliente.nombre} reservas={reservas} />}
        {activeTab === 'ventas' && <TabVentas clienteId={cliente.id} ventas={ventas} />}
      </div>
    </div>
  );
}
