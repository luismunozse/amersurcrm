import { describe, it, expect, vi } from "vitest";
import {
  fetchMetricasClientes,
  fetchMetricasInventario,
  fetchMetricasVentas,
} from "@/app/dashboard/admin/reportes/actions/metricas-fetchers";

function createChainMock(finalResult: any = { data: null, error: null }) {
  const chain: any = {};
  const methods = [
    "select", "insert", "update", "delete", "eq", "neq", "is", "or",
    "order", "range", "single", "in", "limit", "head", "maybeSingle", "not", "gte", "lte",
  ];
  for (const method of methods) chain[method] = vi.fn().mockReturnValue(chain);
  chain.then = (resolve: any, reject: any) => Promise.resolve(finalResult).then(resolve, reject);
  return chain;
}

function createPagedChainMock(pages: any[][]) {
  const chain: any = {};
  const methods = [
    "select", "eq", "neq", "is", "or", "order", "in", "limit", "head", "maybeSingle", "not", "gte", "lte",
  ];
  for (const method of methods) chain[method] = vi.fn().mockReturnValue(chain);
  let callIndex = 0;
  chain.range = vi.fn().mockImplementation(() => {
    const page = pages[callIndex] ?? [];
    callIndex += 1;
    return Promise.resolve({ data: page, error: null });
  });
  return chain;
}

// `fetchAllRows` calls `.from(table)` fresh once per page (every retry
// rebuilds the whole query), so a naive call-count router breaks as soon as
// a query paginates more than once. These helpers instead return ONE
// persistent chain per logical query (or route by the `.select()` column
// string, which differs per real query), so pagination and interleaving
// across concurrent `Promise.all` fetches never desyncs the mock.

/** `cliente` is queried twice in `fetchMetricasClientes`: once paginated
 * (nuevosRes), once as a single head:true count (totalRes). Both share one
 * persistent chain; `.range()` only ever gets called by the paginated path,
 * `.then()` only ever gets awaited directly by the count path (no `.range()`
 * before it), so the two never collide regardless of call order. */
function createDualClienteChainMock(pages: any[][], totalCount: number) {
  const chain: any = {};
  const methods = ["select", "eq", "neq", "is", "or", "order", "in", "limit", "maybeSingle", "not", "gte", "lte"];
  for (const method of methods) chain[method] = vi.fn().mockReturnValue(chain);
  let pageIdx = 0;
  chain.range = vi.fn().mockImplementation(() => {
    const page = pages[pageIdx] ?? [];
    pageIdx += 1;
    return Promise.resolve({ data: page, error: null });
  });
  chain.then = (resolve: any, reject: any) =>
    Promise.resolve({ data: null, error: null, count: totalCount }).then(resolve, reject);
  return chain;
}

// ============================================================
// fetchMetricasClientes — Strategy B pagination for id-bearing selects
// ============================================================

describe("fetchMetricasClientes — pagination", () => {
  it("computes nuevos/activos id-sets correctly when cliente/interaccion/venta span >1000 rows", async () => {
    const leadIds = Array.from({ length: 1200 }, (_, i) => `c${i}`);
    const leads = leadIds.map((id) => ({ id, estado_cliente: "contactado", fecha_alta: "2026-01-01", vendedor_asignado: "v1" }));
    const interacciones = leadIds.slice(0, 300).map((id) => ({ cliente_id: id }));
    const ventas = leadIds.slice(300, 1200).map((id) => ({ cliente_id: id }));

    const clienteChain = createDualClienteChainMock([leads.slice(0, 1000), leads.slice(1000)], 1200);
    const interaccionChain = createPagedChainMock([interacciones]);
    const ventaChain = createPagedChainMock([ventas.slice(0, 1000), ventas.slice(1000)]);

    const supabase = {
      schema: (_s: string) => ({
        from: (table: string) => {
          if (table === "cliente") return clienteChain;
          if (table === "cliente_interaccion") return interaccionChain;
          if (table === "venta") return ventaChain;
          return createChainMock();
        },
      }),
    } as any;

    const result = await fetchMetricasClientes(supabase, "2026-01-01T00:00:00.000Z", "2026-01-31T23:59:59.999Z");

    expect(result.nuevos).toBe(1200);
    expect(result.totalHistorico).toBe(1200);
    // activos = union of interacciones (300) + ventas (900) cliente ids = all 1200 (no overlap by construction)
    expect(result.activos).toBe(1200);
  });
});

// ============================================================
// fetchMetricasInventario — Strategy A per-estado head counts
// ============================================================

describe("fetchMetricasInventario — exact head counts", () => {
  it("reads vendidas/disponibles from count, not from a bulk .data array length", async () => {
    // `data` is deliberately null/empty on every chain — if the implementation
    // still relied on `.data.length` it would report 0, proving the fix reads
    // `.count` instead (which can legitimately exceed 1000).
    let loteCall = 0;
    let propCall = 0;
    const loteCounts = [2000, 40, 1500, 300]; // total, nuevas, vendido, disponible
    const propCounts = [1800, 25, 1200, 400];

    const supabase = {
      schema: (_s: string) => ({
        from: (table: string) => {
          if (table === "lote") {
            const count = loteCounts[loteCall++];
            return createChainMock({ data: null, error: null, count });
          }
          if (table === "propiedad") {
            const count = propCounts[propCall++];
            return createChainMock({ data: null, error: null, count });
          }
          return createChainMock();
        },
      }),
    } as any;

    const result = await fetchMetricasInventario(supabase, "2026-01-01T00:00:00.000Z", "2026-01-31T23:59:59.999Z");

    expect(result.totalPropiedades).toBe(2000 + 1800);
    expect(result.propiedadesNuevas).toBe(40 + 25);
    expect(result.totalVendidas).toBe(1500 + 1200);
    expect(result.totalDisponibles).toBe(300 + 400);
  });
});

// ============================================================
// fetchMetricasVentas — Strategy B pagination for sum + vendedor grouping
// ============================================================

describe("fetchMetricasVentas — pagination", () => {
  it("sums precio_total and groups by vendedor correctly across >1000 rows", async () => {
    const montosPage1 = Array.from({ length: 1000 }, () => ({ id: "v", precio_total: 100 }));
    const montosPage2 = Array.from({ length: 50 }, () => ({ id: "v", precio_total: 200 }));

    const vendedoresPage1 = Array.from({ length: 1000 }, () => ({ vendedor_username: "juan", precio_total: 100 }));
    const vendedoresPage2 = Array.from({ length: 50 }, () => ({ vendedor_username: "maria", precio_total: 200 }));

    // Pagination re-invokes `.from('venta')` once per page for EACH of the
    // two concurrent queries (montos, vendedores), so a call-count router
    // would desync as soon as either paginates more than once. Route by the
    // `.select()` column string instead — real code selects different
    // columns for each query, so this mirrors production behavior exactly.
    const montosChain = createPagedChainMock([montosPage1, montosPage2]);
    const vendedoresChain = createPagedChainMock([vendedoresPage1, vendedoresPage2]);
    const supabase = {
      schema: (_s: string) => ({
        from: (_table: string) => ({
          select: (cols: string) =>
            (cols.startsWith("vendedor_username") ? vendedoresChain : montosChain).select(cols),
        }),
      }),
    } as any;

    const result = await fetchMetricasVentas(supabase, "2026-01-01T00:00:00.000Z", "2026-01-31T23:59:59.999Z");

    // 1000*100 + 50*200 = 100000 + 10000 = 110000
    expect(result.valorVentasRegistradas).toBe(110000);
    expect(result.cantidadVentas).toBe(1050);
    expect(result.ventasPorVendedor.get("juan")).toEqual({ ventas: 100000, propiedades: 1000 });
    expect(result.ventasPorVendedor.get("maria")).toEqual({ ventas: 10000, propiedades: 50 });
  });
});
