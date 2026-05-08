import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetUser, mockServerActionClient, createChainMock, mockEsAdmin, mockEsAdminOCoord } = vi.hoisted(() => {
  // Thenable chain: cualquier método encadenable retorna chain; await chain resuelve con finalResult.
  function createChainMock(finalResult: any = { data: null, error: null }) {
    const chain: any = {};
    const methods = [
      "select", "insert", "update", "delete", "eq", "neq", "is", "or",
      "order", "range", "single", "in", "limit", "head", "maybeSingle", "not", "gte", "lte",
    ];
    for (const method of methods) chain[method] = vi.fn().mockReturnValue(chain);
    chain.then = (resolve: any, reject: any) =>
      Promise.resolve(finalResult).then(resolve, reject);
    chain.__finalResult = finalResult;
    return chain;
  }

  const mockGetUser = vi.fn();
  const mockEsAdmin = vi.fn();
  const mockEsAdminOCoord = vi.fn();

  // Holder de chains. Cada test setea los chains específicos por tabla/schema.
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

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import {
  registrarSeparacion,
  obtenerLotesParaSeparacion,
  anularSeparacion,
  extenderVencimientoSeparacion,
} from "@/app/dashboard/clientes/[id]/_actions-separacion";

// ============================================================
// Helpers de setup compartidos
// ============================================================

function setupAuthOK(opts: { privilegiado?: boolean; vendedorAsignado?: boolean } = {}) {
  mockGetUser.mockResolvedValue({ data: { user: { id: "uid-1" } } });
  mockEsAdminOCoord.mockResolvedValue(opts.privilegiado ?? false);

  // Perfil del usuario (schema crm.usuario_perfil)
  const perfilChain = createChainMock({ data: { username: "vendedor1" }, error: null });
  mockServerActionClient.__setSchemaChain("crm", "usuario_perfil", perfilChain);

  // Cliente (public.cliente) — vendedor asignado match si vendedorAsignado=true
  const clienteChain = createChainMock({
    data: opts.vendedorAsignado
      ? { vendedor_username: "vendedor1", vendedor_asignado: "uid-1" }
      : { vendedor_username: "otro_vendedor", vendedor_asignado: "uid-otro" },
    error: null,
  });
  mockServerActionClient.__setPublicChain("cliente", clienteChain);
}

function setupLoteDisponible(loteId = "l-1", proyectoId = "p-1") {
  const loteChain = createChainMock({
    data: { id: loteId, estado: "disponible", proyecto_id: proyectoId },
    error: null,
  });
  mockServerActionClient.__setPublicChain("lote", loteChain);
}

function setupConfigProyecto(diasVigencia: number | null) {
  const configChain = createChainMock({
    data: diasVigencia === null ? null : { dias_vigencia_reserva: diasVigencia },
    error: null,
  });
  mockServerActionClient.__setSchemaChain("crm", "configuracion_proyecto_financiera", configChain);
}

function setupReservaCreada(reservaId = "r-1", codigoReserva = "RES-001") {
  const reservaChain = createChainMock({
    data: { id: reservaId, codigo_reserva: codigoReserva },
    error: null,
  });
  mockServerActionClient.__setSchemaChain("crm", "reserva", reservaChain);
}

function setupRPCs(opts: {
  reservarLoteError?: { message: string } | null;
  crearProcesoError?: { message: string } | null;
  moverPipelineError?: { message: string } | null;
  liberarLoteError?: { message: string } | null;
} = {}) {
  mockServerActionClient.rpc.mockImplementation((name: string) => {
    if (name === "reservar_lote") return Promise.resolve({ data: null, error: opts.reservarLoteError ?? null });
    if (name === "crear_proceso_desde_plantilla") return Promise.resolve({ data: null, error: opts.crearProcesoError ?? null });
    if (name === "mover_cliente_pipeline") return Promise.resolve({ data: null, error: opts.moverPipelineError ?? null });
    if (name === "liberar_lote") return Promise.resolve({ data: null, error: opts.liberarLoteError ?? null });
    return Promise.resolve({ data: null, error: null });
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockServerActionClient.__reset();
  mockEsAdmin.mockResolvedValue(false);
  mockEsAdminOCoord.mockResolvedValue(false);
});

// ============================================================
// registrarSeparacion — validaciones de entrada
// ============================================================

describe("registrarSeparacion: validaciones de entrada", () => {
  it("rechaza sin clienteId", async () => {
    const res = await registrarSeparacion({
      clienteId: "",
      loteId: "l-1",
      montoSeparacion: 1000,
      formaPago: "contado",
    });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/Cliente y lote/);
  });

  it("rechaza sin loteId", async () => {
    const res = await registrarSeparacion({
      clienteId: "c-1",
      loteId: "",
      montoSeparacion: 1000,
      formaPago: "contado",
    });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/Cliente y lote/);
  });

  it("rechaza forma_pago inválida", async () => {
    const res = await registrarSeparacion({
      clienteId: "c-1",
      loteId: "l-1",
      montoSeparacion: 1000,
      formaPago: "cheque" as any,
    });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/Forma de pago/);
  });

  it("rechaza monto cero", async () => {
    const res = await registrarSeparacion({
      clienteId: "c-1",
      loteId: "l-1",
      montoSeparacion: 0,
      formaPago: "contado",
    });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/Monto/);
  });

  it("rechaza monto negativo", async () => {
    const res = await registrarSeparacion({
      clienteId: "c-1",
      loteId: "l-1",
      montoSeparacion: -100,
      formaPago: "contado",
    });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/Monto/);
  });
});

// ============================================================
// registrarSeparacion — autorización
// ============================================================

describe("registrarSeparacion: autorización", () => {
  it("rechaza si no autenticado", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await registrarSeparacion({
      clienteId: "c-1",
      loteId: "l-1",
      montoSeparacion: 1000,
      formaPago: "contado",
    });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/No autenticado/);
  });

  it("rechaza si usuario sin username", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "uid-1" } } });
    mockEsAdminOCoord.mockResolvedValue(false);
    const perfilChain = createChainMock({ data: { username: null }, error: null });
    mockServerActionClient.__setSchemaChain("crm", "usuario_perfil", perfilChain);

    const res = await registrarSeparacion({
      clienteId: "c-1",
      loteId: "l-1",
      montoSeparacion: 1000,
      formaPago: "contado",
    });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/username/);
  });

  it("rechaza si no es admin/coord ni vendedor asignado", async () => {
    setupAuthOK({ privilegiado: false, vendedorAsignado: false });
    const res = await registrarSeparacion({
      clienteId: "c-1",
      loteId: "l-1",
      montoSeparacion: 1000,
      formaPago: "contado",
    });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/permisos/);
  });

  it("permite si es admin/coordinador aunque no sea vendedor asignado", async () => {
    setupAuthOK({ privilegiado: true, vendedorAsignado: false });
    setupLoteDisponible();
    setupConfigProyecto(7);
    setupReservaCreada();
    setupRPCs();

    const res = await registrarSeparacion({
      clienteId: "c-1",
      loteId: "l-1",
      montoSeparacion: 1000,
      formaPago: "contado",
    });
    expect(res.success).toBe(true);
  });

  it("permite si es vendedor asignado aunque no sea privilegiado", async () => {
    setupAuthOK({ privilegiado: false, vendedorAsignado: true });
    setupLoteDisponible();
    setupConfigProyecto(7);
    setupReservaCreada();
    setupRPCs();

    const res = await registrarSeparacion({
      clienteId: "c-1",
      loteId: "l-1",
      montoSeparacion: 1000,
      formaPago: "contado",
    });
    expect(res.success).toBe(true);
  });
});

// ============================================================
// registrarSeparacion — disponibilidad de lote
// ============================================================

describe("registrarSeparacion: disponibilidad de lote", () => {
  it("rechaza si lote no existe", async () => {
    setupAuthOK({ privilegiado: true });
    const loteChain = createChainMock({ data: null, error: null });
    mockServerActionClient.__setPublicChain("lote", loteChain);

    const res = await registrarSeparacion({
      clienteId: "c-1",
      loteId: "l-x",
      montoSeparacion: 1000,
      formaPago: "contado",
    });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/no encontrado/);
  });

  it("rechaza si lote no está disponible", async () => {
    setupAuthOK({ privilegiado: true });
    const loteChain = createChainMock({
      data: { id: "l-1", estado: "reservado", proyecto_id: "p-1" },
      error: null,
    });
    mockServerActionClient.__setPublicChain("lote", loteChain);

    const res = await registrarSeparacion({
      clienteId: "c-1",
      loteId: "l-1",
      montoSeparacion: 1000,
      formaPago: "contado",
    });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/no esta disponible|no está disponible/i);
  });
});

// ============================================================
// registrarSeparacion — flujo feliz y efectos
// ============================================================

describe("registrarSeparacion: flujo end-to-end", () => {
  it("crea reserva con forma_pago y devuelve código", async () => {
    setupAuthOK({ privilegiado: true });
    setupLoteDisponible("l-1", "p-1");
    setupConfigProyecto(7);
    setupReservaCreada("r-1", "RES-001");
    setupRPCs();

    const res = await registrarSeparacion({
      clienteId: "c-1",
      loteId: "l-1",
      montoSeparacion: 1500,
      formaPago: "credito_hipotecario",
      moneda: "PEN",
    });

    expect(res.success).toBe(true);
    expect(res.data?.codigoReserva).toBe("RES-001");
    expect(res.data?.reservaId).toBe("r-1");
  });

  it("llama RPC reservar_lote antes de crear reserva", async () => {
    setupAuthOK({ privilegiado: true });
    setupLoteDisponible();
    setupConfigProyecto(7);
    setupReservaCreada();
    setupRPCs();

    await registrarSeparacion({
      clienteId: "c-1",
      loteId: "l-1",
      montoSeparacion: 1000,
      formaPago: "contado",
    });

    expect(mockServerActionClient.rpc).toHaveBeenCalledWith("reservar_lote", { p_lote: "l-1" });
  });

  it("pasa forma_pago a crear_proceso_desde_plantilla", async () => {
    setupAuthOK({ privilegiado: true });
    setupLoteDisponible("l-1", "p-7");
    setupConfigProyecto(7);
    setupReservaCreada();
    setupRPCs();

    await registrarSeparacion({
      clienteId: "c-1",
      loteId: "l-1",
      montoSeparacion: 1000,
      formaPago: "contado",
    });

    expect(mockServerActionClient.rpc).toHaveBeenCalledWith(
      "crear_proceso_desde_plantilla",
      expect.objectContaining({
        p_cliente_id: "c-1",
        p_lote_id: "l-1",
        p_proyecto_id: "p-7",
        p_forma_pago: "contado",
      }),
    );
  });

  it("mueve cliente a estado en_proceso", async () => {
    setupAuthOK({ privilegiado: true });
    setupLoteDisponible();
    setupConfigProyecto(7);
    setupReservaCreada();
    setupRPCs();

    await registrarSeparacion({
      clienteId: "c-1",
      loteId: "l-1",
      montoSeparacion: 1000,
      formaPago: "contado",
    });

    expect(mockServerActionClient.rpc).toHaveBeenCalledWith(
      "mover_cliente_pipeline",
      expect.objectContaining({
        p_cliente_id: "c-1",
        p_estado_nuevo: "en_proceso",
      }),
    );
  });

  it("hace rollback (libera lote) si falla creación de reserva", async () => {
    setupAuthOK({ privilegiado: true });
    setupLoteDisponible();
    setupConfigProyecto(7);
    // Reserva falla
    const reservaChain = createChainMock({ data: null, error: { message: "DB error" } });
    mockServerActionClient.__setSchemaChain("crm", "reserva", reservaChain);
    setupRPCs();

    const res = await registrarSeparacion({
      clienteId: "c-1",
      loteId: "l-1",
      montoSeparacion: 1000,
      formaPago: "contado",
    });

    expect(res.success).toBe(false);
    expect(mockServerActionClient.rpc).toHaveBeenCalledWith("liberar_lote", { p_lote: "l-1" });
  });

  it("falla si reservar_lote retorna error", async () => {
    setupAuthOK({ privilegiado: true });
    setupLoteDisponible();
    setupConfigProyecto(7);
    setupRPCs({ reservarLoteError: { message: "Lote ya tomado" } });

    const res = await registrarSeparacion({
      clienteId: "c-1",
      loteId: "l-1",
      montoSeparacion: 1000,
      formaPago: "contado",
    });

    expect(res.success).toBe(false);
    expect(res.error).toMatch(/no se pudo reservar/i);
  });

  it("retorna success aunque falle creación de proceso (no rollback)", async () => {
    setupAuthOK({ privilegiado: true });
    setupLoteDisponible();
    setupConfigProyecto(7);
    setupReservaCreada();
    setupRPCs({ crearProcesoError: { message: "RPC fail" } });

    const res = await registrarSeparacion({
      clienteId: "c-1",
      loteId: "l-1",
      montoSeparacion: 1000,
      formaPago: "contado",
    });

    expect(res.success).toBe(true);
  });

  it("retorna success aunque falle mover_cliente_pipeline", async () => {
    setupAuthOK({ privilegiado: true });
    setupLoteDisponible();
    setupConfigProyecto(7);
    setupReservaCreada();
    setupRPCs({ moverPipelineError: { message: "Estado bloqueado" } });

    const res = await registrarSeparacion({
      clienteId: "c-1",
      loteId: "l-1",
      montoSeparacion: 1000,
      formaPago: "contado",
    });

    expect(res.success).toBe(true);
  });

  it("usa default 7 días si proyecto no tiene config", async () => {
    setupAuthOK({ privilegiado: true });
    setupLoteDisponible();
    setupConfigProyecto(null);
    setupReservaCreada();
    setupRPCs();

    const res = await registrarSeparacion({
      clienteId: "c-1",
      loteId: "l-1",
      montoSeparacion: 1000,
      formaPago: "contado",
    });

    expect(res.success).toBe(true);
  });
});

// ============================================================
// obtenerLotesParaSeparacion
// ============================================================

describe("obtenerLotesParaSeparacion", () => {
  it("rechaza si no autenticado", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await obtenerLotesParaSeparacion("c-1");
    expect(res.success).toBe(false);
  });

  it("prioriza lotes marcados como interés del cliente", async () => {
    setupAuthOK({ privilegiado: true });

    const interesChain = createChainMock({
      data: [{ lote_id: "l-2" }, { lote_id: "l-3" }],
      error: null,
    });
    mockServerActionClient.__setSchemaChain("crm", "cliente_propiedad_interes", interesChain);

    const lotesChain = createChainMock({
      data: [
        { id: "l-1", codigo: "A1", precio: 100, moneda: "PEN", sup_m2: 100, estado: "disponible", proyecto_id: "p-1", proyecto: { nombre: "Proy 1" } },
        { id: "l-2", codigo: "A2", precio: 200, moneda: "PEN", sup_m2: 120, estado: "disponible", proyecto_id: "p-1", proyecto: { nombre: "Proy 1" } },
        { id: "l-3", codigo: "A3", precio: 300, moneda: "PEN", sup_m2: 140, estado: "disponible", proyecto_id: "p-1", proyecto: { nombre: "Proy 1" } },
      ],
      error: null,
    });
    mockServerActionClient.__setPublicChain("lote", lotesChain);

    const res = await obtenerLotesParaSeparacion("c-1");
    expect(res.success).toBe(true);
    expect(res.data).toHaveLength(3);
    // Los dos primeros deben ser de interés
    expect(res.data![0].es_interes).toBe(true);
    expect(res.data![1].es_interes).toBe(true);
    expect(res.data![2].es_interes).toBe(false);
  });
});

// ============================================================
// anularSeparacion (admin only)
// ============================================================

describe("anularSeparacion", () => {
  it("rechaza sin reservaId", async () => {
    const res = await anularSeparacion("", "motivo");
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/ID/);
  });

  it("rechaza sin motivo", async () => {
    const res = await anularSeparacion("r-1", "");
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/motivo/i);
  });

  it("rechaza motivo solo whitespace", async () => {
    const res = await anularSeparacion("r-1", "   ");
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/motivo/i);
  });

  it("rechaza si usuario no es admin", async () => {
    mockEsAdmin.mockResolvedValue(false);
    const res = await anularSeparacion("r-1", "Cliente desistió");
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/administrador/i);
  });

  it("rechaza si reserva no existe", async () => {
    mockEsAdmin.mockResolvedValue(true);
    const reservaChain = createChainMock({ data: null, error: null });
    mockServerActionClient.__setSchemaChain("crm", "reserva", reservaChain);

    const res = await anularSeparacion("r-x", "Motivo");
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/no encontrada/i);
  });

  it("rechaza si reserva no está activa", async () => {
    mockEsAdmin.mockResolvedValue(true);
    const reservaChain = createChainMock({
      data: { id: "r-1", cliente_id: "c-1", lote_id: "l-1", estado: "cancelada" },
      error: null,
    });
    mockServerActionClient.__setSchemaChain("crm", "reserva", reservaChain);

    const res = await anularSeparacion("r-1", "Motivo");
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/no esta activa|no está activa/i);
  });

  it("cancela reserva, libera lote, cancela proceso y revierte cliente", async () => {
    mockEsAdmin.mockResolvedValue(true);
    const reservaChain = createChainMock({
      data: { id: "r-1", cliente_id: "c-1", lote_id: "l-1", estado: "activa" },
      error: null,
    });
    mockServerActionClient.__setSchemaChain("crm", "reserva", reservaChain);

    const procesoChain = createChainMock({ data: null, error: null });
    mockServerActionClient.__setSchemaChain("crm", "proceso_adquisicion", procesoChain);

    setupRPCs();

    const res = await anularSeparacion("r-1", "Cliente desistió");

    expect(res.success).toBe(true);
    expect(mockServerActionClient.rpc).toHaveBeenCalledWith("liberar_lote", { p_lote: "l-1" });
    expect(mockServerActionClient.rpc).toHaveBeenCalledWith(
      "mover_cliente_pipeline",
      expect.objectContaining({
        p_cliente_id: "c-1",
        p_estado_nuevo: "potencial",
      }),
    );
  });
});

// ============================================================
// extenderVencimientoSeparacion (admin only)
// ============================================================

describe("extenderVencimientoSeparacion", () => {
  it("rechaza sin reservaId", async () => {
    const res = await extenderVencimientoSeparacion("", "2099-01-01");
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/ID/);
  });

  it("rechaza sin fecha", async () => {
    const res = await extenderVencimientoSeparacion("r-1", "");
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/fecha/i);
  });

  it("rechaza fecha inválida", async () => {
    const res = await extenderVencimientoSeparacion("r-1", "no-es-fecha");
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/invalida|inválida/i);
  });

  it("rechaza fecha pasada", async () => {
    const res = await extenderVencimientoSeparacion("r-1", "2000-01-01");
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/futura/i);
  });

  it("rechaza si usuario no es admin", async () => {
    mockEsAdmin.mockResolvedValue(false);
    const res = await extenderVencimientoSeparacion("r-1", "2099-01-01");
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/administrador/i);
  });

  it("rechaza si reserva no está activa", async () => {
    mockEsAdmin.mockResolvedValue(true);
    const reservaChain = createChainMock({
      data: { id: "r-1", cliente_id: "c-1", estado: "cancelada" },
      error: null,
    });
    mockServerActionClient.__setSchemaChain("crm", "reserva", reservaChain);

    const res = await extenderVencimientoSeparacion("r-1", "2099-01-01");
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/no esta activa|no está activa/i);
  });

  it("actualiza fecha_vencimiento exitosamente", async () => {
    mockEsAdmin.mockResolvedValue(true);
    const reservaChain = createChainMock({
      data: { id: "r-1", cliente_id: "c-1", estado: "activa" },
      error: null,
    });
    mockServerActionClient.__setSchemaChain("crm", "reserva", reservaChain);

    const futura = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const res = await extenderVencimientoSeparacion("r-1", futura);

    expect(res.success).toBe(true);
  });
});
