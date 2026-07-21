import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { mockSupabase, chains, createChainMock } = vi.hoisted(() => {
  function createChainMock(finalResult: any = { data: null, error: null }) {
    const chain: any = {};
    const methods = [
      "select", "insert", "update", "delete", "eq", "neq", "is", "or",
      "order", "range", "single", "in", "limit", "head", "maybeSingle", "not", "gte", "lte", "gt",
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

import {
  getAgingLeads,
  getInventarioLotesPorProyecto,
  getAlertasSinGestionarCount,
  getResumenGeneral,
  getVentasMensuales,
  ROLES_VENDEDOR_ACTIVOS,
} from "@/lib/dashboard/command-center.server";
import { EXCLUIR_IMPORTACION_NUNCA_CONTACTADO } from "@/lib/dashboard/aging";
import { equipoOrFilter, type EquipoScope } from "@/lib/auth/equipo-scope.server";

const GLOBAL_SCOPE: EquipoScope = { tier: "global" };
const PROPIO_SCOPE: EquipoScope = { tier: "propio", userId: "user-1", username: "vend1" };
const EQUIPO_SCOPE: EquipoScope = {
  tier: "equipo",
  userId: "coord-1",
  username: "coord1",
  equipoUsernames: ["coord1", "vend1"],
  equipoUserIds: ["coord-1", "vend-1"],
};

function clienteRow(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    nombre: `Cliente ${id}`,
    estado_cliente: "contactado",
    ultimo_contacto: null,
    // Recent by default so the fix-2 creation-date window never filters out
    // rows in tests that aren't specifically exercising it.
    fecha_alta: new Date().toISOString(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  delete chains.cliente;
  delete chains.cliente_interaccion;
  delete chains.lote;
  delete chains.alerta_cobranza;
  delete chains.proyecto;
  delete chains.venta;
  delete chains.usuario_perfil;
});

afterEach(() => {
  vi.useRealTimers();
});

describe("getAgingLeads", () => {
  it("returns an empty exact result without querying anything when esGlobal is false", async () => {
    const resultado = await getAgingLeads(PROPIO_SCOPE);

    expect(resultado).toEqual({ count: 0, isExact: true, top: [] });
    expect(mockSupabase.schema).not.toHaveBeenCalled();
  });

  it("queries candidate clientes excluding desestimado/transferido/propietario and filtering stale/null ultimo_contacto", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-05T12:00:00.000Z"));

    chains.cliente = createChainMock({ data: [], error: null });
    chains.cliente_interaccion = createChainMock({ data: [], error: null });

    await getAgingLeads(GLOBAL_SCOPE);

    expect(chains.cliente.not).toHaveBeenCalledWith(
      "estado_cliente",
      "in",
      '("desestimado","transferido","propietario")',
    );
    expect(chains.cliente.or).toHaveBeenCalledWith(
      "ultimo_contacto.is.null,ultimo_contacto.lte.2026-07-02T12:00:00.000Z",
    );
    // Fix 2: only clientes created in the last 90 days are aging candidates.
    expect(chains.cliente.gte).toHaveBeenCalledWith("fecha_alta", "2026-04-06T12:00:00.000Z");
  });

  it("excludes bulk-imported clientes never contacted from the aging candidate pool (data-provenance fix)", async () => {
    chains.cliente = createChainMock({ data: [], error: null });
    chains.cliente_interaccion = createChainMock({ data: [], error: null });

    await getAgingLeads(GLOBAL_SCOPE);

    expect(chains.cliente.or).toHaveBeenCalledWith(EXCLUIR_IMPORTACION_NUNCA_CONTACTADO);
  });

  it("applies the imported-never-contacted exclusion identically to the candidate query and the at-cap head-count query (data-provenance fix — count-parity)", async () => {
    const rows = Array.from({ length: 200 }, (_, i) => clienteRow(`c${i + 1}`));
    chains.cliente = createChainMock({ data: rows, count: 537, error: null });
    chains.cliente_interaccion = createChainMock({ data: [], error: null });

    await getAgingLeads(GLOBAL_SCOPE);

    const exclusionCalls = chains.cliente.or.mock.calls.filter(
      ([filtro]: [string]) => filtro === EXCLUIR_IMPORTACION_NUNCA_CONTACTADO,
    );
    expect(exclusionCalls).toHaveLength(2);
  });

  it("uses the exact same fecha_alta cutoff for the candidate query and the at-cap head-count query (fix 2 — count-parity)", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-05T12:00:00.000Z"));

    const rows = Array.from({ length: 200 }, (_, i) => clienteRow(`c${i + 1}`));
    // Same shared chain backs both the candidate list query and the at-cap
    // head-count query issued against 'cliente' (see the fix-2 test below) —
    // its .gte mock therefore records calls from BOTH queries.
    chains.cliente = createChainMock({ data: rows, count: 537, error: null });
    chains.cliente_interaccion = createChainMock({ data: [], error: null });

    await getAgingLeads(GLOBAL_SCOPE);

    const cutoffCalls = chains.cliente.gte.mock.calls.filter(([campo]: [string]) => campo === "fecha_alta");
    expect(cutoffCalls).toHaveLength(2);
    expect(cutoffCalls[0][1]).toBe("2026-04-06T12:00:00.000Z");
    expect(cutoffCalls[1][1]).toBe(cutoffCalls[0][1]);
  });

  it("short-circuits without querying cliente_interaccion when there are no candidates", async () => {
    chains.cliente = createChainMock({ data: [], error: null });
    chains.cliente_interaccion = createChainMock({ data: [], error: null });

    const resultado = await getAgingLeads(GLOBAL_SCOPE);

    expect(chains.cliente_interaccion.in).not.toHaveBeenCalled();
    expect(resultado).toEqual({ count: 0, isExact: true, top: [] });
  });

  it("excludes a stale candidate that has a future scheduled action (two-step set difference)", async () => {
    chains.cliente = createChainMock({
      data: [clienteRow("c1"), clienteRow("c2")],
      error: null,
    });
    chains.cliente_interaccion = createChainMock({
      data: [{ cliente_id: "c1" }],
      error: null,
    });

    const resultado = await getAgingLeads(GLOBAL_SCOPE);

    expect(chains.cliente_interaccion.in).toHaveBeenCalledWith("cliente_id", ["c1", "c2"]);
    expect(resultado.count).toBe(1);
    expect(resultado.isExact).toBe(true);
    expect(resultado.top.map((c) => c.id)).toEqual(["c2"]);
  });

  it("caps the preview list at 5 oldest but reports the full EXACT aging count when under the candidate cap", async () => {
    const rows = Array.from({ length: 7 }, (_, i) => clienteRow(`c${i + 1}`));
    chains.cliente = createChainMock({ data: rows, error: null });
    chains.cliente_interaccion = createChainMock({ data: [], error: null });

    const resultado = await getAgingLeads(GLOBAL_SCOPE);

    expect(resultado.count).toBe(7);
    expect(resultado.isExact).toBe(true);
    expect(resultado.top).toHaveLength(5);
  });

  it("never counts a propietario candidate even with a stale ultimo_contacto (fix 1)", async () => {
    // The real DB query excludes 'propietario' server-side (asserted above);
    // this pins the defense-in-depth behavior if one ever slipped through —
    // isAgingLead itself must still reject it.
    chains.cliente = createChainMock({
      data: [clienteRow("c1", { estado_cliente: "propietario", ultimo_contacto: "2020-01-01T00:00:00.000Z" })],
      error: null,
    });
    chains.cliente_interaccion = createChainMock({ data: [], error: null });

    const resultado = await getAgingLeads(GLOBAL_SCOPE);

    expect(resultado.count).toBe(0);
    expect(resultado.top).toEqual([]);
  });

  it("falls back to an inexact upper-bound count via a head-count query when the candidate scan hits the cap (fix 2)", async () => {
    const rows = Array.from({ length: 200 }, (_, i) => clienteRow(`c${i + 1}`));
    // A single mock chain per table serves both the capped list query
    // (reads `data`) and the head-count query (reads `count`) issued against
    // the same 'cliente' table — each call destructures only the field it
    // needs, so one fixture backs both.
    chains.cliente = createChainMock({ data: rows, count: 537, error: null });
    chains.cliente_interaccion = createChainMock({ data: [], error: null });

    const resultado = await getAgingLeads(GLOBAL_SCOPE);

    expect(resultado.isExact).toBe(false);
    expect(resultado.count).toBe(537);
    expect(resultado.top).toHaveLength(5);
  });

  it("falls back to a conservative floor when the head-count query errors after hitting the cap (fix 2)", async () => {
    const rows = Array.from({ length: 200 }, (_, i) => clienteRow(`c${i + 1}`));
    chains.cliente = createChainMock({ data: rows, count: null, error: null });
    chains.cliente_interaccion = createChainMock({ data: [], error: null });

    const resultado = await getAgingLeads(GLOBAL_SCOPE);

    expect(resultado.isExact).toBe(false);
    expect(resultado.count).toBe(200);
  });
});

describe("getInventarioLotesPorProyecto", () => {
  it("returns an empty inventory without querying when esGlobal is false", async () => {
    const resultado = await getInventarioLotesPorProyecto(PROPIO_SCOPE);

    expect(resultado).toEqual({
      proyectos: [],
      totales: { disponible: 0, reservado: 0, vendido: 0, total: 0, pctVendido: 0 },
    });
    expect(mockSupabase.schema).not.toHaveBeenCalled();
  });

  it("aggregates lotes per project into disponible/reservado/vendido counts with pctVendido", async () => {
    chains.lote = createChainMock({
      data: [
        { proyecto_id: "p1", estado: "disponible", proyecto: { nombre: "Proyecto Uno" } },
        { proyecto_id: "p1", estado: "vendido", proyecto: { nombre: "Proyecto Uno" } },
        { proyecto_id: "p1", estado: "vendido", proyecto: { nombre: "Proyecto Uno" } },
        { proyecto_id: "p2", estado: "reservado", proyecto: { nombre: "Proyecto Dos" } },
      ],
      error: null,
    });

    const resultado = await getInventarioLotesPorProyecto(GLOBAL_SCOPE);

    const p1 = resultado.proyectos.find((p) => p.proyectoId === "p1");
    expect(p1).toMatchObject({
      nombre: "Proyecto Uno",
      disponible: 1,
      reservado: 0,
      vendido: 2,
      total: 3,
      pctVendido: 67,
    });

    const p2 = resultado.proyectos.find((p) => p.proyectoId === "p2");
    expect(p2).toMatchObject({ nombre: "Proyecto Dos", disponible: 0, reservado: 1, vendido: 0, total: 1 });
  });

  it("derives org totals summed across all projects", async () => {
    chains.lote = createChainMock({
      data: [
        { proyecto_id: "p1", estado: "disponible", proyecto: { nombre: "Proyecto Uno" } },
        { proyecto_id: "p1", estado: "vendido", proyecto: { nombre: "Proyecto Uno" } },
        { proyecto_id: "p2", estado: "reservado", proyecto: { nombre: "Proyecto Dos" } },
      ],
      error: null,
    });

    const resultado = await getInventarioLotesPorProyecto(GLOBAL_SCOPE);

    expect(resultado.totales).toEqual({ disponible: 1, reservado: 1, vendido: 1, total: 3, pctVendido: 33 });
  });
});

describe("getAlertasSinGestionarCount", () => {
  it("returns 0 without querying when esGlobal is false", async () => {
    const resultado = await getAlertasSinGestionarCount(PROPIO_SCOPE);

    expect(resultado).toBe(0);
    expect(mockSupabase.schema).not.toHaveBeenCalled();
  });

  it("counts unmanaged alerts excluding resolved cuotas/ventas, scoped globally", async () => {
    chains.alerta_cobranza = createChainMock({ data: null, error: null, count: 4 });

    const resultado = await getAlertasSinGestionarCount(GLOBAL_SCOPE);

    expect(chains.alerta_cobranza.eq).toHaveBeenCalledWith("gestionada", false);
    expect(chains.alerta_cobranza.neq).toHaveBeenCalledWith("cuota.estado", "pagada");
    expect(chains.alerta_cobranza.not).toHaveBeenCalledWith(
      "cuota.venta.estado", "in", '("cancelada","suspendida")',
    );
    expect(resultado).toBe(4);
  });

  it("returns 0 when the count query errors", async () => {
    chains.alerta_cobranza = createChainMock({ data: null, error: new Error("boom"), count: null });

    const resultado = await getAlertasSinGestionarCount(GLOBAL_SCOPE);

    expect(resultado).toBe(0);
  });
});

describe("getResumenGeneral", () => {
  it("returns a zeroed default without querying anything when esGlobal is false", async () => {
    const resultado = await getResumenGeneral(PROPIO_SCOPE);

    expect(resultado).toEqual({
      clientesNuevosMes: 0,
      clientesTotales: 0,
      proyectosActivos: 0,
      lotesTotales: 0,
      lotesPctDisponible: 0,
      lotesPctVendido: 0,
      vendedoresActivos: 0,
    });
    expect(mockSupabase.schema).not.toHaveBeenCalled();
  });

  it("counts clientes nuevos by fecha_alta (not created_at), clientes totales, proyectos activos, and reuses lote totals", async () => {
    chains.cliente = createChainMock({ data: null, error: null, count: 12 });
    chains.proyecto = createChainMock({ data: null, error: null, count: 3 });
    chains.lote = createChainMock({
      data: [
        { proyecto_id: "p1", estado: "disponible", proyecto: { nombre: "Proyecto Uno" } },
        { proyecto_id: "p1", estado: "vendido", proyecto: { nombre: "Proyecto Uno" } },
      ],
      error: null,
    });
    chains.usuario_perfil = createChainMock({ data: null, error: null, count: 5 });

    const resultado = await getResumenGeneral(GLOBAL_SCOPE);

    expect(chains.cliente.gte).toHaveBeenCalledWith("fecha_alta", expect.any(String));
    expect(chains.cliente.gte).not.toHaveBeenCalledWith("created_at", expect.anything());
    expect(chains.proyecto.eq).toHaveBeenCalledWith("estado", "activo");
    expect(resultado.clientesNuevosMes).toBe(12);
    expect(resultado.clientesTotales).toBe(12);
    expect(resultado.proyectosActivos).toBe(3);
    // Reused from getInventarioLotesPorProyecto's totales, not a second query.
    expect(resultado.lotesTotales).toBe(2);
    expect(resultado.lotesPctDisponible).toBe(50);
    expect(resultado.lotesPctVendido).toBe(50);
  });

  it("falls back to 0 for a field whose query errors, without zeroing the others", async () => {
    chains.cliente = createChainMock({ data: null, error: new Error("boom"), count: null });
    chains.proyecto = createChainMock({ data: null, error: null, count: 3 });
    chains.lote = createChainMock({ data: [], error: null });
    chains.usuario_perfil = createChainMock({ data: null, error: null, count: 5 });

    const resultado = await getResumenGeneral(GLOBAL_SCOPE);

    expect(resultado.clientesNuevosMes).toBe(0);
    expect(resultado.clientesTotales).toBe(0);
    expect(resultado.proyectosActivos).toBe(3);
  });

  it("counts only active usuario_perfil rows with rol ROL_VENDEDOR or ROL_COORDINADOR_VENTAS", async () => {
    chains.cliente = createChainMock({ data: null, error: null, count: 0 });
    chains.proyecto = createChainMock({ data: null, error: null, count: 0 });
    chains.lote = createChainMock({ data: [], error: null });
    chains.usuario_perfil = createChainMock({ data: null, error: null, count: 7 });

    const resultado = await getResumenGeneral(GLOBAL_SCOPE);

    expect(chains.usuario_perfil.eq).toHaveBeenCalledWith("activo", true);
    expect(chains.usuario_perfil.in).toHaveBeenCalledWith("rol.nombre", ROLES_VENDEDOR_ACTIVOS);
    // Without !inner the rol filter would narrow only the embedded object,
    // not the parent head-count — the join hint IS the query's correctness.
    expect(chains.usuario_perfil.select).toHaveBeenCalledWith(
      expect.stringContaining("!inner"),
      expect.objectContaining({ count: "exact", head: true }),
    );
    expect(resultado.vendedoresActivos).toBe(7);
  });

  it("falls back to 0 vendedoresActivos when that query errors, without breaking the rest of the resumen", async () => {
    chains.cliente = createChainMock({ data: null, error: null, count: 12 });
    chains.proyecto = createChainMock({ data: null, error: null, count: 3 });
    chains.lote = createChainMock({ data: [], error: null });
    chains.usuario_perfil = createChainMock({ data: null, error: new Error("boom"), count: null });

    const resultado = await getResumenGeneral(GLOBAL_SCOPE);

    expect(resultado.vendedoresActivos).toBe(0);
    expect(resultado.clientesNuevosMes).toBe(12);
    expect(resultado.proyectosActivos).toBe(3);
  });
});

describe("getVentasMensuales", () => {
  it("returns an empty object without querying when esGlobal is false", async () => {
    const resultado = await getVentasMensuales(PROPIO_SCOPE);

    expect(resultado).toEqual({});
    expect(mockSupabase.schema).not.toHaveBeenCalled();
  });

  it("groups finalizada ventas into zero-padded YYYY-MM buckets for the last 6 months", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-15T12:00:00.000Z"));

    chains.venta = createChainMock({
      data: [
        { fecha_venta: "2026-07-05T12:00:00.000Z" },
        { fecha_venta: "2026-07-20T12:00:00.000Z" },
        { fecha_venta: "2026-05-10T12:00:00.000Z" },
      ],
      error: null,
    });

    const resultado = await getVentasMensuales(GLOBAL_SCOPE);

    expect(chains.venta.eq).toHaveBeenCalledWith("estado", "finalizada");
    expect(Object.keys(resultado)).toEqual([
      "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07",
    ]);
    expect(resultado["2026-07"]).toBe(2);
    expect(resultado["2026-05"]).toBe(1);
    expect(resultado["2026-02"]).toBe(0);
  });

  it("returns an empty object when the query errors", async () => {
    chains.venta = createChainMock({ data: null, error: new Error("boom") });

    const resultado = await getVentasMensuales(GLOBAL_SCOPE);

    expect(resultado).toEqual({});
  });
});

describe("getAgingLeads — equipo (coordinador) team scope", () => {
  it("applies the team ownership filter to both the candidate query and the at-cap count query", async () => {
    const rows = Array.from({ length: 200 }, (_, i) => clienteRow(`c${i + 1}`));
    chains.cliente = createChainMock({ data: rows, count: 537, error: null });
    chains.cliente_interaccion = createChainMock({ data: [], error: null });

    await getAgingLeads(EQUIPO_SCOPE);

    const teamCalls = chains.cliente.or.mock.calls.filter(([filtro]: [string]) =>
      filtro.includes("vendedor_username.in."),
    );
    expect(teamCalls).toHaveLength(2); // candidate query + at-cap count query
    // NOTE: divergence from task-4b-brief.md's inline snippet, which predates
    // equipo-scope.server.ts gaining .in()-over-all-team-UUIDs +
    // vendedor_asignado arms (see that file's `equipoOrFilter` doc comment,
    // Issues #1/#2). The authoritative filter contract is that helper, not
    // the brief — so this asserts against its real output rather than a
    // stale hardcoded string.
    expect(teamCalls[0][0]).toBe(equipoOrFilter(EQUIPO_SCOPE));
  });
});

describe("getInventarioLotesPorProyecto — equipo (coordinador) sees the SAME full inventory as global", () => {
  it("does not scope the lote query for equipo — lotes have no per-vendedor ownership", async () => {
    chains.lote = createChainMock({
      data: [{ proyecto_id: "p1", estado: "disponible", proyecto: { nombre: "Proyecto Uno" } }],
      error: null,
    });

    const resultado = await getInventarioLotesPorProyecto(EQUIPO_SCOPE);

    expect(resultado.proyectos).toHaveLength(1);
    expect(resultado.totales.disponible).toBe(1);
  });
});

describe("getAlertasSinGestionarCount — equipo (coordinador) team scope", () => {
  it("filters by the team's venta.vendedor_username", async () => {
    chains.alerta_cobranza = createChainMock({ data: null, error: null, count: 2 });

    const resultado = await getAlertasSinGestionarCount(EQUIPO_SCOPE);

    expect(chains.alerta_cobranza.in).toHaveBeenCalledWith("cuota.venta.vendedor_username", ["coord1", "vend1"]);
    expect(resultado).toBe(2);
  });
});

describe("getResumenGeneral — equipo (coordinador) team scope", () => {
  it("scopes clientesNuevosMes/clientesTotales by team, leaves proyectosActivos org-wide, and scopes vendedoresActivos to the coordinador's own team", async () => {
    chains.cliente = createChainMock({ data: null, error: null, count: 3 });
    chains.proyecto = createChainMock({ data: null, error: null, count: 5 });
    chains.lote = createChainMock({ data: [], error: null });
    chains.usuario_perfil = createChainMock({ data: null, error: null, count: 2 });

    const resultado = await getResumenGeneral(EQUIPO_SCOPE);

    const teamCalls = chains.cliente.or.mock.calls.filter(([filtro]: [string]) =>
      filtro.includes("vendedor_username.in."),
    );
    expect(teamCalls.length).toBeGreaterThanOrEqual(2); // clientesNuevos + clientesTotales
    expect(resultado.proyectosActivos).toBe(5);
    expect(chains.usuario_perfil.or).toHaveBeenCalledWith("coordinador_id.eq.coord-1,id.eq.coord-1");
    expect(resultado.vendedoresActivos).toBe(2);
  });
});

describe("getVentasMensuales — equipo (coordinador) team scope", () => {
  it("filters ventas by the team's vendedor_username", async () => {
    chains.venta = createChainMock({ data: [], error: null });

    await getVentasMensuales(EQUIPO_SCOPE);

    expect(chains.venta.in).toHaveBeenCalledWith("vendedor_username", ["coord1", "vend1"]);
  });
});
