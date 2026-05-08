import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetUser, mockServerActionClient, createChainMock, mockEsAdmin, mockTienePermiso } = vi.hoisted(() => {
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

  const mockGetUser = vi.fn();
  const mockEsAdmin = vi.fn();
  const mockTienePermiso = vi.fn();

  const publicChains: Record<string, any> = {};

  const mockServerActionClient: any = {
    auth: { getUser: mockGetUser },
    from: vi.fn((table: string) => publicChains[table] ?? createChainMock()),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    __setPublicChain(table: string, chain: any) { publicChains[table] = chain; },
    __reset() {
      for (const k of Object.keys(publicChains)) delete publicChains[k];
    },
  };

  return { mockGetUser, mockServerActionClient, createChainMock, mockEsAdmin, mockTienePermiso };
});

vi.mock("@/lib/supabase.server-actions", () => ({
  createServerActionClient: vi.fn().mockImplementation(() => Promise.resolve(mockServerActionClient)),
}));

vi.mock("@/lib/permissions/server", () => ({
  esAdmin: mockEsAdmin,
  tienePermiso: mockTienePermiso,
  requierePermiso: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/permissions", () => ({
  PERMISOS: {
    COMISIONES: { VER_TODAS: "comisiones.ver_todas", VER_PROPIAS: "comisiones.ver_propias" },
  },
}));

vi.mock("@/app/dashboard/clientes/_actions-crm-helpers", () => ({
  obtenerUsernameActual: vi.fn().mockImplementation(async () => ({
    success: true,
    username: "admin1",
    userId: "uid-1",
  })),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import {
  obtenerComisiones,
  obtenerResumenComisiones,
  aprobarComision,
  pagarComision,
  anularComision,
  generarComisionVenta,
} from "@/app/dashboard/comisiones/_actions-comisiones";

beforeEach(() => {
  vi.clearAllMocks();
  mockServerActionClient.__reset();
  mockGetUser.mockResolvedValue({ data: { user: { id: "uid-1" } } });
  mockEsAdmin.mockResolvedValue(false);
  mockTienePermiso.mockResolvedValue(true);
});

// ============================================================
// obtenerComisiones
// ============================================================

describe("obtenerComisiones", () => {
  it("retorna lista vacia si no hay comisiones", async () => {
    mockTienePermiso.mockResolvedValue(true);
    const chain = createChainMock({ data: [], error: null });
    mockServerActionClient.__setPublicChain("comision", chain);

    const res = await obtenerComisiones();
    expect(res.success).toBe(true);
    expect(res.data).toEqual([]);
  });

  it("aplica filtro de estado", async () => {
    mockTienePermiso.mockResolvedValue(true);
    const chain = createChainMock({ data: [], error: null });
    mockServerActionClient.__setPublicChain("comision", chain);

    await obtenerComisiones({ estado: "pendiente" });
    expect(chain.eq).toHaveBeenCalledWith("estado", "pendiente");
  });

  it("filtra por beneficiario propio si no tiene VER_TODAS", async () => {
    mockTienePermiso.mockResolvedValue(false);
    const chain = createChainMock({ data: [], error: null });
    mockServerActionClient.__setPublicChain("comision", chain);

    await obtenerComisiones();
    expect(chain.eq).toHaveBeenCalledWith("beneficiario_username", "admin1");
  });

  it("aplana joins anidados de venta/cliente/lote/proyecto", async () => {
    mockTienePermiso.mockResolvedValue(true);
    const chain = createChainMock({
      data: [
        {
          id: "c-1",
          venta: [
            {
              codigo_venta: "VTA-2026-0001",
              cliente_id: "cl-1",
              cliente: [{ nombre: "Juan" }],
              lote: [{ codigo: "A1", proyecto: [{ nombre: "Sol" }] }],
            },
          ],
        },
      ],
      error: null,
    });
    mockServerActionClient.__setPublicChain("comision", chain);

    const res = await obtenerComisiones();
    expect(res.success).toBe(true);
    expect(res.data?.[0].venta?.codigo_venta).toBe("VTA-2026-0001");
    expect(res.data?.[0].venta?.cliente?.nombre).toBe("Juan");
    expect(res.data?.[0].venta?.lote?.codigo).toBe("A1");
    expect(res.data?.[0].venta?.lote?.proyecto?.nombre).toBe("Sol");
  });
});

// ============================================================
// obtenerResumenComisiones
// ============================================================

describe("obtenerResumenComisiones", () => {
  it("agrupa por estado y suma montos", async () => {
    mockTienePermiso.mockResolvedValue(true);
    const chain = createChainMock({
      data: [
        { estado: "pendiente", monto: 1000 },
        { estado: "pendiente", monto: 500 },
        { estado: "aprobada", monto: 2000 },
        { estado: "pagada", monto: 800 },
        { estado: "anulada", monto: 300 },
      ],
      error: null,
    });
    mockServerActionClient.__setPublicChain("comision", chain);

    const res = await obtenerResumenComisiones();
    expect(res.success).toBe(true);
    expect(res.data?.total).toBe(5);
    expect(res.data?.pendiente.count).toBe(2);
    expect(res.data?.pendiente.monto).toBe(1500);
    expect(res.data?.aprobada.count).toBe(1);
    expect(res.data?.aprobada.monto).toBe(2000);
    expect(res.data?.pagada.count).toBe(1);
    expect(res.data?.anulada.monto).toBe(300);
  });

  it("filtra a propias si no tiene VER_TODAS", async () => {
    mockTienePermiso.mockResolvedValue(false);
    const chain = createChainMock({ data: [], error: null });
    mockServerActionClient.__setPublicChain("comision", chain);

    await obtenerResumenComisiones();
    expect(chain.eq).toHaveBeenCalledWith("beneficiario_username", "admin1");
  });
});

// ============================================================
// aprobarComision
// ============================================================

describe("aprobarComision", () => {
  it("rechaza sin comisionId", async () => {
    const res = await aprobarComision("");
    expect(res.success).toBe(false);
  });

  it("rechaza si no es admin", async () => {
    mockEsAdmin.mockResolvedValue(false);
    const res = await aprobarComision("c-1");
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/admin/i);
    expect(mockServerActionClient.rpc).not.toHaveBeenCalled();
  });

  it("invoca RPC aprobar_comision si es admin", async () => {
    mockEsAdmin.mockResolvedValue(true);
    mockServerActionClient.rpc.mockResolvedValue({ data: true, error: null });

    const res = await aprobarComision("c-1");
    expect(res.success).toBe(true);
    expect(mockServerActionClient.rpc).toHaveBeenCalledWith(
      "aprobar_comision",
      expect.objectContaining({ p_comision_id: "c-1", p_username: "admin1" }),
    );
  });

  it("propaga error del RPC", async () => {
    mockEsAdmin.mockResolvedValue(true);
    mockServerActionClient.rpc.mockResolvedValue({
      data: null,
      error: { message: "Solo se pueden aprobar comisiones pendientes" },
    });

    const res = await aprobarComision("c-1");
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/pendientes/);
  });
});

// ============================================================
// pagarComision
// ============================================================

describe("pagarComision", () => {
  it("rechaza sin comisionId", async () => {
    const res = await pagarComision({ comisionId: "", metodoPago: "transferencia" });
    expect(res.success).toBe(false);
  });

  it("rechaza sin metodoPago", async () => {
    const res = await pagarComision({ comisionId: "c-1", metodoPago: "" });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/[Mm]etodo|método/);
  });

  it("rechaza si no es admin", async () => {
    mockEsAdmin.mockResolvedValue(false);
    const res = await pagarComision({ comisionId: "c-1", metodoPago: "transferencia" });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/admin/i);
  });

  it("invoca RPC con todos los parametros", async () => {
    mockEsAdmin.mockResolvedValue(true);
    mockServerActionClient.rpc.mockResolvedValue({ data: true, error: null });

    await pagarComision({
      comisionId: "c-1",
      metodoPago: "transferencia",
      comprobanteUrl: "https://ex/comp.pdf",
      notas: "Pago batch enero",
    });

    expect(mockServerActionClient.rpc).toHaveBeenCalledWith(
      "pagar_comision",
      expect.objectContaining({
        p_comision_id: "c-1",
        p_username: "admin1",
        p_metodo_pago: "transferencia",
        p_comprobante_url: "https://ex/comp.pdf",
        p_notas: "Pago batch enero",
      }),
    );
  });

  it("usa null para comprobante y notas si no se pasan", async () => {
    mockEsAdmin.mockResolvedValue(true);
    mockServerActionClient.rpc.mockResolvedValue({ data: true, error: null });

    await pagarComision({ comisionId: "c-1", metodoPago: "efectivo" });

    expect(mockServerActionClient.rpc).toHaveBeenCalledWith(
      "pagar_comision",
      expect.objectContaining({ p_comprobante_url: null, p_notas: null }),
    );
  });
});

// ============================================================
// anularComision
// ============================================================

describe("anularComision", () => {
  it("rechaza sin comisionId", async () => {
    const res = await anularComision("", "Motivo");
    expect(res.success).toBe(false);
  });

  it("rechaza sin motivo", async () => {
    const res = await anularComision("c-1", "");
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/[Mm]otivo/);
  });

  it("rechaza motivo solo whitespace", async () => {
    const res = await anularComision("c-1", "   ");
    expect(res.success).toBe(false);
  });

  it("rechaza si no es admin", async () => {
    mockEsAdmin.mockResolvedValue(false);
    const res = await anularComision("c-1", "Motivo");
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/admin/i);
  });

  it("invoca RPC con motivo trimmed", async () => {
    mockEsAdmin.mockResolvedValue(true);
    mockServerActionClient.rpc.mockResolvedValue({ data: true, error: null });

    await anularComision("c-1", "  Error de calculo  ");
    expect(mockServerActionClient.rpc).toHaveBeenCalledWith(
      "anular_comision",
      expect.objectContaining({ p_motivo: "Error de calculo" }),
    );
  });

  it("propaga error 'ya pagada' del RPC", async () => {
    mockEsAdmin.mockResolvedValue(true);
    mockServerActionClient.rpc.mockResolvedValue({
      data: null,
      error: { message: "No se puede anular una comision ya pagada" },
    });

    const res = await anularComision("c-1", "Motivo");
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/pagada/);
  });
});

// ============================================================
// generarComisionVenta (manual)
// ============================================================

describe("generarComisionVenta", () => {
  it("rechaza sin ventaId", async () => {
    const res = await generarComisionVenta("");
    expect(res.success).toBe(false);
  });

  it("rechaza si no es admin", async () => {
    mockEsAdmin.mockResolvedValue(false);
    const res = await generarComisionVenta("v-1");
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/admin/i);
  });

  it("retorna comisionId del RPC", async () => {
    mockEsAdmin.mockResolvedValue(true);
    mockServerActionClient.rpc.mockResolvedValue({ data: "com-uuid-123", error: null });

    const res = await generarComisionVenta("v-1");
    expect(res.success).toBe(true);
    expect(res.data?.comisionId).toBe("com-uuid-123");
  });
});
