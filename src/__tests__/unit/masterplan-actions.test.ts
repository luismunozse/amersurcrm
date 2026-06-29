import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetUser, mockServerActionClient, createChainMock } = vi.hoisted(() => {
  function createChainMock(finalResult: any = { data: null, error: null }) {
    const chain: any = {};
    for (const m of ["select", "insert", "update", "eq", "single", "maybeSingle"]) {
      chain[m] = vi.fn().mockReturnValue(chain);
    }
    chain.then = (res: any, rej: any) => Promise.resolve(finalResult).then(res, rej);
    return chain;
  }
  const mockGetUser = vi.fn();
  const chains: Record<string, any> = {};
  const mockServerActionClient: any = {
    auth: { getUser: mockGetUser },
    from: vi.fn((t: string) => chains[t] ?? createChainMock()),
    __setChain(t: string, c: any) { chains[t] = c; },
    __reset() { for (const k of Object.keys(chains)) delete chains[k]; },
  };
  return { mockGetUser, mockServerActionClient, createChainMock };
});

vi.mock("@/lib/supabase.server-actions", () => ({
  createServerActionClient: vi.fn().mockResolvedValue(mockServerActionClient),
}));
vi.mock("@/lib/permissions/server", () => ({ requierePermiso: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/app/_actionsNotifications", () => ({ crearNotificacion: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { guardarMasterplanProyecto, guardarPoligonoLote, eliminarPoligonoLote } from "@/app/dashboard/proyectos/_actions";

beforeEach(() => {
  vi.clearAllMocks();
  mockServerActionClient.__reset();
  mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
});

describe("guardarMasterplanProyecto", () => {
  it("actualiza proyecto.masterplan", async () => {
    const chain = createChainMock({ data: null, error: null });
    mockServerActionClient.__setChain("proyecto", chain);
    const mp = { url: "u", path: "p", width: 100, height: 50 };
    const res = await guardarMasterplanProyecto("proj-1", mp);
    expect(res).toEqual({ ok: true });
    expect(chain.update).toHaveBeenCalledWith({ masterplan: mp });
    expect(chain.eq).toHaveBeenCalledWith("id", "proj-1");
  });
});

describe("guardarPoligonoLote", () => {
  it("mergea el polígono en data sin pisar fotos", async () => {
    const chain = createChainMock({ data: { data: { fotos: ["a.jpg"] } }, error: null });
    mockServerActionClient.__setChain("lote", chain);
    const res = await guardarPoligonoLote("lote-1", [[0, 0], [0.1, 0], [0.1, 0.1]]);
    expect(res).toEqual({ ok: true });
    const payload = chain.update.mock.calls[0][0];
    expect(payload.data.fotos).toEqual(["a.jpg"]);
    expect(payload.data.masterplan_poly).toEqual([[0, 0], [0.1, 0], [0.1, 0.1]]);
  });
});

describe("eliminarPoligonoLote", () => {
  it("borra masterplan_poly del data", async () => {
    const chain = createChainMock({ data: { data: { fotos: ["a.jpg"], masterplan_poly: [[0, 0]] } }, error: null });
    mockServerActionClient.__setChain("lote", chain);
    const res = await eliminarPoligonoLote("lote-1");
    expect(res).toEqual({ ok: true });
    const payload = chain.update.mock.calls[0][0];
    expect(payload.data.masterplan_poly).toBeUndefined();
    expect(payload.data.fotos).toEqual(["a.jpg"]);
  });
});
