"use client";

import { useEffect, useState, useTransition, useCallback } from "react";
import { Settings2, Save, RotateCcw, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { usePermissions } from "@/lib/permissions/client";
import {
  obtenerConfigFinanciera,
  guardarConfigFinanciera,
  type ConfigFinanciera,
  type ConfigFinancieraInput,
} from "./_config-financiera-actions";

interface Props {
  proyectoId: string;
}

const DEFAULTS: ConfigFinancieraInput = {
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
  moneda_predeterminada: "PEN",
};

const MONEDAS = ["PEN", "USD"] as const;

function toInput(data: ConfigFinanciera | null): ConfigFinancieraInput {
  if (!data) return { ...DEFAULTS };
  return {
    porcentaje_minimo_separacion: Number(data.porcentaje_minimo_separacion ?? DEFAULTS.porcentaje_minimo_separacion),
    porcentaje_cuota_inicial: Number(data.porcentaje_cuota_inicial ?? DEFAULTS.porcentaje_cuota_inicial),
    max_cuotas_iniciales: Number(data.max_cuotas_iniciales ?? DEFAULTS.max_cuotas_iniciales),
    max_cuotas_saldo: Number(data.max_cuotas_saldo ?? DEFAULTS.max_cuotas_saldo),
    tasa_efectiva_mensual: Number(data.tasa_efectiva_mensual ?? DEFAULTS.tasa_efectiva_mensual),
    tasa_mora_mensual: Number(data.tasa_mora_mensual ?? DEFAULTS.tasa_mora_mensual),
    dias_gracia_mora: Number(data.dias_gracia_mora ?? DEFAULTS.dias_gracia_mora),
    penalidad_clientes_al_dia: Number(data.penalidad_clientes_al_dia ?? DEFAULTS.penalidad_clientes_al_dia),
    penalidad_clientes_morosos: Number(data.penalidad_clientes_morosos ?? DEFAULTS.penalidad_clientes_morosos),
    descuento_maximo_letra: Number(data.descuento_maximo_letra ?? DEFAULTS.descuento_maximo_letra),
    seguro_desgravamen_porcentaje: Number(data.seguro_desgravamen_porcentaje ?? DEFAULTS.seguro_desgravamen_porcentaje),
    seguro_multiriesgo_porcentaje: Number(data.seguro_multiriesgo_porcentaje ?? DEFAULTS.seguro_multiriesgo_porcentaje),
    moneda_predeterminada: data.moneda_predeterminada ?? DEFAULTS.moneda_predeterminada,
  };
}

function formatFecha(iso?: string): string {
  if (!iso) return "Sin registro";
  try {
    return new Date(iso).toLocaleString("es-PE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function validarCliente(payload: ConfigFinancieraInput): string | null {
  const porcentajes100: (keyof ConfigFinancieraInput)[] = [
    "porcentaje_minimo_separacion",
    "porcentaje_cuota_inicial",
    "penalidad_clientes_al_dia",
    "penalidad_clientes_morosos",
    "descuento_maximo_letra",
  ];
  for (const campo of porcentajes100) {
    const v = payload[campo] as number;
    if (typeof v !== "number" || Number.isNaN(v) || v < 0 || v > 100) {
      return `El campo ${campo.replace(/_/g, " ")} debe estar entre 0 y 100`;
    }
  }

  const fracciones: (keyof ConfigFinancieraInput)[] = [
    "tasa_efectiva_mensual",
    "tasa_mora_mensual",
    "seguro_desgravamen_porcentaje",
    "seguro_multiriesgo_porcentaje",
  ];
  for (const campo of fracciones) {
    const v = payload[campo] as number;
    if (typeof v !== "number" || Number.isNaN(v) || v < 0 || v > 1) {
      return `El campo ${campo.replace(/_/g, " ")} debe estar entre 0 y 1 (fracción decimal)`;
    }
  }

  if (!Number.isInteger(payload.max_cuotas_iniciales) || payload.max_cuotas_iniciales <= 0) {
    return "Máx. cuotas iniciales debe ser un entero mayor a 0";
  }
  if (!Number.isInteger(payload.max_cuotas_saldo) || payload.max_cuotas_saldo <= 0) {
    return "Máx. cuotas de saldo debe ser un entero mayor a 0";
  }
  if (!Number.isInteger(payload.dias_gracia_mora) || payload.dias_gracia_mora < 0) {
    return "Días de gracia de mora debe ser un entero mayor o igual a 0";
  }
  if (!MONEDAS.includes(payload.moneda_predeterminada as (typeof MONEDAS)[number])) {
    return "Seleccione una moneda válida";
  }
  return null;
}

export default function ConfigFinancieraTab({ proyectoId }: Props) {
  const { esAdminOCoordinador, loading: permisosCargando } = usePermissions();
  const puedeEditar = esAdminOCoordinador();

  const [original, setOriginal] = useState<ConfigFinanciera | null>(null);
  const [config, setConfig] = useState<ConfigFinancieraInput>({ ...DEFAULTS });
  const [loading, setLoading] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const loadConfig = useCallback(async () => {
    setLoading(true);
    setErrorCarga(null);
    const { data, error } = await obtenerConfigFinanciera(proyectoId);
    if (error) {
      setErrorCarga(error);
    } else {
      setOriginal(data);
      setConfig(toInput(data));
    }
    setLoading(false);
  }, [proyectoId]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  function actualizarCampo<K extends keyof ConfigFinancieraInput>(
    campo: K,
    valor: ConfigFinancieraInput[K],
  ) {
    setConfig((prev) => ({ ...prev, [campo]: valor }));
  }

  function handleReset() {
    setConfig(toInput(original));
    toast.success("Cambios descartados");
  }

  function handleSave() {
    const errorValidacion = validarCliente(config);
    if (errorValidacion) {
      toast.error(errorValidacion);
      return;
    }

    startTransition(async () => {
      const resultado = await guardarConfigFinanciera(proyectoId, config);
      if (resultado.success) {
        toast.success("Configuración financiera guardada");
        await loadConfig();
      } else {
        toast.error(resultado.error || "Error al guardar la configuración");
      }
    });
  }

  if (loading || permisosCargando) {
    return (
      <div className="flex items-center justify-center gap-2 py-8 text-crm-text-muted">
        <Loader2 className="h-4 w-4 animate-spin" /> Cargando configuración...
      </div>
    );
  }

  if (errorCarga) {
    return (
      <div className="bg-crm-card border border-red-300 text-red-700 rounded-lg p-4 text-sm">
        No se pudo cargar la configuración financiera. {errorCarga}
      </div>
    );
  }

  const readOnly = !puedeEditar;
  const inputClass = `w-full border border-crm-border rounded-lg px-3 py-2 text-sm bg-crm-card ${
    readOnly ? "opacity-70 cursor-not-allowed" : ""
  }`;

  return (
    <div className="bg-crm-card border border-crm-border rounded-lg p-6 space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-crm-text flex items-center gap-2">
            <Settings2 className="h-5 w-5" /> Configuración Financiera del Proyecto
          </h3>
          <p className="text-xs text-crm-text-muted mt-1">
            Última actualización: {formatFecha(original?.updated_at)}
          </p>
        </div>
        {!readOnly && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              disabled={isPending}
              className="flex items-center gap-1 px-3 py-2 border border-crm-border text-crm-text rounded-lg text-sm hover:bg-crm-card-hover disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4" /> Descartar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="flex items-center gap-1 px-4 py-2 bg-crm-primary text-white rounded-lg text-sm hover:bg-crm-primary/90 disabled:opacity-50"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isPending ? "Guardando..." : "Guardar"}
            </button>
          </div>
        )}
      </div>

      {readOnly && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg p-3 text-sm">
          Usted está visualizando esta configuración en modo solo lectura. Comuníquese con un administrador
          o coordinador para realizar cambios.
        </div>
      )}

      <section>
        <h4 className="text-sm font-semibold text-crm-text-muted uppercase tracking-wider mb-3">
          Separación / Cuota Inicial
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Campo
            label="% Mínimo Separación"
            suffix="%"
            value={config.porcentaje_minimo_separacion}
            onChange={(v) => actualizarCampo("porcentaje_minimo_separacion", v)}
            min={0}
            max={100}
            step="0.01"
            disabled={readOnly}
            className={inputClass}
          />
          <Campo
            label="% Mínimo Cuota Inicial"
            suffix="%"
            value={config.porcentaje_cuota_inicial}
            onChange={(v) => actualizarCampo("porcentaje_cuota_inicial", v)}
            min={0}
            max={100}
            step="0.01"
            disabled={readOnly}
            className={inputClass}
          />
          <Campo
            label="Máx. Cuotas Iniciales"
            value={config.max_cuotas_iniciales}
            onChange={(v) => actualizarCampo("max_cuotas_iniciales", Math.max(1, Math.trunc(v)))}
            min={1}
            step="1"
            disabled={readOnly}
            className={inputClass}
          />
        </div>
      </section>

      <section>
        <h4 className="text-sm font-semibold text-crm-text-muted uppercase tracking-wider mb-3">
          Financiamiento
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Campo
            label="Máx. Cuotas de Saldo"
            value={config.max_cuotas_saldo}
            onChange={(v) => actualizarCampo("max_cuotas_saldo", Math.max(1, Math.trunc(v)))}
            min={1}
            step="1"
            disabled={readOnly}
            className={inputClass}
          />
          <Campo
            label="Tasa Efectiva Mensual"
            hint="Fracción decimal (ej. 0.012 = 1.2%)"
            value={config.tasa_efectiva_mensual}
            onChange={(v) => actualizarCampo("tasa_efectiva_mensual", v)}
            min={0}
            max={1}
            step="0.000001"
            disabled={readOnly}
            className={inputClass}
          />
          <div>
            <label className="block text-sm font-medium text-crm-text mb-1">Moneda Predeterminada</label>
            <select
              value={config.moneda_predeterminada}
              onChange={(e) => actualizarCampo("moneda_predeterminada", e.target.value)}
              disabled={readOnly}
              className={inputClass}
            >
              {MONEDAS.map((m) => (
                <option key={m} value={m}>
                  {m === "PEN" ? "PEN — Soles" : "USD — Dólares"}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section>
        <h4 className="text-sm font-semibold text-crm-text-muted uppercase tracking-wider mb-3">
          Mora y Penalidades
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Campo
            label="Tasa Mora Mensual"
            hint="Fracción decimal (ej. 0.015 = 1.5%)"
            value={config.tasa_mora_mensual}
            onChange={(v) => actualizarCampo("tasa_mora_mensual", v)}
            min={0}
            max={1}
            step="0.000001"
            disabled={readOnly}
            className={inputClass}
          />
          <Campo
            label="Días de Gracia"
            value={config.dias_gracia_mora}
            onChange={(v) => actualizarCampo("dias_gracia_mora", Math.max(0, Math.trunc(v)))}
            min={0}
            step="1"
            disabled={readOnly}
            className={inputClass}
          />
          <Campo
            label="Penalidad Clientes Al Día"
            suffix="%"
            value={config.penalidad_clientes_al_dia}
            onChange={(v) => actualizarCampo("penalidad_clientes_al_dia", v)}
            min={0}
            max={100}
            step="0.01"
            disabled={readOnly}
            className={inputClass}
          />
          <Campo
            label="Penalidad Clientes Morosos"
            suffix="%"
            value={config.penalidad_clientes_morosos}
            onChange={(v) => actualizarCampo("penalidad_clientes_morosos", v)}
            min={0}
            max={100}
            step="0.01"
            disabled={readOnly}
            className={inputClass}
          />
          <Campo
            label="Descuento Máximo por Letra"
            suffix="%"
            value={config.descuento_maximo_letra}
            onChange={(v) => actualizarCampo("descuento_maximo_letra", v)}
            min={0}
            max={100}
            step="0.01"
            disabled={readOnly}
            className={inputClass}
          />
        </div>
      </section>

      <section>
        <h4 className="text-sm font-semibold text-crm-text-muted uppercase tracking-wider mb-3">Seguros</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Campo
            label="Seguro Desgravamen"
            hint="Fracción decimal mensual"
            value={config.seguro_desgravamen_porcentaje}
            onChange={(v) => actualizarCampo("seguro_desgravamen_porcentaje", v)}
            min={0}
            max={1}
            step="0.000001"
            disabled={readOnly}
            className={inputClass}
          />
          <Campo
            label="Seguro Multiriesgo"
            hint="Fracción decimal mensual"
            value={config.seguro_multiriesgo_porcentaje}
            onChange={(v) => actualizarCampo("seguro_multiriesgo_porcentaje", v)}
            min={0}
            max={1}
            step="0.000001"
            disabled={readOnly}
            className={inputClass}
          />
        </div>
      </section>
    </div>
  );
}

interface CampoProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: string;
  suffix?: string;
  hint?: string;
  disabled?: boolean;
  className?: string;
}

function Campo({ label, value, onChange, min, max, step, suffix, hint, disabled, className }: CampoProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-crm-text mb-1">{label}</label>
      <div className="flex items-center gap-1">
        <input
          type="number"
          step={step ?? "any"}
          min={min}
          max={max}
          value={Number.isFinite(value) ? value : ""}
          onChange={(e) => {
            const next = parseFloat(e.target.value);
            onChange(Number.isNaN(next) ? 0 : next);
          }}
          disabled={disabled}
          className={className}
        />
        {suffix && <span className="text-sm text-crm-text-muted whitespace-nowrap">{suffix}</span>}
      </div>
      {hint && <p className="text-xs text-crm-text-muted mt-1">{hint}</p>}
    </div>
  );
}
