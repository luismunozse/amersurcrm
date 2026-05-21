import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================
// Mocks
// ============================================================

const { mockGetUser, mockServerActionClient, createChainMock } = vi.hoisted(() => {
  function createChainMock(finalResult: any = { data: null, error: null }) {
    const chain: any = {};
    const methods = [
      "select", "insert", "update", "delete", "eq", "neq", "is", "or",
      "order", "range", "single", "in", "limit", "head", "maybeSingle", "not", "gte", "lte",
    ];
    for (const m of methods) chain[m] = vi.fn().mockReturnValue(chain);
    chain.then = (resolve: any, reject: any) =>
      Promise.resolve(finalResult).then(resolve, reject);
    chain.__finalResult = finalResult;
    return chain;
  }

  const mockGetUser = vi.fn();
  const publicChains: Record<string, any> = {};

  const mockServerActionClient: any = {
    auth: { getUser: mockGetUser },
    from: vi.fn((table: string) => publicChains[table] ?? createChainMock()),
    schema: vi.fn(() => ({ from: vi.fn(() => createChainMock()) })),
    __setPublicChain(table: string, chain: any) { publicChains[table] = chain; },
    __reset() {
      for (const k of Object.keys(publicChains)) delete publicChains[k];
    },
  };

  return { mockGetUser, mockServerActionClient, createChainMock };
});

vi.mock("@/lib/supabase.server-actions", () => ({
  createServerActionClient: vi.fn().mockImplementation(() => Promise.resolve(mockServerActionClient)),
}));

vi.mock("@/app/_actionsNotifications", () => ({
  crearNotificacion: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/cache.server", () => ({
  getCachedClientes: vi.fn(),
}));

vi.mock("@/lib/permissions/server", () => ({
  requierePermiso: vi.fn().mockResolvedValue(undefined),
  esAdmin: vi.fn().mockResolvedValue(false),
  esAdminOCoordinador: vi.fn().mockResolvedValue(false),
}));

vi.mock("@/app/dashboard/clientes/_actions-helpers", async (importOriginal) => {
  const mod: any = await importOriginal();
  return { ...mod, notifyVendedorAsignado: vi.fn().mockResolvedValue(undefined) };
});

// Import después de mocks
import {
  actualizarCliente,
  asignarVendedorCliente,
} from "@/app/dashboard/clientes/_actions";

// ============================================================
// Helpers
// ============================================================

function buildFormData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

function setClienteChainData(data: any) {
  const chain = createChainMock({ data, error: null });
  mockServerActionClient.__setPublicChain("cliente", chain);
  return chain;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockServerActionClient.__reset();
  mockGetUser.mockResolvedValue({ data: { user: { id: "uid-1" } } });
});

// ============================================================
// asignarVendedorCliente
// ============================================================

describe("asignarVendedorCliente — bump de timestamps", () => {
  it("setea updated_at y fecha_alta al asignar vendedor", async () => {
    const chain = setClienteChainData({ nombre: "Juan" });

    const antes = Date.now();
    await asignarVendedorCliente("c-1", "vendedor1");
    const despues = Date.now();

    expect(chain.update).toHaveBeenCalledTimes(1);
    const payload = chain.update.mock.calls[0][0];

    expect(payload.vendedor_username).toBe("vendedor1");
    expect(payload.vendedor_asignado).toBe("vendedor1");
    expect(payload.updated_at).toBeDefined();
    expect(payload.fecha_alta).toBeDefined();

    // Mismo timestamp en ambos campos
    expect(payload.updated_at).toBe(payload.fecha_alta);

    // Timestamp dentro del rango de ejecución
    const ts = Date.parse(payload.updated_at);
    expect(ts).toBeGreaterThanOrEqual(antes);
    expect(ts).toBeLessThanOrEqual(despues);
  });

  it("setea updated_at y fecha_alta al desasignar vendedor (null)", async () => {
    const chain = setClienteChainData({ nombre: "Juan" });

    await asignarVendedorCliente("c-1", null);

    const payload = chain.update.mock.calls[0][0];

    expect(payload.vendedor_username).toBeNull();
    expect(payload.vendedor_asignado).toBeNull();
    expect(payload.updated_at).toBeDefined();
    expect(payload.fecha_alta).toBeDefined();
  });

  it("lanza si no hay usuario autenticado", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    setClienteChainData({ nombre: "Juan" });

    await expect(asignarVendedorCliente("c-1", "vendedor1")).rejects.toThrow(/No autenticado/);
  });

  it("propaga error de Supabase en update", async () => {
    const chain = createChainMock({ data: null, error: { message: "DB fail" } });
    mockServerActionClient.__setPublicChain("cliente", chain);

    await expect(asignarVendedorCliente("c-1", "vendedor1")).rejects.toThrow(/DB fail/);
  });
});

// ============================================================
// actualizarCliente
// ============================================================

describe("actualizarCliente — bump de timestamps solo si cambia asesor", () => {
  const baseForm = {
    id: "c-1",
    tipo_cliente: "persona",
    nombre: "Juan Pérez",
    estado_cliente: "por_contactar",
  };

  it("bumpea updated_at y fecha_alta cuando cambia el asesor", async () => {
    const chain = setClienteChainData({ vendedor_username: "vendedor1" });

    const fd = buildFormData({ ...baseForm, vendedor_asignado: "vendedor2" });

    const antes = Date.now();
    await actualizarCliente(fd);
    const despues = Date.now();

    expect(chain.update).toHaveBeenCalledTimes(1);
    const payload = chain.update.mock.calls[0][0];

    expect(payload.vendedor_username).toBe("vendedor2");
    expect(payload.vendedor_asignado).toBe("vendedor2");
    expect(payload.updated_at).toBeDefined();
    expect(payload.fecha_alta).toBeDefined();
    expect(payload.updated_at).toBe(payload.fecha_alta);

    const ts = Date.parse(payload.updated_at);
    expect(ts).toBeGreaterThanOrEqual(antes);
    expect(ts).toBeLessThanOrEqual(despues);
  });

  it("bumpea timestamps cuando se asigna un asesor a un cliente sin asesor previo", async () => {
    const chain = setClienteChainData({ vendedor_username: null });

    const fd = buildFormData({ ...baseForm, vendedor_asignado: "vendedor1" });

    await actualizarCliente(fd);

    const payload = chain.update.mock.calls[0][0];

    expect(payload.vendedor_username).toBe("vendedor1");
    expect(payload.updated_at).toBeDefined();
    expect(payload.fecha_alta).toBeDefined();
  });

  it("bumpea timestamps cuando se quita el asesor", async () => {
    const chain = setClienteChainData({ vendedor_username: "vendedor1" });

    const fd = buildFormData({ ...baseForm, vendedor_asignado: "" });

    await actualizarCliente(fd);

    const payload = chain.update.mock.calls[0][0];

    expect(payload.vendedor_username).toBeNull();
    expect(payload.vendedor_asignado).toBeNull();
    expect(payload.updated_at).toBeDefined();
    expect(payload.fecha_alta).toBeDefined();
  });

  it("NO bumpea timestamps cuando el asesor no cambia", async () => {
    const chain = setClienteChainData({ vendedor_username: "vendedor1" });

    const fd = buildFormData({ ...baseForm, vendedor_asignado: "vendedor1" });

    await actualizarCliente(fd);

    const payload = chain.update.mock.calls[0][0];

    expect(payload.vendedor_username).toBe("vendedor1");
    expect(payload.updated_at).toBeUndefined();
    expect(payload.fecha_alta).toBeUndefined();
  });

  it("NO bumpea timestamps cuando se actualizan otros campos sin tocar el asesor", async () => {
    const chain = setClienteChainData({ vendedor_username: "vendedor1" });

    const fd = buildFormData({
      ...baseForm,
      nombre: "Juan Pérez Actualizado",
      telefono: "999888777",
      vendedor_asignado: "vendedor1",
    });

    await actualizarCliente(fd);

    const payload = chain.update.mock.calls[0][0];

    expect(payload.nombre).toBe("Juan Pérez Actualizado");
    expect(payload.updated_at).toBeUndefined();
    expect(payload.fecha_alta).toBeUndefined();
  });

  it("lanza si falta id", async () => {
    const fd = buildFormData({ ...baseForm, id: "" });
    await expect(actualizarCliente(fd)).rejects.toThrow(/ID de cliente/);
  });

  it("lanza si datos inválidos (nombre vacío)", async () => {
    const fd = buildFormData({ ...baseForm, nombre: "" });
    await expect(actualizarCliente(fd)).rejects.toThrow();
  });
});
