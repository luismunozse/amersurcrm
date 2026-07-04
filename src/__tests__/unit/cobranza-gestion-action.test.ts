import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================
// Hoisted mocks — mirrors src/__tests__/unit/cobranza-actions.test.ts
// ============================================================

const { mockGetUser, mockServerActionClient, createChainMock } = vi.hoisted(() => {
  function createChainMock(finalResult: any = { data: null, error: null }) {
    const chain: any = { eqCalls: [] as any[], neqCalls: [] as any[], notCalls: [] as any[] };
    const methods = ["select", "insert", "update", "delete", "eq", "neq", "is", "or", "order", "range", "single", "in", "limit", "head", "maybeSingle", "not", "gte", "lte"];
    for (const method of methods) { chain[method] = vi.fn().mockReturnValue(chain); }
    chain.eq = vi.fn().mockImplementation((...args: any[]) => {
      chain.eqCalls.push(args);
      return chain;
    });
    chain.neq = vi.fn().mockImplementation((...args: any[]) => {
      chain.neqCalls.push(args);
      return chain;
    });
    chain.not = vi.fn().mockImplementation((...args: any[]) => {
      chain.notCalls.push(args);
      return chain;
    });
    chain.single.mockImplementation(() => Promise.resolve(finalResult));
    chain.order.mockImplementation(() => Promise.resolve(finalResult));
    chain.range.mockImplementation(() => Promise.resolve(finalResult));
    return chain;
  }
  const mockGetUser = vi.fn();
  const mockServerActionClient = {
    auth: { getUser: mockGetUser },
    from: vi.fn().mockReturnValue(createChainMock()),
    schema: vi.fn().mockReturnThis(),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
  return { mockGetUser, mockServerActionClient, createChainMock };
});

vi.mock("@/lib/supabase.server-actions", () => ({
  createServerActionClient: vi.fn().mockImplementation(() => Promise.resolve(mockServerActionClient)),
}));
vi.mock("@/lib/permissions/server", () => ({
  requierePermiso: vi.fn().mockResolvedValue(undefined),
  tienePermiso: vi.fn().mockResolvedValue(false),
}));
vi.mock("@/lib/permissions", () => ({
  PERMISOS: { PAGOS: { VER_TODOS: "pagos.ver_todos" }, MORA: { CALCULAR: "mora.calcular" } },
}));
vi.mock("@/app/dashboard/clientes/_actions-crm-helpers", () => ({
  obtenerUsernameActual: vi.fn().mockResolvedValue({ success: true, username: "vendor1", userId: "uid-1" }),
}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { obtenerAlertasCobranza, registrarGestionCobranza } from "@/app/dashboard/cobranza/_actions-cobranza";
import { tienePermiso } from "@/lib/permissions/server";
import { obtenerUsernameActual } from "@/app/dashboard/clientes/_actions-crm-helpers";
import { revalidatePath } from "next/cache";

describe("obtenerAlertasCobranza", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "uid-1" } } });
  });

  it("scopes by vendedor_username when the caller lacks PAGOS.VER_TODOS", async () => {
    (tienePermiso as any).mockResolvedValue(false);
    const chain = createChainMock({ data: [], error: null });
    mockServerActionClient.from.mockReturnValue(chain);

    const result = await obtenerAlertasCobranza();

    expect(result.success).toBe(true);
    expect(mockServerActionClient.from).toHaveBeenCalledWith("alerta_cobranza");
    expect(chain.eqCalls).toContainEqual([
      "cuota.venta.cliente.vendedor_username",
      "vendor1",
    ]);
  });

  it("does not scope by vendedor_username when the caller has PAGOS.VER_TODOS", async () => {
    (tienePermiso as any).mockResolvedValue(true);
    const chain = createChainMock({ data: [], error: null });
    mockServerActionClient.from.mockReturnValue(chain);

    const result = await obtenerAlertasCobranza();

    expect(result.success).toBe(true);
    expect(chain.eqCalls).toHaveLength(0);
    expect(obtenerUsernameActual).not.toHaveBeenCalled();
  });

  it("excludes cuotas already paid and ventas cancelled/suspended, mirroring the cron filters", async () => {
    (tienePermiso as any).mockResolvedValue(true);
    const chain = createChainMock({ data: [], error: null });
    mockServerActionClient.from.mockReturnValue(chain);

    const result = await obtenerAlertasCobranza();

    expect(result.success).toBe(true);
    expect(chain.neqCalls).toContainEqual(["cuota.estado", "pagada"]);
    expect(chain.notCalls).toContainEqual([
      "cuota.venta.estado",
      "in",
      '("cancelada","suspendida")',
    ]);
  });

  it("propagates the username-resolution failure without querying", async () => {
    (tienePermiso as any).mockResolvedValue(false);
    (obtenerUsernameActual as any).mockResolvedValueOnce({ success: false, error: "No autenticado" });
    const chain = createChainMock({ data: [], error: null });
    mockServerActionClient.from.mockReturnValue(chain);

    const result = await obtenerAlertasCobranza();

    expect(result.success).toBe(false);
  });

  it("handles a database error via handleSupabaseError (friendly message, not raw PostgrestError text)", async () => {
    (tienePermiso as any).mockResolvedValue(true);
    const chain = createChainMock({ data: null, error: { message: "DB error", code: "42501" } });
    mockServerActionClient.from.mockReturnValue(chain);

    const result = await obtenerAlertasCobranza();

    expect(result.success).toBe(false);
    expect((result as any).error).toBe("No tienes permisos para realizar esta acción");
  });
});

describe("registrarGestionCobranza", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "uid-1" } } });
    mockServerActionClient.rpc.mockResolvedValue({ data: "gestion-1", error: null });
  });

  const baseInput = {
    cuotaId: "cuota-1",
    clienteId: "cliente-1",
    alertaId: "alerta-1",
    medio: "whatsapp" as const,
    resultado: "promesa_pago" as const,
    notas: "Cliente promete pagar el viernes",
    fechaGestion: "2026-07-01",
  };

  it("calls crm.registrar_gestion_cobranza with the caller-bound payload", async () => {
    const result = await registrarGestionCobranza(baseInput);

    expect(result.success).toBe(true);
    expect(mockServerActionClient.schema).toHaveBeenCalledWith("crm");
    expect(mockServerActionClient.rpc).toHaveBeenCalledWith(
      "registrar_gestion_cobranza",
      expect.objectContaining({
        p_alerta_id: "alerta-1",
        p_cuota_id: "cuota-1",
        p_cliente_id: "cliente-1",
        p_medio: "whatsapp",
        p_resultado: "promesa_pago",
        p_notas: "Cliente promete pagar el viernes",
        p_fecha_gestion: "2026-07-01T00:00:00-05:00",
      }),
    );
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/cobranza");
  });

  it("passes p_alerta_id null when no alertaId is provided", async () => {
    const result = await registrarGestionCobranza({ ...baseInput, alertaId: undefined });

    expect(result.success).toBe(true);
    expect(mockServerActionClient.rpc).toHaveBeenCalledWith(
      "registrar_gestion_cobranza",
      expect.objectContaining({ p_alerta_id: null }),
    );
  });

  it("rejects when the caller's session cannot be resolved", async () => {
    (obtenerUsernameActual as any).mockResolvedValueOnce({ success: false, error: "No autenticado" });

    const result = await registrarGestionCobranza(baseInput);

    expect(result.success).toBe(false);
    expect(mockServerActionClient.rpc).not.toHaveBeenCalled();
  });

  it("rejects an invalid medio without hitting the database", async () => {
    const result = await registrarGestionCobranza({ ...baseInput, medio: "carta_notarial" as any });

    expect(result.success).toBe(false);
    expect((result as any).error).toBe("El medio de gestión no es válido");
    expect(mockServerActionClient.rpc).not.toHaveBeenCalled();
  });

  it("rejects an invalid resultado without hitting the database", async () => {
    const result = await registrarGestionCobranza({ ...baseInput, resultado: "acuerdo_verbal" as any });

    expect(result.success).toBe(false);
    expect((result as any).error).toBe("El resultado de gestión no es válido");
    expect(mockServerActionClient.rpc).not.toHaveBeenCalled();
  });

  it("rejects an unparseable fechaGestion without hitting the database", async () => {
    const result = await registrarGestionCobranza({ ...baseInput, fechaGestion: "no-es-una-fecha" });

    expect(result.success).toBe(false);
    expect((result as any).error).toBe("Fecha de gestión no es válida");
    expect(mockServerActionClient.rpc).not.toHaveBeenCalled();
  });

  it("rejects a fechaGestion in the future without hitting the database", async () => {
    const enUnAnio = new Date();
    enUnAnio.setFullYear(enUnAnio.getFullYear() + 1);
    const fechaFutura = enUnAnio.toISOString().slice(0, 10);

    const result = await registrarGestionCobranza({ ...baseInput, fechaGestion: fechaFutura });

    expect(result.success).toBe(false);
    expect((result as any).error).toBe("La fecha de gestión no puede ser en el futuro");
    expect(mockServerActionClient.rpc).not.toHaveBeenCalled();
  });

  it("validates OK when the caller submits Lima's actual today even though the UTC calendar day has already advanced", async () => {
    vi.useFakeTimers();
    // 2026-07-05T02:00:00Z is already 2026-07-05 in UTC, but still
    // 2026-07-04 21:00 in América/Lima (UTC-5) — the day has not rolled
    // over yet for the caller.
    vi.setSystemTime(new Date("2026-07-05T02:00:00Z"));
    try {
      const result = await registrarGestionCobranza({ ...baseInput, fechaGestion: "2026-07-04" });

      expect(result.success).toBe(true);
      expect(mockServerActionClient.rpc).toHaveBeenCalledWith(
        "registrar_gestion_cobranza",
        expect.objectContaining({ p_fecha_gestion: "2026-07-04T00:00:00-05:00" }),
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it("rejects a fechaGestion matching the UTC calendar day when that day is still tomorrow in Lima", async () => {
    vi.useFakeTimers();
    // Same pinned instant as above: Lima's calendar day is still 2026-07-04,
    // so 2026-07-05 (the UTC-slice value the old, timezone-naive
    // implementation would have accepted as "today") is a genuinely future
    // date for the caller and must be rejected.
    vi.setSystemTime(new Date("2026-07-05T02:00:00Z"));
    try {
      const result = await registrarGestionCobranza({ ...baseInput, fechaGestion: "2026-07-05" });

      expect(result.success).toBe(false);
      expect((result as any).error).toBe("La fecha de gestión no puede ser en el futuro");
      expect(mockServerActionClient.rpc).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("surfaces an RLS/authorization rejection from the RPC as a friendly Spanish message", async () => {
    mockServerActionClient.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: "alerta no visible o inexistente", code: "42501" },
    });

    const result = await registrarGestionCobranza(baseInput);

    expect(result.success).toBe(false);
    expect((result as any).error).toBe("No tienes permisos para realizar esta acción");
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("surfaces a duplicate gestión (unique violation) with a friendly message", async () => {
    mockServerActionClient.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: "duplicate key value violates unique constraint", code: "23505" },
    });

    const result = await registrarGestionCobranza(baseInput);

    expect(result.success).toBe(false);
    expect((result as any).error).toBe("Ya existe una gestión registrada para esta alerta");
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
