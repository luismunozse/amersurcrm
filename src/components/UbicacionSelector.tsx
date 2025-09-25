"use client";

import { useState, useEffect, useRef } from "react";

interface Departamento { code: string; name: string }
interface Provincia { code: string; name: string; departamento_code: string }
interface Distrito { code: string; name: string; provincia_code: string }

interface UbicacionSelectorProps {
  onUbicacionChange?: (ubicacion: {
    departamento: string;
    provincia: string;
    distrito: string;
    codigoDepartamento: string;
    codigoProvincia: string;
    codigoDistrito: string;
  }) => void;
  disabled?: boolean;
  className?: string;
}

export default function UbicacionSelector({
  onUbicacionChange,
  disabled = false,
  className = "",
}: UbicacionSelectorProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [provincias, setProvincias] = useState<Provincia[]>([]);
  const [distritos, setDistritos] = useState<Distrito[]>([]);

  const [departamentoSeleccionado, setDepartamentoSeleccionado] = useState("");
  const [provinciaSeleccionada, setProvinciaSeleccionada] = useState("");
  const [distritoSeleccionado, setDistritoSeleccionado] = useState("");

  const [departamentoAbierto, setDepartamentoAbierto] = useState(false);
  const [provinciaAbierta, setProvinciaAbierta] = useState(false);
  const [distritoAbierto, setDistritoAbierto] = useState(false);

  const depRef = useRef<HTMLDivElement>(null);
  const provRef = useRef<HTMLDivElement>(null);
  const distRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (depRef.current && !depRef.current.contains(t)) setDepartamentoAbierto(false);
      if (provRef.current && !provRef.current.contains(t)) setProvinciaAbierta(false);
      if (distRef.current && !distRef.current.contains(t)) setDistritoAbierto(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Removed automatic opening of department dropdown
  // useEffect(() => {
  //   if (!disabled && departamentos.length > 0 && !departamentoSeleccionado) {
  //     setDepartamentoAbierto(true);
  //   }
  // }, [disabled, departamentos.length, departamentoSeleccionado]);

  useEffect(() => {
    const loadAllData = async () => {
      try {
        setLoading(true);
        const [depsRes, provsRes, distsRes] = await Promise.all([
          fetch("/api/ubigeo/departamentos"),
          fetch("/api/ubigeo/provincias"),
          fetch("/api/ubigeo/distritos"),
        ]);
        if (!depsRes.ok || !provsRes.ok || !distsRes.ok) {
          throw new Error(
            `API Error: ${depsRes.status}, ${provsRes.status}, ${distsRes.status}`
          );
        }
        const [departamentosData, provinciasData, distritosData] = await Promise.all([
          depsRes.json(),
          provsRes.json(),
          distsRes.json(),
        ]);
        const depsFixed = (departamentosData || []).map((it: any) => ({
          code: String(it.code ?? it.codigo ?? it.cod ?? '').trim(),
          name: String(it.name ?? it.nombre ?? '').trim(),
        }));
        const provsFixed = (provinciasData || []).map((it: any) => ({
          code: String(it.code ?? it.codigo ?? it.cod ?? '').trim(),
          name: String(it.name ?? it.nombre ?? '').trim(),
          departamento_code: String(it.departamento_code ?? it.dep_code ?? it.departamento ?? '').trim(),
        }));
        const distsFixed = (distritosData || []).map((it: any) => ({
          code: String(it.code ?? it.codigo ?? it.cod ?? '').trim(),
          name: String(it.name ?? it.nombre ?? '').trim(),
          provincia_code: String(it.provincia_code ?? it.prov_code ?? it.provincia ?? '').trim(),
        }));
        setDepartamentos(depsFixed);
        setProvincias(provsFixed);
        setDistritos(distsFixed);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error cargando datos");
      } finally {
        setLoading(false);
      }
    };
    loadAllData();
  }, []);

  const handleDepartamentoChange = (code: string) => {
    setDepartamentoSeleccionado(code);
    setProvinciaSeleccionada("");
    setDistritoSeleccionado("");
    setDepartamentoAbierto(false);
  };
  const handleProvinciaChange = (code: string) => {
    setProvinciaSeleccionada(code);
    setDistritoSeleccionado("");
    setProvinciaAbierta(false);
  };
  const handleDistritoChange = (code: string) => {
    setDistritoSeleccionado(code);
    setDistritoAbierto(false);
  };

  useEffect(() => {
    if (onUbicacionChange && departamentoSeleccionado && provinciaSeleccionada && distritoSeleccionado) {
      const departamento = departamentos.find(d => d.code === departamentoSeleccionado);
      const provincia = provincias.find(p => p.code === provinciaSeleccionada);
      const distrito = distritos.find(d => d.code === distritoSeleccionado);
      if (departamento && provincia && distrito) {
        onUbicacionChange({
          departamento: departamento.name,
          provincia: provincia.name,
          distrito: distrito.name,
          codigoDepartamento: departamentoSeleccionado,
          codigoProvincia: provinciaSeleccionada,
          codigoDistrito: distritoSeleccionado,
        });
      }
    }
  }, [departamentoSeleccionado, provinciaSeleccionada, distritoSeleccionado, onUbicacionChange, departamentos, provincias, distritos]);

  const provinciasFiltradas = departamentoSeleccionado
    ? provincias.filter(p => p.departamento_code === departamentoSeleccionado)
    : [];
  const distritosFiltrados = provinciaSeleccionada
    ? distritos.filter(d => d.provincia_code === provinciaSeleccionada)
    : [];

  const depNombre = departamentos.find(d => d.code === departamentoSeleccionado)?.name ?? "";
  const provNombre = provincias.find(p => p.code === provinciaSeleccionada)?.name ?? "";
  const distNombre = distritos.find(d => d.code === distritoSeleccionado)?.name ?? "";

  if (loading) {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 ${className}`}>
        <div className="animate-pulse bg-neutral-100 h-12 rounded-xl" />
        <div className="animate-pulse bg-neutral-100 h-12 rounded-xl" />
        <div className="animate-pulse bg-neutral-100 h-12 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return <div className={`text-red-600 text-sm ${className}`}>Error: {error}</div>;
  }

  const triggerClass =
    "w-full px-4 py-3 border-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--crm-primary)] focus:border-transparent bg-white dark:bg-[var(--crm-card)] border-[var(--crm-border)] text-[var(--crm-text-primary)] disabled:opacity-50 transition-all text-left flex justify-between items-center";
  const listClass =
    "absolute z-50 w-full mt-1 max-h-60 overflow-y-auto rounded-xl border-2 border-[var(--crm-border)] shadow-xl ubigeo-menu";
  const itemClass =
    "w-full px-4 py-3 text-left cursor-pointer transition-colors border-b border-[var(--crm-border)] last:border-b-0 ubigeo-item";

  return (
    <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 ${className}`}>
      {/* Departamento */}
      <div className="space-y-2" ref={depRef}>
        <label className="block text-sm font-medium text-[var(--crm-text-secondary)]">
          Departamento <span className="text-red-500">*</span>
        </label>
        <div className="relative" role="combobox" aria-expanded={departamentoAbierto}>
          <button
            type="button"
            onClick={() => setDepartamentoAbierto(a => !a)}
            disabled={disabled}
            className={triggerClass}
          >
            <span className={depNombre ? "text-[var(--crm-text-primary)]" : "text-[var(--crm-text-muted)]"} style={{ color: depNombre ? '#0f172a' : '#64748b' }}>
              {depNombre || "Seleccionar departamento"}
            </span>
            <svg className={`w-4 h-4 transition-transform ${departamentoAbierto ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {departamentoAbierto && (
            <div className={listClass} role="listbox">
              {departamentos.map((d) => (
                <div
                  role="option"
                  aria-selected={d.code === departamentoSeleccionado}
                  key={d.code}
                  onClick={() => handleDepartamentoChange(d.code)}
                  className={itemClass}
                >
                  <span className="ubigeo-item-text">{d.name || '(sin nombre)'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Provincia */}
      <div className="space-y-2" ref={provRef}>
        <label className="block text-sm font-medium text-[var(--crm-text-secondary)]">
          Provincia <span className="text-red-500">*</span>
        </label>
        <div className="relative" role="combobox" aria-expanded={provinciaAbierta}>
          <button
            type="button"
            onClick={() => setProvinciaAbierta(a => !a)}
            disabled={disabled || !departamentoSeleccionado || provinciasFiltradas.length === 0}
            className={triggerClass}
          >
            <span className={provNombre ? "text-[var(--crm-text-primary)]" : "text-[var(--crm-text-muted)]"} style={{ color: provNombre ? '#0f172a' : '#64748b' }}>
              {provNombre || "Seleccionar provincia"}
            </span>
            <svg className={`w-4 h-4 transition-transform ${provinciaAbierta ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {provinciaAbierta && provinciasFiltradas.length > 0 && (
            <div className={listClass} role="listbox">
              {provinciasFiltradas.map((p) => (
                <div
                  role="option"
                  aria-selected={p.code === provinciaSeleccionada}
                  key={p.code}
                  onClick={() => handleProvinciaChange(p.code)}
                  className={itemClass}
                >
                  <span className="ubigeo-item-text">{p.name || '(sin nombre)'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Distrito */}
      <div className="space-y-2" ref={distRef}>
        <label className="block text-sm font-medium text-[var(--crm-text-secondary)]">
          Distrito <span className="text-red-500">*</span>
        </label>
        <div className="relative" role="combobox" aria-expanded={distritoAbierto}>
          <button
            type="button"
            onClick={() => setDistritoAbierto(a => !a)}
            disabled={disabled || !provinciaSeleccionada || distritosFiltrados.length === 0}
            className={triggerClass}
          >
            <span className={distNombre ? "text-[var(--crm-text-primary)]" : "text-[var(--crm-text-muted)]"} style={{ color: distNombre ? '#0f172a' : '#64748b' }}>
              {distNombre || "Seleccionar distrito"}
            </span>
            <svg className={`w-4 h-4 transition-transform ${distritoAbierto ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {distritoAbierto && distritosFiltrados.length > 0 && (
            <div className={listClass} role="listbox">
              {distritosFiltrados.map((d) => (
                <div
                  role="option"
                  aria-selected={d.code === distritoSeleccionado}
                  key={d.code}
                  onClick={() => handleDistritoChange(d.code)}
                  className={itemClass}
                >
                  <span className="ubigeo-item-text">{d.name || '(sin nombre)'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
