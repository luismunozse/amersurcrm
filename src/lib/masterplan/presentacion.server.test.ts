import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockServerOnlyClient, createChainMock } = vi.hoisted(() => {
  function createChainMock(finalResult: unknown = { data: null, error: null }) {
    const chain: Record<string, unknown> = {};
    for (const m of ["select", "eq", "maybeSingle"]) {
      chain[m] = vi.fn().mockReturnValue(chain);
    }
    (chain as { then: unknown }).then = (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) =>
      Promise.resolve(finalResult).then(res, rej);
    return chain;
  }
  const chains: Record<string, unknown> = {};
  const mockServerOnlyClient = {
    from: vi.fn((t: string) => chains[t] ?? createChainMock()),
    __setChain(t: string, c: unknown) {
      chains[t] = c;
    },
    __reset() {
      for (const k of Object.keys(chains)) delete chains[k];
    },
  };
  return { mockServerOnlyClient, createChainMock };
});

vi.mock("@/lib/supabase.server", () => ({
  createServerOnlyClient: vi.fn().mockResolvedValue(mockServerOnlyClient),
}));

import { buildPlanoPresentacion } from "./presentacion.server";

beforeEach(() => {
  vi.clearAllMocks();
  mockServerOnlyClient.__reset();
});

describe("buildPlanoPresentacion", () => {
  it("returns null when the proyecto has no masterplan.url", async () => {
    mockServerOnlyClient.__setChain("proyecto", createChainMock({ data: { masterplan: null }, error: null }));

    expect(await buildPlanoPresentacion("p1")).toBeNull();
  });

  it("returns null when the proyecto row is not found", async () => {
    mockServerOnlyClient.__setChain("proyecto", createChainMock({ data: null, error: null }));

    expect(await buildPlanoPresentacion("p1")).toBeNull();
  });

  it("throws when the proyecto query errors", async () => {
    mockServerOnlyClient.__setChain("proyecto", createChainMock({ data: null, error: { message: "boom" } }));

    await expect(buildPlanoPresentacion("p1")).rejects.toBeTruthy();
  });

  it("builds the DTO mapping sup_m2/manzana/etapa and never leaks precio/moneda", async () => {
    mockServerOnlyClient.__setChain(
      "proyecto",
      createChainMock({ data: { masterplan: { url: "https://img/masterplan.png", path: "p", width: 800, height: 600 } }, error: null }),
    );
    mockServerOnlyClient.__setChain(
      "lote",
      createChainMock({
        data: [
          {
            id: "l1",
            codigo: "A1",
            estado: "disponible",
            sup_m2: 120,
            precio: 99999,
            moneda: "USD",
            data: { manzana: "A", etapa: "1", masterplan_poly: [[0, 0], [0.1, 0], [0.1, 0.1]] },
          },
          {
            id: "l2",
            codigo: "B2",
            estado: "vendido",
            sup_m2: null,
            data: {},
          },
        ],
        error: null,
      }),
    );

    const dto = await buildPlanoPresentacion("p1");

    expect(dto).toEqual({
      imageUrl: "https://img/masterplan.png",
      width: 800,
      height: 600,
      lotes: [
        { id: "l1", codigo: "A1", estado: "disponible", area: 120, manzana: "A", etapa: "1", poly: [[0, 0], [0.1, 0], [0.1, 0.1]] },
        { id: "l2", codigo: "B2", estado: "vendido", area: null, manzana: null, etapa: null, poly: null },
      ],
    });

    const serialized = JSON.stringify(dto);
    expect(serialized).not.toContain("99999");
    expect(serialized.toLowerCase()).not.toContain("precio");
    expect(serialized.toLowerCase()).not.toContain("moneda");
  });
});
