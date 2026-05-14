"use client";

import { useEffect, useState } from "react";
import { Target, TrendingUp } from "lucide-react";
import { obtenerKPIs } from "./_actions-metas";
import { MESES } from "@/lib/types/metas";
import type { KPIVendedor } from "@/lib/types/metas";

export default function MetasManager() {
  const [kpis, setKpis] = useState<KPIVendedor[]>([]);
  const [loading, setLoading] = useState(true);
  const now = new Date();
  const [anio, setAnio] = useState(now.getFullYear());
  const [mes, setMes] = useState(now.getMonth() + 1);

  useEffect(() => { loadData(); }, [anio, mes]);

  async function loadData() {
    setLoading(true);
    const result = await obtenerKPIs({ periodoAnio: anio, periodoMes: mes });
    if (result.success) setKpis(result.data as KPIVendedor[]);
    setLoading(false);
  }

  function calcPorcentaje(real: number, meta: number) {
    if (meta <= 0) return 0;
    return Math.min(100, Math.round((real / meta) * 100));
  }

  function ProgressBar({ real, meta, label }: { real: number; meta: number; label: string }) {
    const pct = calcPorcentaje(real, meta);
    return (
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="text-crm-text-muted">{label}</span>
          <span className="text-crm-text font-medium">{real}/{meta} ({pct}%)</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`rounded-full h-2 transition-all ${pct >= 100 ? 'bg-green-500' : pct >= 70 ? 'bg-blue-500' : pct >= 40 ? 'bg-orange-500' : 'bg-red-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <select value={mes} onChange={e => setMes(Number(e.target.value))} className="border border-crm-border rounded-lg px-3 py-2 text-sm bg-crm-card">
          {MESES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
        <select value={anio} onChange={e => setAnio(Number(e.target.value))} className="border border-crm-border rounded-lg px-3 py-2 text-sm bg-crm-card">
          {[2025, 2026, 2027].map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-8 text-crm-text-muted">Cargando KPIs...</div>
      ) : kpis.length === 0 ? (
        <div className="text-center py-8 text-crm-text-muted">
          <Target className="h-12 w-12 mx-auto mb-2 opacity-30" />
          <p>No hay metas configuradas para {MESES.find(m => m.value === mes)?.label} {anio}</p>
          <p className="text-xs mt-1">Configura metas desde la sección de usuarios</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {kpis.map(kpi => (
            <div key={kpi.meta_id} className="bg-crm-card border border-crm-border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-crm-primary" />
                  <span className="font-semibold text-crm-text">{kpi.vendedor_username}</span>
                </div>
              </div>

              <ProgressBar real={kpi.real_ventas_cantidad} meta={kpi.meta_ventas_cantidad} label="Ventas (cantidad)" />
              <ProgressBar real={kpi.real_separaciones} meta={kpi.meta_separaciones} label="Separaciones" />
              <ProgressBar real={kpi.real_contactos} meta={kpi.meta_contactos} label="Contactos" />
              <ProgressBar real={kpi.real_visitas} meta={kpi.meta_visitas} label="Visitas" />

              {kpi.meta_ventas_monto > 0 && (
                <div className="pt-2 border-t border-crm-border/50">
                  <div className="flex justify-between text-sm">
                    <span className="text-crm-text-muted">Monto Ventas</span>
                    <span className="text-crm-text font-medium">
                      S/ {kpi.real_ventas_monto?.toLocaleString()} / S/ {kpi.meta_ventas_monto?.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
