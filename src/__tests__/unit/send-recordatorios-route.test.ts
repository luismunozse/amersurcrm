import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ============================================================
// Hoisted mocks
// ============================================================

const { mockFrom, mockServiceRoleClient, mockDispatch } = vi.hoisted(() => {
  const mockFrom = vi.fn();
  const mockServiceRoleClient: any = {
    schema: vi.fn().mockReturnValue({ from: mockFrom }),
  };
  const mockDispatch = vi.fn().mockResolvedValue({});
  return { mockFrom, mockServiceRoleClient, mockDispatch };
});

vi.mock("@/lib/supabase.server", () => ({
  createServiceRoleClient: vi.fn(() => mockServiceRoleClient),
}));
vi.mock("@/lib/notificationsDelivery", () => ({
  dispatchNotificationChannels: mockDispatch,
}));

import { GET } from "@/app/api/notifications/send-recordatorios/route";

// ============================================================
// Chain builders
// ============================================================

function makeConfigChain(result: { data: any; error: any }) {
  const chain: any = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.maybeSingle = vi.fn().mockResolvedValue(result);
  return chain;
}

function makeRecordatorioChain(
  pendingResult: { data: any; error: any },
  updateResult: { data: any; error: any } = { data: null, error: null },
) {
  const chain: any = { updateCalls: [] as any[] };
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.lte = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockResolvedValue(pendingResult);
  chain.update = vi.fn().mockImplementation((payload: any) => {
    chain.updateCalls.push({ payload });
    return chain;
  });
  chain.in = vi.fn().mockImplementation((col: string, ids: string[]) => {
    const last = chain.updateCalls[chain.updateCalls.length - 1];
    last.col = col;
    last.ids = ids;
    return Promise.resolve(updateResult);
  });
  return chain;
}

function makeNotifChain(result: { data: any; error: any } = { data: null, error: null }) {
  const chain: any = { insertCalls: [] as any[] };
  chain.insert = vi.fn().mockImplementation((rows: any) => {
    chain.insertCalls.push(rows);
    return Promise.resolve(result);
  });
  return chain;
}

function recordatorio(overrides: Partial<Record<string, any>> = {}) {
  return {
    id: overrides.id ?? "rec-1",
    titulo: overrides.titulo ?? "Recordatorio",
    descripcion: overrides.descripcion ?? "Descripción",
    prioridad: overrides.prioridad ?? "media",
    fecha_recordatorio: overrides.fecha_recordatorio ?? "2026-07-07T10:00:00Z",
    vendedor_id: overrides.vendedor_id ?? "vendedor-1",
    notificar_push: overrides.notificar_push ?? true,
    data: overrides.data ?? null,
  };
}

function bearerRequest(token = "correct-secret") {
  return new NextRequest("http://localhost/api/notifications/send-recordatorios", {
    headers: { authorization: `Bearer ${token}` },
  });
}

const CRON_SECRET = "correct-secret";
const CONFIG_ENABLED = {
  data: {
    notificaciones_push: true,
    notificaciones_recordatorios: true,
    push_provider: "webpush",
    push_vapid_public: "pub",
    push_vapid_private: "priv",
    push_vapid_subject: null,
  },
  error: null,
};

let tableChains: Record<string, any>;

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CRON_SECRET = CRON_SECRET;
  mockDispatch.mockResolvedValue({});

  tableChains = {
    configuracion_sistema: makeConfigChain(CONFIG_ENABLED),
    recordatorio: makeRecordatorioChain({ data: [], error: null }),
    notificacion: makeNotifChain(),
  };
  mockFrom.mockImplementation((table: string) => tableChains[table]);
});

describe("send-recordatorios — push dispatch client", () => {
  it("passes the raw service-role client as dispatch context (notificationsDelivery schema-scopes it internally)", async () => {
    tableChains.recordatorio = makeRecordatorioChain({ data: [recordatorio({ id: "rec-a" })], error: null });
    mockFrom.mockImplementation((table: string) => tableChains[table]);
    mockDispatch.mockResolvedValue({ push: { attempted: 1, sent: 1, failed: 0, pruned: 0 } });

    const res = await GET(bearerRequest());
    expect(res.status).toBe(200);

    expect(mockDispatch).toHaveBeenCalledTimes(1);
    const [, , , context] = mockDispatch.mock.calls[0];
    expect(context?.supabaseClient).toBe(mockServiceRoleClient);
  });
});

describe("send-recordatorios — truthful push counters", () => {
  it("counts pushDispatched only for recordatorios that actually delivered at least one push", async () => {
    tableChains.recordatorio = makeRecordatorioChain({
      data: [recordatorio({ id: "rec-ok" }), recordatorio({ id: "rec-fail" })],
      error: null,
    });
    mockFrom.mockImplementation((table: string) => tableChains[table]);

    mockDispatch.mockImplementation((payload: any) => {
      if (payload.data?.recordatorio_id === "rec-ok") {
        return Promise.resolve({ push: { attempted: 2, sent: 2, failed: 0, pruned: 0 } });
      }
      // Lookup/send failure: subscriptions existed but nothing was delivered.
      return Promise.resolve({ push: { attempted: 3, sent: 0, failed: 3, pruned: 0 } });
    });

    const res = await GET(bearerRequest());
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.pushDispatched).toBe(1);
    expect(body.failures).toHaveLength(1);
    expect(body.failures[0].id).toBe("rec-fail");
  });

  it("treats a rejected dispatch (e.g. push_subscription lookup error) as a failure, not a silent success", async () => {
    tableChains.recordatorio = makeRecordatorioChain({
      data: [recordatorio({ id: "rec-boom" })],
      error: null,
    });
    mockFrom.mockImplementation((table: string) => tableChains[table]);

    mockDispatch.mockRejectedValue(new Error("No se pudieron obtener suscripciones push: boom"));

    const res = await GET(bearerRequest());
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.pushDispatched).toBe(0);
    expect(body.failures).toEqual([
      { id: "rec-boom", error: "No se pudieron obtener suscripciones push: boom" },
    ]);
  });
});
