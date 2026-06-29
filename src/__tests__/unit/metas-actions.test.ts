import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetUser: _mockGetUser, mockServerActionClient, createChainMock } = vi.hoisted(() => {
  function createChainMock(finalResult: any = { data: null, error: null }) {
    const chain: any = {};
    const methods = ["select", "insert", "update", "delete", "eq", "neq", "is", "or", "order", "range", "single", "in", "limit", "head", "maybeSingle", "upsert"];
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
  tienePermiso: vi.fn().mockResolvedValue(true),
}));
vi.mock("@/lib/permissions", () => ({
  PERMISOS: { METAS: { ASIGNAR: "metas.asignar" } },
}));
vi.mock("@/app/dashboard/clientes/_actions-crm-helpers", () => ({
  obtenerUsernameActual: vi.fn().mockResolvedValue({ success: true, username: "admin1", userId: "uid-1" }),
  revalidarCliente: vi.fn(),
}));

import { tienePermiso } from "@/lib/permissions/server";
import { obtenerUsernameActual } from "@/app/dashboard/clientes/_actions-crm-helpers";

import {
  guardarMeta,
  obtenerMetas,
  obtenerKPIs,
  obtenerMotivosDesestimacion,
} from "@/app/dashboard/admin/metas/_actions-metas";

describe("guardarMeta", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("guarda meta de vendedor", async () => {
    const chain = createChainMock({ data: { id: "m-1" }, error: null });
    mockServerActionClient.from.mockReturnValue(chain);

    const result = await guardarMeta({
      vendedorUsername: "vendedor1",
      periodoAnio: 2026,
      periodoMes: 3,
      metaVentasMonto: 500000,
      metaVentasCantidad: 5,
      metaSeparaciones: 10,
      metaContactos: 50,
      metaVisitas: 20,
    });
    expect(result.success).toBe(true);
  });

  it("maneja error al guardar meta", async () => {
    const chain = createChainMock();
    chain.single.mockImplementation(() => { throw { message: "Duplicate" }; });
    mockServerActionClient.from.mockReturnValue(chain);

    const result = await guardarMeta({
      vendedorUsername: "vendedor1",
      periodoAnio: 2026,
      periodoMes: 3,
    });
    expect(result.success).toBe(false);
  });
});

describe("obtenerMetas", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("llama a from('meta_vendedor') para obtener metas", async () => {
    vi.mocked(tienePermiso).mockResolvedValueOnce(true);
    const chain = createChainMock();
    chain.order.mockImplementation(() => Promise.resolve({ data: [{ id: "m-1" }], error: null }));
    mockServerActionClient.from.mockReturnValue(chain);

    await obtenerMetas();
    expect(mockServerActionClient.from).toHaveBeenCalledWith("meta_vendedor");
  });

  it("maneja error al obtener metas", async () => {
    vi.mocked(tienePermiso).mockResolvedValueOnce(true);
    const chain = createChainMock();
    chain.order.mockImplementation(() => { throw { message: "DB error" }; });
    mockServerActionClient.from.mockReturnValue(chain);

    const result = await obtenerMetas();
    expect(result.success).toBe(false);
  });

  // global role must return all metas without a vendedor_username ownership filter
  // Note: use mockReturnValue(chain) for order so the two chained .order() calls work.
  it("global role — returns all metas without vendedor_username filter", async () => {
    vi.mocked(tienePermiso).mockResolvedValueOnce(true);
    const chain = createChainMock();
    chain.order.mockReturnValue(chain); // allow .order().order() chaining
    mockServerActionClient.from.mockReturnValue(chain);

    await obtenerMetas();

    // The key assertion: no own-vendor scope filter applied for global role
    expect(chain.eq).not.toHaveBeenCalledWith("vendedor_username", "admin1");
  });

  // vendor role must scope metas query to own vendedor_username
  it("vendor role — scopes query to own vendedor_username", async () => {
    vi.mocked(tienePermiso).mockResolvedValueOnce(false); // vendor
    vi.mocked(obtenerUsernameActual).mockResolvedValueOnce({
      success: true,
      username: "vendedor1",
      userId: "uid-v1",
    } as any);

    const chain = createChainMock();
    chain.order.mockReturnValue(chain); // allow .order().order() chaining
    mockServerActionClient.from.mockReturnValue(chain);

    await obtenerMetas();

    expect(chain.eq).toHaveBeenCalledWith("vendedor_username", "vendedor1");
  });
});

describe("obtenerKPIs", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("obtiene KPIs de vendedor (global role)", async () => {
    vi.mocked(tienePermiso).mockResolvedValueOnce(true);
    const kpiData = [{
      meta_id: "m-1",
      vendedor_username: "vendedor1",
      meta_ventas_monto: 500000,
      real_ventas_monto: 350000,
      meta_separaciones: 10,
      real_separaciones: 7,
    }];
    const chain = createChainMock();
    chain.order.mockImplementation(() => Promise.resolve({ data: kpiData, error: null }));
    mockServerActionClient.from.mockReturnValue(chain);

    const result = await obtenerKPIs({ vendedorUsername: "vendedor1" });
    expect(result.success).toBe(true);
  });

  // global role must return all KPIs without a vendedor_username ownership filter
  it("global role — returns all KPIs without own-vendor filter", async () => {
    vi.mocked(tienePermiso).mockResolvedValueOnce(true);
    const chain = createChainMock();
    mockServerActionClient.from.mockReturnValue(chain);

    await obtenerKPIs();

    // The key assertion: no own-vendor scope filter applied for global role
    expect(chain.eq).not.toHaveBeenCalledWith("vendedor_username", "admin1");
  });

  // vendor role must scope KPIs query to own vendedor_username
  it("vendor role — scopes query to own vendedor_username", async () => {
    vi.mocked(tienePermiso).mockResolvedValueOnce(false); // vendor
    vi.mocked(obtenerUsernameActual).mockResolvedValueOnce({
      success: true,
      username: "vendedor1",
      userId: "uid-v1",
    } as any);

    const chain = createChainMock();
    mockServerActionClient.from.mockReturnValue(chain);

    await obtenerKPIs();

    expect(chain.eq).toHaveBeenCalledWith("vendedor_username", "vendedor1");
  });
});

describe("obtenerMotivosDesestimacion", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("obtiene catálogo de motivos", async () => {
    const motivos = [
      { id: "1", codigo: "precio", descripcion: "Precio fuera de presupuesto" },
      { id: "2", codigo: "competencia", descripcion: "Compró con la competencia" },
    ];
    const chain = createChainMock();
    chain.order.mockImplementation(() => Promise.resolve({ data: motivos, error: null }));
    mockServerActionClient.from.mockReturnValue(chain);

    const result = await obtenerMotivosDesestimacion();
    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2);
  });
});
