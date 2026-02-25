"use client";

import { useEffect, useState, useCallback } from "react";
import { Info, MessageSquare, Heart, FileText, DollarSign, Clock, FileSpreadsheet } from "lucide-react";
import TabInformacionBasica from "./_TabInformacionBasica";
import TabInteracciones from "./_TabInteracciones";
import TabPropiedadesInteres from "./_TabPropiedadesInteres";
import TabReservas from "./_TabReservas";
import TabVentas from "./_TabVentas";
import TabTimeline from "./_TabTimeline";
import TabProformas from "./_TabProformas";
import type { ClienteCompleto } from "@/lib/types/clientes";
import type {
  InteraccionConVendedor,
  ReservaConRelaciones,
  VentaConRelaciones,
  AsesorActual,
} from "@/lib/types/cliente-detail";
import type { ProformaRecord } from "@/types/proforma";
import type { PropiedadInteres } from "@/types/propiedades-interes";

interface Props {
  cliente: ClienteCompleto;
  interacciones: InteraccionConVendedor[];
  propiedadesInteres: PropiedadInteres[];
  reservas: ReservaConRelaciones[];
  ventas: VentaConRelaciones[];
  proformas: ProformaRecord[];
  asesorActual: AsesorActual | null;
  defaultTab?: ClienteTabType;
  vendedores: Array<{ id: string; username: string; nombre_completo?: string | null; telefono?: string | null; email?: string | null }>;
  isAdmin?: boolean;
  seguimientosVencidos?: number;
}

export type ClienteTabType =
  | 'info'
  | 'interacciones'
  | 'propiedades'
  | 'reservas'
  | 'ventas'
  | 'proformas'
  | 'timeline';

export default function ClienteDetailTabs({
  cliente,
  interacciones,
  propiedadesInteres,
  reservas,
  ventas,
  proformas,
  asesorActual,
  vendedores,
  defaultTab = 'info',
  isAdmin = false,
  seguimientosVencidos = 0,
}: Props) {
  const [activeTab, setActiveTab] = useState<ClienteTabType>(defaultTab);
  const [interaccionesCount, setInteraccionesCount] = useState(interacciones.length);

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  // Sync interacciones count when props change (e.g., after router.refresh)
  useEffect(() => {
    setInteraccionesCount(interacciones.length);
  }, [interacciones.length]);

  const handleInteraccionesCountChange = useCallback((count: number) => {
    setInteraccionesCount(count);
  }, []);

  const tabs = [
    {
      id: 'info' as ClienteTabType,
      label: 'Información',
      icon: Info,
      count: null,
    },
    {
      id: 'timeline' as ClienteTabType,
      label: 'Historial',
      icon: Clock,
      count: null,
    },
    {
      id: 'interacciones' as ClienteTabType,
      label: 'Interacciones',
      icon: MessageSquare,
      count: interaccionesCount,
    },
    {
      id: 'propiedades' as ClienteTabType,
      label: 'Propiedades de Interés',
      icon: Heart,
      count: propiedadesInteres.length,
    },
    {
      id: 'reservas' as ClienteTabType,
      label: 'Reservas',
      icon: FileText,
      count: reservas.length,
    },
    {
      id: 'ventas' as ClienteTabType,
      label: 'Ventas',
      icon: DollarSign,
      count: ventas.length,
    },
    {
      id: 'proformas' as ClienteTabType,
      label: 'Cotizaciones',
      icon: FileSpreadsheet,
      count: proformas.length,
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
                {tab.id === 'interacciones' && seguimientosVencidos > 0 && (
                  <span className="relative flex h-2.5 w-2.5" title={`${seguimientosVencidos} seguimiento${seguimientosVencidos > 1 ? 's' : ''} vencido${seguimientosVencidos > 1 ? 's' : ''}`}>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'info' && (
          <TabInformacionBasica cliente={cliente} vendedores={vendedores} />
        )}
        {activeTab === 'timeline' && <TabTimeline clienteId={cliente.id} />}
        {activeTab === 'interacciones' && (
          <TabInteracciones
            clienteId={cliente.id}
            clienteNombre={cliente.nombre}
            interacciones={interacciones}
            onCountChange={handleInteraccionesCountChange}
          />
        )}
        {activeTab === 'propiedades' && (
          <TabPropiedadesInteres
            propiedades={propiedadesInteres}
            clienteId={cliente.id}
          />
        )}
        {activeTab === 'reservas' && <TabReservas clienteId={cliente.id} clienteNombre={cliente.nombre} reservas={reservas} isAdmin={isAdmin} />}
        {activeTab === 'ventas' && <TabVentas ventas={ventas} />}
        {activeTab === 'proformas' && (
          <TabProformas
            cliente={cliente}
            proformas={proformas}
            reservas={reservas}
            ventas={ventas}
            asesorActual={asesorActual}
            isAdmin={isAdmin}
          />
        )}
      </div>
    </div>
  );
}
