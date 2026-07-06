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
} from "@/lib/dashboard/command-center.server";

function clienteRow(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    nombre: `Cliente ${id}`,
    estado_cliente: "contactado",
    ultimo_contacto: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  delete chains.cliente;
  delete chains.cliente_interaccion;
  delete chains.lote;
  delete chains.alerta_cobranza;
});

afterEach(() => {
  vi.useRealTimers();
});

describe("getAgingLeads", () => {
  it("returns an empty exact result without querying anything when esGlobal is false", async () => {
    const resultado = await getAgingLeads(false);

    expect(resultado).toEqual({ count: 0, isExact: true, top: [] });
    expect(mockSupabase.schema).not.toHaveBeenCalled();
  });

  it("queries candidate clientes excluding desestimado/transferido/propietario and filtering stale/null ultimo_contacto", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-05T12:00:00.000Z"));

    chains.cliente = createChainMock({ data: [], error: null });
    chains.cliente_interaccion = createChainMock({ data: [], error: null });

    await getAgingLeads(true);

    expect(chains.cliente.not).toHaveBeenCalledWith(
      "estado_cliente",
      "in",
      '("desestimado","transferido","propietario")',
    );
    expect(chains.cliente.or).toHaveBeenCalledWith(
      "ultimo_contacto.is.null,ultimo_contacto.lte.2026-07-02T12:00:00.000Z",
    );
  });

  it("short-circuits without querying cliente_interaccion when there are no candidates", async () => {
    chains.cliente = createChainMock({ data: [], error: null });
    chains.cliente_interaccion = createChainMock({ data: [], error: null });

    const resultado = await getAgingLeads(true);

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

    const resultado = await getAgingLeads(true);

    expect(chains.cliente_interaccion.in).toHaveBeenCalledWith("cliente_id", ["c1", "c2"]);
    expect(resultado.count).toBe(1);
    expect(resultado.isExact).toBe(true);
    expect(resultado.top.map((c) => c.id)).toEqual(["c2"]);
  });

  it("caps the preview list at 5 oldest but reports the full EXACT aging count when under the candidate cap", async () => {
    const rows = Array.from({ length: 7 }, (_, i) => clienteRow(`c${i + 1}`));
    chains.cliente = createChainMock({ data: rows, error: null });
    chains.cliente_interaccion = createChainMock({ data: [], error: null });

    const resultado = await getAgingLeads(true);

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

    const resultado = await getAgingLeads(true);

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

    const resultado = await getAgingLeads(true);

    expect(resultado.isExact).toBe(false);
    expect(resultado.count).toBe(537);
    expect(resultado.top).toHaveLength(5);
  });

  it("falls back to a conservative floor when the head-count query errors after hitting the cap (fix 2)", async () => {
    const rows = Array.from({ length: 200 }, (_, i) => clienteRow(`c${i + 1}`));
    chains.cliente = createChainMock({ data: rows, count: null, error: null });
    chains.cliente_interaccion = createChainMock({ data: [], error: null });

    const resultado = await getAgingLeads(true);

    expect(resultado.isExact).toBe(false);
    expect(resultado.count).toBe(200);
  });
});

describe("getInventarioLotesPorProyecto", () => {
  it("returns an empty inventory without querying when esGlobal is false", async () => {
    const resultado = await getInventarioLotesPorProyecto(false);

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

    const resultado = await getInventarioLotesPorProyecto(true);

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

    const resultado = await getInventarioLotesPorProyecto(true);

    expect(resultado.totales).toEqual({ disponible: 1, reservado: 1, vendido: 1, total: 3, pctVendido: 33 });
  });
});

describe("getAlertasSinGestionarCount", () => {
  it("returns 0 without querying when esGlobal is false", async () => {
    const resultado = await getAlertasSinGestionarCount(false);

    expect(resultado).toBe(0);
    expect(mockSupabase.schema).not.toHaveBeenCalled();
  });

  it("counts unmanaged alerts excluding resolved cuotas/ventas, scoped globally", async () => {
    chains.alerta_cobranza = createChainMock({ data: null, error: null, count: 4 });

    const resultado = await getAlertasSinGestionarCount(true);

    expect(chains.alerta_cobranza.eq).toHaveBeenCalledWith("gestionada", false);
    expect(chains.alerta_cobranza.neq).toHaveBeenCalledWith("cuota.estado", "pagada");
    expect(chains.alerta_cobranza.not).toHaveBeenCalledWith(
      "cuota.venta.estado", "in", '("cancelada","suspendida")',
    );
    expect(resultado).toBe(4);
  });

  it("returns 0 when the count query errors", async () => {
    chains.alerta_cobranza = createChainMock({ data: null, error: new Error("boom"), count: null });

    const resultado = await getAlertasSinGestionarCount(true);

    expect(resultado).toBe(0);
  });
});
