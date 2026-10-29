"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase.client";

/**
 * Fila de `crm.lote` tal como la entrega Realtime (postgres_changes).
 * Solo se declaran los campos que la UI usa; el resto se ignora.
 */
export interface LoteRealtimeRow {
  id: string;
  proyecto_id: string;
  codigo?: string;
  estado?: "disponible" | "reservado" | "vendido";
  sup_m2?: number | null;
  precio?: number | null;
  moneda?: string | null;
  data?: Record<string, unknown> | null;
}

export type CambioLote =
  | { tipo: "INSERT"; lote: LoteRealtimeRow }
  | { tipo: "UPDATE"; lote: LoteRealtimeRow }
  | { tipo: "DELETE"; id: string };

export type EstadoConexion = "conectando" | "en_vivo" | "reconectando";

/** Campos que un UPDATE puede pisar en el estado local. */
const CAMPOS_ACTUALIZABLES = ["codigo", "estado", "sup_m2", "precio", "moneda", "data"] as const;

/**
 * Aplica un cambio de Realtime a una lista local de lotes. Pura: no muta
 * `lotes` y devuelve la MISMA referencia si el cambio no afecta a la lista
 * (lote ajeno a la lista, INSERT), para no disparar renders de más.
 *
 * Los INSERT no se agregan acá: la lista está paginada/ordenada en el server,
 * así que el llamador decide (p. ej. `router.refresh()`).
 */
export function aplicarCambioLote<T extends { id: string }>(lotes: T[], cambio: CambioLote): T[] {
  if (cambio.tipo === "DELETE") {
    return lotes.some((l) => l.id === cambio.id) ? lotes.filter((l) => l.id !== cambio.id) : lotes;
  }
  if (cambio.tipo === "INSERT") return lotes;

  const idx = lotes.findIndex((l) => l.id === cambio.lote.id);
  if (idx === -1) return lotes;

  const parche: Record<string, unknown> = {};
  for (const campo of CAMPOS_ACTUALIZABLES) {
    if (campo in cambio.lote) parche[campo] = cambio.lote[campo];
  }
  const copia = lotes.slice();
  copia[idx] = { ...lotes[idx], ...parche };
  return copia;
}

/**
 * Traduce un payload de postgres_changes a un `CambioLote` del proyecto, o
 * `null` si el evento es de otro proyecto.
 *
 * El filtrado es client-side a propósito: el `filter` de Realtime tiene
 * problemas con UUIDs en schemas no-públicos (ver NotificationsDropdown).
 */
export function cambioDesdePayload(
  payload: { eventType: string; new?: unknown; old?: unknown },
  proyectoId: string,
): CambioLote | null {
  const nuevo = (payload.new ?? {}) as Partial<LoteRealtimeRow>;
  const viejo = (payload.old ?? {}) as Partial<LoteRealtimeRow>;

  if (payload.eventType === "DELETE") {
    if (!viejo.id) return null;
    // Con REPLICA IDENTITY FULL llega proyecto_id; si faltara, el DELETE por
    // id es inocuo (solo borra si el lote está en la lista local).
    if (viejo.proyecto_id && viejo.proyecto_id !== proyectoId) return null;
    return { tipo: "DELETE", id: viejo.id };
  }
  if (payload.eventType !== "INSERT" && payload.eventType !== "UPDATE") return null;
  if (!nuevo.id || nuevo.proyecto_id !== proyectoId) return null;
  return { tipo: payload.eventType, lote: nuevo as LoteRealtimeRow };
}

interface Opciones {
  /**
   * Se llama cuando el canal vuelve a conectarse después de un corte: los
   * cambios ocurridos mientras tanto no se reenvían, así que hay que
   * resincronizar (típicamente `router.refresh()`).
   */
  onResync?: () => void;
}

/**
 * Se suscribe a los cambios de `crm.lote` de un proyecto y llama a
 * `onCambio` por cada INSERT/UPDATE/DELETE. Devuelve el estado de la conexión
 * para mostrar un indicador "En vivo".
 *
 * Requiere la migración 20261028000000_enable_lote_realtime.sql.
 */
export function useLotesRealtime(
  proyectoId: string,
  onCambio: (cambio: CambioLote) => void,
  { onResync }: Opciones = {},
): EstadoConexion {
  const [estado, setEstado] = useState<EstadoConexion>("conectando");
  // Refs para no re-suscribir el canal cada vez que el padre re-renderiza
  // con callbacks nuevos.
  const onCambioRef = useRef(onCambio);
  const onResyncRef = useRef(onResync);
  onCambioRef.current = onCambio;
  onResyncRef.current = onResync;

  useEffect(() => {
    if (!proyectoId) return;
    const supabase = createClient();
    let yaConecto = false;
    let cortado = false;

    const channel = supabase
      .channel(`lotes:${proyectoId}`)
      .on("postgres_changes", { event: "*", schema: "crm", table: "lote" }, (payload) => {
        const cambio = cambioDesdePayload(payload, proyectoId);
        if (cambio) onCambioRef.current(cambio);
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          if (yaConecto && cortado) onResyncRef.current?.();
          yaConecto = true;
          cortado = false;
          setEstado("en_vivo");
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          // supabase-js reintenta solo; marcamos el corte para resincronizar
          // cuando vuelva.
          cortado = true;
          setEstado(yaConecto ? "reconectando" : "conectando");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [proyectoId]);

  return estado;
}
