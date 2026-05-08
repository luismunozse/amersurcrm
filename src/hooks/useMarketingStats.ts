"use client";

import { useEffect, useState } from "react";
import { obtenerEstadisticasMarketing } from "@/app/dashboard/admin/marketing/_actions";
import type { EstadisticasMarketing } from "@/types/whatsapp-marketing";

export function useMarketingStats(autoLoad = true) {
  const [data, setData] = useState<EstadisticasMarketing | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargarDatos = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await obtenerEstadisticasMarketing();
      if (result.error) {
        setError(result.error);
      } else if (result.data) {
        setData(result.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoLoad) cargarDatos();
  }, [autoLoad]);

  return { data, loading, error, recargar: cargarDatos };
}
