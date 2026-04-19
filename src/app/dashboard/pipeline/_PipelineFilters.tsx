"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { obtenerVendedores } from "@/app/dashboard/clientes/_actions";

type Vendedor = { id: string; username: string; nombre_completo: string };

interface Props {
  vendedorActual: string;
}

export default function PipelineFilters({ vendedorActual }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [, startTransition] = useTransition();

  useEffect(() => {
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
  }, []);

  function onChange(valor: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (valor) params.set("vendedor", valor);
    else params.delete("vendedor");
    startTransition(() => {
      router.push(`/dashboard/pipeline${params.toString() ? `?${params.toString()}` : ""}`);
    });
  }

  const vendedorNoEnLista =
    vendedorActual && !vendedores.some((v) => v.username === vendedorActual);

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="pipeline-vendedor" className="text-sm text-crm-text-muted">
        Vendedor:
      </label>
      <select
        id="pipeline-vendedor"
        value={vendedorActual}
        onChange={(e) => onChange(e.target.value)}
        disabled={loading}
        className="h-9 rounded-lg border border-crm-border bg-crm-card px-3 text-sm text-crm-text-primary focus:outline-none focus:border-crm-primary focus:ring-1 focus:ring-crm-primary disabled:opacity-50 min-w-[220px]"
      >
        <option value="">Todos los vendedores</option>
        {vendedores.map((v) => (
          <option key={v.id} value={v.username}>
            {v.nombre_completo ? `${v.nombre_completo} (@${v.username})` : `@${v.username}`}
          </option>
        ))}
        {vendedorNoEnLista ? <option value={vendedorActual}>@{vendedorActual}</option> : null}
      </select>
    </div>
  );
}
