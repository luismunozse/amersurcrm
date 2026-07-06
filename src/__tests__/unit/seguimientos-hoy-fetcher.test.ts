import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { mockSupabase, chains, createChainMock } = vi.hoisted(() => {
  function createChainMock(finalResult: any = { data: null, error: null }) {
    const chain: any = {};
    const methods = [
      "select", "insert", "update", "delete", "eq", "neq", "is", "or",
      "order", "range", "single", "in", "limit", "head", "maybeSingle", "not", "gte", "lte",
    ];
    for (const method of methods) chain[method] = vi.fn().mockReturnValue(chain);
    chain.then = (resolve: any, reject: any) =>
      Promise.resolve(finalResult).then(resolve, reject);
    return chain;
  }

  const chains: Record<string, any> = {};

  const mockSupabase: any = {
    schema: vi.fn(() => ({
      from: vi.fn((table: string) => chains[table] ?? createChainMock()),
    })),
  };

  return { mockSupabase, chains, createChainMock };
});

vi.mock("@/lib/supabase.server", () => ({
  createOptimizedServerClient: vi.fn().mockResolvedValue(mockSupabase),
  getCachedUserId: vi.fn().mockResolvedValue("user-1"),
}));

import { getCachedSeguimientosHoy } from "@/lib/cache.server";
import { getUrgencia } from "@/components/SeguimientosHoy";

function setupChains(opts: {
  rolNombre?: string;
  username?: string;
  interacciones?: { cliente_id: string; fecha_proxima_accion: string }[];
  clientesConAccion?: any[];
}) {
  const rolNombre = opts.rolNombre ?? "ROL_VENDEDOR";
  const username = opts.username ?? "vend1";

  chains.usuario_perfil = createChainMock({
    data: { username, rol: { nombre: rolNombre } },
    error: null,
  });
  chains.cliente_interaccion = createChainMock({
    data: opts.interacciones ?? [],
    error: null,
  });
  // 5+ rows short-circuits the "sin contacto reciente" fallback branch
  // (getCachedSeguimientosHoy only runs it when resultados.length < 5), so
  // a single `cliente` chain is enough for these tests.
  chains.cliente = createChainMock({
    data: opts.clientesConAccion ?? [],
    error: null,
  });

  return { username };
}

function clienteRow(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    nombre: `Cliente ${id}`,
    estado_cliente: "contactado",
    ultimo_contacto: null,
    proxima_accion: "llamar", // enum label — must never be parsed as a date
    telefono: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("getCachedSeguimientosHoy — ADR-7 due/overdue column fix", () => {
  it("queries cliente_interaccion.fecha_proxima_accion for the due/overdue branch, not the cliente enum column", async () => {
    setupChains({
      interacciones: [
        { cliente_id: "c1", fecha_proxima_accion: "2026-07-01T10:00:00.000Z" },
        { cliente_id: "c2", fecha_proxima_accion: "2026-07-02T10:00:00.000Z" },
        { cliente_id: "c3", fecha_proxima_accion: "2026-07-03T10:00:00.000Z" },
        { cliente_id: "c4", fecha_proxima_accion: "2026-07-04T10:00:00.000Z" },
        { cliente_id: "c5", fecha_proxima_accion: "2026-07-05T10:00:00.000Z" },
      ],
      clientesConAccion: [
        clienteRow("c1"), clienteRow("c2"), clienteRow("c3"), clienteRow("c4"), clienteRow("c5"),
      ],
    });

    await getCachedSeguimientosHoy();

    expect(chains.cliente_interaccion.select).toHaveBeenCalledWith("cliente_id, fecha_proxima_accion");
    expect(chains.cliente_interaccion.not).toHaveBeenCalledWith("fecha_proxima_accion", "is", null);
    expect(chains.cliente_interaccion.lte).toHaveBeenCalledWith(
      "fecha_proxima_accion",
      expect.any(String),
    );

    // The old bug queried `.lte('proxima_accion', ...)` directly on `cliente`.
    // That predicate must be gone from the cliente query entirely.
    expect(chains.cliente.lte).not.toHaveBeenCalled();
  });

  it("exposes fecha_proxima_accion on the result, decoupled from the proxima_accion enum label", async () => {
    setupChains({
      interacciones: [
        { cliente_id: "c1", fecha_proxima_accion: "2026-07-01T10:00:00.000Z" },
        { cliente_id: "c2", fecha_proxima_accion: "2026-07-02T10:00:00.000Z" },
        { cliente_id: "c3", fecha_proxima_accion: "2026-07-03T10:00:00.000Z" },
        { cliente_id: "c4", fecha_proxima_accion: "2026-07-04T10:00:00.000Z" },
        { cliente_id: "c5", fecha_proxima_accion: "2026-07-05T10:00:00.000Z" },
      ],
      clientesConAccion: [
        clienteRow("c1"), clienteRow("c2"), clienteRow("c3"), clienteRow("c4"), clienteRow("c5"),
      ],
    });

    const resultado = await getCachedSeguimientosHoy();

    expect(resultado).toHaveLength(5);
    const c1 = resultado.find((r) => r.id === "c1");
    expect(c1?.fecha_proxima_accion).toBe("2026-07-01T10:00:00.000Z");
    expect(c1?.proxima_accion).toBe("llamar");
  });

  it("scopes the interaccion query via a cliente-ownership prefilter (.in), never via cliente_interaccion.vendedor_username", async () => {
    const { username } = setupChains({
      rolNombre: "ROL_VENDEDOR",
      interacciones: [
        { cliente_id: "c1", fecha_proxima_accion: "2026-07-01T10:00:00.000Z" },
      ],
      clientesConAccion: [clienteRow("c1")],
    });

    await getCachedSeguimientosHoy();

    // Own-cliente prefilter: resolved from `cliente` ownership, matching the
    // `.or(created_by.eq...,vendedor_username.eq...)` predicate already used
    // by getCachedPipelineClientes — NOT cliente_interaccion.vendedor_username.
    expect(chains.cliente.or).toHaveBeenCalledWith(`created_by.eq.user-1,vendedor_username.eq.${username}`);
    expect(chains.cliente_interaccion.in).toHaveBeenCalledWith("cliente_id", ["c1"]);
    expect(chains.cliente_interaccion.eq).not.toHaveBeenCalledWith("vendedor_username", expect.anything());
  });

  it.each(["ROL_ADMIN", "ROL_GERENTE"])(
    "does not scope the interaccion query by ownership for %s (global command-center branch)",
    async (rolNombre) => {
      setupChains({ rolNombre, interacciones: [], clientesConAccion: [] });

      await getCachedSeguimientosHoy();

      expect(chains.cliente_interaccion.eq).not.toHaveBeenCalled();
      expect(chains.cliente_interaccion.in).not.toHaveBeenCalled();
    },
  );

  it("skips the interaccion query entirely when the caller owns no clientes (never issues .in with an empty array)", async () => {
    setupChains({ rolNombre: "ROL_VENDEDOR", interacciones: [], clientesConAccion: [] });

    const resultado = await getCachedSeguimientosHoy();

    expect(chains.cliente_interaccion.in).not.toHaveBeenCalled();
    expect(resultado).toEqual([]);
  });

  it("reassignment: an interaccion tied to a cliente the caller no longer owns is excluded, even though the caller owns other clientes", async () => {
    function createFilteringChain(rows: { cliente_id: string; fecha_proxima_accion: string }[]) {
      const chain: any = {};
      const methods = [
        "select", "insert", "update", "delete", "eq", "neq", "is", "or",
        "order", "range", "single", "head", "maybeSingle", "not", "gte", "lte", "limit",
      ];
      for (const method of methods) chain[method] = vi.fn().mockReturnValue(chain);
      let data = rows;
      chain.in = vi.fn((column: string, values: string[]) => {
        data = data.filter((row) => values.includes((row as any)[column]));
        return chain;
      });
      chain.then = (resolve: any, reject: any) => Promise.resolve({ data, error: null }).then(resolve, reject);
      return chain;
    }

    const clienteX = clienteRow("cx");
    const clienteY = clienteRow("cy");

    // Vendedor A: still owns cy, but cx was reassigned away from A to B.
    // Historically A logged the interaccion row for cx before the reassignment.
    chains.usuario_perfil = createChainMock({
      data: { username: "vendA", rol: { nombre: "ROL_VENDEDOR" } },
      error: null,
    });
    chains.cliente = createChainMock({ data: [clienteY], error: null });
    chains.cliente_interaccion = createFilteringChain([
      { cliente_id: "cx", fecha_proxima_accion: "2026-07-01T00:00:00.000Z" },
    ]);

    const resultA = await getCachedSeguimientosHoy();

    expect(chains.cliente_interaccion.in).toHaveBeenCalledWith("cliente_id", ["cy"]);
    expect(resultA.find((r) => r.id === "cx")).toBeUndefined();

    vi.clearAllMocks();

    // Vendedor B: the cliente's current owner.
    chains.usuario_perfil = createChainMock({
      data: { username: "vendB", rol: { nombre: "ROL_VENDEDOR" } },
      error: null,
    });
    chains.cliente = createChainMock({ data: [clienteX], error: null });
    chains.cliente_interaccion = createFilteringChain([
      { cliente_id: "cx", fecha_proxima_accion: "2026-07-01T00:00:00.000Z" },
    ]);

    const resultB = await getCachedSeguimientosHoy();

    expect(chains.cliente_interaccion.in).toHaveBeenCalledWith("cliente_id", ["cx"]);
    expect(resultB.find((r) => r.id === "cx")).toBeDefined();
  });
});

describe("getCachedSeguimientosHoy — bounded raw window + newest-per-client dedup (crowd-out fix)", () => {
  it("raises the raw interaccion cap for the privileged/global branch (was 20 — crowd-out risk)", async () => {
    setupChains({ rolNombre: "ROL_ADMIN", interacciones: [], clientesConAccion: [] });

    await getCachedSeguimientosHoy();

    expect(chains.cliente_interaccion.limit).toHaveBeenCalledWith(200);
  });

  it("dedupes per client keeping the newest fecha_proxima_accion and caps the final list at the display size without crowd-out", async () => {
    const clienteIds = ["c1", "c2", "c3", "c4", "c5", "c6", "c7", "c8", "c9"]; // 9 distinct clients > display cap (8)

    const interacciones = [
      { cliente_id: "c1", fecha_proxima_accion: "2026-06-10T00:00:00.000Z" }, // stale — superseded below
      { cliente_id: "c2", fecha_proxima_accion: "2026-06-11T00:00:00.000Z" },
      { cliente_id: "c3", fecha_proxima_accion: "2026-06-12T00:00:00.000Z" },
      { cliente_id: "c4", fecha_proxima_accion: "2026-06-13T00:00:00.000Z" },
      { cliente_id: "c5", fecha_proxima_accion: "2026-06-14T00:00:00.000Z" },
      { cliente_id: "c1", fecha_proxima_accion: "2026-06-15T00:00:00.000Z" }, // newest for c1 — must win
      { cliente_id: "c6", fecha_proxima_accion: "2026-06-16T00:00:00.000Z" },
      { cliente_id: "c7", fecha_proxima_accion: "2026-06-17T00:00:00.000Z" },
      { cliente_id: "c8", fecha_proxima_accion: "2026-06-18T00:00:00.000Z" },
      { cliente_id: "c9", fecha_proxima_accion: "2026-06-19T00:00:00.000Z" }, // 9th-most-urgent — dropped by the display cap
    ];

    setupChains({
      rolNombre: "ROL_ADMIN",
      interacciones,
      clientesConAccion: clienteIds.map((id) => clienteRow(id)),
    });

    const resultado = await getCachedSeguimientosHoy();

    expect(resultado).toHaveLength(8);
    const ids = resultado.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length); // no single client occupies multiple slots

    const c1 = resultado.find((r) => r.id === "c1");
    expect(c1?.fecha_proxima_accion).toBe("2026-06-15T00:00:00.000Z"); // newest wins over the stale duplicate

    expect(resultado.find((r) => r.id === "c9")).toBeUndefined(); // least urgent of the 9 — correctly excluded, not an arbitrary crowd-out victim
  });
});

describe("SeguimientosHoy getUrgencia — reads fecha_proxima_accion, never new Date(proxima_accion)", () => {
  it("marks an overdue interaction date as vencido", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-05T12:00:00.000Z"));

    const urgencia = getUrgencia(clienteRow("c1", { fecha_proxima_accion: "2026-07-04T09:00:00.000Z" }) as any);

    expect(urgencia.label).toBe("Vencido hace 1d");
    expect(urgencia.color).toContain("text-crm-danger");
  });

  it("marks a same-day interaction date as 'Para hoy'", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-05T12:00:00.000Z"));

    const urgencia = getUrgencia(clienteRow("c1", { fecha_proxima_accion: "2026-07-05T09:00:00.000Z" }) as any);

    expect(urgencia.label).toBe("Para hoy");
  });

  it("never parses the enum label as a date — falls back to ultimo_contacto when fecha_proxima_accion is null", () => {
    const now = new Date("2026-07-05T12:00:00.000Z");
    vi.useFakeTimers();
    vi.setSystemTime(now);

    // Derive "10 days before now" via local calendar arithmetic (not a fixed
    // UTC literal) so the assertion is stable across the runner's timezone —
    // `differenceInCalendarDays` compares local calendar days.
    const ultimoContacto = new Date(now);
    ultimoContacto.setDate(ultimoContacto.getDate() - 10);

    // proxima_accion is a truthy enum string ("llamar") — the pre-fix code did
    // `new Date(cliente.proxima_accion)` here, producing Invalid Date/NaN.
    const urgencia = getUrgencia(
      clienteRow("c1", {
        fecha_proxima_accion: null,
        proxima_accion: "llamar",
        ultimo_contacto: ultimoContacto.toISOString(),
      }) as any,
    );

    expect(urgencia.label).toBe("10d sin contacto");
    expect(urgencia.label).not.toContain("NaN");
  });
});
