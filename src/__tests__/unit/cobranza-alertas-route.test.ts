import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ============================================================
// Hoisted mocks
// ============================================================

const { mockRpc, mockFrom, mockServiceRoleClient, callOrder } = vi.hoisted(() => {
  const callOrder: string[] = [];
  const mockRpc = vi.fn().mockImplementation(() => {
    callOrder.push("rpc:actualizar_cuotas_vencidas");
    return Promise.resolve({ data: null, error: null });
  });
  const mockFrom = vi.fn();
  const mockServiceRoleClient: any = {
    schema: vi.fn().mockReturnValue({ from: mockFrom, rpc: mockRpc }),
  };
  return { mockRpc, mockFrom, mockServiceRoleClient, callOrder };
});

vi.mock("@/lib/supabase.server", () => ({
  createServiceRoleClient: vi.fn(() => mockServiceRoleClient),
}));

import { GET } from "@/app/api/cron/cobranza-alertas/route";

// ============================================================
// Chain builders (table-specific, mirroring route.ts call shapes)
// ============================================================

// Simulates the real cuota query's filter chain (select -> neq -> not ->
// gte -> lte) so tests can assert both the exact filter arguments the route
// sends (builder-call recording) AND the resulting filtered rows (since the
// venta.estado exclusion and the fecha_vencimiento window are genuine
// server-side filters this mock now actually applies, not just records).
function makeCuotaChain(result: { data: any; error: any }) {
  const chain: any = { calls: {} as Record<string, any> };
  let rows = Array.isArray(result.data) ? [...result.data] : result.data;

  const applyFilter = (predicate: (row: any) => boolean) => {
    if (Array.isArray(rows)) rows = rows.filter(predicate);
  };

  chain.select = vi.fn().mockImplementation((cols: string) => {
    chain.calls.select = cols;
    return chain;
  });
  chain.neq = vi.fn().mockImplementation((col: string, val: any) => {
    chain.calls.neq = [col, val];
    applyFilter((row) => row[col] !== val);
    return chain;
  });
  chain.not = vi.fn().mockImplementation((col: string, op: string, val: any) => {
    chain.calls.not = [col, op, val];
    if (op === "in") {
      const excluded = String(val).replace(/[()"]/g, "").split(",");
      const [parent, field] = col.split(".");
      applyFilter((row) => !excluded.includes(row?.[parent]?.[field]));
    }
    return chain;
  });
  chain.gte = vi.fn().mockImplementation((col: string, val: string) => {
    chain.calls.gte = [col, val];
    applyFilter((row) => row[col] >= val);
    return chain;
  });
  chain.lte = vi.fn().mockImplementation((col: string, val: string) => {
    chain.calls.lte = [col, val];
    applyFilter((row) => row[col] <= val);
    callOrder.push("cuota:read");
    return Promise.resolve({ data: rows, error: result.error });
  });
  return chain;
}

/** Walks a dotted path (e.g. "cuota.venta.estado") through a nested object. */
function getByPath(row: any, path: string): any {
  return path.split(".").reduce((acc: any, key: string) => (acc == null ? acc : acc[key]), row);
}

// Simulates the alerta_cobranza table's three distinct call shapes used by
// the route, all sharing one mock object (mockFrom returns the same chain
// instance for every `.from("alerta_cobranza")` call within a request):
//   (a) upsert(rows, opts).select(cols)                    -> resolves upsertResult
//   (b) select(cols).eq("enviada", false).not(...).neq(...)
//       .order(...).limit(...)                              -> resolves pendingResult
//       (FIX 1/3 retry-read; realistically filters by the `.not()`/`.neq()`
//       args, same convention as makeCuotaChain, so tests can assert
//       exclusion by supplying rows and checking which ones survive)
//   (c) update(payload).in(col, ids)                        -> resolves updateResult
function makeAlertaChain(
  upsertResult: { data: any; error: any },
  pendingResult: { data: any; error: any } = { data: [], error: null },
  updateResult: { data: any; error: any } = { data: null, error: null },
) {
  const chain: any = {};
  chain.upsertCalls = [] as any[];
  chain.updateCalls = [] as any[];
  chain.pendingCalls = [] as any[];
  let afterUpsert = false;

  chain.upsert = vi.fn().mockImplementation((rows: any, opts: any) => {
    chain.upsertCalls.push({ rows, opts });
    afterUpsert = true;
    return chain;
  });

  chain.select = vi.fn().mockImplementation((cols: string) => {
    if (afterUpsert) {
      afterUpsert = false;
      return Promise.resolve(upsertResult);
    }
    const record: any = { select: cols };
    chain.pendingCalls.push(record);
    let filtered = Array.isArray(pendingResult.data) ? [...pendingResult.data] : pendingResult.data;
    const applyFilter = (predicate: (row: any) => boolean) => {
      if (Array.isArray(filtered)) filtered = filtered.filter(predicate);
    };

    const pendingChain: any = {};
    pendingChain.eq = vi.fn().mockImplementation((col: string, val: any) => {
      record.eq = [col, val];
      return pendingChain;
    });
    pendingChain.not = vi.fn().mockImplementation((col: string, op: string, val: any) => {
      record.not = [col, op, val];
      if (op === "in") {
        const excluded = String(val).replace(/[()"]/g, "").split(",");
        applyFilter((row) => !excluded.includes(getByPath(row, col)));
      }
      return pendingChain;
    });
    pendingChain.neq = vi.fn().mockImplementation((col: string, val: any) => {
      record.neq = [col, val];
      applyFilter((row) => getByPath(row, col) !== val);
      return pendingChain;
    });
    pendingChain.order = vi.fn().mockImplementation((col: string, opts: any) => {
      record.order = [col, opts];
      return pendingChain;
    });
    pendingChain.limit = vi.fn().mockImplementation((n: number) => {
      record.limit = n;
      return Promise.resolve({ data: filtered, error: pendingResult.error });
    });
    return pendingChain;
  });

  chain.update = vi.fn().mockImplementation((payload: any) => {
    chain.updateCalls.push({ payload });
    return chain;
  });
  chain.in = vi.fn().mockImplementation((col: string, ids: string[]) => {
    chain.updateCalls[chain.updateCalls.length - 1].ids = ids;
    chain.updateCalls[chain.updateCalls.length - 1].col = col;
    return Promise.resolve(updateResult);
  });
  return chain;
}

function makePerfilChain(result: { data: any; error: any }) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue(result),
  };
}

function makeNotifChain(result: { data: any; error: any } = { data: null, error: null }) {
  const chain: any = { insertCalls: [] as any[] };
  chain.insert = vi.fn().mockImplementation((rows: any) => {
    chain.insertCalls.push(rows);
    return Promise.resolve(result);
  });
  return chain;
}

function cuota(overrides: Partial<Record<string, any>> = {}) {
  return {
    id: overrides.id ?? "cuota-1",
    numero_cuota: overrides.numero_cuota ?? 1,
    monto_programado: overrides.monto_programado ?? 500,
    moneda: overrides.moneda ?? "PEN",
    fecha_vencimiento: overrides.fecha_vencimiento ?? "2026-07-19",
    estado: overrides.estado ?? "pendiente",
    venta: overrides.venta ?? {
      estado: "activa",
      cliente: {
        id: "cliente-1",
        nombre: "Cliente Uno",
        vendedor_username: "vendor1",
        vendedor_asignado: null,
        created_by: null,
      },
    },
  };
}

function bearerRequest(token = "correct-secret") {
  return new NextRequest("http://localhost/api/cron/cobranza-alertas", {
    headers: { authorization: `Bearer ${token}` },
  });
}

function noAuthRequest() {
  return new NextRequest("http://localhost/api/cron/cobranza-alertas");
}

const CRON_SECRET = "correct-secret";

// ============================================================
// Test setup
// ============================================================

beforeEach(() => {
  vi.clearAllMocks();
  callOrder.length = 0;
  process.env.CRON_SECRET = CRON_SECRET;

  // Fix "now" so limaToday() inside the route is deterministic across runs.
  // 2026-07-04T15:00:00Z = 2026-07-04 10:00 Lima (UTC-5) -> Lima date "2026-07-04".
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-07-04T15:00:00Z"));

  // Safe defaults: no cuotas, no perfiles, no rows generated.
  const tableChains: Record<string, any> = {
    cuota: makeCuotaChain({ data: [], error: null }),
    alerta_cobranza: makeAlertaChain({ data: [], error: null }),
    usuario_perfil: makePerfilChain({ data: [], error: null }),
    notificacion: makeNotifChain(),
  };
  mockFrom.mockImplementation((table: string) => tableChains[table]);
  (mockFrom as any)._tableChains = tableChains;
});

afterEach(() => {
  vi.useRealTimers();
});

// ============================================================
// Auth
// ============================================================

describe("GET /api/cron/cobranza-alertas — authorization", () => {
  it("returns 401 when the Authorization header is missing", async () => {
    const res = await GET(noAuthRequest());
    expect(res.status).toBe(401);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("returns 401 when the bearer token is wrong", async () => {
    const res = await GET(bearerRequest("wrong-secret"));
    expect(res.status).toBe(401);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("returns 401 when CRON_SECRET is not configured, without writing rows", async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(bearerRequest());
    expect(res.status).toBe(401);
    expect(mockFrom).not.toHaveBeenCalled();
  });
});

// ============================================================
// Ordering: refresh before read
// ============================================================

describe("GET /api/cron/cobranza-alertas — refresh ordering", () => {
  it("calls actualizar_cuotas_vencidas before reading cuotas", async () => {
    const res = await GET(bearerRequest());
    expect(res.status).toBe(200);
    expect(callOrder).toEqual(["rpc:actualizar_cuotas_vencidas", "cuota:read"]);
  });
});

// ============================================================
// Dedup upsert semantics
// ============================================================

describe("GET /api/cron/cobranza-alertas — dedup upsert", () => {
  it("upserts with onConflict 'cuota_id,tipo_alerta' and ignoreDuplicates true", async () => {
    const tableChains = (mockFrom as any)._tableChains;
    tableChains.cuota = makeCuotaChain({
      data: [cuota({ id: "cuota-a", fecha_vencimiento: "2026-07-19" })],
      error: null,
    });
    tableChains.alerta_cobranza = makeAlertaChain({
      data: [{ id: "alerta-a", cuota_id: "cuota-a", tipo_alerta: "por_vencer_15d" }],
      error: null,
    });
    mockFrom.mockImplementation((table: string) => tableChains[table]);

    const res = await GET(bearerRequest());
    expect(res.status).toBe(200);

    const alertaChain = tableChains.alerta_cobranza;
    expect(alertaChain.upsertCalls).toHaveLength(1);
    expect(alertaChain.upsertCalls[0].opts).toEqual({
      onConflict: "cuota_id,tipo_alerta",
      ignoreDuplicates: true,
    });
    expect(alertaChain.upsertCalls[0].rows).toEqual([
      { cuota_id: "cuota-a", tipo_alerta: "por_vencer_15d" },
    ]);
  });
});

// ============================================================
// 90-day cap
// ============================================================

describe("GET /api/cron/cobranza-alertas — 90-day overdue cap", () => {
  it("excludes a cuota 91 days overdue but includes one 90 days overdue", async () => {
    const today = new Date();
    const limaTodayStr = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" }).format(
      today,
    );
    const [y, m, d] = limaTodayStr.split("-").map(Number);
    const dayMs = 86_400_000;
    const base = Date.UTC(y, m - 1, d);
    const fecha90 = new Date(base - 90 * dayMs).toISOString().slice(0, 10);
    const fecha91 = new Date(base - 91 * dayMs).toISOString().slice(0, 10);

    const tableChains = (mockFrom as any)._tableChains;
    tableChains.cuota = makeCuotaChain({
      data: [
        cuota({ id: "cuota-90d", fecha_vencimiento: fecha90, estado: "vencida" }),
        cuota({ id: "cuota-91d", fecha_vencimiento: fecha91, estado: "vencida" }),
      ],
      error: null,
    });
    tableChains.alerta_cobranza = makeAlertaChain({
      data: [{ id: "alerta-90d", cuota_id: "cuota-90d", tipo_alerta: "mora" }],
      error: null,
    });
    mockFrom.mockImplementation((table: string) => tableChains[table]);

    const res = await GET(bearerRequest());
    expect(res.status).toBe(200);

    const alertaChain = tableChains.alerta_cobranza;
    const rows = alertaChain.upsertCalls[0].rows;
    expect(rows).toEqual([{ cuota_id: "cuota-90d", tipo_alerta: "mora" }]);
  });
});

// ============================================================
// Notification fan-out
// ============================================================

describe("GET /api/cron/cobranza-alertas — notification fan-out", () => {
  it("notifies the cliente owner plus every active global-role holder, one row each", async () => {
    const tableChains = (mockFrom as any)._tableChains;
    tableChains.cuota = makeCuotaChain({
      data: [
        cuota({
          id: "cuota-a",
          fecha_vencimiento: "2026-07-19",
          venta: {
            cliente: {
              id: "cliente-1",
              nombre: "Cliente Uno",
              vendedor_username: "owner1",
              vendedor_asignado: null,
            },
          },
        }),
      ],
      error: null,
    });
    tableChains.alerta_cobranza = makeAlertaChain({
      data: [{ id: "alerta-a", cuota_id: "cuota-a", tipo_alerta: "por_vencer_15d" }],
      error: null,
    });
    tableChains.usuario_perfil = makePerfilChain({
      data: [
        { id: "uid-owner1", username: "owner1", rol: { nombre: "ROL_VENDEDOR" }, coordinador_id: "uid-coord1" },
        { id: "uid-coord1", username: "coord1", rol: { nombre: "ROL_COORDINADOR_VENTAS" }, coordinador_id: null },
        { id: "uid-coord2", username: "coord2", rol: { nombre: "ROL_COORDINADOR_VENTAS" }, coordinador_id: null },
        { id: "uid-admin1", username: "admin1", rol: { nombre: "ROL_ADMIN" }, coordinador_id: null },
      ],
      error: null,
    });
    mockFrom.mockImplementation((table: string) => tableChains[table]);

    const res = await GET(bearerRequest());
    expect(res.status).toBe(200);

    const notifChain = tableChains.notificacion;
    expect(notifChain.insertCalls).toHaveLength(1);
    const recipientIds = notifChain.insertCalls[0].map((row: any) => row.usuario_id).sort();
    expect(recipientIds).toEqual(
      ["uid-admin1", "uid-coord1", "uid-owner1"].sort(),
    );
  });

  it("notifies the owning vendedor's coordinador (via coordinador_id), not an unrelated coordinador", async () => {
    const tableChains = (mockFrom as any)._tableChains;
    tableChains.cuota = makeCuotaChain({
      data: [
        cuota({
          id: "cuota-a",
          fecha_vencimiento: "2026-07-19",
          venta: {
            estado: "activa",
            cliente: {
              id: "cliente-1",
              nombre: "Cliente Uno",
              vendedor_username: "owner1",
              vendedor_asignado: null,
              created_by: null,
            },
          },
        }),
      ],
      error: null,
    });
    tableChains.alerta_cobranza = makeAlertaChain({
      data: [{ id: "alerta-a", cuota_id: "cuota-a", tipo_alerta: "por_vencer_15d" }],
      error: null,
    });
    tableChains.usuario_perfil = makePerfilChain({
      data: [
        { id: "uid-owner1", username: "owner1", rol: { nombre: "ROL_VENDEDOR" }, coordinador_id: "uid-coord1" },
        { id: "uid-coord1", username: "coord1", rol: { nombre: "ROL_COORDINADOR_VENTAS" }, coordinador_id: null },
        { id: "uid-coord-unrelated", username: "coord-unrelated", rol: { nombre: "ROL_COORDINADOR_VENTAS" }, coordinador_id: null },
      ],
      error: null,
    });
    mockFrom.mockImplementation((table: string) => tableChains[table]);

    const res = await GET(bearerRequest());
    expect(res.status).toBe(200);

    const notifChain = tableChains.notificacion;
    const recipientIds = notifChain.insertCalls[0].map((row: any) => row.usuario_id);
    expect(recipientIds).toContain("uid-coord1");
    expect(recipientIds).not.toContain("uid-coord-unrelated");
  });

  it("de-dupes when the cliente owner is also a global-role holder (no double notification)", async () => {
    const tableChains = (mockFrom as any)._tableChains;
    tableChains.cuota = makeCuotaChain({
      data: [
        cuota({
          id: "cuota-a",
          fecha_vencimiento: "2026-07-19",
          venta: {
            cliente: {
              id: "cliente-1",
              nombre: "Cliente Uno",
              vendedor_username: "admin1",
              vendedor_asignado: null,
            },
          },
        }),
      ],
      error: null,
    });
    tableChains.alerta_cobranza = makeAlertaChain({
      data: [{ id: "alerta-a", cuota_id: "cuota-a", tipo_alerta: "por_vencer_15d" }],
      error: null,
    });
    tableChains.usuario_perfil = makePerfilChain({
      data: [{ id: "uid-admin1", username: "admin1", rol: { nombre: "ROL_ADMIN" } }],
      error: null,
    });
    mockFrom.mockImplementation((table: string) => tableChains[table]);

    const res = await GET(bearerRequest());
    expect(res.status).toBe(200);

    const notifChain = tableChains.notificacion;
    expect(notifChain.insertCalls).toHaveLength(1);
    expect(notifChain.insertCalls[0]).toHaveLength(1);
    expect(notifChain.insertCalls[0][0].usuario_id).toBe("uid-admin1");
  });
});

// ============================================================
// enviada flag
// ============================================================

describe("GET /api/cron/cobranza-alertas — enviada flag", () => {
  it("marks newly-inserted alerts as enviada=true after dispatch", async () => {
    const tableChains = (mockFrom as any)._tableChains;
    tableChains.cuota = makeCuotaChain({
      data: [cuota({ id: "cuota-a", fecha_vencimiento: "2026-07-19" })],
      error: null,
    });
    tableChains.alerta_cobranza = makeAlertaChain({
      data: [{ id: "alerta-a", cuota_id: "cuota-a", tipo_alerta: "por_vencer_15d" }],
      error: null,
    });
    // A resolvable recipient (the cliente owner, "vendor1") is required —
    // an alert with zero recipients must NOT be marked enviada (FIX 2c).
    tableChains.usuario_perfil = makePerfilChain({
      data: [{ id: "uid-vendor1", username: "vendor1", rol: { nombre: "ROL_VENDEDOR" } }],
      error: null,
    });
    mockFrom.mockImplementation((table: string) => tableChains[table]);

    const res = await GET(bearerRequest());
    expect(res.status).toBe(200);

    const alertaChain = tableChains.alerta_cobranza;
    expect(alertaChain.updateCalls).toHaveLength(1);
    expect(alertaChain.updateCalls[0].payload).toEqual({ enviada: true });
    expect(alertaChain.updateCalls[0].col).toBe("id");
    expect(alertaChain.updateCalls[0].ids).toEqual(["alerta-a"]);
  });

  it("skips notification/update work entirely when no tier is crossed", async () => {
    const tableChains = (mockFrom as any)._tableChains;
    tableChains.cuota = makeCuotaChain({
      // Within the query window (today + 16d) but past the 15-day
      // por-vencer threshold, so computeTier() legitimately returns null.
      data: [cuota({ id: "cuota-a", fecha_vencimiento: "2026-07-20" })],
      error: null,
    });
    mockFrom.mockImplementation((table: string) => tableChains[table]);

    const res = await GET(bearerRequest());
    expect(res.status).toBe(200);

    const alertaChain = tableChains.alerta_cobranza;
    expect(alertaChain.upsertCalls).toHaveLength(0);
    const notifChain = tableChains.notificacion;
    expect(notifChain.insertCalls).toHaveLength(0);
  });
});

// ============================================================
// FIX 7 — abort on refresh failure
// ============================================================

describe("GET /api/cron/cobranza-alertas — refresh failure", () => {
  it("returns 500 and never reads cuotas when actualizar_cuotas_vencidas errors", async () => {
    mockRpc.mockImplementationOnce(() => {
      callOrder.push("rpc:actualizar_cuotas_vencidas");
      return Promise.resolve({ data: null, error: { message: "rpc boom" } });
    });

    const res = await GET(bearerRequest());
    expect(res.status).toBe(500);
    expect(mockFrom).not.toHaveBeenCalled();
  });
});

// ============================================================
// FIX 1 — exclude cancelled/suspended ventas
// ============================================================

describe("GET /api/cron/cobranza-alertas — cancelled/suspended ventas", () => {
  it("uses an inner join hint on venta and filters out cancelada/suspendida ventas server-side", async () => {
    const tableChains = (mockFrom as any)._tableChains;
    tableChains.cuota = makeCuotaChain({
      data: [
        cuota({
          id: "cuota-ok",
          fecha_vencimiento: "2026-07-19",
          venta: {
            estado: "activa",
            cliente: {
              id: "cliente-1",
              nombre: "Cliente Uno",
              vendedor_username: "vendor1",
              vendedor_asignado: null,
              created_by: null,
            },
          },
        }),
        cuota({
          id: "cuota-cancelada",
          fecha_vencimiento: "2026-07-19",
          venta: {
            estado: "cancelada",
            cliente: {
              id: "cliente-2",
              nombre: "Cliente Dos",
              vendedor_username: "vendor2",
              vendedor_asignado: null,
              created_by: null,
            },
          },
        }),
      ],
      error: null,
    });
    tableChains.alerta_cobranza = makeAlertaChain({
      data: [{ id: "alerta-ok", cuota_id: "cuota-ok", tipo_alerta: "por_vencer_15d" }],
      error: null,
    });
    mockFrom.mockImplementation((table: string) => tableChains[table]);

    const res = await GET(bearerRequest());
    expect(res.status).toBe(200);

    const cuotaChain = tableChains.cuota;
    expect(cuotaChain.calls.select).toContain("venta!venta_id!inner");
    expect(cuotaChain.calls.not).toEqual(["venta.estado", "in", '("cancelada","suspendida")']);

    // The cancelada venta's cuota never reaches tier evaluation: no alert,
    // no notification for it.
    const alertaChain = tableChains.alerta_cobranza;
    expect(alertaChain.upsertCalls[0].rows).toEqual([
      { cuota_id: "cuota-ok", tipo_alerta: "por_vencer_15d" },
    ]);
  });
});

// ============================================================
// FIX 6 — bound the cuota query to the alerting window
// ============================================================

describe("GET /api/cron/cobranza-alertas — query window bound", () => {
  it("bounds fecha_vencimiento to [today-91d, today+16d]", async () => {
    const today = new Date();
    const limaTodayStr = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" }).format(
      today,
    );
    const [y, m, d] = limaTodayStr.split("-").map(Number);
    const dayMs = 86_400_000;
    const base = Date.UTC(y, m - 1, d);
    const expectedStart = new Date(base - 91 * dayMs).toISOString().slice(0, 10);
    const expectedEnd = new Date(base + 16 * dayMs).toISOString().slice(0, 10);

    const res = await GET(bearerRequest());
    expect(res.status).toBe(200);

    const tableChains = (mockFrom as any)._tableChains;
    const cuotaChain = tableChains.cuota;
    expect(cuotaChain.calls.gte).toEqual(["fecha_vencimiento", expectedStart]);
    expect(cuotaChain.calls.lte).toEqual(["fecha_vencimiento", expectedEnd]);
  });
});

// ============================================================
// FIX 3 — created_by owner fallback
// ============================================================

describe("GET /api/cron/cobranza-alertas — created_by owner fallback", () => {
  it("notifies the cliente creator when vendedor_username and vendedor_asignado are both null, and the creator is an active perfil", async () => {
    const tableChains = (mockFrom as any)._tableChains;
    tableChains.cuota = makeCuotaChain({
      data: [
        cuota({
          id: "cuota-a",
          fecha_vencimiento: "2026-07-19",
          venta: {
            estado: "activa",
            cliente: {
              id: "cliente-1",
              nombre: "Cliente Uno",
              vendedor_username: null,
              vendedor_asignado: null,
              created_by: "uid-creator",
            },
          },
        }),
      ],
      error: null,
    });
    tableChains.alerta_cobranza = makeAlertaChain({
      data: [{ id: "alerta-a", cuota_id: "cuota-a", tipo_alerta: "por_vencer_15d" }],
      error: null,
    });
    // created_by is the auth.users.id directly (no username lookup), but
    // FIX 2 validates it against the fetched active-perfiles set before
    // trusting it as a recipient — so the fixture must include a matching
    // usuario_perfil row.
    tableChains.usuario_perfil = makePerfilChain({
      data: [{ id: "uid-creator", username: "creator1", rol: { nombre: "ROL_VENDEDOR" } }],
      error: null,
    });
    mockFrom.mockImplementation((table: string) => tableChains[table]);

    const res = await GET(bearerRequest());
    expect(res.status).toBe(200);

    const notifChain = tableChains.notificacion;
    expect(notifChain.insertCalls).toHaveLength(1);
    const recipientIds = notifChain.insertCalls[0].map((row: any) => row.usuario_id);
    expect(recipientIds).toEqual(["uid-creator"]);
  });

  it("skips created_by as a recipient when it does not match any fetched active perfil (FIX 2 — orphaned/inactive created_by must not poison the batch)", async () => {
    const tableChains = (mockFrom as any)._tableChains;
    tableChains.cuota = makeCuotaChain({
      data: [
        cuota({
          id: "cuota-a",
          fecha_vencimiento: "2026-07-19",
          venta: {
            estado: "activa",
            cliente: {
              id: "cliente-1",
              nombre: "Cliente Uno",
              vendedor_username: "vendor1",
              vendedor_asignado: null,
              created_by: "uid-orphan",
            },
          },
        }),
      ],
      error: null,
    });
    tableChains.alerta_cobranza = makeAlertaChain({
      data: [{ id: "alerta-a", cuota_id: "cuota-a", tipo_alerta: "por_vencer_15d" }],
      error: null,
    });
    // "uid-orphan" (created_by) has no corresponding row here — it must not
    // be added as a recipient, and the batch must still proceed normally
    // for the resolvable owner ("vendor1").
    tableChains.usuario_perfil = makePerfilChain({
      data: [{ id: "uid-vendor1", username: "vendor1", rol: { nombre: "ROL_VENDEDOR" } }],
      error: null,
    });
    mockFrom.mockImplementation((table: string) => tableChains[table]);

    const res = await GET(bearerRequest());
    expect(res.status).toBe(200);

    const notifChain = tableChains.notificacion;
    expect(notifChain.insertCalls).toHaveLength(1);
    const recipientIds = notifChain.insertCalls[0].map((row: any) => row.usuario_id);
    expect(recipientIds).toEqual(["uid-vendor1"]);
    expect(recipientIds).not.toContain("uid-orphan");

    const alertaChain = tableChains.alerta_cobranza;
    expect(alertaChain.updateCalls).toHaveLength(1);
    expect(alertaChain.updateCalls[0].ids).toEqual(["alerta-a"]);
  });
});

// ============================================================
// FIX 2a — abort when recipient resolution (usuario_perfil) errors
// ============================================================

describe("GET /api/cron/cobranza-alertas — recipient resolution failure", () => {
  it("returns 500 and does not dispatch or mark alerts when the usuario_perfil query errors", async () => {
    const tableChains = (mockFrom as any)._tableChains;
    tableChains.cuota = makeCuotaChain({
      data: [cuota({ id: "cuota-a", fecha_vencimiento: "2026-07-19" })],
      error: null,
    });
    tableChains.alerta_cobranza = makeAlertaChain({
      data: [{ id: "alerta-a", cuota_id: "cuota-a", tipo_alerta: "por_vencer_15d" }],
      error: null,
    });
    tableChains.usuario_perfil = makePerfilChain({
      data: null,
      error: { message: "perfil boom" },
    });
    mockFrom.mockImplementation((table: string) => tableChains[table]);

    const res = await GET(bearerRequest());
    expect(res.status).toBe(500);

    const alertaChain = tableChains.alerta_cobranza;
    expect(alertaChain.updateCalls).toHaveLength(0);
    const notifChain = tableChains.notificacion;
    expect(notifChain.insertCalls).toHaveLength(0);
  });
});

// ============================================================
// FIX 2b — do not mark enviada when the notification insert fails
// ============================================================

describe("GET /api/cron/cobranza-alertas — notification insert failure", () => {
  it("returns 500 and leaves alerts enviada=false when the notificacion insert errors", async () => {
    const tableChains = (mockFrom as any)._tableChains;
    tableChains.cuota = makeCuotaChain({
      data: [cuota({ id: "cuota-a", fecha_vencimiento: "2026-07-19" })],
      error: null,
    });
    tableChains.alerta_cobranza = makeAlertaChain({
      data: [{ id: "alerta-a", cuota_id: "cuota-a", tipo_alerta: "por_vencer_15d" }],
      error: null,
    });
    tableChains.usuario_perfil = makePerfilChain({
      data: [{ id: "uid-vendor1", username: "vendor1", rol: { nombre: "ROL_VENDEDOR" } }],
      error: null,
    });
    tableChains.notificacion = makeNotifChain({ data: null, error: { message: "insert boom" } });
    mockFrom.mockImplementation((table: string) => tableChains[table]);

    const res = await GET(bearerRequest());
    expect(res.status).toBe(500);

    // The alert must NOT be marked enviada — it stays retryable.
    const alertaChain = tableChains.alerta_cobranza;
    expect(alertaChain.updateCalls).toHaveLength(0);
  });
});

// ============================================================
// FIX 2c — do not mark enviada when an alert resolved zero recipients
// ============================================================

describe("GET /api/cron/cobranza-alertas — zero-recipient alert", () => {
  it("does not mark an alert enviada when it resolved no recipients, without erroring the run", async () => {
    const tableChains = (mockFrom as any)._tableChains;
    tableChains.cuota = makeCuotaChain({
      data: [
        cuota({
          id: "cuota-a",
          fecha_vencimiento: "2026-07-19",
          venta: {
            estado: "activa",
            cliente: {
              id: "cliente-1",
              nombre: "Cliente Uno",
              vendedor_username: "vendor-sin-perfil",
              vendedor_asignado: null,
              created_by: null,
            },
          },
        }),
      ],
      error: null,
    });
    tableChains.alerta_cobranza = makeAlertaChain({
      data: [{ id: "alerta-a", cuota_id: "cuota-a", tipo_alerta: "por_vencer_15d" }],
      error: null,
    });
    // usuario_perfil stays empty (default beforeEach fixture): the owner
    // username cannot be resolved to any usuario_perfil.id, and there are
    // no global-role holders either -> zero recipients for this alert.
    mockFrom.mockImplementation((table: string) => tableChains[table]);

    const res = await GET(bearerRequest());
    expect(res.status).toBe(200);

    const notifChain = tableChains.notificacion;
    expect(notifChain.insertCalls).toHaveLength(0);

    const alertaChain = tableChains.alerta_cobranza;
    expect(alertaChain.updateCalls).toHaveLength(0);
  });
});

// ============================================================
// FIX 1 — pending-alert retry path
// ============================================================

describe("GET /api/cron/cobranza-alertas — pending-alert retry path", () => {
  it("retries a previously-stuck alert on a later run after its notification insert failed", async () => {
    const tableChains = (mockFrom as any)._tableChains;

    // Run 1 ("day 1"): a new alert is generated but its notification insert
    // fails -> it must stay enviada=false (FIX 2b behavior, unchanged).
    tableChains.cuota = makeCuotaChain({
      data: [cuota({ id: "cuota-stuck", fecha_vencimiento: "2026-07-19" })],
      error: null,
    });
    tableChains.alerta_cobranza = makeAlertaChain({
      data: [{ id: "alerta-stuck", cuota_id: "cuota-stuck", tipo_alerta: "por_vencer_15d" }],
      error: null,
    });
    tableChains.usuario_perfil = makePerfilChain({
      data: [{ id: "uid-vendor1", username: "vendor1", rol: { nombre: "ROL_VENDEDOR" } }],
      error: null,
    });
    tableChains.notificacion = makeNotifChain({ data: null, error: { message: "insert boom" } });
    mockFrom.mockImplementation((table: string) => tableChains[table]);

    const day1 = await GET(bearerRequest());
    expect(day1.status).toBe(500);
    expect(tableChains.alerta_cobranza.updateCalls).toHaveLength(0);

    // Run 2 (fresh mocks, simulating the next day's invocation): the cuota
    // still exists, but the upsert now hits the (cuota_id, tipo_alerta)
    // unique conflict from run 1's insert, so `ignoreDuplicates` returns [].
    // The ONLY way "alerta-stuck" can come back is through the pending-retry
    // query (`enviada = false`) — proving generation alone cannot recover it.
    vi.clearAllMocks();
    callOrder.length = 0;
    const tableChains2: Record<string, any> = {
      cuota: makeCuotaChain({
        data: [cuota({ id: "cuota-stuck", fecha_vencimiento: "2026-07-19" })],
        error: null,
      }),
      alerta_cobranza: makeAlertaChain(
        { data: [], error: null }, // upsert: conflicting pair -> nothing new returned
        {
          data: [
            {
              id: "alerta-stuck",
              cuota_id: "cuota-stuck",
              tipo_alerta: "por_vencer_15d",
              cuota: cuota({ id: "cuota-stuck", fecha_vencimiento: "2026-07-19" }),
            },
          ],
          error: null,
        },
      ),
      usuario_perfil: makePerfilChain({
        data: [{ id: "uid-vendor1", username: "vendor1", rol: { nombre: "ROL_VENDEDOR" } }],
        error: null,
      }),
      notificacion: makeNotifChain(),
    };
    mockFrom.mockImplementation((table: string) => tableChains2[table]);

    const day2 = await GET(bearerRequest());
    expect(day2.status).toBe(200);

    const notifChain2 = tableChains2.notificacion;
    expect(notifChain2.insertCalls).toHaveLength(1);
    expect(notifChain2.insertCalls[0][0].data.alerta_id).toBe("alerta-stuck");
    expect(notifChain2.insertCalls[0][0].usuario_id).toBe("uid-vendor1");

    const alertaChain2 = tableChains2.alerta_cobranza;
    expect(alertaChain2.updateCalls).toHaveLength(1);
    expect(alertaChain2.updateCalls[0].payload).toEqual({ enviada: true });
    expect(alertaChain2.updateCalls[0].ids).toEqual(["alerta-stuck"]);
  });

  it("does not dispatch a pending alert whose venta has since been cancelled", async () => {
    const tableChains = (mockFrom as any)._tableChains;
    // No new tier-crossing cuotas today -> the run's only work is the
    // pending-retry sweep.
    tableChains.cuota = makeCuotaChain({ data: [], error: null });
    tableChains.alerta_cobranza = makeAlertaChain(
      { data: [], error: null },
      {
        data: [
          {
            id: "alerta-cancelada",
            cuota_id: "cuota-cancelada",
            tipo_alerta: "mora",
            cuota: cuota({
              id: "cuota-cancelada",
              venta: {
                estado: "cancelada",
                cliente: {
                  id: "cliente-2",
                  nombre: "Cliente Dos",
                  vendedor_username: "vendor2",
                  vendedor_asignado: null,
                  created_by: null,
                },
              },
            }),
          },
        ],
        error: null,
      },
    );
    mockFrom.mockImplementation((table: string) => tableChains[table]);

    const res = await GET(bearerRequest());
    expect(res.status).toBe(200);

    const alertaChain = tableChains.alerta_cobranza;
    // The server-side `.not("cuota.venta.estado", "in", ...)` filter is what
    // excludes it — assert both the filter args and the resulting exclusion.
    expect(alertaChain.pendingCalls[0].eq).toEqual(["enviada", false]);
    expect(alertaChain.pendingCalls[0].not).toEqual([
      "cuota.venta.estado",
      "in",
      '("cancelada","suspendida")',
    ]);
    // FIX 3 — the retry sweep is bounded and deterministic: oldest-first,
    // capped at 500 rows/run.
    expect(alertaChain.pendingCalls[0].order).toEqual(["fecha_alerta", { ascending: true }]);
    expect(alertaChain.pendingCalls[0].limit).toBe(500);

    const notifChain = tableChains.notificacion;
    expect(notifChain.insertCalls).toHaveLength(0);
    expect(alertaChain.updateCalls).toHaveLength(0);
  });

  it("does not dispatch a pending alert whose cuota has since been paid (FIX 1 — stuck alert on a paid cuota must not be resurrected)", async () => {
    const tableChains = (mockFrom as any)._tableChains;
    // No new tier-crossing cuotas today -> the run's only work is the
    // pending-retry sweep.
    tableChains.cuota = makeCuotaChain({ data: [], error: null });
    tableChains.alerta_cobranza = makeAlertaChain(
      { data: [], error: null },
      {
        data: [
          {
            id: "alerta-pagada",
            cuota_id: "cuota-pagada",
            tipo_alerta: "mora",
            cuota: cuota({
              id: "cuota-pagada",
              estado: "pagada",
              venta: {
                estado: "activa",
                cliente: {
                  id: "cliente-3",
                  nombre: "Cliente Tres",
                  vendedor_username: "vendor3",
                  vendedor_asignado: null,
                  created_by: null,
                },
              },
            }),
          },
        ],
        error: null,
      },
    );
    mockFrom.mockImplementation((table: string) => tableChains[table]);

    const res = await GET(bearerRequest());
    expect(res.status).toBe(200);

    const alertaChain = tableChains.alerta_cobranza;
    // The server-side `.neq("cuota.estado", "pagada")` filter is what
    // excludes it — assert both the filter args and the resulting exclusion.
    expect(alertaChain.pendingCalls[0].neq).toEqual(["cuota.estado", "pagada"]);

    const notifChain = tableChains.notificacion;
    expect(notifChain.insertCalls).toHaveLength(0);
    expect(alertaChain.updateCalls).toHaveLength(0);
  });
});

// ============================================================
// FIX 4 — surface the enviada-update failure instead of reporting success
// ============================================================

describe("GET /api/cron/cobranza-alertas — enviada persist failure", () => {
  it("returns 500 with a response reflecting reality when the enviada UPDATE fails after notifications were already dispatched", async () => {
    const tableChains = (mockFrom as any)._tableChains;
    tableChains.cuota = makeCuotaChain({
      data: [cuota({ id: "cuota-a", fecha_vencimiento: "2026-07-19" })],
      error: null,
    });
    tableChains.alerta_cobranza = makeAlertaChain(
      { data: [{ id: "alerta-a", cuota_id: "cuota-a", tipo_alerta: "por_vencer_15d" }], error: null },
      { data: [], error: null },
      { data: null, error: { message: "update boom" } },
    );
    tableChains.usuario_perfil = makePerfilChain({
      data: [{ id: "uid-vendor1", username: "vendor1", rol: { nombre: "ROL_VENDEDOR" } }],
      error: null,
    });
    mockFrom.mockImplementation((table: string) => tableChains[table]);

    const res = await GET(bearerRequest());
    expect(res.status).toBe(500);

    // The notification was already dispatched (insert succeeded) — the
    // response must not claim the flag was persisted.
    const notifChain = tableChains.notificacion;
    expect(notifChain.insertCalls).toHaveLength(1);

    const body = await res.json();
    expect(body.enviadas_persistidas).toBe(0);
    expect(body.notificaciones).toBe(1);
    expect(body.error).toContain("update boom");
  });
});
