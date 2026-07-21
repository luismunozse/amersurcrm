import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockNotificarUsuariosPorRoles,
  mockCrearNotificacion,
  mockServerActionClient,
  mockSchemaClient,
} = vi.hoisted(() => {
  function makeVendedorChain(result: { data: any; error: any }) {
    const chain: any = {};
    chain.select = vi.fn().mockReturnValue(chain);
    chain.eq = vi.fn().mockReturnValue(chain);
    chain.maybeSingle = vi.fn().mockResolvedValue(result);
    return chain;
  }

  const defaultChain = makeVendedorChain({ data: null, error: null });
  const mockSchemaClient = {
    from: vi.fn().mockReturnValue(defaultChain),
    __makeVendedorChain: makeVendedorChain,
  };
  const mockServerActionClient = {
    schema: vi.fn().mockReturnValue(mockSchemaClient),
  };

  return {
    mockNotificarUsuariosPorRoles: vi.fn().mockResolvedValue({ enviadas: 2, errores: 0 }),
    mockCrearNotificacion: vi.fn().mockResolvedValue({ id: "n-1" }),
    mockServerActionClient,
    mockSchemaClient,
  };
});

vi.mock("@/app/_actionsNotifications", () => ({
  notificarUsuariosPorRoles: mockNotificarUsuariosPorRoles,
  crearNotificacion: mockCrearNotificacion,
}));

vi.mock("@/lib/supabase.server-actions", () => ({
  createServerActionClient: vi.fn().mockImplementation(() => Promise.resolve(mockServerActionClient)),
}));

import { notificarVentaCreada } from "@/lib/notifications/venta";

function setVendedorLookupResult(result: { data: any; error: any }) {
  const chain = (mockSchemaClient as any).__makeVendedorChain(result);
  mockSchemaClient.from.mockReturnValue(chain);
  return chain;
}

beforeEach(() => {
  vi.clearAllMocks();
  // Restore the default "no vendedor found" chain after clearAllMocks wipes
  // mock implementations set via a previous test's setVendedorLookupResult.
  setVendedorLookupResult({ data: null, error: null });
});

describe("notificarVentaCreada", () => {
  it("notifica a ROL_ADMIN + ROL_COORDINADOR_VENTAS excluyendo al actor", async () => {
    await notificarVentaCreada({
      clienteNombre: "Juan Perez",
      loteCodigo: "A1",
      monto: 50000,
      actorId: "uid-1",
      actorNombre: "Vendedor Uno",
      ventaId: "v-1",
      codigoVenta: "VTA-1",
    });

    expect(mockNotificarUsuariosPorRoles).toHaveBeenCalledTimes(1);
    const [roles, tipo, titulo, mensaje, data, excluirId] = mockNotificarUsuariosPorRoles.mock.calls[0];

    expect(roles).toEqual(["ROL_ADMIN", "ROL_COORDINADOR_VENTAS"]);
    expect(tipo).toBe("venta");
    expect(titulo).toContain("A1");
    expect(mensaje).toContain("Juan Perez");
    expect(mensaje).toContain("Vendedor Uno");
    expect(data).toMatchObject({
      cliente_nombre: "Juan Perez",
      loteCodigo: "A1",
      ventaId: "v-1",
      codigoVenta: "VTA-1",
    });
    expect(excluirId).toBe("uid-1");
  });

  it("usa el nombre del cliente en el titulo cuando no hay lote", async () => {
    await notificarVentaCreada({ clienteNombre: "Maria Lopez", actorId: "uid-2" });

    const [, , titulo, mensaje] = mockNotificarUsuariosPorRoles.mock.calls[0];
    expect(titulo).toContain("Maria Lopez");
    expect(mensaje).toContain("Maria Lopez");
  });

  it("usa 'Un usuario' cuando no se provee actorNombre", async () => {
    await notificarVentaCreada({ clienteNombre: "Cliente X", actorId: "uid-3" });

    const [, , , mensaje] = mockNotificarUsuariosPorRoles.mock.calls[0];
    expect(mensaje).toContain("Un usuario");
  });

  describe("notificación al vendedor asignado", () => {
    it("incluye al vendedor asignado ademas del fanout de roles", async () => {
      setVendedorLookupResult({
        data: { id: "vend-1", rol: { nombre: "ROL_VENDEDOR" } },
        error: null,
      });

      await notificarVentaCreada({
        clienteNombre: "Juan Perez",
        loteCodigo: "A1",
        monto: 50000,
        actorId: "uid-1",
        actorNombre: "Vendedor Uno",
        ventaId: "v-1",
        codigoVenta: "VTA-1",
        vendedorUsername: "vendedor1",
      });

      expect(mockCrearNotificacion).toHaveBeenCalledTimes(1);
      const [usuarioId, tipo, titulo, mensaje, data] = mockCrearNotificacion.mock.calls[0];
      expect(usuarioId).toBe("vend-1");
      expect(tipo).toBe("venta");
      expect(titulo).toContain("A1");
      expect(mensaje).toContain("Juan Perez");
      expect(data).toMatchObject({ cliente_nombre: "Juan Perez" });
    });

    it("no notifica dos veces al actor cuando el vendedor asignado es quien registra la venta", async () => {
      setVendedorLookupResult({
        data: { id: "uid-1", rol: { nombre: "ROL_VENDEDOR" } },
        error: null,
      });

      await notificarVentaCreada({
        clienteNombre: "Juan Perez",
        actorId: "uid-1",
        vendedorUsername: "vendedor1",
      });

      expect(mockCrearNotificacion).not.toHaveBeenCalled();
    });

    it("no notifica por separado cuando el vendedor ya tiene un rol global notificado (dedupe)", async () => {
      setVendedorLookupResult({
        data: { id: "vend-2", rol: { nombre: "ROL_ADMIN" } },
        error: null,
      });

      await notificarVentaCreada({
        clienteNombre: "Juan Perez",
        actorId: "uid-1",
        vendedorUsername: "admin-vendedor",
      });

      expect(mockCrearNotificacion).not.toHaveBeenCalled();
    });

    it("sin vendedorUsername solo notifica los roles globales (no consulta ni notifica al vendedor)", async () => {
      await notificarVentaCreada({ clienteNombre: "Cliente X", actorId: "uid-3" });

      expect(mockServerActionClient.schema).not.toHaveBeenCalled();
      expect(mockCrearNotificacion).not.toHaveBeenCalled();
      expect(mockNotificarUsuariosPorRoles).toHaveBeenCalledTimes(1);
    });

    it("no falla si la notificación al vendedor asignado lanza (fire-and-forget)", async () => {
      setVendedorLookupResult({
        data: { id: "vend-1", rol: { nombre: "ROL_VENDEDOR" } },
        error: null,
      });
      mockCrearNotificacion.mockRejectedValueOnce(new Error("boom"));

      await expect(
        notificarVentaCreada({
          clienteNombre: "Juan Perez",
          actorId: "uid-1",
          vendedorUsername: "vendedor1",
        }),
      ).resolves.toBeDefined();
    });
  });
});
