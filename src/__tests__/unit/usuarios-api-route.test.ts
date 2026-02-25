import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ==================== HOISTED MOCKS ====================
// vi.mock is hoisted to the top, so we need vi.hoisted for variables referenced in factories

const {
  mockGetUser,
  mockSchemaFrom,
  mockSchema,
  mockSupabase,
  mockServiceRole,
  createChainMock,
} = vi.hoisted(() => {
  function createChainMock(finalResult: any = { data: [], error: null, count: 0 }) {
    const chain: any = {};
    const methods = ["select", "insert", "update", "eq", "neq", "is", "or", "order", "range", "single", "in", "limit"];
    for (const method of methods) {
      chain[method] = vi.fn().mockReturnValue(chain);
    }
    chain.range.mockImplementation(() => Promise.resolve(finalResult));
    chain.single.mockImplementation(() => Promise.resolve(finalResult));
    chain.order.mockReturnValue(chain);
    chain.limit.mockImplementation(() => Promise.resolve(finalResult));
    return chain;
  }

  const mockGetUser = vi.fn();
  const mockSchemaFrom = vi.fn().mockReturnValue(createChainMock());
  const mockSchema = vi.fn().mockReturnValue({ from: mockSchemaFrom });

  const mockSupabase = {
    auth: { getUser: mockGetUser },
    schema: mockSchema,
  };

  const mockServiceRole = {
    auth: {
      admin: {
        listUsers: vi.fn().mockResolvedValue({ data: { users: [] } }),
        createUser: vi.fn(),
        deleteUser: vi.fn(),
        updateUserById: vi.fn(),
      },
    },
    schema: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue(createChainMock()) }),
  };

  return { mockGetUser, mockSchemaFrom, mockSchema, mockSupabase, mockServiceRole, createChainMock };
});

vi.mock("@/lib/supabase.server", () => ({
  createServerOnlyClient: vi.fn().mockImplementation(() => Promise.resolve(mockSupabase)),
  createServiceRoleClient: vi.fn().mockReturnValue(mockServiceRole),
}));

vi.mock("@/lib/permissions/server", () => ({
  esAdmin: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/utils/username-generator", () => ({
  generarUsername: vi.fn().mockReturnValue("jperez"),
  generarUsernameConNumero: vi.fn().mockImplementation((base: string, num: number) => `${base}${num}`),
  validarUsername: vi.fn().mockReturnValue({ valido: true }),
}));

vi.mock("@/app/_actionsNotifications", () => ({
  crearNotificacion: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/auditoria-usuarios", () => ({
  registrarAuditoriaUsuario: vi.fn().mockResolvedValue(undefined),
}));

// Import after mocks
import { GET, POST, PATCH } from "@/app/api/admin/usuarios/route";
import { esAdmin } from "@/lib/permissions/server";

describe("GET /api/admin/usuarios", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "admin-1", email: "admin@test.com" } } });
    (esAdmin as any).mockResolvedValue(true);

    const chain = createChainMock({ data: [], error: null, count: 0 });
    chain.range.mockResolvedValue({ data: [], error: null, count: 0 });
    chain.limit.mockResolvedValue({ data: [], error: null });
    mockSchemaFrom.mockReturnValue(chain);
    mockSchema.mockReturnValue({ from: mockSchemaFrom });
  });

  it("retorna 401 si el usuario no está autenticado", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const req = new NextRequest("http://localhost:3000/api/admin/usuarios");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe("No autorizado");
  });

  it("retorna 403 si el usuario no es admin", async () => {
    (esAdmin as any).mockResolvedValue(false);

    const req = new NextRequest("http://localhost:3000/api/admin/usuarios");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toContain("permisos");
  });

  it("parsea correctamente los parámetros de paginación", async () => {
    const req = new NextRequest(
      "http://localhost:3000/api/admin/usuarios?page=2&limit=20&search=test&rol=rol-1&estado=activo"
    );
    const res = await GET(req);
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(body.page).toBe(2);
    expect(body.limit).toBe(20);
  });

  it("limita el limit a un máximo de 50", async () => {
    const req = new NextRequest("http://localhost:3000/api/admin/usuarios?limit=100");
    const res = await GET(req);
    const body = await res.json();

    expect(body.limit).toBe(50);
  });

  it("asegura que page mínimo sea 1", async () => {
    const req = new NextRequest("http://localhost:3000/api/admin/usuarios?page=-5");
    const res = await GET(req);
    const body = await res.json();

    expect(body.page).toBe(1);
  });

  it("retorna historial si se pasa ?historial=userId", async () => {
    const chain = createChainMock();
    chain.limit.mockResolvedValue({
      data: [{ id: 1, campo: "nombre", valor_anterior: "A", valor_nuevo: "B" }],
      error: null,
    });
    mockSchemaFrom.mockReturnValue(chain);

    const req = new NextRequest("http://localhost:3000/api/admin/usuarios?historial=user-456");
    const res = await GET(req);
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(body.historial).toBeDefined();
  });

  it("retorna array vacío si error PGRST205 (tabla no existe)", async () => {
    const chain = createChainMock();
    chain.range.mockResolvedValue({
      data: null,
      error: { code: "PGRST205", message: "table not found" },
      count: null,
    });
    mockSchemaFrom.mockReturnValue(chain);

    const req = new NextRequest("http://localhost:3000/api/admin/usuarios");
    const res = await GET(req);
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(body.usuarios).toEqual([]);
    expect(body.total).toBe(0);
  });

  it("retorna 500 ante errores genéricos de DB", async () => {
    const chain = createChainMock();
    chain.range.mockResolvedValue({
      data: null,
      error: { code: "42P01", message: "generic error" },
      count: null,
    });
    mockSchemaFrom.mockReturnValue(chain);
    vi.spyOn(console, "error").mockImplementation(() => {});

    const req = new NextRequest("http://localhost:3000/api/admin/usuarios");
    const res = await GET(req);

    expect(res.status).toBe(500);
  });

  it("mapea meta_mensual_ventas a meta_mensual en respuesta", async () => {
    const chain = createChainMock();
    chain.range.mockResolvedValue({
      data: [{ id: "user-1", meta_mensual_ventas: 50000, nombre_completo: "Test" }],
      error: null,
      count: 1,
    });
    mockSchemaFrom.mockReturnValue(chain);

    const req = new NextRequest("http://localhost:3000/api/admin/usuarios");
    const res = await GET(req);
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(body.usuarios[0].meta_mensual).toBe(50000);
    expect(body.usuarios[0].meta_mensual_ventas).toBeUndefined();
  });
});

describe("POST /api/admin/usuarios", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "admin-1", email: "admin@test.com" } } });
    (esAdmin as any).mockResolvedValue(true);

    const chain = createChainMock();
    chain.single.mockResolvedValue({ data: null, error: { code: "PGRST116" } });
    mockSchemaFrom.mockReturnValue(chain);
    mockSchema.mockReturnValue({ from: mockSchemaFrom });
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("retorna 401 si no hay usuario autenticado", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const formData = new FormData();
    formData.append("nombre_completo", "Test");
    const req = new NextRequest("http://localhost:3000/api/admin/usuarios", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("retorna 403 si no es admin", async () => {
    (esAdmin as any).mockResolvedValue(false);

    const formData = new FormData();
    formData.append("nombre_completo", "Test");
    const req = new NextRequest("http://localhost:3000/api/admin/usuarios", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("retorna 400 si falta la contraseña", async () => {
    const formData = new FormData();
    formData.append("nombre_completo", "Test User");
    formData.append("email", "test@gmail.com");
    formData.append("rol_id", "rol-1");

    const req = new NextRequest("http://localhost:3000/api/admin/usuarios", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain("contraseña");
  });

  it("retorna 400 si contraseña es menor a 6 caracteres", async () => {
    const formData = new FormData();
    formData.append("nombre_completo", "Test");
    formData.append("password", "12345");
    formData.append("rol_id", "rol-1");
    formData.append("email", "test@gmail.com");

    const req = new NextRequest("http://localhost:3000/api/admin/usuarios", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("retorna 400 si falta el rol_id", async () => {
    const formData = new FormData();
    formData.append("nombre_completo", "Test");
    formData.append("password", "password123");
    formData.append("email", "test@gmail.com");

    const req = new NextRequest("http://localhost:3000/api/admin/usuarios", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("retorna 400 si el email es vacío", async () => {
    const rolChain = createChainMock();
    rolChain.single.mockResolvedValue({ data: { id: "rol-1", nombre: "ROL_VENDEDOR" }, error: null });
    mockSchemaFrom.mockReturnValue(rolChain);

    const formData = new FormData();
    formData.append("nombre_completo", "Test User");
    formData.append("dni", "12345678");
    formData.append("password", "password123");
    formData.append("rol_id", "rol-1");
    formData.append("email", "");

    const req = new NextRequest("http://localhost:3000/api/admin/usuarios", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain("email");
  });

  it("retorna 400 si el email tiene dominio local", async () => {
    const rolChain = createChainMock();
    rolChain.single.mockResolvedValue({ data: { id: "rol-1", nombre: "ROL_VENDEDOR" }, error: null });
    mockSchemaFrom.mockReturnValue(rolChain);

    const formData = new FormData();
    formData.append("nombre_completo", "Test User");
    formData.append("dni", "12345678");
    formData.append("password", "password123");
    formData.append("rol_id", "rol-1");
    formData.append("email", "test@domain.local");

    const req = new NextRequest("http://localhost:3000/api/admin/usuarios", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain("dominio");
  });

  it("retorna 400 si DNI no tiene 8 dígitos para vendedor", async () => {
    const rolChain = createChainMock();
    rolChain.single.mockResolvedValue({ data: { id: "rol-1", nombre: "ROL_VENDEDOR" }, error: null });
    mockSchemaFrom.mockReturnValue(rolChain);

    const formData = new FormData();
    formData.append("nombre_completo", "Test User");
    formData.append("dni", "1234567");
    formData.append("password", "password123");
    formData.append("rol_id", "rol-1");
    formData.append("email", "test@gmail.com");

    const req = new NextRequest("http://localhost:3000/api/admin/usuarios", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain("8 dígitos");
  });

  it("retorna 400 si email tiene formato inválido", async () => {
    const rolChain = createChainMock();
    rolChain.single.mockResolvedValue({ data: { id: "rol-1", nombre: "ROL_VENDEDOR" }, error: null });
    mockSchemaFrom.mockReturnValue(rolChain);

    const formData = new FormData();
    formData.append("nombre_completo", "Test User");
    formData.append("dni", "12345678");
    formData.append("password", "password123");
    formData.append("rol_id", "rol-1");
    formData.append("email", "not-an-email");

    const req = new NextRequest("http://localhost:3000/api/admin/usuarios", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain("email");
  });
});

describe("PATCH /api/admin/usuarios", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "admin-1", email: "admin@test.com" } } });
    (esAdmin as any).mockResolvedValue(true);
    mockSchema.mockReturnValue({ from: mockSchemaFrom });
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("retorna 401 si no hay usuario autenticado", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const req = new NextRequest("http://localhost:3000/api/admin/usuarios", {
      method: "PATCH",
      body: JSON.stringify({ id: "user-1", nombre_completo: "New Name" }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(401);
  });

  it("retorna 403 si no es admin", async () => {
    (esAdmin as any).mockResolvedValue(false);

    const req = new NextRequest("http://localhost:3000/api/admin/usuarios", {
      method: "PATCH",
      body: JSON.stringify({ id: "user-1", nombre_completo: "New Name" }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(403);
  });

  it("retorna 400 si falta el id", async () => {
    const req = new NextRequest("http://localhost:3000/api/admin/usuarios", {
      method: "PATCH",
      body: JSON.stringify({ nombre_completo: "New Name" }),
    });
    const res = await PATCH(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain("id");
  });

  it("retorna 404 si el usuario no existe", async () => {
    const chain = createChainMock();
    chain.single.mockResolvedValue({ data: null, error: { code: "PGRST116" } });
    mockSchemaFrom.mockReturnValue(chain);

    const req = new NextRequest("http://localhost:3000/api/admin/usuarios", {
      method: "PATCH",
      body: JSON.stringify({ id: "nonexistent", nombre_completo: "Test" }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(404);
  });

  it("retorna 400 si no hay cambios para aplicar", async () => {
    const chain = createChainMock();
    chain.single.mockResolvedValue({
      data: { username: "jperez", nombre_completo: "Juan Pérez", activo: true },
      error: null,
    });
    mockSchemaFrom.mockReturnValue(chain);

    const req = new NextRequest("http://localhost:3000/api/admin/usuarios", {
      method: "PATCH",
      body: JSON.stringify({ id: "user-1" }),
    });
    const res = await PATCH(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain("No hay cambios");
  });

  it("retorna 400 si DNI no tiene 8 dígitos", async () => {
    const chain = createChainMock();
    chain.single.mockResolvedValue({
      data: { username: "jperez", nombre_completo: "Juan", dni: "12345678", activo: true },
      error: null,
    });
    mockSchemaFrom.mockReturnValue(chain);

    const req = new NextRequest("http://localhost:3000/api/admin/usuarios", {
      method: "PATCH",
      body: JSON.stringify({ id: "user-1", dni: "123" }),
    });
    const res = await PATCH(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain("8 dígitos");
  });

  it("retorna 400 si meta_mensual es negativa", async () => {
    const chain = createChainMock();
    chain.single.mockResolvedValue({
      data: { username: "jperez", nombre_completo: "Juan", meta_mensual_ventas: 0, activo: true },
      error: null,
    });
    mockSchemaFrom.mockReturnValue(chain);

    const req = new NextRequest("http://localhost:3000/api/admin/usuarios", {
      method: "PATCH",
      body: JSON.stringify({ id: "user-1", meta_mensual: -100 }),
    });
    const res = await PATCH(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain("meta mensual");
  });

  it("retorna 400 si comisión > 100", async () => {
    const chain = createChainMock();
    chain.single.mockResolvedValue({
      data: { username: "jperez", nombre_completo: "Juan", comision_porcentaje: 5, activo: true },
      error: null,
    });
    mockSchemaFrom.mockReturnValue(chain);

    const req = new NextRequest("http://localhost:3000/api/admin/usuarios", {
      method: "PATCH",
      body: JSON.stringify({ id: "user-1", comision_porcentaje: 150 }),
    });
    const res = await PATCH(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain("comisión");
  });

  it("retorna 400 si email tiene formato inválido", async () => {
    const chain = createChainMock();
    chain.single.mockResolvedValue({
      data: { username: "jperez", nombre_completo: "Juan", email: "old@test.com", activo: true },
      error: null,
    });
    mockSchemaFrom.mockReturnValue(chain);

    const req = new NextRequest("http://localhost:3000/api/admin/usuarios", {
      method: "PATCH",
      body: JSON.stringify({ id: "user-1", email: "invalid-email" }),
    });
    const res = await PATCH(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain("email");
  });
});
