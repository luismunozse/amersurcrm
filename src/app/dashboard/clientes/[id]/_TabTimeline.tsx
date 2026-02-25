"use client";

import { useEffect, useState } from "react";
import ClienteTimeline from "@/components/ClienteTimeline";
import { obtenerTimelineCliente } from "../_actions_crm";
import { AlertCircle } from "lucide-react";
import { PageLoader } from "@/components/ui/PageLoader";

interface TimelineEvent {
  id: string;
  type: 'interaccion' | 'visita' | 'reserva' | 'venta' | 'pago' | 'evento_agenda';
  fecha: string;
  titulo: string;
  descripcion?: string;
  metadata?: Record<string, unknown>;
}

interface Props {
  clienteId: string;
}

export default function TabTimeline({ clienteId }: Props) {
  const [eventos, setEventos] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function cargarTimeline() {
      setLoading(true);
      setError(null);
      try {
        const result = await obtenerTimelineCliente(clienteId);
        if (cancelled) return;
        if (result.success && result.data) {
          setEventos(result.data);
        } else {
          setError(result.error || "No se pudo cargar el historial");
        }
      } catch (err) {
        if (cancelled) return;
        setError("Error inesperado al cargar el historial");
        console.error("Error cargando timeline:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    cargarTimeline();

    return () => {
      cancelled = true;
    };
  }, [clienteId]);

  if (loading) {
    return (
      <PageLoader size="sm" />
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <AlertCircle className="h-8 w-8 text-red-500" />
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-lg font-semibold text-crm-text mb-6">Historial Completo del Cliente</h3>
      <ClienteTimeline eventos={eventos} />
    </div>
  );
}
