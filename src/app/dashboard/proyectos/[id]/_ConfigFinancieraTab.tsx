"use client";

import { useEffect, useState, useTransition } from "react";
import { Settings2, Save } from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";
import type { ConfiguracionProyectoFinanciera } from "@/lib/types/cuotas";
import toast from "react-hot-toast";

interface Props {
  proyectoId: string;
}

export default function ConfigFinancieraTab({ proyectoId }: Props) {
  const [config, setConfig] = useState<Partial<ConfiguracionProyectoFinanciera>>({
    porcentaje_minimo_separacion: 5,
    porcentaje_cuota_inicial: 20,
    max_cuotas_iniciales: 3,
    max_cuotas_saldo: 120,
    tasa_efectiva_mensual: 0,
    tasa_mora_mensual: 0.015,
    dias_gracia_mora: 3,
    penalidad_clientes_al_dia: 0,
    penalidad_clientes_morosos: 2,
    descuento_maximo_letra: 0,
    seguro_desgravamen_porcentaje: 0,
    seguro_multiriesgo_porcentaje: 0,
    moneda_predeterminada: 'PEN',
  });
  const [loading, setLoading] = useState(true);
  const [existingId, setExistingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    loadConfig();
  }, [proyectoId]);

  async function loadConfig() {
    const { data } = await supabase
      .schema('crm')
      .from('configuracion_proyecto_financiera')
      .select('*')
      .eq('proyecto_id', proyectoId)
      .maybeSingle();

    if (data) {
      setConfig(data);
      setExistingId(data.id);
    }
    setLoading(false);
  }

  async function handleSave() {
    startTransition(async () => {
      const payload = {
        proyecto_id: proyectoId,
        porcentaje_minimo_separacion: config.porcentaje_minimo_separacion,
        porcentaje_cuota_inicial: config.porcentaje_cuota_inicial,
        max_cuotas_iniciales: config.max_cuotas_iniciales,
        max_cuotas_saldo: config.max_cuotas_saldo,
        tasa_efectiva_mensual: config.tasa_efectiva_mensual,
        tasa_mora_mensual: config.tasa_mora_mensual,
        dias_gracia_mora: config.dias_gracia_mora,
        penalidad_clientes_al_dia: config.penalidad_clientes_al_dia,
        penalidad_clientes_morosos: config.penalidad_clientes_morosos,
        descuento_maximo_letra: config.descuento_maximo_letra,
        seguro_desgravamen_porcentaje: config.seguro_desgravamen_porcentaje,
        seguro_multiriesgo_porcentaje: config.seguro_multiriesgo_porcentaje,
        moneda_predeterminada: config.moneda_predeterminada,
      };

      let error;
      if (existingId) {
        ({ error } = await supabase
          .schema('crm')
          .from('configuracion_proyecto_financiera')
          .update(payload)
          .eq('id', existingId));
      } else {
        const result = await supabase
          .schema('crm')
          .from('configuracion_proyecto_financiera')
          .insert(payload)
          .select()
          .single();
        error = result.error;
        if (result.data) setExistingId(result.data.id);
      }

      if (error) {
        toast.error('Error al guardar: ' + error.message);
      } else {
        toast.success('Configuración financiera guardada');
      }
    });
  }

  function Field({ label, field, type = 'number', suffix = '' }: { label: string; field: keyof ConfiguracionProyectoFinanciera; type?: string; suffix?: string }) {
    return (
      <div>
        <label className="block text-sm font-medium text-crm-text mb-1">{label}</label>
        <div className="flex items-center gap-1">
          <input
            type={type}
            step="any"
            value={(config as any)[field] ?? ''}
            onChange={e => setConfig(prev => ({ ...prev, [field]: type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value }))}
            className="w-full border border-crm-border rounded-lg px-3 py-2 text-sm bg-crm-card"
          />
          {suffix && <span className="text-sm text-crm-text-muted whitespace-nowrap">{suffix}</span>}
        </div>
      </div>
    );
  }

  if (loading) return <div className="text-center py-8 text-crm-text-muted">Cargando configuración...</div>;

  return (
    <div className="bg-crm-card border border-crm-border rounded-lg p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-crm-text flex items-center gap-2">
          <Settings2 className="h-5 w-5" /> Configuración Financiera del Proyecto
        </h3>
        <button
          onClick={handleSave}
          disabled={isPending}
          className="flex items-center gap-1 px-4 py-2 bg-crm-primary text-white rounded-lg text-sm hover:bg-crm-primary/90 disabled:opacity-50"
        >
          <Save className="h-4 w-4" /> {isPending ? 'Guardando...' : 'Guardar'}
        </button>
      </div>

      {/* Separación */}
      <div>
        <h4 className="text-sm font-semibold text-crm-text-muted uppercase tracking-wider mb-3">Separación / Cuota Inicial</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="% Mínimo Separación" field="porcentaje_minimo_separacion" suffix="%" />
          <Field label="% Mínimo Cuota Inicial" field="porcentaje_cuota_inicial" suffix="%" />
          <Field label="Máx. Cuotas Iniciales" field="max_cuotas_iniciales" />
        </div>
      </div>

      {/* Financiamiento */}
      <div>
        <h4 className="text-sm font-semibold text-crm-text-muted uppercase tracking-wider mb-3">Financiamiento</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Máx. Cuotas de Saldo" field="max_cuotas_saldo" />
          <Field label="Tasa Efectiva Mensual" field="tasa_efectiva_mensual" />
          <Field label="Moneda Predeterminada" field="moneda_predeterminada" type="text" />
        </div>
      </div>

      {/* Mora */}
      <div>
        <h4 className="text-sm font-semibold text-crm-text-muted uppercase tracking-wider mb-3">Mora y Penalidades</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Tasa Mora Mensual" field="tasa_mora_mensual" />
          <Field label="Días de Gracia" field="dias_gracia_mora" />
          <Field label="Penalidad Clientes Al Día" field="penalidad_clientes_al_dia" suffix="%" />
          <Field label="Penalidad Clientes Morosos" field="penalidad_clientes_morosos" suffix="%" />
          <Field label="Descuento Máximo por Letra" field="descuento_maximo_letra" suffix="%" />
        </div>
      </div>

      {/* Seguros */}
      <div>
        <h4 className="text-sm font-semibold text-crm-text-muted uppercase tracking-wider mb-3">Seguros</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Seguro Desgravamen" field="seguro_desgravamen_porcentaje" suffix="%" />
          <Field label="Seguro Multiriesgo" field="seguro_multiriesgo_porcentaje" suffix="%" />
        </div>
      </div>
    </div>
  );
}
