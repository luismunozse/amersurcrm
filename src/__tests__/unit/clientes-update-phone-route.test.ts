import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ============================================================
// Hoisted mocks
// ============================================================

const {
  mockGetUser,
  mockPerfilSingle,
  mockClienteMaybeSingle,
  mockClienteSingle,
  mockClienteEq,
  mockClienteOr,
  mockClienteNeq,
  mockClienteUpdate,
  mockServiceRoleClient,
} = vi.hoisted(() => {
  const mockGetUser = vi.fn();
  const mockPerfilSingle = vi.fn();
  const mockClienteMaybeSingle = vi.fn();
  const mockClienteSingle = vi.fn();
  const mockClienteEq = vi.fn();
  const mockClienteOr = vi.fn();
  const mockClienteNeq = vi.fn();
  const mockClienteUpdate = vi.fn();

  const mockServiceRoleClient: any = {
    auth: { getUser: mockGetUser },
    schema: vi.fn(),
  };

  return {
    mockGetUser,
    mockPerfilSingle,
    mockClienteMaybeSingle,
    mockClienteSingle,
    mockClienteEq,
    mockClienteOr,
    mockClienteNeq,
    mockClienteUpdate,
    mockServiceRoleClient,
  };
});

vi.mock("@/lib/supabase.server", () => ({
  createServiceRoleClient: vi.fn(() => mockServiceRoleClient),
  createServerOnlyClient: vi.fn(() => Promise.resolve(mockServiceRoleClient)),
}));

// resolveEquipoScope/equipoOrFilter are NOT mocked — with a ROL_ADMIN caller
// they resolve to tier "global" without extra queries, keeping these tests
// focused on the update-phone-specific logic (role-scoping itself is already
// covered end-to-end by clientes-search-route.test.ts).
import { POST } from "@/app/api/clientes/update-phone/route";

// ============================================================
// Test setup
// ============================================================

const VALID_UUID = "11111111-1111-1111-1111-111111111111";

beforeEach(() => {
  vi.clearAllMocks();

  const clienteChain: any = {};
  clienteChain.select = vi.fn().mockReturnValue(clienteChain);
  clienteChain.eq = mockClienteEq;
  clienteChain.or = mockClienteOr;
  clienteChain.neq = mockClienteNeq;
  clienteChain.limit = vi.fn().mockReturnValue(clienteChain);
  clienteChain.update = mockClienteUpdate;
  clienteChain.maybeSingle = mockClienteMaybeSingle;
  clienteChain.single = mockClienteSingle;

  mockClienteEq.mockReturnValue(clienteChain);
  mockClienteOr.mockReturnValue(clienteChain);
  mockClienteNeq.mockReturnValue(clienteChain);
  mockClienteUpdate.mockReturnValue(clienteChain);

  const perfilChain: any = {};
  perfilChain.select = vi.fn().mockReturnThis();
  perfilChain.eq = vi.fn().mockReturnThis();
  perfilChain.single = mockPerfilSingle;

  mockServiceRoleClient.schema.mockReturnValue({
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "usuario_perfil") return perfilChain;
      return clienteChain;
    }),
  });

  // Defaults: authenticated ROL_ADMIN caller (global scope, no team lookup needed)
  mockGetUser.mockResolvedValue({ data: { user: { id: "uid-test" } }, error: null });
  mockPerfilSingle.mockResolvedValue({
    data: { username: "admin1", rol: { nombre: "ROL_ADMIN" } },
    error: null,
  });
  mockClienteMaybeSingle.mockResolvedValue({ data: null, error: null });
  mockClienteSingle.mockResolvedValue({ data: null, error: null });
});

// ============================================================
// Helpers
// ============================================================

function bearerRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/clientes/update-phone", {
    method: "POST",
    headers: {
      Authorization: "Bearer valid-token",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

// ============================================================
// Tests
// ============================================================

describe("POST /api/clientes/update-phone", () => {
  it("returns 401 when the caller is not authenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: { message: "invalid token" } });

    const res = await bearerRequestAndCall({ cliente_id: VALID_UUID, telefono: "+51987654321" });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("No autenticado");
  });

  it("returns 400 when the phone is invalid (too short)", async () => {
    const res = await bearerRequestAndCall({ cliente_id: VALID_UUID, telefono: "123" });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/teléfono/i);
    expect(mockClienteMaybeSingle).not.toHaveBeenCalled();
  });

  it("returns 400 when the phone passes the digit-count filter but is not a possible number (garbage digits)", async () => {
    // "1111111111" is 10 digits — passes the cheap 8-15 count filter, but is
    // not a possible PE/NANP number under libphonenumber-js. Regression test
    // for the bug where limpiarTelefonoValido alone let garbage through.
    const res = await bearerRequestAndCall({ cliente_id: VALID_UUID, telefono: "1111111111" });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/válido/i);
    expect(mockClienteMaybeSingle).not.toHaveBeenCalled();
  });

  it("returns 400 when cliente_id is not a valid UUID", async () => {
    const res = await bearerRequestAndCall({ cliente_id: "not-a-uuid", telefono: "+51987654321" });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/cliente_id/i);
  });

  it("returns 409 when the client already has a phone registered — does not overwrite it", async () => {
    mockClienteMaybeSingle.mockResolvedValueOnce({
      data: { id: VALID_UUID, telefono: "+51999999999" },
      error: null,
    });

    const res = await bearerRequestAndCall({ cliente_id: VALID_UUID, telefono: "+51987654321" });

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe("El cliente ya tiene un teléfono registrado");
    expect(body.telefono_actual).toBe("+51999999999");
    expect(mockClienteUpdate).not.toHaveBeenCalled();
  });

  it("returns 409 when the phone already belongs to another client — does not merge automatically", async () => {
    mockClienteMaybeSingle
      .mockResolvedValueOnce({ data: { id: VALID_UUID, telefono: null }, error: null }) // load: no phone yet
      .mockResolvedValueOnce({ data: { id: "otro-cliente-id", nombre: "Otro Cliente" }, error: null }); // collision

    const res = await bearerRequestAndCall({ cliente_id: VALID_UUID, telefono: "+51987654321" });

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe("Este número ya pertenece a otro cliente");
    expect(body.cliente_existente).toEqual({ id: "otro-cliente-id", nombre: "Otro Cliente" });
    expect(mockClienteUpdate).not.toHaveBeenCalled();
  });

  it("updates the client and returns it on success", async () => {
    mockClienteMaybeSingle
      .mockResolvedValueOnce({ data: { id: VALID_UUID, telefono: null }, error: null }) // load: no phone yet
      .mockResolvedValueOnce({ data: null, error: null }); // no collision

    const clienteActualizado = {
      id: VALID_UUID,
      nombre: "Juan Pérez",
      telefono: "+51987654321",
      telefono_whatsapp: "+51987654321",
      email: null,
      tipo_cliente: "persona",
      estado_cliente: "por_contactar",
      origen_lead: "whatsapp_web",
      vendedor_asignado: "admin1",
      created_at: "2026-08-01T00:00:00.000Z",
      notas: null,
      whatsapp_username: "juanp",
      whatsapp_chat_id: null,
    };
    mockClienteSingle.mockResolvedValueOnce({ data: clienteActualizado, error: null });

    const res = await bearerRequestAndCall({ cliente_id: VALID_UUID, telefono: "+51987654321" });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.cliente).toEqual(clienteActualizado);

    // Verifica que el update se llamó con formato "+" + dígitos, consistente con create-lead.
    expect(mockClienteUpdate).toHaveBeenCalledWith({
      telefono: "+51987654321",
      telefono_whatsapp: "+51987654321",
    });
  });
});

async function bearerRequestAndCall(body: Record<string, unknown>) {
  return POST(bearerRequest(body));
}
