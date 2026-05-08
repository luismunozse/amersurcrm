import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetUser, mockServerActionClient, createChainMock, mockEsAdmin } = vi.hoisted(() => {
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

  const publicChains: Record<string, any> = {};
  const schemaChains: Record<string, Record<string, any>> = {};

  const mockServerActionClient: any = {
    auth: { getUser: mockGetUser },
    from: vi.fn((table: string) => publicChains[table] ?? createChainMock()),
    schema: vi.fn((schemaName: string) => ({
      from: vi.fn((table: string) => schemaChains[schemaName]?.[table] ?? createChainMock()),
    })),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    __setPublicChain(table: string, chain: any) { publicChains[table] = chain; },
    __setSchemaChain(schemaName: string, table: string, chain: any) {
      if (!schemaChains[schemaName]) schemaChains[schemaName] = {};
      schemaChains[schemaName][table] = chain;
    },
    __reset() {
      for (const k of Object.keys(publicChains)) delete publicChains[k];
      for (const k of Object.keys(schemaChains)) delete schemaChains[k];
    },
  };

  return { mockGetUser, mockServerActionClient, createChainMock, mockEsAdmin };
});

vi.mock("@/lib/supabase.server-actions", () => ({
  createServerActionClient: vi.fn().mockImplementation(() => Promise.resolve(mockServerActionClient)),
}));

vi.mock("@/lib/permissions/server", () => ({
  esAdmin: mockEsAdmin,
  tienePermiso: vi.fn().mockResolvedValue(true),
  requierePermiso: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/permissions", () => ({
  PERMISOS: {
    PAGOS: { REGISTRAR: "pagos.registrar", VER_TODOS: "pagos.ver_todos" },
    CUOTAS: { GESTIONAR: "cuotas.gestionar" },
  },
}));

vi.mock("@/app/dashboard/clientes/_actions-crm-helpers", () => ({
  obtenerUsernameActual: vi.fn().mockImplementation(async () => ({
    success: true,
    username: "admin1",
    userId: "uid-1",
  })),
  validarMonto: vi.fn().mockReturnValue({ valid: true }),
  revalidarCliente: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import {
  obtenerPagosCuota,
  anularPago,
} from "@/app/dashboard/clientes/_actions-cuotas";

beforeEach(() => {
  vi.clearAllMocks();
  mockServerActionClient.__reset();
  mockGetUser.mockResolvedValue({ data: { user: { id: "uid-1" } } });
  mockEsAdmin.mockResolvedValue(false);
});

// ============================================================
// obtenerPagosCuota
// ============================================================

describe("obtenerPagosCuota", () => {
  it("rechaza sin cuotaId", async () => {
    const res = await obtenerPagosCuota("");
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/ID/);
  });

  it("retorna lista de pagos (incluye anulados)", async () => {
    const pagosChain = createChainMock({
      data: [
        { id: "p-1", cuota_id: "c-1", monto: 1000, anulado: false, registrado_por: "v1", created_at: "2026-05-01" },
        { id: "p-2", cuota_id: "c-1", monto: 500, anulado: true, anulado_por: "admin1", motivo_anulacion: "Error", created_at: "2026-04-30" },
      ],
      error: null,
    });
    mockServerActionClient.__setPublicChain("pago", pagosChain);

    const res = await obtenerPagosCuota("c-1");
    expect(res.success).toBe(true);
    expect(res.data).toHaveLength(2);
  });

  it("retorna lista vacia si la cuota no tiene pagos", async () => {
    const pagosChain = createChainMock({ data: [], error: null });
    mockServerActionClient.__setPublicChain("pago", pagosChain);

    const res = await obtenerPagosCuota("c-1");
    expect(res.success).toBe(true);
    expect(res.data).toEqual([]);
  });

  it("propaga error de DB", async () => {
    const pagosChain = createChainMock({ data: null, error: { message: "DB down" } });
    mockServerActionClient.__setPublicChain("pago", pagosChain);

    const res = await obtenerPagosCuota("c-1");
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/DB down/);
  });
});

// ============================================================
// anularPago
// ============================================================

describe("anularPago: validaciones", () => {
  it("rechaza sin pagoId", async () => {
    const res = await anularPago("", "Motivo");
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/ID/);
  });

  it("rechaza sin motivo", async () => {
    const res = await anularPago("p-1", "");
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/[Mm]otivo/);
  });

  it("rechaza motivo solo whitespace", async () => {
    const res = await anularPago("p-1", "    ");
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/[Mm]otivo/);
  });
});

describe("anularPago: autorizacion", () => {
  it("rechaza si usuario no es admin", async () => {
    mockEsAdmin.mockResolvedValue(false);
    const res = await anularPago("p-1", "Cliente desistio");
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/administrador/i);
    // No debe llamar al RPC si rechazo por permisos
    expect(mockServerActionClient.rpc).not.toHaveBeenCalled();
  });

  it("permite a admin invocar RPC", async () => {
    mockEsAdmin.mockResolvedValue(true);
    mockServerActionClient.rpc.mockResolvedValue({
      data: { pago_id: "p-1", cuota_id: "c-1", venta_id: "v-1", monto_revertido: 500 },
      error: null,
    });

    const res = await anularPago("p-1", "Error de carga");
    expect(res.success).toBe(true);
    expect(mockServerActionClient.rpc).toHaveBeenCalledWith(
      "anular_pago",
      expect.objectContaining({
        p_pago_id: "p-1",
        p_motivo: "Error de carga",
      }),
    );
  });
});

describe("anularPago: flujo OK", () => {
  it("retorna venta_id y cuota_id del RPC", async () => {
    mockEsAdmin.mockResolvedValue(true);
    mockServerActionClient.rpc.mockResolvedValue({
      data: {
        pago_id: "p-99",
        cuota_id: "c-7",
        venta_id: "v-3",
        monto_revertido: 1500,
        cuota_estado: "parcial",
        venta_saldo_actualizado: 50000,
      },
      error: null,
    });

    const res = await anularPago("p-99", "Pago duplicado");
    expect(res.success).toBe(true);
    expect(res.data?.ventaId).toBe("v-3");
    expect(res.data?.cuotaId).toBe("c-7");
  });

  it("propaga error del RPC", async () => {
    mockEsAdmin.mockResolvedValue(true);
    mockServerActionClient.rpc.mockResolvedValue({
      data: null,
      error: { message: "El pago ya fue anulado" },
    });

    const res = await anularPago("p-1", "Motivo");
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/anulado/);
  });

  it("normaliza motivo trim antes de enviar a RPC", async () => {
    mockEsAdmin.mockResolvedValue(true);
    mockServerActionClient.rpc.mockResolvedValue({
      data: { pago_id: "p-1", cuota_id: null, venta_id: "v-1", monto_revertido: 100 },
      error: null,
    });

    await anularPago("p-1", "  Error de ingreso  ");
    expect(mockServerActionClient.rpc).toHaveBeenCalledWith(
      "anular_pago",
      expect.objectContaining({ p_motivo: "Error de ingreso" }),
    );
  });

  it("maneja respuesta del RPC con cuota_id null (pago sin cuota)", async () => {
    mockEsAdmin.mockResolvedValue(true);
    mockServerActionClient.rpc.mockResolvedValue({
      data: { pago_id: "p-1", cuota_id: null, venta_id: "v-1", monto_revertido: 200 },
      error: null,
    });

    const res = await anularPago("p-1", "Motivo");
    expect(res.success).toBe(true);
    expect(res.data?.cuotaId).toBeNull();
  });
});
