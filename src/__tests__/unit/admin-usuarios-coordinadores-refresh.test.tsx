import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";

// ==================== MOCKS ====================

const cambiarEstadoUsuario = vi.fn();

vi.mock("@/app/dashboard/admin/usuarios/_actions", () => ({
  cambiarEstadoUsuario: (...args: unknown[]) => cambiarEstadoUsuario(...args),
  eliminarUsuario: vi.fn(),
  resetearPasswordUsuario: vi.fn(),
  restaurarUsuario: vi.fn(),
  reasignarClientes: vi.fn(),
  contarClientesAsignados: vi.fn().mockResolvedValue(0),
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

const vendedor = {
  id: "vend-1",
  username: "vend1",
  nombre_completo: "Vendedor Uno",
  email: "vend1@test.com",
  rol: { id: "r2", nombre: "ROL_VENDEDOR", descripcion: "Vendedor" },
  activo: true,
  created_at: "2026-01-01T00:00:00.000Z",
};

let vendedoresApiCallCount = 0;

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
      vendedoresApiCallCount += 1;
      return Promise.resolve({
        ok: true,
        json: async () => ({
          vendedores: [{ id: "coord-1", username: "coord1", nombre_completo: "Coordinador Uno", rol: "ROL_COORDINADOR_VENTAS" }],
        }),
      });
    }
    if (url.includes("/api/admin/usuarios")) {
      return Promise.resolve({ ok: true, json: async () => ({ usuarios: [coordinador, vendedor], total: 2 }) });
    }
    return Promise.resolve({ ok: true, json: async () => ({}) });
  }) as unknown as typeof fetch;
}

// Import after mocks
import AdminUsuariosPage from "@/app/dashboard/admin/usuarios/page";

describe("admin/usuarios page — coordinadores list freshness", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vendedoresApiCallCount = 0;
    global.fetch = mockFetch();
  });

  it("refetches /api/clientes/vendedores when EquipoDecisionModal opens (needsEquipoDecision path)", async () => {
    cambiarEstadoUsuario.mockResolvedValueOnce({ success: false, needsEquipoDecision: true, equipoSize: 3, error: "tiene equipo" });

    render(<AdminUsuariosPage />);

    // "Coordinador Uno" also renders inside the "Todos los coordinadores"
    // filter <option> once /api/clientes/vendedores resolves — use getAllBy
    // to avoid a multiple-match error instead of asserting on a single node.
    await waitFor(() => expect(screen.getAllByText("Coordinador Uno").length).toBeGreaterThan(0));
    await waitFor(() => expect(vendedoresApiCallCount).toBe(1)); // mount-time fetch only

    // Both the coordinador and the vendedor rows are active, so there are two
    // "Desactivar" buttons on the page — scope to the coordinador's row. The
    // row name renders as a <p>; the filter <option> is not inside a <tr>.
    const coordinadorNamesInDom = screen.getAllByText("Coordinador Uno");
    const coordinadorRow = coordinadorNamesInDom.map((el) => el.closest("tr")).find((tr): tr is HTMLTableRowElement => tr !== null)!;
    fireEvent.click(within(coordinadorRow).getByTitle("Desactivar"));
    const estadoDialog = await screen.findByRole("dialog");
    fireEvent.change(within(estadoDialog).getByLabelText(/motivo del cambio de estado/i), {
      target: { value: "Motivo de prueba con más de diez caracteres" },
    });
    fireEvent.click(within(estadoDialog).getByRole("button", { name: /^desactivar$/i }));

    await waitFor(() => expect(cambiarEstadoUsuario).toHaveBeenCalledTimes(1));
    // EquipoDecisionModal opened — the coordinadores list must be refreshed,
    // not served from the stale mount-time snapshot.
    await waitFor(() => expect(vendedoresApiCallCount).toBeGreaterThanOrEqual(2));
  });

  it("refetches /api/clientes/vendedores when BulkCoordinadorModal opens (Asignar coordinador click)", async () => {
    render(<AdminUsuariosPage />);

    await waitFor(() => expect(screen.getByText("Vendedor Uno")).toBeInTheDocument());
    await waitFor(() => expect(vendedoresApiCallCount).toBe(1)); // mount-time fetch only

    fireEvent.click(await screen.findByLabelText(/seleccionar a vendedor uno/i));
    fireEvent.click(await screen.findByRole("button", { name: /asignar coordinador/i }));

    await waitFor(() => expect(vendedoresApiCallCount).toBeGreaterThanOrEqual(2));
  });
});
