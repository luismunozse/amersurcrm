import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================
// Mocks
// ============================================================

const { mockGetUser, mockRpc, mockServerActionClient, createChainMock } = vi.hoisted(() => {
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
  const mockRpc = vi.fn();
  const publicChains: Record<string, any> = {};
  const crmChains: Record<string, any> = {};

  const mockServerActionClient: any = {
    auth: { getUser: mockGetUser },
    from: vi.fn((table: string) => publicChains[table] ?? createChainMock()),
    // schema("crm") expone .from() y .rpc() — la RPC es el contrato nuevo del round-robin
    schema: vi.fn(() => ({
      from: vi.fn((table: string) => crmChains[table] ?? createChainMock()),
      rpc: mockRpc,
    })),
    __setPublicChain(table: string, chain: any) { publicChains[table] = chain; },
    __setCrmChain(table: string, chain: any) { crmChains[table] = chain; },
    __reset() {
      for (const k of Object.keys(publicChains)) delete publicChains[k];
      for (const k of Object.keys(crmChains)) delete crmChains[k];
    },
  };

  return { mockGetUser, mockRpc, mockServerActionClient, createChainMock };
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
  crearCliente,
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

const baseForm = {
  tipo_cliente: "persona",
  nombre: "Juan Pérez",
  estado_cliente: "por_contactar",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockServerActionClient.__reset();
  mockGetUser.mockResolvedValue({ data: { user: { id: "uid-1" } } });
  mockRpc.mockResolvedValue({ data: 3, error: null });
  // El insert del cliente devuelve un id válido
  mockServerActionClient.__setPublicChain(
    "cliente",
    createChainMock({ data: { id: "new-1", nombre: "Juan Pérez" }, error: null }),
  );
});

// ============================================================
// crearCliente — round-robin atómico en alta manual
// ============================================================

describe("crearCliente — avance atómico del round-robin", () => {
  it("avanza el puntero vía RPC registrar_asignacion_manual cuando se asigna un vendedor", async () => {
    const fd = buildFormData({ ...baseForm, vendedor_asignado: "vendedor1" });

    const res = await crearCliente(fd);

    expect(res).toEqual({ ok: true });
    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(mockRpc).toHaveBeenCalledWith("registrar_asignacion_manual", {
      p_vendedor_username: "vendedor1",
    });
  });

  it("NO toca el puntero cuando el alta no asigna vendedor", async () => {
    const fd = buildFormData({ ...baseForm });

    const res = await crearCliente(fd);

    expect(res).toEqual({ ok: true });
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("no rompe el alta si la RPC del round-robin falla (best-effort)", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "lock timeout" } });
    const fd = buildFormData({ ...baseForm, vendedor_asignado: "vendedor1" });

    const res = await crearCliente(fd);

    expect(res).toEqual({ ok: true });
    expect(mockRpc).toHaveBeenCalledTimes(1);
  });
});

// ============================================================
// actualizarCliente — reasignación consume turno solo si cambia el asesor
// ============================================================

describe("actualizarCliente — avance del round-robin al reasignar", () => {
  const baseEdit = { id: "c-1", tipo_cliente: "persona", nombre: "Juan Pérez", estado_cliente: "por_contactar" };

  it("avanza el puntero cuando cambia el asesor a uno nuevo", async () => {
    mockServerActionClient.__setPublicChain(
      "cliente",
      createChainMock({ data: { vendedor_username: "vendedor1" }, error: null }),
    );
    const fd = buildFormData({ ...baseEdit, vendedor_asignado: "vendedor2" });

    const res = await actualizarCliente(fd);

    expect(res).toEqual({ ok: true });
    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(mockRpc).toHaveBeenCalledWith("registrar_asignacion_manual", {
      p_vendedor_username: "vendedor2",
    });
  });

  it("NO avanza el puntero si el asesor no cambia", async () => {
    mockServerActionClient.__setPublicChain(
      "cliente",
      createChainMock({ data: { vendedor_username: "vendedor2" }, error: null }),
    );
    const fd = buildFormData({ ...baseEdit, vendedor_asignado: "vendedor2" });

    const res = await actualizarCliente(fd);

    expect(res).toEqual({ ok: true });
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("NO avanza el puntero al desasignar (vendedor vacío)", async () => {
    mockServerActionClient.__setPublicChain(
      "cliente",
      createChainMock({ data: { vendedor_username: "vendedor1" }, error: null }),
    );
    const fd = buildFormData({ ...baseEdit, vendedor_asignado: "" });

    const res = await actualizarCliente(fd);

    expect(res).toEqual({ ok: true });
    expect(mockRpc).not.toHaveBeenCalled();
  });
});

// ============================================================
// asignarVendedorCliente — asignación directa consume turno
// ============================================================

describe("asignarVendedorCliente — avance del round-robin", () => {
  it("avanza el puntero al asignar un vendedor nuevo", async () => {
    mockServerActionClient.__setPublicChain(
      "cliente",
      createChainMock({ data: { nombre: "Juan", vendedor_username: null }, error: null }),
    );

    await asignarVendedorCliente("c-1", "vendedor3");

    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(mockRpc).toHaveBeenCalledWith("registrar_asignacion_manual", {
      p_vendedor_username: "vendedor3",
    });
  });

  it("NO avanza el puntero al reasignar el MISMO vendedor", async () => {
    mockServerActionClient.__setPublicChain(
      "cliente",
      createChainMock({ data: { nombre: "Juan", vendedor_username: "vendedor3" }, error: null }),
    );

    await asignarVendedorCliente("c-1", "vendedor3");

    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("NO avanza el puntero al desasignar (null)", async () => {
    mockServerActionClient.__setPublicChain(
      "cliente",
      createChainMock({ data: { nombre: "Juan", vendedor_username: "vendedor3" }, error: null }),
    );

    await asignarVendedorCliente("c-1", null);

    expect(mockRpc).not.toHaveBeenCalled();
  });
});
