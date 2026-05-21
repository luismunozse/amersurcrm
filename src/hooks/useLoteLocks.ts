"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase.client";

export type LoteLock = {
  username: string;
  nombre_completo: string | null;
  since: string;
};

type LocksMap = Record<string, LoteLock>;

const channelName = (proyectoId: string) => `proyecto-locks:${proyectoId}`;

/**
 * Listen presence channel del proyecto. Devuelve mapa loteId → quien edita.
 * Para broadcaster, use {@link useLoteLockBroadcaster}.
 */
export function useLoteLocks(proyectoId: string): LocksMap {
  const [locks, setLocks] = useState<LocksMap>({});

  useEffect(() => {
    if (!proyectoId) return;
    const supabase = createClient();
    const channel = supabase.channel(channelName(proyectoId), {
      config: { presence: { key: `viewer-${Math.random().toString(36).slice(2, 10)}` } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const next: LocksMap = {};
        for (const arr of Object.values(state)) {
          for (const entry of arr as unknown as LoteLock[] & { loteId?: string }[]) {
            const loteId = (entry as { loteId?: string }).loteId;
            if (loteId && entry.username) {
              next[loteId] = {
                username: entry.username,
                nombre_completo: entry.nombre_completo ?? null,
                since: entry.since ?? new Date().toISOString(),
              };
            }
          }
        }
        setLocks(next);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [proyectoId]);

  return locks;
}

/**
 * Anuncia que el usuario actual está editando un lote.
 * Llamar al montar el modal de edición. Auto-cleanup al desmontar.
 */
export function useLoteLockBroadcaster(
  proyectoId: string | null,
  loteId: string | null,
  username: string | null,
  nombreCompleto: string | null,
) {
  useEffect(() => {
    if (!proyectoId || !loteId || !username) return;

    const supabase = createClient();
    const channel = supabase.channel(channelName(proyectoId), {
      config: { presence: { key: `${username}-${loteId}` } },
    });

    let tracked = false;
    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED" && !tracked) {
        tracked = true;
        await channel.track({
          loteId,
          username,
          nombre_completo: nombreCompleto,
          since: new Date().toISOString(),
        });
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [proyectoId, loteId, username, nombreCompleto]);
}
