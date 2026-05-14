import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetUser, mockServerActionClient, createChainMock } = vi.hoisted(() => {
  function createChainMock(finalResult: any = { data: null, error: null }) {
    const chain: any = {};
    const methods = ["select", "insert", "update", "delete", "eq", "neq", "is", "or", "order", "range", "single", "in", "limit", "head", "maybeSingle"];
    for (const method of methods) { chain[method] = vi.fn().mockReturnValue(chain); }
    chain.single.mockImplementation(() => Promise.resolve(finalResult));
    chain.order.mockImplementation(() => Promise.resolve(finalResult));
    chain.range.mockImplementation(() => Promise.resolve(finalResult));
    return chain;
  }
  const mockGetUser = vi.fn();
  const mockServerActionClient = {
    auth: { getUser: mockGetUser },
    from: vi.fn().mockReturnValue(createChainMock()),
  };
  return { mockGetUser, mockServerActionClient, createChainMock };
});

vi.mock("@/lib/supabase.server-actions", () => ({
  createServerActionClient: vi.fn().mockImplementation(() => Promise.resolve(mockServerActionClient)),
}));
vi.mock("@/lib/permissions/server", () => ({
  requierePermiso: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/permissions", () => ({
  PERMISOS: { VENTAS: { CREAR: "ventas.crear" } },
}));
vi.mock("@/app/dashboard/clientes/_actions-crm-helpers", () => ({
  obtenerUsernameActual: vi.fn().mockResolvedValue({ success: true, username: "vendedor1", userId: "uid-1" }),
  revalidarCliente: vi.fn(),
}));

import {
  crearEntrega,
  actualizarEntrega,
  obtenerEntregasCliente,
  obtenerEntregas,
  agregarObservacionEntrega,
  agregarChecklistItem,
  toggleChecklistItem,
} from "@/app/dashboard/entregas/_actions-entregas";

describe("crearEntrega", () => {
  beforeEach(() => { vi.clearAllMocks(); mockGetUser.mockResolvedValue({ data: { user: { id: "uid-1" } } }); });

  it("crea entrega correctamente", async () => {
    const chain = createChainMock({ data: { id: "e-1", estado: "programada" }, error: null });
    mockServerActionClient.from.mockReturnValue(chain);

    const result = await crearEntrega({
      ventaId: "v-1",
      clienteId: "c-1",
      loteId: "l-1",
      fechaProgramada: "2026-06-15",
    });
    expect(result.success).toBe(true);
  });

  it("maneja error al crear entrega", async () => {
    const chain = createChainMock();
    chain.single.mockImplementation(() => { throw { message: "Error" }; });
    mockServerActionClient.from.mockReturnValue(chain);

    const result = await crearEntrega({ ventaId: "v-1", clienteId: "c-1" });
    expect(result.success).toBe(false);
  });
});

describe("actualizarEntrega", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("actualiza estado de entrega", async () => {
    const chain = createChainMock({ data: { id: "e-1", estado: "en_inspeccion" }, error: null });
    mockServerActionClient.from.mockReturnValue(chain);

    const result = await actualizarEntrega("e-1", { estado: "en_inspeccion", clienteId: "c-1" });
    expect(result.success).toBe(true);
  });

  it("actualiza con acta de entrega", async () => {
    const chain = createChainMock({ data: { id: "e-1" }, error: null });
    mockServerActionClient.from.mockReturnValue(chain);

    const result = await actualizarEntrega("e-1", {
      estado: "entregada",
      fechaEntrega: "2026-06-20",
      actaUrl: "https://storage.example.com/acta.pdf",
      clienteId: "c-1",
    });
    expect(result.success).toBe(true);
  });
});

describe("obtenerEntregasCliente", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("obtiene entregas de un cliente", async () => {
    const chain = createChainMock();
    chain.order.mockImplementation(() => Promise.resolve({ data: [{ id: "e-1" }], error: null }));
    mockServerActionClient.from.mockReturnValue(chain);

    const result = await obtenerEntregasCliente("c-1");
    expect(result.success).toBe(true);
  });
});

describe("obtenerEntregas", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("llama a supabase from('entrega') para listar", async () => {
    const chain = createChainMock();
    // Make the chain awaitable (the query is awaited directly after range)
    chain.range.mockImplementation(() => Promise.resolve({ data: [], error: null }));
    chain.order.mockReturnValue(chain);
    mockServerActionClient.from.mockReturnValue(chain);

    await obtenerEntregas();
    expect(mockServerActionClient.from).toHaveBeenCalledWith("entrega");
  });

  it("maneja error al listar entregas", async () => {
    const chain = createChainMock();
    chain.range.mockImplementation(() => Promise.resolve({ data: null, error: { message: "DB error" } }));
    chain.order.mockReturnValue(chain);
    mockServerActionClient.from.mockReturnValue(chain);

    const result = await obtenerEntregas();
    expect(result.success).toBe(false);
  });
});

describe("agregarObservacionEntrega", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("agrega observación", async () => {
    const chain = createChainMock({ data: { id: "obs-1" }, error: null });
    mockServerActionClient.from.mockReturnValue(chain);

    const result = await agregarObservacionEntrega({
      entregaId: "e-1",
      descripcion: "Falta pintar pared lateral",
      fotoUrl: "https://storage.example.com/foto.jpg",
      clienteId: "c-1",
    });
    expect(result.success).toBe(true);
  });
});

describe("agregarChecklistItem", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("agrega item al checklist", async () => {
    const chain = createChainMock({ data: { id: "cli-1" }, error: null });
    mockServerActionClient.from.mockReturnValue(chain);

    const result = await agregarChecklistItem({
      entregaId: "e-1",
      item: "Verificar instalaciones eléctricas",
      orden: 1,
    });
    expect(result.success).toBe(true);
  });
});

describe("toggleChecklistItem (entregas)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("aprueba item del checklist", async () => {
    const chain = createChainMock({ data: { id: "cli-1", aprobado: true }, error: null });
    mockServerActionClient.from.mockReturnValue(chain);

    const result = await toggleChecklistItem("cli-1", true, "inspector1");
    expect(result.success).toBe(true);
  });
});
