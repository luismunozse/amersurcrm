"use client";

import { useState, useEffect, useRef } from "react";

interface Departamento { code: string; name: string }
interface Provincia { code: string; name: string; departamento_code: string }
interface Distrito { code: string; name: string; provincia_code: string }

interface UbicacionSelectorProps {
  departamento?: string;
  provincia?: string;
  distrito?: string;
  onUbigeoChange?: (departamento: string, provincia: string, distrito: string) => void;
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
  departamento: propDepartamento = "",
  provincia: propProvincia = "",
  distrito: propDistrito = "",
  onUbigeoChange,
  onUbicacionChange,
  disabled = false,
  className = "",
}: UbicacionSelectorProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [provincias, setProvincias] = useState<Provincia[]>([]);
  const [distritos, setDistritos] = useState<Distrito[]>([]);

  const [departamentoSeleccionado, setDepartamentoSeleccionado] = useState(propDepartamento);
  const [provinciaSeleccionada, setProvinciaSeleccionada] = useState(propProvincia);
  const [distritoSeleccionado, setDistritoSeleccionado] = useState(propDistrito);

  // Solo sincronizar en la inicialización, no en cada cambio
  useEffect(() => {
    setDepartamentoSeleccionado(propDepartamento);
    setProvinciaSeleccionada(propProvincia);
    setDistritoSeleccionado(propDistrito);
  }, []); // Solo ejecutar una vez al montar

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
    
    // Llamar a onUbigeoChange si está disponible
    if (onUbigeoChange) {
      const depNombre = departamentos.find(d => d.code === code)?.name || "";
      onUbigeoChange(depNombre, "", "");
    }
  };
  const handleProvinciaChange = (code: string) => {
    setProvinciaSeleccionada(code);
    setDistritoSeleccionado("");
    setProvinciaAbierta(false);
    
    // Llamar a onUbigeoChange si está disponible
    if (onUbigeoChange) {
      const depNombre = departamentos.find(d => d.code === departamentoSeleccionado)?.name || "";
      const provNombre = provincias.find(p => p.code === code)?.name || "";
      onUbigeoChange(depNombre, provNombre, "");
    }
  };
  const handleDistritoChange = (code: string) => {
    setDistritoSeleccionado(code);
    setDistritoAbierto(false);
    
    // Llamar a onUbigeoChange si está disponible
    if (onUbigeoChange) {
      const depNombre = departamentos.find(d => d.code === departamentoSeleccionado)?.name || "";
      const provNombre = provincias.find(p => p.code === provinciaSeleccionada)?.name || "";
      const distNombre = distritos.find(d => d.code === code)?.name || "";
      onUbigeoChange(depNombre, provNombre, distNombre);
    }
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
      <div className={`grid grid-cols-1 md:grid-cols-3 gap-3 ${className}`}>
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-crm-primary/20 rounded animate-pulse"></div>
            <div className="h-3 bg-crm-primary/20 rounded w-20 animate-pulse"></div>
          </div>
          <div className="animate-pulse bg-crm-card-hover h-9 rounded-lg" />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-crm-primary/20 rounded animate-pulse"></div>
            <div className="h-3 bg-crm-primary/20 rounded w-16 animate-pulse"></div>
          </div>
          <div className="animate-pulse bg-crm-card-hover h-9 rounded-lg" />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-crm-primary/20 rounded animate-pulse"></div>
            <div className="h-3 bg-crm-primary/20 rounded w-14 animate-pulse"></div>
          </div>
          <div className="animate-pulse bg-crm-card-hover h-9 rounded-lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return <div className={`text-red-600 text-sm ${className}`}>Error: {error}</div>;
  }

  const triggerClass =
    "w-full px-3 py-2 border border-crm-border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-crm-primary bg-white text-crm-text-primary disabled:opacity-50 disabled:bg-crm-card-hover transition-all text-left flex justify-between items-center hover:border-crm-primary/50";
  const listClass =
    "absolute z-50 w-full mt-1 max-h-48 overflow-y-auto rounded-lg border border-crm-border shadow-xl bg-white ubigeo-menu backdrop-blur-sm";
  const itemClass =
    "w-full px-3 py-2 text-left cursor-pointer transition-all duration-200 border-b border-crm-border last:border-b-0 hover:bg-crm-primary/5 hover:text-crm-primary text-xs ubigeo-item flex items-center justify-between group";

  return (
    <div className={`space-y-3 w-full ${className}`}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full">
      {/* Departamento */}
      <div className="space-y-1.5" ref={depRef}>
        <label className="flex items-center gap-1.5 text-xs font-medium text-crm-text-primary">
          <svg className="w-3 h-3 text-crm-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          Departamento <span className="text-red-500">*</span>
        </label>
        <div className="relative" role="combobox" aria-expanded={departamentoAbierto}>
          <button
            type="button"
            onClick={() => setDepartamentoAbierto(a => !a)}
            disabled={disabled}
            className={triggerClass}
          >
            <span className={depNombre ? "text-crm-text-primary" : "text-crm-text-muted"}>
              {depNombre || "Selecciona"}
            </span>
            <svg className={`w-3 h-3 transition-transform ${departamentoAbierto ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  className={`${itemClass} ${d.code === departamentoSeleccionado ? 'bg-crm-primary/10 text-crm-primary font-medium' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-crm-primary/20 group-hover:bg-crm-primary/40 transition-colors"></div>
                    <span className="ubigeo-item-text">{d.name || '(sin nombre)'}</span>
                  </div>
                  {d.code === departamentoSeleccionado && (
                    <svg className="w-4 h-4 text-crm-primary" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Provincia */}
      <div className="space-y-1.5" ref={provRef}>
        <label className="flex items-center gap-1.5 text-xs font-medium text-crm-text-primary">
          <svg className="w-3 h-3 text-crm-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Provincia <span className="text-red-500">*</span>
        </label>
        <div className="relative" role="combobox" aria-expanded={provinciaAbierta}>
          <button
            type="button"
            onClick={() => setProvinciaAbierta(a => !a)}
            disabled={disabled || !departamentoSeleccionado || provinciasFiltradas.length === 0}
            className={triggerClass}
          >
            <span className={provNombre ? "text-crm-text-primary" : "text-crm-text-muted"}>
              {provNombre || (departamentoSeleccionado ? "Selecciona" : "Selecciona dpto.")}
            </span>
            <svg className={`w-3 h-3 transition-transform ${provinciaAbierta ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  className={`${itemClass} ${p.code === provinciaSeleccionada ? 'bg-crm-primary/10 text-crm-primary font-medium' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-crm-primary/20 group-hover:bg-crm-primary/40 transition-colors"></div>
                    <span className="ubigeo-item-text">{p.name || '(sin nombre)'}</span>
                  </div>
                  {p.code === provinciaSeleccionada && (
                    <svg className="w-4 h-4 text-crm-primary" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Distrito */}
      <div className="space-y-1.5" ref={distRef}>
        <label className="flex items-center gap-1.5 text-xs font-medium text-crm-text-primary">
          <svg className="w-3 h-3 text-crm-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
          </svg>
          Distrito <span className="text-red-500">*</span>
        </label>
        <div className="relative" role="combobox" aria-expanded={distritoAbierto}>
          <button
            type="button"
            onClick={() => setDistritoAbierto(a => !a)}
            disabled={disabled || !provinciaSeleccionada || distritosFiltrados.length === 0}
            className={triggerClass}
          >
            <span className={distNombre ? "text-crm-text-primary" : "text-crm-text-muted"}>
              {distNombre || (provinciaSeleccionada ? "Selecciona" : "Selecciona prov.")}
            </span>
            <svg className={`w-3 h-3 transition-transform ${distritoAbierto ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  className={`${itemClass} ${d.code === distritoSeleccionado ? 'bg-crm-primary/10 text-crm-primary font-medium' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-crm-primary/20 group-hover:bg-crm-primary/40 transition-colors"></div>
                    <span className="ubigeo-item-text">{d.name || '(sin nombre)'}</span>
                  </div>
                  {d.code === distritoSeleccionado && (
                    <svg className="w-4 h-4 text-crm-primary" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
