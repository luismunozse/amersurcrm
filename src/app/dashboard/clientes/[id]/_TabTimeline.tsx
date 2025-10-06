"use client";

import { useEffect, useState } from "react";
import ClienteTimeline from "@/components/ClienteTimeline";
import { obtenerTimelineCliente } from "../_actions_crm";
import { Loader2 } from "lucide-react";

interface Props {
  clienteId: string;
}

export default function TabTimeline({ clienteId }: Props) {
  const [eventos, setEventos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function cargarTimeline() {
      setLoading(true);
      const result = await obtenerTimelineCliente(clienteId);
      if (result.success && result.data) {
        setEventos(result.data);
      }
      setLoading(false);
    }

    cargarTimeline();
  }, [clienteId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-crm-primary" />
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
