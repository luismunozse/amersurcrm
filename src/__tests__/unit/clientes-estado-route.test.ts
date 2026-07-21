import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const {
  mockValidateBearer,
  mockCreateServerOnlyClient,
  mockCreateServiceRoleClient,
  mockCrearNotificacionSistema,
  createChainMock,
  mockBearerClient,
  mockServiceRoleClient,
} = vi.hoisted(() => {
  function createChainMock(finalResult: any = { data: null, error: null }) {
    const chain: any = {};
    const methods = ["select", "insert", "update", "delete", "eq", "neq", "single", "maybeSingle", "order", "limit"];
    for (const m of methods) chain[m] = vi.fn().mockReturnValue(chain);
    chain.then = (resolve: any, reject: any) => Promise.resolve(finalResult).then(resolve, reject);
    return chain;
  }

  const chains: Record<string, any> = {};
  const mockBearerClient: any = {
    schema: vi.fn(() => ({ from: vi.fn((table: string) => chains[table] ?? createChainMock()) })),
    __chains: chains,
  };

  const serviceChains: Record<string, any> = {};
  const mockServiceRoleClient: any = {
    schema: vi.fn(() => ({ from: vi.fn((table: string) => serviceChains[table] ?? createChainMock()) })),
    __chains: serviceChains,
  };

  return {
    mockValidateBearer: vi.fn(),
    mockCreateServerOnlyClient: vi.fn(),
    mockCreateServiceRoleClient: vi.fn(() => mockServiceRoleClient),
    mockCrearNotificacionSistema: vi.fn().mockResolvedValue(undefined),
    createChainMock,
    mockBearerClient,
    mockServiceRoleClient,
  };
});

vi.mock("@/lib/auth/extension-auth", () => ({
  validateBearerAndEnsureClientAccess: mockValidateBearer,
}));

vi.mock("@/lib/supabase.server", () => ({
  createServerOnlyClient: mockCreateServerOnlyClient,
  createServiceRoleClient: mockCreateServiceRoleClient,
}));

vi.mock("@/lib/notifications/system", () => ({
  crearNotificacionSistema: mockCrearNotificacionSistema,
}));

import { PATCH } from "@/app/api/clientes/[id]/estado/route";

function buildRequest(body: Record<string, unknown>, token?: string) {
  return new NextRequest("http://localhost/api/clientes/c-1/estado", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  for (const k of Object.keys(mockBearerClient.__chains)) delete mockBearerClient.__chains[k];
  for (const k of Object.keys(mockServiceRoleClient.__chains)) delete mockServiceRoleClient.__chains[k];

  mockValidateBearer.mockResolvedValue({
    ok: true,
    user: { id: "ext-user" },
    username: "extuser",
    rol: "ROL_ADMIN",
    supabase: mockBearerClient,
  });
});

describe("PATCH /api/clientes/[id]/estado — notificación al vendedor (extensión Chrome)", () => {
  it("notifica via crearNotificacionSistema (session-free) cuando el estado cambia y hay vendedor asignado", async () => {
    // The cliente chain result serves both the pre-update read (previous
    // estado) and the post-update row: previous estado is "por_contactar",
    // the PATCH moves it to "contactado" → real change → must notify.
    mockBearerClient.__chains.cliente = createChainMock({
      data: { id: "c-1", nombre: "Juan Perez", vendedor_username: "vendedor1", estado_cliente: "por_contactar", notas: null },
      error: null,
    });
    mockServiceRoleClient.__chains.usuario_perfil = createChainMock({
      data: { id: "perfil-1" },
      error: null,
    });

    const res = await PATCH(buildRequest({ estado_cliente: "contactado" }, "valid-token"), {
      params: Promise.resolve({ id: "c-1" }),
    });
    expect(res.status).toBe(200);

    await vi.waitFor(() => expect(mockCrearNotificacionSistema).toHaveBeenCalledTimes(1));

    const [usuarioId, tipo, titulo, mensaje, data] = mockCrearNotificacionSistema.mock.calls[0];
    expect(usuarioId).toBe("perfil-1");
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

  it("NO notifica cuando el estado no cambió (PATCH idempotente/reintento de la extensión)", async () => {
    // Previous estado equals the PATCH's estado → no real change → no
    // misleading "estado cambiado" notification, even with vendedor asignado.
    mockBearerClient.__chains.cliente = createChainMock({
      data: { id: "c-1", nombre: "Juan Perez", vendedor_username: "vendedor1", estado_cliente: "contactado", notas: null },
      error: null,
    });
    mockServiceRoleClient.__chains.usuario_perfil = createChainMock({
      data: { id: "perfil-1" },
      error: null,
    });

    const res = await PATCH(buildRequest({ estado_cliente: "contactado" }, "valid-token"), {
      params: Promise.resolve({ id: "c-1" }),
    });
    expect(res.status).toBe(200);

    await new Promise((r) => setTimeout(r, 0));
    expect(mockCrearNotificacionSistema).not.toHaveBeenCalled();
  });

  it("no notifica (ni revienta el request) cuando el cliente no tiene vendedor asignado", async () => {
    mockBearerClient.__chains.cliente = createChainMock({
      data: { id: "c-1", nombre: "Juan Perez", vendedor_username: null, estado_cliente: "por_contactar", notas: null },
      error: null,
    });

    const res = await PATCH(buildRequest({ estado_cliente: "contactado" }, "valid-token"), {
      params: Promise.resolve({ id: "c-1" }),
    });
    expect(res.status).toBe(200);

    await new Promise((r) => setTimeout(r, 0));
    expect(mockCrearNotificacionSistema).not.toHaveBeenCalled();
  });

  it("no notifica cuando no se resuelve el perfil del vendedor por username", async () => {
    mockBearerClient.__chains.cliente = createChainMock({
      data: { id: "c-1", nombre: "Juan Perez", vendedor_username: "vendedor-fantasma", estado_cliente: "por_contactar", notas: null },
      error: null,
    });
    mockServiceRoleClient.__chains.usuario_perfil = createChainMock({ data: null, error: null });

    const res = await PATCH(buildRequest({ estado_cliente: "contactado" }, "valid-token"), {
      params: Promise.resolve({ id: "c-1" }),
    });
    expect(res.status).toBe(200);

    await new Promise((r) => setTimeout(r, 0));
    expect(mockCrearNotificacionSistema).not.toHaveBeenCalled();
  });

  it("no falla el request si crearNotificacionSistema lanza", async () => {
    mockBearerClient.__chains.cliente = createChainMock({
      data: { id: "c-1", nombre: "Juan Perez", vendedor_username: "vendedor1", estado_cliente: "por_contactar", notas: null },
      error: null,
    });
    mockServiceRoleClient.__chains.usuario_perfil = createChainMock({
      data: { id: "perfil-1" },
      error: null,
    });
    mockCrearNotificacionSistema.mockRejectedValueOnce(new Error("push down"));

    const res = await PATCH(buildRequest({ estado_cliente: "contactado" }, "valid-token"), {
      params: Promise.resolve({ id: "c-1" }),
    });
    expect(res.status).toBe(200);

    await vi.waitFor(() => expect(mockCrearNotificacionSistema).toHaveBeenCalledTimes(1));
  });
});
