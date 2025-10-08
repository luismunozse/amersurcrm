"use client";

import { useState, useEffect } from "react";
import { obtenerEstadisticasMarketing } from "@/app/dashboard/admin/marketing/_actions";
import type { EstadisticasMarketing } from "@/types/whatsapp-marketing";

export function useMarketingStats(autoLoad: boolean = true) {
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
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoLoad) {
      cargarDatos();
    }
  }, [autoLoad]);

  const formatearTiempo = (segundos: number): string => {
    if (segundos < 60) {
      return `${segundos}s`;
    } else if (segundos < 3600) {
      return `${Math.floor(segundos / 60)}m`;
    } else {
      return `${Math.floor(segundos / 3600)}h ${Math.floor((segundos % 3600) / 60)}m`;
    }
  };

  return {
    data,
    loading,
    error,
    recargar: cargarDatos,
    formatearTiempo
  };
}
