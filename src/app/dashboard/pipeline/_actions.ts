"use server";

import { revalidatePath } from "next/cache";
import { createOptimizedServerClient } from "@/lib/supabase.server";

export type MoverClienteResult =
  | { ok: true; cambiado: boolean; estadoAnterior?: string; estadoNuevo?: string }
  | { ok: false; error: string };

const ESTADOS_VALIDOS = new Set([
  "por_contactar",
  "contactado",
  "intermedio",
  "potencial",
  "desestimado",
  "transferido",
]);

export async function moverClientePipeline(
  clienteId: string,
  estadoNuevo: string,
  motivo?: string,
): Promise<MoverClienteResult> {
  if (!clienteId || !ESTADOS_VALIDOS.has(estadoNuevo)) {
    return { ok: false, error: "Parámetros inválidos" };
  }

  const supabase = await createOptimizedServerClient();
  const { data, error } = await supabase
    .schema("crm")
    .rpc("mover_cliente_pipeline", {
      p_cliente_id: clienteId,
      p_estado_nuevo: estadoNuevo,
      p_motivo: motivo ?? null,
    });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/dashboard/pipeline");
  revalidatePath("/dashboard/clientes");

  const payload = (data ?? {}) as {
    cambiado?: boolean;
    estado_anterior?: string;
    estado_nuevo?: string;
  };

  return {
    ok: true,
    cambiado: payload.cambiado ?? false,
    estadoAnterior: payload.estado_anterior,
    estadoNuevo: payload.estado_nuevo,
  };
}
