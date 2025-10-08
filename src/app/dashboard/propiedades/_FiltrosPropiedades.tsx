"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface FiltrosPropiedadesProps {
  proyectos: Array<{ id: string; nombre: string }>;
}

export default function FiltrosPropiedades({ proyectos }: FiltrosPropiedadesProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [busqueda, setBusqueda] = useState(searchParams.get("q") || "");
  const [tipo, setTipo] = useState(searchParams.get("tipo") || "");
  const [estado, setEstado] = useState(searchParams.get("estado") || "");
  const [proyecto, setProyecto] = useState(searchParams.get("proyecto") || "");

  // Debounce para búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      actualizarURL();
    }, 300);

    return () => clearTimeout(timer);
  }, [busqueda]);

  // Actualizar URL cuando cambian los filtros (excepto búsqueda que usa debounce)
  useEffect(() => {
    actualizarURL();
  }, [tipo, estado, proyecto]);

  const actualizarURL = () => {
    const params = new URLSearchParams();
    if (busqueda) params.set("q", busqueda);
    if (tipo) params.set("tipo", tipo);
    if (estado) params.set("estado", estado);
    if (proyecto) params.set("proyecto", proyecto);
    params.set("page", "1"); // Reset a página 1 al filtrar

    router.push(`/dashboard/propiedades?${params.toString()}`);
  };

  const limpiarFiltros = () => {
    setBusqueda("");
    setTipo("");
    setEstado("");
    setProyecto("");
    router.push("/dashboard/propiedades");
  };

  const hayFiltrosActivos = busqueda || tipo || estado || proyecto;

  return (
    <div className="crm-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-crm-text-primary">Filtros</h3>
        {hayFiltrosActivos && (
          <button
            onClick={limpiarFiltros}
            className="text-xs text-crm-primary hover:text-crm-primary-dark font-medium"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-crm-text-primary mb-2">
            Buscar
          </label>
          <input
            type="text"
            placeholder="Código, identificación..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-crm-text-primary mb-2">
            Tipo
          </label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary"
          >
            <option value="">Todos los tipos</option>
            <option value="lote">Lote</option>
            <option value="casa">Casa</option>
            <option value="departamento">Departamento</option>
            <option value="oficina">Oficina</option>
            <option value="local">Local Comercial</option>
            <option value="terreno">Terreno</option>
            <option value="otro">Otro</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-crm-text-primary mb-2">
            Estado
          </label>
          <select
            value={estado}
            onChange={(e) => setEstado(e.target.value)}
            className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary"
          >
            <option value="">Todos los estados</option>
            <option value="disponible">Disponible</option>
            <option value="reservado">Reservado</option>
            <option value="vendido">Vendido</option>
            <option value="bloqueado">Bloqueado</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-crm-text-primary mb-2">
            Proyecto
          </label>
          <select
            value={proyecto}
            onChange={(e) => setProyecto(e.target.value)}
            className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary"
          >
            <option value="">Todos los proyectos</option>
            <option value="independientes">Propiedades Independientes</option>
            {proyectos?.map((proy) => (
              <option key={proy.id} value={proy.id}>
                {proy.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
