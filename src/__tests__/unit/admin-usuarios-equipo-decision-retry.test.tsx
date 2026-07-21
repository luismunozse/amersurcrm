import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";

// ==================== MOCKS ====================

const cambiarEstadoUsuario = vi.fn();
const eliminarUsuario = vi.fn();
const contarClientesAsignados = vi.fn().mockResolvedValue(0);

vi.mock("@/app/dashboard/admin/usuarios/_actions", () => ({
  cambiarEstadoUsuario: (...args: unknown[]) => cambiarEstadoUsuario(...args),
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

const coordinador = {
  id: "coord-1",
  username: "coord1",
  nombre_completo: "Coordinador Uno",
  email: "coord1@test.com",
  rol: { id: "r1", nombre: "ROL_COORDINADOR_VENTAS", descripcion: "Coordinador" },
  activo: true,
  created_at: "2026-01-01T00:00:00.000Z",
};

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
      return Promise.resolve({ ok: true, json: async () => ({ usuarios: [coordinador], total: 1 }) });
    }
    return Promise.resolve({ ok: true, json: async () => ({}) });
  }) as unknown as typeof fetch;
}

// Import after mocks
import AdminUsuariosPage from "@/app/dashboard/admin/usuarios/page";

describe("admin/usuarios page — equipo-decision retry contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    contarClientesAsignados.mockResolvedValue(0);
    global.fetch = mockFetch();
  });

  it("keeps the modal open and warns via toast (no silent close) when the resumed action needs a decision again, then closes on eventual success", async () => {
    // 1st call (no decision yet): needs a decision, team of 4.
    // 2nd call (resumed with a decision): needs a decision AGAIN, team of 2 —
    // this is the scenario the reviewer flagged: the executor must report
    // "needs-decision" so the caller does not stomp the freshly reopened modal.
    // 3rd call (resumed again): succeeds.
    cambiarEstadoUsuario
      .mockResolvedValueOnce({ success: false, needsEquipoDecision: true, equipoSize: 4, error: "tiene equipo" })
      .mockResolvedValueOnce({ success: false, needsEquipoDecision: true, equipoSize: 2, error: "tiene equipo" })
      .mockResolvedValueOnce({ success: true, message: "Usuario desactivado exitosamente" });

    render(<AdminUsuariosPage />);

    // Wait for the coordinador row and open EstadoUsuarioModal via "Desactivar".
    // (findByTitle waits for both the usuarios fetch AND the permissions
    // fetch that gates the ProtectedAction wrapping this button.)
    await waitFor(() => expect(screen.getByText("Coordinador Uno")).toBeInTheDocument());
    fireEvent.click(await screen.findByTitle("Desactivar"));

    const estadoDialog = await screen.findByRole("dialog");
    fireEvent.change(within(estadoDialog).getByLabelText(/motivo del cambio de estado/i), {
      target: { value: "Motivo de prueba con más de diez caracteres" },
    });
    fireEvent.click(within(estadoDialog).getByRole("button", { name: /^desactivar$/i }));

    // First response: needsEquipoDecision -> EquipoDecisionModal opens with size 4.
    await waitFor(() => expect(cambiarEstadoUsuario).toHaveBeenCalledTimes(1));
    let equipoDialog = await screen.findByRole("dialog");
    expect(within(equipoDialog).getByText("4")).toBeInTheDocument();

    // Choose "dejar sin coordinador" and confirm.
    fireEvent.click(within(equipoDialog).getByLabelText(/sin coordinador/i));
    fireEvent.click(within(equipoDialog).getByRole("button", { name: /confirmar/i }));

    // Second response also needsEquipoDecision (size 2) — the fix under test:
    // the modal must stay open with the fresh state, not get stomped shut.
    await waitFor(() => expect(cambiarEstadoUsuario).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(toastError).toHaveBeenCalledWith(
      "No se pudo completar la acción. Por favor, seleccione nuevamente."
    ));
    equipoDialog = screen.getByRole("dialog");
    expect(within(equipoDialog).getByText("2")).toBeInTheDocument();
    expect(toastSuccess).not.toHaveBeenCalled();

    // Confirm again — this time it succeeds, and the modal should close.
    fireEvent.click(within(equipoDialog).getByLabelText(/sin coordinador/i));
    fireEvent.click(within(equipoDialog).getByRole("button", { name: /confirmar/i }));

    await waitFor(() => expect(cambiarEstadoUsuario).toHaveBeenCalledTimes(3));
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith("Usuario desactivado exitosamente"));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});
