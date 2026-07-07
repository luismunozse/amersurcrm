import { describe, it, expect, vi } from "vitest";

// funnel.ts wraps `_fetchFunnel` with `buildCachedReportFetcher` at module
// top-level, which calls `unstable_cache` from `next/cache` at import time.
// The global `vitest.setup.ts` mock only stubs `revalidatePath`/`revalidateTag`,
// so importing funnel.ts here needs its own identity-passthrough override
// (documented gotcha from PR1a apply-progress, precedent:
// `cobranza-gestion-action.test.ts`).
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  unstable_cache: (fn: any) => fn,
}));

import { _fetchFunnel } from "@/app/dashboard/admin/reportes/actions/funnel";

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

function buildSupabase(tables: Record<string, any[][]>) {
  const chains: Record<string, any> = {};
  for (const [table, pages] of Object.entries(tables)) {
    chains[table] = createPagedChainMock(pages);
  }
  return {
    schema: (_schemaName: string) => ({
      from: (table: string) => chains[table] ?? createPagedChainMock([[]]),
    }),
  } as any;
}

describe("_fetchFunnel", () => {
  it("counts totalLeads correctly when cliente spans >1000 rows across 2 mocked pages", async () => {
    const page1 = Array.from({ length: 1000 }, (_, i) => ({ id: `c${i}`, estado_cliente: "contactado" }));
    const page2 = Array.from({ length: 50 }, (_, i) => ({ id: `c${1000 + i}`, estado_cliente: "contactado" }));

    const supabase = buildSupabase({
      cliente: [page1, page2],
      cliente_interaccion: [[]],
      visita_propiedad: [[]],
      reserva: [[]],
      venta: [[]],
    });

    const data = await _fetchFunnel(supabase, "2026-01-01T00:00:00.000Z", "2026-01-31T23:59:59.999Z");

    expect(data.totalLeads).toBe(1050);
  });

  it("counts contactados membership correctly when both cliente and cliente_interaccion span >1000 rows", async () => {
    const leadIds = Array.from({ length: 1200 }, (_, i) => `c${i}`);
    const leads = leadIds.map((id) => ({ id, estado_cliente: "contactado" }));
    const interacciones = leadIds.map((id) => ({ cliente_id: id }));

    const supabase = buildSupabase({
      cliente: [leads.slice(0, 1000), leads.slice(1000)],
      cliente_interaccion: [interacciones.slice(0, 1000), interacciones.slice(1000)],
      visita_propiedad: [[]],
      reserva: [[]],
      venta: [[]],
    });

    const data = await _fetchFunnel(supabase, "2026-01-01T00:00:00.000Z", "2026-01-31T23:59:59.999Z");

    const contactadosEtapa = data.etapas.find((e) => e.id === "contactados");
    expect(contactadosEtapa?.cantidad).toBe(1200);
  });

  it("sums valorVentas correctly when venta spans >1000 rows across 2 mocked pages", async () => {
    const leadIds = Array.from({ length: 1100 }, (_, i) => `c${i}`);
    const leads = leadIds.map((id) => ({ id, estado_cliente: "propietario" }));
    const ventasPage1 = leadIds.slice(0, 1000).map((id) => ({ cliente_id: id, precio_total: 100 }));
    const ventasPage2 = leadIds.slice(1000).map((id) => ({ cliente_id: id, precio_total: 200 }));

    const supabase = buildSupabase({
      cliente: [leads],
      cliente_interaccion: [[]],
      visita_propiedad: [[]],
      reserva: [[]],
      venta: [ventasPage1, ventasPage2],
    });

    const data = await _fetchFunnel(supabase, "2026-01-01T00:00:00.000Z", "2026-01-31T23:59:59.999Z");

    // 1000 ventas @ 100 + 100 ventas @ 200 = 100000 + 20000 = 120000
    expect(data.valorVentas).toBe(120000);
    expect(data.totalVentas).toBe(1100);
  });
});
