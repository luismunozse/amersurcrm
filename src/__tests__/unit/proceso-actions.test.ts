import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetUser, mockServerActionClient, createChainMock } = vi.hoisted(() => {
  function createChainMock(finalResult: any = { data: null, error: null }) {
    const chain: any = {};
    const methods = ["select", "insert", "update", "delete", "eq", "neq", "is", "or", "order", "range", "single", "in", "limit", "head", "maybeSingle", "not", "gte", "lte"];
    for (const method of methods) { chain[method] = vi.fn().mockReturnValue(chain); }
    chain.single.mockImplementation(() => Promise.resolve(finalResult));
    chain.maybeSingle.mockImplementation(() => Promise.resolve(finalResult));
    chain.order.mockImplementation(() => Promise.resolve(finalResult));
    chain.range.mockImplementation(() => Promise.resolve(finalResult));
    return chain;
  }
  const mockGetUser = vi.fn();
  const mockServerActionClient = {
    auth: { getUser: mockGetUser },
    from: vi.fn().mockReturnValue(createChainMock()),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
  return { mockGetUser, mockServerActionClient, createChainMock };
});

vi.mock("@/lib/supabase.server-actions", () => ({
  createServerActionClient: vi.fn().mockImplementation(() => Promise.resolve(mockServerActionClient)),
}));
vi.mock("@/lib/permissions/server", () => ({
  requierePermiso: vi.fn().mockResolvedValue(undefined),
  tienePermiso: vi.fn().mockResolvedValue(true),
  esAdminOCoordinador: vi.fn().mockResolvedValue(false),
  esAdmin: vi.fn().mockResolvedValue(false),
  esAdminOGerente: vi.fn().mockResolvedValue(false),
}));
vi.mock("@/lib/permissions", () => ({
  PERMISOS: { VENTAS: { VER_TODAS: "ventas.ver_todas", CREAR: "ventas.crear" } },
}));
vi.mock("@/app/dashboard/clientes/_actions-crm-helpers", () => ({
  obtenerUsernameActual: vi.fn().mockResolvedValue({ success: true, username: "vendedor1", userId: "uid-1" }),
  revalidarCliente: vi.fn(),
}));

import { esAdminOGerente } from "@/lib/permissions/server";

import {
  obtenerProcesos,
  obtenerProcesosCliente,
  obtenerResumenPipeline,
  toggleChecklistItem,
  avanzarEtapa,
  cancelarProceso,
} from "@/app/dashboard/adquisicion/_actions-proceso";

describe("obtenerProcesos", () => {
  beforeEach(() => { vi.clearAllMocks(); mockGetUser.mockResolvedValue({ data: { user: { id: "uid-1" } } }); });

  it("llama a supabase from('proceso_adquisicion')", async () => {
    const chain = createChainMock();
    chain.range.mockImplementation(() => Promise.resolve({ data: [], error: null }));
    chain.order.mockReturnValue(chain);
    mockServerActionClient.from.mockReturnValue(chain);

    await obtenerProcesos();
    expect(mockServerActionClient.from).toHaveBeenCalledWith("proceso_adquisicion");
  });

  it("maneja error al obtener procesos", async () => {
    const chain = createChainMock();
    chain.range.mockImplementation(() => Promise.resolve({ data: null, error: { message: "DB error" } }));
    chain.order.mockReturnValue(chain);
    mockServerActionClient.from.mockReturnValue(chain);

    const result = await obtenerProcesos();
    expect(result.success).toBe(false);
  });
});

describe("obtenerProcesosCliente", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("obtiene procesos de un cliente", async () => {
    const chain = createChainMock();
    chain.order.mockImplementation(() => Promise.resolve({ data: [{ id: "p-1" }], error: null }));
    mockServerActionClient.from.mockReturnValue(chain);

    const result = await obtenerProcesosCliente("c-1");
    expect(result.success).toBe(true);
  });
});

describe("obtenerResumenPipeline", () => {
  beforeEach(() => { vi.clearAllMocks(); mockGetUser.mockResolvedValue({ data: { user: { id: "uid-1" } } }); });

  it("obtiene resumen del pipeline", async () => {
    mockServerActionClient.rpc.mockResolvedValue({
      data: { separacion: 5, calificacion: 3, contrato: 2, desembolso: 1 },
      error: null,
    });

    const result = await obtenerResumenPipeline();
    expect(result.success).toBe(true);
  });
});

describe("toggleChecklistItem", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("marca item como completado", async () => {
    const chain = createChainMock({ data: { id: "ci-1", completado: true }, error: null });
    mockServerActionClient.from.mockReturnValue(chain);

    const result = await toggleChecklistItem("ci-1", true);
    expect(result.success).toBe(true);
    expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({ completado: true }));
  });

  it("desmarca item", async () => {
    const chain = createChainMock({ data: { id: "ci-1", completado: false }, error: null });
    mockServerActionClient.from.mockReturnValue(chain);

    const result = await toggleChecklistItem("ci-1", false);
    expect(result.success).toBe(true);
  });
});

describe("avanzarEtapa", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("avanza proceso a siguiente etapa cuando checklist completo", async () => {
    // Mock: proceso con etapas y checklist completado
    const proceso = {
      id: "p-1",
      etapa_actual: "separacion",
      etapas: [
        { etapa: "separacion", orden: 1, checklist: [{ id: "ci-1", obligatorio: true, completado: true }] },
        { etapa: "calificacion", orden: 2, checklist: [] },
      ],
    };
    const chain = createChainMock({ data: proceso, error: null });
    mockServerActionClient.from.mockReturnValue(chain);

    const result = await avanzarEtapa("p-1");
    expect(result.success).toBe(true);
  });

  it("rechaza avance con checklist incompleto", async () => {
    const proceso = {
      id: "p-1",
      etapa_actual: "separacion",
      etapas: [
        { etapa: "separacion", orden: 1, checklist: [{ id: "ci-1", obligatorio: true, completado: false }] },
        { etapa: "calificacion", orden: 2, checklist: [] },
      ],
    };
    const chain = createChainMock({ data: proceso, error: null });
    mockServerActionClient.from.mockReturnValue(chain);

    const result = await avanzarEtapa("p-1");
    expect(result.success).toBe(false);
  });
});

describe("cancelarProceso", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  // Updated: cancellation now requires ROL_ADMIN or ROL_GERENTE.
  it("cancela proceso con motivo (admin/gerente authorized)", async () => {
    vi.mocked(esAdminOGerente).mockResolvedValueOnce(true);
    const chain = createChainMock({ data: null, error: null });
    // FIX 7: cancelarProceso now calls .select('id') as terminal — mock it to return a row
    chain.select.mockImplementation(() => Promise.resolve({ data: [{ id: "p-1" }], error: null }));
    mockServerActionClient.from.mockReturnValue(chain);

    const result = await cancelarProceso("p-1", "Cliente desistió");
    expect(result.success).toBe(true);
  });

  // vendor/coordinator without ROL_ADMIN or ROL_GERENTE must be rejected before any DB write
  it("rejects non-admin/gerente callers without any DB write", async () => {
    vi.mocked(esAdminOGerente).mockResolvedValueOnce(false);

    const result = await cancelarProceso("p-1", "motivo");

    expect(result.success).toBe(false);
    expect((result as any).error).toBeTruthy();
    expect(mockServerActionClient.from).not.toHaveBeenCalled();
  });

  // authorized cancel must persist audit columns: cancelado_por, fecha_cancelacion, motivo_cancelacion
  it("authorized cancel writes cancelado_por, fecha_cancelacion, motivo_cancelacion", async () => {
    vi.mocked(esAdminOGerente).mockResolvedValueOnce(true);
    const chain = createChainMock({ data: null, error: null });
    // FIX 7: cancelarProceso now calls .select('id') as terminal — mock it to return a row
    chain.select.mockImplementation(() => Promise.resolve({ data: [{ id: "p-1" }], error: null }));
    mockServerActionClient.from.mockReturnValue(chain);

    const result = await cancelarProceso("p-1", "test motivo");

    expect(result.success).toBe(true);
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        cancelado_por: "uid-1",
        fecha_cancelacion: expect.any(String),
        motivo_cancelacion: "test motivo",
      })
    );
  });
});
