import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ==================== HOISTED MOCKS ====================

const {
  mockGetUser,
  mockSupabase,
  mockServiceClient,
  createChainMock,
} = vi.hoisted(() => {
  function createChainMock(finalResult: any = { data: null, error: null }) {
    const chain: any = {};
    const methods = ["select", "insert", "update", "eq", "single"];
    for (const method of methods) {
      chain[method] = vi.fn().mockReturnValue(chain);
    }
    chain.single.mockImplementation(() => Promise.resolve(finalResult));
    chain.eq.mockReturnValue(chain);
    return chain;
  }

  const mockGetUser = vi.fn();
  const mockSupabase = {
    auth: { getUser: mockGetUser },
  };

  const mockServiceChain = createChainMock({ error: null });
  const mockServiceFrom = vi.fn().mockReturnValue(mockServiceChain);
  const mockServiceSchema = vi.fn().mockReturnValue({ from: mockServiceFrom });

  const mockServiceClient = {
    schema: mockServiceSchema,
    _chain: mockServiceChain,
    _from: mockServiceFrom,
  };

  return { mockGetUser, mockSupabase, mockServiceClient, createChainMock };
});

vi.mock("@/lib/supabase.server", () => ({
  createServerOnlyClient: vi.fn().mockImplementation(() => Promise.resolve(mockSupabase)),
  createServiceRoleClient: vi.fn().mockReturnValue(mockServiceClient),
}));

vi.mock("@/lib/permissions/server", () => ({
  esAdmin: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/storage", () => ({
  uploadFile: vi.fn().mockResolvedValue({ data: { path: "firmas/user-1/firma-123.png" }, error: null }),
  deleteFile: vi.fn().mockResolvedValue({ data: [{ name: "firma.png" }], error: null }),
  getPublicUrl: vi.fn().mockReturnValue("https://storage.example.com/avatars/firmas/user-1/firma-123.png"),
}));

import { POST, DELETE } from "@/app/api/admin/usuarios/firma/route";
import { esAdmin } from "@/lib/permissions/server";
import { uploadFile, getPublicUrl } from "@/lib/storage";

// Helper: create a NextRequest with mocked formData to avoid jsdom File handling issues
function createFormDataRequest(
  url: string,
  method: string,
  fields: Record<string, string | File>
): NextRequest {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value);
  }
  const req = new NextRequest(url, { method });
  // Override formData method to avoid jsdom hanging with File objects
  req.formData = () => Promise.resolve(formData);
  return req;
}

describe("POST /api/admin/usuarios/firma", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "admin-1" } } });
    (esAdmin as any).mockResolvedValue(true);

    const chain = createChainMock({ error: null });
    chain.eq.mockReturnValue(Promise.resolve({ error: null }));
    mockServiceClient._from.mockReturnValue(chain);
  });

  it("retorna 401 si no hay usuario autenticado", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const req = createFormDataRequest(
      "http://localhost:3000/api/admin/usuarios/firma",
      "POST",
      { userId: "user-1", firma: new File(["test"], "firma.png", { type: "image/png" }) }
    );
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("retorna 403 si no es admin", async () => {
    (esAdmin as any).mockResolvedValue(false);

    const req = createFormDataRequest(
      "http://localhost:3000/api/admin/usuarios/firma",
      "POST",
      { userId: "user-1", firma: new File(["test"], "firma.png", { type: "image/png" }) }
    );
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("retorna 400 si faltan datos requeridos (userId)", async () => {
    const req = createFormDataRequest(
      "http://localhost:3000/api/admin/usuarios/firma",
      "POST",
      { firma: new File(["test"], "firma.png", { type: "image/png" }) }
    );
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain("Faltan datos");
  });

  it("retorna 400 si faltan datos requeridos (firma file)", async () => {
    const req = createFormDataRequest(
      "http://localhost:3000/api/admin/usuarios/firma",
      "POST",
      { userId: "user-1" }
    );
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain("Faltan datos");
  });

  it("retorna 400 si el tipo de archivo no es válido", async () => {
    const req = createFormDataRequest(
      "http://localhost:3000/api/admin/usuarios/firma",
      "POST",
      { userId: "user-1", firma: new File(["test"], "firma.pdf", { type: "application/pdf" }) }
    );
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain("JPG, PNG o WebP");
  });

  it("retorna 400 si el archivo supera 1MB", async () => {
    const largeContent = new Uint8Array(1.1 * 1024 * 1024);
    const req = createFormDataRequest(
      "http://localhost:3000/api/admin/usuarios/firma",
      "POST",
      { userId: "user-1", firma: new File([largeContent], "firma.png", { type: "image/png" }) }
    );
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain("1MB");
  });

  it("acepta archivos JPG", async () => {
    const req = createFormDataRequest(
      "http://localhost:3000/api/admin/usuarios/firma",
      "POST",
      { userId: "user-1", firma: new File(["test"], "firma.jpg", { type: "image/jpeg" }) }
    );
    const res = await POST(req);
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(body.firmaUrl).toBeDefined();
  });

  it("acepta archivos WebP", async () => {
    const req = createFormDataRequest(
      "http://localhost:3000/api/admin/usuarios/firma",
      "POST",
      { userId: "user-1", firma: new File(["test"], "firma.webp", { type: "image/webp" }) }
    );
    const res = await POST(req);
    const body = await res.json();

    expect(body.success).toBe(true);
  });

  it("sube correctamente y retorna URL pública", async () => {
    const req = createFormDataRequest(
      "http://localhost:3000/api/admin/usuarios/firma",
      "POST",
      { userId: "user-1", firma: new File(["test"], "firma.png", { type: "image/png" }) }
    );
    const res = await POST(req);
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(body.firmaUrl).toBe("https://storage.example.com/avatars/firmas/user-1/firma-123.png");
    expect(uploadFile).toHaveBeenCalled();
    expect(getPublicUrl).toHaveBeenCalled();
  });
});

describe("DELETE /api/admin/usuarios/firma", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "admin-1" } } });
    (esAdmin as any).mockResolvedValue(true);

    const chain = createChainMock({
      data: { firma_url: "https://supabase.co/storage/v1/object/public/avatars/firmas/user-1/firma.png" },
      error: null,
    });
    mockServiceClient._from.mockReturnValue(chain);
  });

  it("retorna 401 si no hay usuario autenticado", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const req = new NextRequest("http://localhost:3000/api/admin/usuarios/firma", {
      method: "DELETE",
      body: JSON.stringify({ userId: "user-1" }),
    });
    const res = await DELETE(req);
    expect(res.status).toBe(401);
  });

  it("retorna 403 si no es admin", async () => {
    (esAdmin as any).mockResolvedValue(false);

    const req = new NextRequest("http://localhost:3000/api/admin/usuarios/firma", {
      method: "DELETE",
      body: JSON.stringify({ userId: "user-1" }),
    });
    const res = await DELETE(req);
    expect(res.status).toBe(403);
  });

  it("retorna 400 si falta userId", async () => {
    const req = new NextRequest("http://localhost:3000/api/admin/usuarios/firma", {
      method: "DELETE",
      body: JSON.stringify({}),
    });
    const res = await DELETE(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain("userId");
  });
});
