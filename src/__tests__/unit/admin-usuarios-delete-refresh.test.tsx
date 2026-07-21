import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";

// ==================== MOCKS ====================

const eliminarUsuario = vi.fn();
const contarClientesAsignados = vi.fn().mockResolvedValue(0);

vi.mock("@/app/dashboard/admin/usuarios/_actions", () => ({
  cambiarEstadoUsuario: vi.fn(),
  eliminarUsuario: (...args: unknown[]) => eliminarUsuario(...args),
  resetearPasswordUsuario: vi.fn(),
  restaurarUsuario: vi.fn(),
  reasignarClientes: vi.fn(),
  contarClientesAsignados: (...args: unknown[]) => contarClientesAsignados(...args),
}));

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock("react-hot-toast", () => ({
  default: { success: (...a: unknown[]) => toastSuccess(...a), error: (...a: unknown[]) => toastError(...a) },
}));

const vendedor = {
  id: "vend-1",
  username: "vend1",
  nombre_completo: "Vendedor Uno",
  email: "vend1@test.com",
  rol: { id: "r2", nombre: "ROL_VENDEDOR", descripcion: "Vendedor" },
  activo: true,
  created_at: "2026-01-01T00:00:00.000Z",
  coordinador: { id: "coord-1", nombre_completo: "Coordinador Uno" },
};

// After the coordinador is deleted, the server-side team decision (transfer
// or dejar-sin-coordinador — resolverEquipoDelCoordinador in _actions.ts)
// moves this vendedor's coordinador_id. The refetch must be what makes that
// visible; a local filter of the deleted row alone would never show it.
const vendedorTrasTransferencia = {
  ...vendedor,
  coordinador: { id: "coord-2", nombre_completo: "Coordinador Dos" },
};

let usuariosApiCallCount = 0;

function mockFetch() {
  return vi.fn((url: string) => {
    if (url.includes("/api/auth/permissions")) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ usuario: { id: "admin-1", rol: "ROL_ADMIN", permisos: [], activo: true } }),
      });
    }
    if (url.includes("/api/admin/roles")) {
      return Promise.resolve({ ok: true, json: async () => ({ roles: [] }) });
    }
    if (url.includes("/api/clientes/vendedores")) {
      return Promise.resolve({ ok: true, json: async () => ({ vendedores: [] }) });
    }
    if (url.includes("/api/admin/usuarios")) {
      usuariosApiCallCount += 1;
      const usuarios = usuariosApiCallCount === 1 ? [vendedor] : [vendedorTrasTransferencia];
      return Promise.resolve({ ok: true, json: async () => ({ usuarios, total: 1 }) });
    }
    return Promise.resolve({ ok: true, json: async () => ({}) });
  }) as unknown as typeof fetch;
}

// Import after mocks
import AdminUsuariosPage from "@/app/dashboard/admin/usuarios/page";

describe("admin/usuarios page — delete refreshes the full list", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usuariosApiCallCount = 0;
    contarClientesAsignados.mockResolvedValue(0);
    global.fetch = mockFetch();
  });

  it("refetches usuarios on delete success, surfacing a team member's updated Coordinador column instead of only filtering the deleted row locally", async () => {
    eliminarUsuario.mockResolvedValueOnce({ success: true, message: "Usuario eliminado exitosamente" });

    render(<AdminUsuariosPage />);

    await waitFor(() => expect(screen.getByText("Vendedor Uno")).toBeInTheDocument());
    expect(screen.getByText("Coordinador Uno")).toBeInTheDocument();

    fireEvent.click(await screen.findByTitle("Eliminar"));

    // DeleteUserModal has no role="dialog" — locate it by its confirm input.
    const confirmInput = await screen.findByPlaceholderText("ELIMINAR");
    fireEvent.change(confirmInput, { target: { value: "ELIMINAR" } });
    fireEvent.click(screen.getByRole("button", { name: /eliminar usuario/i }));

    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith("Usuario eliminado exitosamente"));

    // The refetch is the ONLY way this can show up — it comes from a second
    // /api/admin/usuarios response, not a local Array.prototype.filter.
    await waitFor(() => expect(usuariosApiCallCount).toBeGreaterThanOrEqual(2));
    await waitFor(() => expect(screen.getByText("Coordinador Dos")).toBeInTheDocument());
    expect(screen.queryByPlaceholderText("ELIMINAR")).not.toBeInTheDocument();
  });
});
