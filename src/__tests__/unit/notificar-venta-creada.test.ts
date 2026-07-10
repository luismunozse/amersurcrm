import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockNotificarUsuariosPorRoles } = vi.hoisted(() => ({
  mockNotificarUsuariosPorRoles: vi.fn().mockResolvedValue({ enviadas: 2, errores: 0 }),
}));

vi.mock("@/app/_actionsNotifications", () => ({
  notificarUsuariosPorRoles: mockNotificarUsuariosPorRoles,
}));

import { notificarVentaCreada } from "@/lib/notifications/venta";

beforeEach(() => {
  vi.clearAllMocks();
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
});
