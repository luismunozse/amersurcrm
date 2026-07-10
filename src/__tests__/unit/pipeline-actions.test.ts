import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockRpc,
  mockServerClient,
  mockServiceRoleClient,
  createChainMock,
  mockCrearNotificacionSistema,
} = vi.hoisted(() => {
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

  const mockRpc = vi.fn();

  // Session client: only the RPC goes through here.
  const mockServerClient: any = {
    schema: vi.fn(() => ({
      rpc: mockRpc,
      from: vi.fn(() => createChainMock()),
    })),
  };

  // Service-role client: the after() notify path must use THIS one
  // (session getUser() can write cookies, which throws inside after()).
  const serviceChains: Record<string, any> = {};
  const mockServiceRoleClient: any = {
    schema: vi.fn(() => ({
      from: vi.fn((table: string) => serviceChains[table] ?? createChainMock()),
    })),
    __chains: serviceChains,
  };

  const mockCrearNotificacionSistema = vi.fn().mockResolvedValue(undefined);

  return { mockRpc, mockServerClient, mockServiceRoleClient, createChainMock, mockCrearNotificacionSistema };
});

vi.mock("@/lib/supabase.server", () => ({
  createOptimizedServerClient: vi.fn().mockResolvedValue(mockServerClient),
  createServiceRoleClient: vi.fn(() => mockServiceRoleClient),
}));

vi.mock("@/lib/notifications/system", () => ({
  crearNotificacionSistema: mockCrearNotificacionSistema,
}));

import { moverClientePipeline } from "@/app/dashboard/pipeline/_actions";

function setServiceChain(table: string, chain: any) {
  mockServiceRoleClient.__chains[table] = chain;
}

beforeEach(() => {
  vi.clearAllMocks();
  for (const k of Object.keys(mockServiceRoleClient.__chains)) delete mockServiceRoleClient.__chains[k];
});

describe("moverClientePipeline: validaciones", () => {
  it("rechaza sin clienteId", async () => {
    const res = await moverClientePipeline("", "contactado");
    expect(res.ok).toBe(false);
  });

  it("rechaza estado invalido", async () => {
    const res = await moverClientePipeline("c-1", "estado_invalido");
    expect(res.ok).toBe(false);
  });
});

describe("moverClientePipeline: error del RPC", () => {
  it("retorna error y no notifica", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "boom" } });

    const res = await moverClientePipeline("c-1", "contactado");

    expect(res.ok).toBe(false);
    await new Promise((r) => setTimeout(r, 0));
    expect(mockCrearNotificacionSistema).not.toHaveBeenCalled();
  });
});

describe("moverClientePipeline: sin cambios de estado", () => {
  it("no notifica cuando cambiado=false", async () => {
    mockRpc.mockResolvedValue({ data: { cambiado: false }, error: null });

    const res = await moverClientePipeline("c-1", "contactado");

    expect(res.ok).toBe(true);
    if (res.ok) expect(res.cambiado).toBe(false);
    await new Promise((r) => setTimeout(r, 0));
    expect(mockCrearNotificacionSistema).not.toHaveBeenCalled();
  });
});

describe("moverClientePipeline: notifica al vendedor asignado tras un cambio", () => {
  function setupMoveOK() {
    mockRpc.mockResolvedValue({
      data: { cambiado: true, estado_anterior: "por_contactar", estado_nuevo: "contactado" },
      error: null,
    });
  }

  it("usa el emisor session-free (crearNotificacionSistema) con el mismo shape que el formulario", async () => {
    setupMoveOK();
    setServiceChain("cliente", createChainMock({
      data: { nombre: "Juan Perez", vendedor_username: "vendedor1" },
      error: null,
    }));
    setServiceChain("usuario_perfil", createChainMock({
      data: { id: "perfil-vendedor1" },
      error: null,
    }));

    const res = await moverClientePipeline("c-1", "contactado");
    expect(res.ok).toBe(true);

    await vi.waitFor(() => expect(mockCrearNotificacionSistema).toHaveBeenCalledTimes(1));

    const [usuarioId, tipo, titulo, mensaje, data] = mockCrearNotificacionSistema.mock.calls[0];
    expect(usuarioId).toBe("perfil-vendedor1");
    expect(tipo).toBe("cliente");
    expect(titulo).toBe("Estado de cliente actualizado");
    expect(mensaje).toContain("Juan Perez");
    expect(mensaje).toContain("Contactado");
    expect(data).toEqual({
      cliente_id: "c-1",
      nuevo_estado: "contactado",
      url: "/dashboard/clientes/c-1",
    });
  });

  it("resuelve cliente y perfil con el service-role client, no con el cliente de sesión", async () => {
    setupMoveOK();
    setServiceChain("cliente", createChainMock({
      data: { nombre: "Juan Perez", vendedor_username: "vendedor1" },
      error: null,
    }));
    setServiceChain("usuario_perfil", createChainMock({
      data: { id: "perfil-vendedor1" },
      error: null,
    }));

    await moverClientePipeline("c-1", "contactado");
    await vi.waitFor(() => expect(mockCrearNotificacionSistema).toHaveBeenCalledTimes(1));

    // Session client is only allowed the RPC call — inside after() a session
    // getUser()/query could trigger a cookie write, which throws
    // ReadonlyRequestCookiesError with phase='after'.
    expect(mockServiceRoleClient.schema).toHaveBeenCalledWith("crm");
    expect(mockServerClient.schema).toHaveBeenCalledTimes(1); // solo el RPC
  });

  it("no notifica si el cliente no tiene vendedor asignado", async () => {
    setupMoveOK();
    setServiceChain("cliente", createChainMock({
      data: { nombre: "Juan Perez", vendedor_username: null },
      error: null,
    }));

    const res = await moverClientePipeline("c-1", "contactado");
    expect(res.ok).toBe(true);

    await new Promise((r) => setTimeout(r, 0));
    expect(mockCrearNotificacionSistema).not.toHaveBeenCalled();
  });

  it("no notifica si el cliente movido no tiene fila (edge case)", async () => {
    setupMoveOK();
    setServiceChain("cliente", createChainMock({ data: null, error: null }));

    const res = await moverClientePipeline("c-1", "contactado");
    expect(res.ok).toBe(true);

    await new Promise((r) => setTimeout(r, 0));
    expect(mockCrearNotificacionSistema).not.toHaveBeenCalled();
  });

  it("no notifica si no se resuelve el perfil del vendedor por username", async () => {
    setupMoveOK();
    setServiceChain("cliente", createChainMock({
      data: { nombre: "Juan Perez", vendedor_username: "vendedor-fantasma" },
      error: null,
    }));
    setServiceChain("usuario_perfil", createChainMock({ data: null, error: null }));

    const res = await moverClientePipeline("c-1", "contactado");
    expect(res.ok).toBe(true);

    await new Promise((r) => setTimeout(r, 0));
    expect(mockCrearNotificacionSistema).not.toHaveBeenCalled();
  });

  it("no falla el movimiento si la notificacion falla", async () => {
    setupMoveOK();
    setServiceChain("cliente", createChainMock({
      data: { nombre: "Juan Perez", vendedor_username: "vendedor1" },
      error: null,
    }));
    setServiceChain("usuario_perfil", createChainMock({
      data: { id: "perfil-vendedor1" },
      error: null,
    }));
    mockCrearNotificacionSistema.mockRejectedValueOnce(new Error("push down"));

    const res = await moverClientePipeline("c-1", "contactado");
    expect(res.ok).toBe(true);

    await vi.waitFor(() => expect(mockCrearNotificacionSistema).toHaveBeenCalledTimes(1));
  });
});
