"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Banknote, AlertTriangle, BellRing } from "lucide-react";
import dynamic from "next/dynamic";

const CobranzaList = dynamic(() => import("./_CobranzaList"), { ssr: false });
const SeguimientoMoraList = dynamic(() => import("./_SeguimientoMoraList"), { ssr: false });
const AlertasCobranzaList = dynamic(() => import("./_AlertasCobranzaList"), { ssr: false });

export type ControlPagosTab = 'cobranza' | 'seguimiento' | 'alertas';

interface Props {
  esAdmin?: boolean;
  initialTab?: ControlPagosTab;
}

const tabs: { id: ControlPagosTab; label: string; icon: typeof Banknote }[] = [
  { id: 'cobranza', label: 'Cobranza', icon: Banknote },
  { id: 'seguimiento', label: 'Seguimiento de Mora', icon: AlertTriangle },
  { id: 'alertas', label: 'Alertas', icon: BellRing },
];

const VALID_TABS: readonly string[] = tabs.map((t) => t.id);

function tabDesdeParam(param: string | null): ControlPagosTab | null {
  return param && VALID_TABS.includes(param) ? (param as ControlPagosTab) : null;
}

export default function ControlPagosHub({ esAdmin = false, initialTab = 'cobranza' }: Props) {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');

  const [activeTab, setActiveTab] = useState<ControlPagosTab>(initialTab);
  // Recuerda el último `tab` de la URL visto para detectar una navegación
  // soft (p.ej. router.push('?tab=alertas') desde una notificación) mientras
  // la página ya está montada — useState(initialTab) solo aplica en el
  // montaje inicial. Ajuste de estado durante el render (no en un
  // useEffect, ver rerender-derived-state-no-effect): un click manual en una
  // pestaña no toca `tabParam`, así que sigue funcionando sin interferencia.
  const [lastTabParam, setLastTabParam] = useState(tabParam);
  if (tabParam !== lastTabParam) {
    setLastTabParam(tabParam);
    const tabDesdeUrl = tabDesdeParam(tabParam);
    if (tabDesdeUrl) setActiveTab(tabDesdeUrl);
  }

  return (
    <div className="space-y-4">
      <div className="bg-crm-card border border-crm-border rounded-lg p-1">
        <div className="grid grid-cols-3 gap-1">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-[color,background-color,box-shadow] duration-200 ease-out-strong ${
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

      {activeTab === 'cobranza' && <CobranzaList esAdmin={esAdmin} />}
      {activeTab === 'seguimiento' && <SeguimientoMoraList esAdmin={esAdmin} />}
      {activeTab === 'alertas' && <AlertasCobranzaList />}
    </div>
  );
}
