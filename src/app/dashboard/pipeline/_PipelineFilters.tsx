"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { obtenerVendedores } from "@/app/dashboard/clientes/_actions";
import { ORIGENES_LEAD_OPTIONS } from "@/lib/types/clientes";

type Vendedor = { id: string; username: string; nombre_completo: string };

export type UrgenciaFiltro = "todas" | "vencidas" | "hoy_y_vencidas";

interface Props {
  vendedorActual: string;
  origenActual: string;
  mostrarVendedor: boolean;
  busqueda: string;
  urgencia: UrgenciaFiltro;
  onBusquedaChange: (valor: string) => void;
  onUrgenciaChange: (valor: UrgenciaFiltro) => void;
  onLimpiarTodo: () => void;
  hayFiltrosActivos: boolean;
}

export default function PipelineFilters({
  vendedorActual,
  origenActual,
  mostrarVendedor,
  busqueda,
  urgencia,
  onBusquedaChange,
  onUrgenciaChange,
  onLimpiarTodo,
  hayFiltrosActivos,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!mostrarVendedor) {
      setLoading(false);
      return;
    }
    let mounted = true;
    obtenerVendedores()
      .then((data) => {
        if (mounted) setVendedores(data as Vendedor[]);
      })
      .catch((e) => console.error("Error cargando vendedores:", e))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [mostrarVendedor]);

  function actualizarURL(next: URLSearchParams) {
    const qs = next.toString();
    startTransition(() => {
      router.push(`/dashboard/pipeline${qs ? `?${qs}` : ""}`);
    });
  }

  function onVendedorChange(valor: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (valor) params.set("vendedor", valor);
    else params.delete("vendedor");
    actualizarURL(params);
  }

  function onOrigenChange(valor: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (valor) params.set("origen", valor);
    else params.delete("origen");
    actualizarURL(params);
  }

  function limpiarServerFilters() {
    actualizarURL(new URLSearchParams());
    onLimpiarTodo();
  }

  const vendedorNoEnLista =
    vendedorActual && !vendedores.some((v) => v.username === vendedorActual);

  return (
    <div className="flex flex-col gap-2 md:items-end">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-crm-text-muted" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => onBusquedaChange(e.target.value)}
            placeholder="Buscar por nombre o código"
            className="h-9 rounded-lg border border-crm-border bg-crm-card pl-8 pr-3 text-sm text-crm-text-primary placeholder:text-crm-text-muted focus:outline-none focus:border-crm-primary focus:ring-1 focus:ring-crm-primary min-w-[220px]"
          />
        </div>

        <select
          aria-label="Filtrar por urgencia"
          value={urgencia}
          onChange={(e) => onUrgenciaChange(e.target.value as UrgenciaFiltro)}
          className="h-9 rounded-lg border border-crm-border bg-crm-card px-3 text-sm text-crm-text-primary focus:outline-none focus:border-crm-primary focus:ring-1 focus:ring-crm-primary"
        >
          <option value="todas">Urgencia: todas</option>
          <option value="hoy_y_vencidas">Urgencia: hoy + vencidas</option>
          <option value="vencidas">Urgencia: solo vencidas</option>
        </select>

        <select
          aria-label="Filtrar por origen"
          value={origenActual}
          onChange={(e) => onOrigenChange(e.target.value)}
          className="h-9 rounded-lg border border-crm-border bg-crm-card px-3 text-sm text-crm-text-primary focus:outline-none focus:border-crm-primary focus:ring-1 focus:ring-crm-primary"
        >
          <option value="">Origen: todos</option>
          {ORIGENES_LEAD_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        {mostrarVendedor ? (
          <select
            aria-label="Filtrar por vendedor"
            value={vendedorActual}
            onChange={(e) => onVendedorChange(e.target.value)}
            disabled={loading}
            className="h-9 rounded-lg border border-crm-border bg-crm-card px-3 text-sm text-crm-text-primary focus:outline-none focus:border-crm-primary focus:ring-1 focus:ring-crm-primary disabled:opacity-50 min-w-[200px]"
          >
            <option value="">Todos los vendedores</option>
            {vendedores.map((v) => (
              <option key={v.id} value={v.username}>
                {v.nombre_completo ? `${v.nombre_completo} (@${v.username})` : `@${v.username}`}
              </option>
            ))}
            {vendedorNoEnLista ? (
              <option value={vendedorActual}>@{vendedorActual}</option>
            ) : null}
          </select>
        ) : null}

        {hayFiltrosActivos ? (
          <button
            type="button"
            onClick={limpiarServerFilters}
            className="inline-flex items-center gap-1 h-9 rounded-lg border border-crm-border bg-crm-card px-3 text-sm text-crm-text-secondary hover:text-crm-text-primary hover:border-crm-primary/40 transition"
          >
            <X className="w-3.5 h-3.5" />
            Limpiar
          </button>
        ) : null}
      </div>
    </div>
  );
}
