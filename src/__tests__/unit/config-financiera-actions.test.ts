import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockGetUser,
  mockServerActionClient,
  createChainMock,
  mockEsAdminOCoordinador,
  mockRequierePermiso,
} = vi.hoisted(() => {
  function createChainMock(finalResult: any = { data: null, error: null }) {
    const chain: any = {};
    const methods = [
      "select",
      "insert",
      "update",
      "upsert",
      "delete",
      "eq",
      "neq",
      "is",
      "or",
      "order",
      "range",
      "single",
      "in",
      "limit",
      "head",
      "maybeSingle",
      "not",
      "gte",
      "lte",
    ];
    for (const method of methods) {
      chain[method] = vi.fn().mockReturnValue(chain);
    }
    chain.single.mockImplementation(() => Promise.resolve(finalResult));
    chain.maybeSingle.mockImplementation(() => Promise.resolve(finalResult));
    chain.order.mockImplementation(() => Promise.resolve(finalResult));
    chain.upsert.mockImplementation(() => Promise.resolve(finalResult));
    return chain;
  }

  const mockGetUser = vi.fn();
  const mockServerActionClient = {
    auth: { getUser: mockGetUser },
    from: vi.fn().mockReturnValue(createChainMock()),
  };

  return {
    mockGetUser,
    mockServerActionClient,
    createChainMock,
    mockEsAdminOCoordinador: vi.fn(),
    mockRequierePermiso: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock("@/lib/supabase.server-actions", () => ({
  createServerActionClient: vi.fn().mockImplementation(() => Promise.resolve(mockServerActionClient)),
}));

vi.mock("@/lib/permissions/server", () => ({
  requierePermiso: mockRequierePermiso,
  esAdminOCoordinador: mockEsAdminOCoordinador,
}));

vi.mock("@/lib/permissions", () => ({
  PERMISOS: {
    PROYECTOS: { EDITAR: "proyectos.editar", CREAR: "proyectos.crear", ELIMINAR: "proyectos.eliminar" },
  },
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import {
  obtenerConfigFinanciera,
  guardarConfigFinanciera,
} from "@/app/dashboard/proyectos/[id]/_config-financiera-actions";

const PROYECTO_VALIDO = "11111111-2222-3333-4444-555566667777";

const PAYLOAD_VALIDO = {
  porcentaje_minimo_separacion: 5,
  porcentaje_cuota_inicial: 20,
  max_cuotas_iniciales: 3,
  max_cuotas_saldo: 120,
  tasa_efectiva_mensual: 0.012,
  tasa_mora_mensual: 0.015,
  dias_gracia_mora: 3,
  penalidad_clientes_al_dia: 0,
  penalidad_clientes_morosos: 2,
  descuento_maximo_letra: 0,
  seguro_desgravamen_porcentaje: 0.0005,
  seguro_multiriesgo_porcentaje: 0.0003,
  moneda_predeterminada: "PEN",
};

describe("obtenerConfigFinanciera", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "uid-1" } } });
  });

  it("rechaza UUID inválido", async () => {
    const result = await obtenerConfigFinanciera("no-es-uuid");
    expect(result.error).toContain("inválido");
    expect(result.data).toBeNull();
  });

  it("rechaza si no hay usuario autenticado", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const result = await obtenerConfigFinanciera(PROYECTO_VALIDO);
    expect(result.data).toBeNull();
    expect(result.error).toContain("autenticado");
  });

  it("retorna la configuración cuando existe", async () => {
    const dataMock = {
      id: "cfg-1",
      proyecto_id: PROYECTO_VALIDO,
      porcentaje_minimo_separacion: 5,
      porcentaje_cuota_inicial: 20,
      max_cuotas_iniciales: 3,
      max_cuotas_saldo: 120,
      tasa_efectiva_mensual: 0,
      tasa_mora_mensual: 0.015,
      dias_gracia_mora: 3,
      penalidad_clientes_al_dia: 0,
      penalidad_clientes_morosos: 2,
      descuento_maximo_letra: 0,
      seguro_desgravamen_porcentaje: 0,
      seguro_multiriesgo_porcentaje: 0,
      moneda_predeterminada: "PEN",
      created_at: "2026-05-01T00:00:00Z",
      updated_at: "2026-05-19T10:00:00Z",
    };
    const chain = createChainMock({ data: dataMock, error: null });
    mockServerActionClient.from.mockReturnValueOnce(chain);

    const result = await obtenerConfigFinanciera(PROYECTO_VALIDO);
    expect(result.error).toBeNull();
    expect(result.data).toEqual(dataMock);
  });

  it("retorna null cuando no existe configuración aún", async () => {
    const chain = createChainMock({ data: null, error: null });
    mockServerActionClient.from.mockReturnValueOnce(chain);

    const result = await obtenerConfigFinanciera(PROYECTO_VALIDO);
    expect(result.error).toBeNull();
    expect(result.data).toBeNull();
  });

  it("propaga el error de Supabase", async () => {
    const chain = createChainMock({ data: null, error: { message: "DB caída" } });
    mockServerActionClient.from.mockReturnValueOnce(chain);

    const result = await obtenerConfigFinanciera(PROYECTO_VALIDO);
    expect(result.data).toBeNull();
    expect(result.error).toContain("DB caída");
  });
});

describe("guardarConfigFinanciera", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "uid-1" } } });
    mockEsAdminOCoordinador.mockResolvedValue(true);
    mockRequierePermiso.mockResolvedValue(undefined);
  });

  it("rechaza UUID inválido", async () => {
    const result = await guardarConfigFinanciera("xxx", PAYLOAD_VALIDO);
    expect(result.success).toBe(false);
    expect(result.error).toContain("inválido");
  });

  it("rechaza porcentaje fuera de rango 0-100", async () => {
    const result = await guardarConfigFinanciera(PROYECTO_VALIDO, {
      ...PAYLOAD_VALIDO,
      porcentaje_minimo_separacion: 150,
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain("porcentaje_minimo_separacion");
  });

  it("rechaza cuotas iniciales menores o iguales a 0", async () => {
    const result = await guardarConfigFinanciera(PROYECTO_VALIDO, {
      ...PAYLOAD_VALIDO,
      max_cuotas_iniciales: 0,
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain("cuotas iniciales");
  });

  it("rechaza moneda inválida", async () => {
    const result = await guardarConfigFinanciera(PROYECTO_VALIDO, {
      ...PAYLOAD_VALIDO,
      moneda_predeterminada: "EUR",
    });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Moneda/i);
  });

  it("rechaza si no es admin/coordinador", async () => {
    mockEsAdminOCoordinador.mockResolvedValueOnce(false);
    const result = await guardarConfigFinanciera(PROYECTO_VALIDO, PAYLOAD_VALIDO);
    expect(result.success).toBe(false);
    expect(result.error).toContain("Solo administradores");
  });

  it("rechaza sin permiso PROYECTOS.EDITAR", async () => {
    mockRequierePermiso.mockRejectedValueOnce(new Error("Permiso denegado: proyectos.editar"));
    const result = await guardarConfigFinanciera(PROYECTO_VALIDO, PAYLOAD_VALIDO);
    expect(result.success).toBe(false);
    expect(result.error).toContain("Permiso");
  });

  it("upsert exitoso con payload válido", async () => {
    const chain = createChainMock({ data: null, error: null });
    mockServerActionClient.from.mockReturnValueOnce(chain);

    const result = await guardarConfigFinanciera(PROYECTO_VALIDO, PAYLOAD_VALIDO);
    expect(result.success).toBe(true);
    expect(mockServerActionClient.from).toHaveBeenCalledWith("configuracion_proyecto_financiera");
    expect(chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        proyecto_id: PROYECTO_VALIDO,
        porcentaje_minimo_separacion: 5,
        moneda_predeterminada: "PEN",
      }),
      { onConflict: "proyecto_id" },
    );
  });

  it("retorna error si el upsert falla", async () => {
    const chain = createChainMock({ data: null, error: { message: "constraint violation" } });
    mockServerActionClient.from.mockReturnValueOnce(chain);

    const result = await guardarConfigFinanciera(PROYECTO_VALIDO, PAYLOAD_VALIDO);
    expect(result.success).toBe(false);
    expect(result.error).toContain("constraint");
  });
});
