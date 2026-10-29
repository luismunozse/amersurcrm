import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// ── Mock del cliente de Supabase: captura el handler y el callback de status ──
type Handler = (payload: { eventType: string; new?: unknown; old?: unknown }) => void;
let handler: Handler | null = null;
let statusCb: ((s: string) => void) | null = null;
const removeChannel = vi.fn();

vi.mock("@/lib/supabase.client", () => ({
  createClient: () => {
    const channel = {
      on: (_t: string, _f: unknown, h: Handler) => {
        handler = h;
        return channel;
      },
      subscribe: (cb: (s: string) => void) => {
        statusCb = cb;
        return channel;
      },
    };
    return { channel: () => channel, removeChannel };
  },
}));

import {
  aplicarCambioLote,
  cambioDesdePayload,
  useLotesRealtime,
  type CambioLote,
} from "../useLotesRealtime";

const P = "proy-1";
const lotes = [
  { id: "a", codigo: "1", estado: "disponible" as const, precio: 100, extra: "x" },
  { id: "b", codigo: "2", estado: "disponible" as const, precio: 200, extra: "y" },
];

describe("aplicarCambioLote", () => {
  it("UPDATE pisa solo los campos que llegan y conserva el resto", () => {
    const res = aplicarCambioLote(lotes, {
      tipo: "UPDATE",
      lote: { id: "a", proyecto_id: P, estado: "reservado" },
    });
    expect(res[0]).toEqual({ id: "a", codigo: "1", estado: "reservado", precio: 100, extra: "x" });
    expect(res[1]).toBe(lotes[1]);
    expect(lotes[0].estado).toBe("disponible"); // no muta
  });

  it("devuelve la misma referencia si el lote no está en la lista", () => {
    const cambio: CambioLote = { tipo: "UPDATE", lote: { id: "zzz", proyecto_id: P, estado: "vendido" } };
    expect(aplicarCambioLote(lotes, cambio)).toBe(lotes);
  });

  it("DELETE quita el lote; INSERT no toca la lista", () => {
    expect(aplicarCambioLote(lotes, { tipo: "DELETE", id: "b" }).map((l) => l.id)).toEqual(["a"]);
    expect(aplicarCambioLote(lotes, { tipo: "DELETE", id: "nope" })).toBe(lotes);
    expect(aplicarCambioLote(lotes, { tipo: "INSERT", lote: { id: "c", proyecto_id: P } })).toBe(lotes);
  });
});

describe("cambioDesdePayload", () => {
  it("descarta eventos de otros proyectos", () => {
    expect(cambioDesdePayload({ eventType: "UPDATE", new: { id: "a", proyecto_id: "otro" } }, P)).toBeNull();
    expect(cambioDesdePayload({ eventType: "DELETE", old: { id: "a", proyecto_id: "otro" } }, P)).toBeNull();
  });

  it("traduce UPDATE, INSERT y DELETE del proyecto", () => {
    expect(cambioDesdePayload({ eventType: "UPDATE", new: { id: "a", proyecto_id: P, estado: "vendido" } }, P))
      .toEqual({ tipo: "UPDATE", lote: { id: "a", proyecto_id: P, estado: "vendido" } });
    expect(cambioDesdePayload({ eventType: "INSERT", new: { id: "c", proyecto_id: P } }, P)?.tipo).toBe("INSERT");
    expect(cambioDesdePayload({ eventType: "DELETE", old: { id: "a", proyecto_id: P } }, P))
      .toEqual({ tipo: "DELETE", id: "a" });
    // DELETE sin proyecto_id (sin REPLICA IDENTITY FULL) igual se acepta por id
    expect(cambioDesdePayload({ eventType: "DELETE", old: { id: "a" } }, P)).toEqual({ tipo: "DELETE", id: "a" });
  });
});

describe("useLotesRealtime", () => {
  beforeEach(() => {
    handler = null;
    statusCb = null;
    removeChannel.mockClear();
  });

  it("entrega solo los cambios del proyecto y reporta la conexión", () => {
    const onCambio = vi.fn();
    const { result } = renderHook(() => useLotesRealtime(P, onCambio));
    expect(result.current).toBe("conectando");

    act(() => statusCb!("SUBSCRIBED"));
    expect(result.current).toBe("en_vivo");

    act(() => {
      handler!({ eventType: "UPDATE", new: { id: "a", proyecto_id: P, estado: "reservado" } });
      handler!({ eventType: "UPDATE", new: { id: "x", proyecto_id: "otro", estado: "vendido" } });
    });
    expect(onCambio).toHaveBeenCalledTimes(1);
    expect(onCambio.mock.calls[0][0]).toMatchObject({ tipo: "UPDATE", lote: { id: "a" } });
  });

  it("pide resincronizar al reconectar después de un corte, no en la primera conexión", () => {
    const onResync = vi.fn();
    const { result } = renderHook(() => useLotesRealtime(P, vi.fn(), { onResync }));

    act(() => statusCb!("SUBSCRIBED"));
    expect(onResync).not.toHaveBeenCalled();

    act(() => statusCb!("CHANNEL_ERROR"));
    expect(result.current).toBe("reconectando");

    act(() => statusCb!("SUBSCRIBED"));
    expect(onResync).toHaveBeenCalledTimes(1);
    expect(result.current).toBe("en_vivo");
  });

  it("libera el canal al desmontar", () => {
    const { unmount } = renderHook(() => useLotesRealtime(P, vi.fn()));
    unmount();
    expect(removeChannel).toHaveBeenCalledTimes(1);
  });
});
