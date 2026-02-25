import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabase client
const mockInsert = vi.fn();
const mockSchema = vi.fn();
const mockFrom = vi.fn();

const mockSupabase = {
  schema: mockSchema,
};

mockSchema.mockReturnValue({ from: mockFrom });
mockFrom.mockReturnValue({ insert: mockInsert });

// Now import after mocks are set up - we test the function logic directly
// Since the module uses SupabaseClient as a type, we can pass our mock
import { registrarAuditoriaUsuario } from "@/lib/auditoria-usuarios";

describe("registrarAuditoriaUsuario", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSchema.mockReturnValue({ from: mockFrom });
    mockFrom.mockReturnValue({ insert: mockInsert });
  });

  it("inserta correctamente un registro de auditoría", async () => {
    mockInsert.mockResolvedValue({ error: null });

    await registrarAuditoriaUsuario(mockSupabase as any, {
      adminId: "admin-123",
      adminNombre: "Admin Test",
      usuarioId: "user-456",
      usuarioNombre: "Usuario Test",
      accion: "crear",
      detalles: { username: "utest", email: "test@mail.com" },
    });

    expect(mockSchema).toHaveBeenCalledWith("crm");
    expect(mockFrom).toHaveBeenCalledWith("auditoria_usuarios");
    expect(mockInsert).toHaveBeenCalledWith({
      admin_id: "admin-123",
      admin_nombre: "Admin Test",
      usuario_id: "user-456",
      usuario_nombre: "Usuario Test",
      accion: "crear",
      detalles: { username: "utest", email: "test@mail.com" },
    });
  });

  it("usa detalles vacío si no se proporcionan", async () => {
    mockInsert.mockResolvedValue({ error: null });

    await registrarAuditoriaUsuario(mockSupabase as any, {
      adminId: "admin-123",
      adminNombre: "Admin",
      usuarioId: "user-456",
      usuarioNombre: "User",
      accion: "eliminar",
    });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ detalles: {} })
    );
  });

  it("no lanza error si la tabla no existe (PGRST205)", async () => {
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    mockInsert.mockResolvedValue({
      error: { code: "PGRST205", message: "table not found" },
    });

    // Should not throw
    await expect(
      registrarAuditoriaUsuario(mockSupabase as any, {
        adminId: "admin-123",
        adminNombre: "Admin",
        usuarioId: "user-456",
        usuarioNombre: "User",
        accion: "editar",
      })
    ).resolves.toBeUndefined();

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Tabla no encontrada")
    );
    consoleSpy.mockRestore();
  });

  it("no lanza error ante errores genéricos de DB", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockInsert.mockResolvedValue({
      error: { code: "42501", message: "permission denied" },
    });

    await expect(
      registrarAuditoriaUsuario(mockSupabase as any, {
        adminId: "admin-123",
        adminNombre: "Admin",
        usuarioId: "user-456",
        usuarioNombre: "User",
        accion: "activar",
      })
    ).resolves.toBeUndefined();

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("no lanza error si la promise se rechaza", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockInsert.mockRejectedValue(new Error("Network error"));

    await expect(
      registrarAuditoriaUsuario(mockSupabase as any, {
        adminId: "admin-123",
        adminNombre: "Admin",
        usuarioId: "user-456",
        usuarioNombre: "User",
        accion: "desactivar",
      })
    ).resolves.toBeUndefined();

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("acepta todas las acciones válidas", async () => {
    mockInsert.mockResolvedValue({ error: null });

    const acciones = [
      "crear",
      "editar",
      "activar",
      "desactivar",
      "eliminar",
      "resetear_password",
      "restaurar",
    ] as const;

    for (const accion of acciones) {
      await registrarAuditoriaUsuario(mockSupabase as any, {
        adminId: "admin-123",
        adminNombre: "Admin",
        usuarioId: "user-456",
        usuarioNombre: "User",
        accion,
      });
    }

    expect(mockInsert).toHaveBeenCalledTimes(acciones.length);
  });
});
