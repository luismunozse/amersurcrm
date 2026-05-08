import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetUser, mockServerActionClient, createChainMock, mockEsAdmin, mockEsAdminOCoord } = vi.hoisted(() => {
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
  const mockEsAdminOCoord = vi.fn();

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

  return { mockGetUser, mockServerActionClient, createChainMock, mockEsAdmin, mockEsAdminOCoord };
});

vi.mock("@/lib/supabase.server-actions", () => ({
  createServerActionClient: vi.fn().mockImplementation(() => Promise.resolve(mockServerActionClient)),
}));

vi.mock("@/lib/permissions/server", () => ({
  esAdmin: mockEsAdmin,
  esAdminOCoordinador: mockEsAdminOCoord,
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import {
  obtenerDatosProformaParaSeparacion,
  registrarSeparacion,
} from "@/app/dashboard/clientes/[id]/_actions-separacion";

beforeEach(() => {
  vi.clearAllMocks();
  mockServerActionClient.__reset();
  mockGetUser.mockResolvedValue({ data: { user: { id: "uid-1" } } });
  mockEsAdmin.mockResolvedValue(false);
  mockEsAdminOCoord.mockResolvedValue(true);
});

// ============================================================
// obtenerDatosProformaParaSeparacion
// ============================================================

describe("obtenerDatosProformaParaSeparacion: validaciones", () => {
  it("rechaza sin proformaId", async () => {
    const res = await obtenerDatosProformaParaSeparacion("");
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/ID/);
  });

  it("rechaza si proforma no existe", async () => {
    const chain = createChainMock({ data: null, error: null });
    mockServerActionClient.__setSchemaChain("crm", "proforma", chain);

    const res = await obtenerDatosProformaParaSeparacion("p-x");
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/no encontrada/i);
  });

  it("rechaza si proforma no esta aprobada", async () => {
    const chain = createChainMock({
      data: {
        id: "p-1",
        estado: "borrador",
        cliente_id: "c-1",
        lote_id: "l-1",
        moneda: "PEN",
        total: 100000,
        datos: {},
        comentarios: null,
        reserva_id: null,
        lote: { codigo: "A1", proyecto: { nombre: "Sol" } },
      },
      error: null,
    });
    mockServerActionClient.__setSchemaChain("crm", "proforma", chain);

    const res = await obtenerDatosProformaParaSeparacion("p-1");
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/aprobadas/i);
  });

  it("rechaza si proforma no tiene lote_id", async () => {
    const chain = createChainMock({
      data: {
        id: "p-1",
        estado: "aprobada",
        cliente_id: "c-1",
        lote_id: null,
        moneda: "PEN",
        total: 100000,
        datos: {},
        comentarios: null,
        reserva_id: null,
      },
      error: null,
    });
    mockServerActionClient.__setSchemaChain("crm", "proforma", chain);

    const res = await obtenerDatosProformaParaSeparacion("p-1");
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/unidad/i);
  });
});

describe("obtenerDatosProformaParaSeparacion: idempotencia", () => {
  it("retorna yaConvertida si la proforma ya tiene reserva_id", async () => {
    const chain = createChainMock({
      data: {
        id: "p-1",
        estado: "convertida",
        cliente_id: "c-1",
        lote_id: "l-1",
        moneda: "PEN",
        total: 100000,
        datos: {},
        comentarios: null,
        reserva_id: "r-EXISTENTE",
        lote: null,
      },
      error: null,
    });
    mockServerActionClient.__setSchemaChain("crm", "proforma", chain);

    const res = await obtenerDatosProformaParaSeparacion("p-1");
    expect(res.success).toBe(true);
    expect(res.yaConvertida?.reservaId).toBe("r-EXISTENTE");
    expect(res.data).toBeUndefined();
  });
});

describe("obtenerDatosProformaParaSeparacion: prefill exitoso", () => {
  it("retorna prefill con monto desde datos.formaPago.separacion", async () => {
    const chain = createChainMock({
      data: {
        id: "p-1",
        numero: "PF-2026-0010",
        estado: "aprobada",
        cliente_id: "c-1",
        lote_id: "l-1",
        moneda: "PEN",
        total: 100000,
        datos: {
          formaPago: { separacion: 5000, numeroCuotas: 60 },
        },
        comentarios: "Cliente VIP",
        reserva_id: null,
        lote: { codigo: "A1", proyecto: { nombre: "Sol" } },
      },
      error: null,
    });
    mockServerActionClient.__setSchemaChain("crm", "proforma", chain);

    const res = await obtenerDatosProformaParaSeparacion("p-1");
    expect(res.success).toBe(true);
    expect(res.data?.proformaId).toBe("p-1");
    expect(res.data?.loteId).toBe("l-1");
    expect(res.data?.montoSeparacion).toBe(5000);
    expect(res.data?.moneda).toBe("PEN");
    expect(res.data?.formaPagoSugerida).toBe("credito_directo"); // tiene cuotas > 0
    expect(res.data?.notas).toBe("Cliente VIP");
    expect(res.data?.numero).toBe("PF-2026-0010");
    expect(res.data?.proyectoNombre).toBe("Sol");
    expect(res.data?.loteCodigo).toBe("A1");
  });

  it("infere contado si no hay cuotas en datos", async () => {
    const chain = createChainMock({
      data: {
        id: "p-1",
        numero: "PF-2026-0011",
        estado: "aprobada",
        cliente_id: "c-1",
        lote_id: "l-1",
        moneda: "USD",
        total: 80000,
        datos: { formaPago: { separacion: 4000, numeroCuotas: 0 } },
        comentarios: null,
        reserva_id: null,
        lote: { codigo: "B2", proyecto: { nombre: "Luna" } },
      },
      error: null,
    });
    mockServerActionClient.__setSchemaChain("crm", "proforma", chain);

    const res = await obtenerDatosProformaParaSeparacion("p-1");
    expect(res.data?.formaPagoSugerida).toBe("contado");
    expect(res.data?.moneda).toBe("USD");
  });

  it("usa fallback de 5% del total si no hay separacion en datos", async () => {
    const chain = createChainMock({
      data: {
        id: "p-1",
        numero: "PF-2026-0012",
        estado: "aprobada",
        cliente_id: "c-1",
        lote_id: "l-1",
        moneda: "PEN",
        total: 100000,
        datos: { formaPago: {} },
        comentarios: null,
        reserva_id: null,
        lote: null,
      },
      error: null,
    });
    mockServerActionClient.__setSchemaChain("crm", "proforma", chain);

    const res = await obtenerDatosProformaParaSeparacion("p-1");
    expect(res.success).toBe(true);
    expect(res.data?.montoSeparacion).toBe(5000); // 5% de 100000
  });

  it("genera nota por defecto si no hay comentarios", async () => {
    const chain = createChainMock({
      data: {
        id: "p-1",
        numero: "PF-2026-0099",
        estado: "aprobada",
        cliente_id: "c-1",
        lote_id: "l-1",
        moneda: "PEN",
        total: 50000,
        datos: { formaPago: { separacion: 1000 } },
        comentarios: null,
        reserva_id: null,
        lote: null,
      },
      error: null,
    });
    mockServerActionClient.__setSchemaChain("crm", "proforma", chain);

    const res = await obtenerDatosProformaParaSeparacion("p-1");
    expect(res.data?.notas).toMatch(/PF-2026-0099/);
  });
});

// ============================================================
// registrarSeparacion: enlace con proformaId
// ============================================================

describe("registrarSeparacion: enlace con proforma", () => {
  function setupHappyPath() {
    mockEsAdminOCoord.mockResolvedValue(true);
    mockGetUser.mockResolvedValue({ data: { user: { id: "uid-1" } } });

    const perfilChain = createChainMock({ data: { username: "vendedor1" }, error: null });
    mockServerActionClient.__setSchemaChain("crm", "usuario_perfil", perfilChain);

    const clienteChain = createChainMock({
      data: { vendedor_username: "vendedor1", vendedor_asignado: "uid-1" },
      error: null,
    });
    mockServerActionClient.__setPublicChain("cliente", clienteChain);

    const loteChain = createChainMock({
      data: { id: "l-1", estado: "disponible", proyecto_id: "py-1" },
      error: null,
    });
    mockServerActionClient.__setPublicChain("lote", loteChain);

    const configChain = createChainMock({ data: { dias_vigencia_reserva: 7 }, error: null });
    mockServerActionClient.__setSchemaChain("crm", "configuracion_proyecto_financiera", configChain);

    const reservaChain = createChainMock({
      data: { id: "r-NEW", codigo_reserva: "RES-2026-0050" },
      error: null,
    });
    mockServerActionClient.__setSchemaChain("crm", "reserva", reservaChain);

    const proformaChain = createChainMock({ data: null, error: null });
    mockServerActionClient.__setSchemaChain("crm", "proforma", proformaChain);

    mockServerActionClient.rpc.mockResolvedValue({ data: null, error: null });

    return { proformaChain, reservaChain };
  }

  it("registra separacion sin proforma (proformaId opcional)", async () => {
    setupHappyPath();
    const res = await registrarSeparacion({
      clienteId: "c-1",
      loteId: "l-1",
      montoSeparacion: 5000,
      formaPago: "contado",
    });
    expect(res.success).toBe(true);
    expect(res.data?.codigoReserva).toBe("RES-2026-0050");
  });

  it("actualiza proforma con reserva_id y estado convertida cuando proformaId presente", async () => {
    const { proformaChain } = setupHappyPath();

    await registrarSeparacion({
      clienteId: "c-1",
      loteId: "l-1",
      montoSeparacion: 5000,
      formaPago: "credito_hipotecario",
      proformaId: "p-FROM-PROFORMA",
    });

    expect(proformaChain.update).toHaveBeenCalledWith({
      reserva_id: "r-NEW",
      estado: "convertida",
    });
    expect(proformaChain.eq).toHaveBeenCalledWith("id", "p-FROM-PROFORMA");
  });

  it("no rompe el flujo si la actualizacion de proforma falla", async () => {
    const { proformaChain } = setupHappyPath();
    // Simular error en update sin afectar then default
    proformaChain.eq.mockReturnValue({
      then: (resolve: any) => resolve({ error: { message: "FK violation" } }),
    });

    const res = await registrarSeparacion({
      clienteId: "c-1",
      loteId: "l-1",
      montoSeparacion: 5000,
      formaPago: "contado",
      proformaId: "p-FAIL",
    });

    // La separacion debe registrarse igual; el fallo de proforma se loguea.
    expect(res.success).toBe(true);
  });
});
