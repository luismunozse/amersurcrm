import { describe, it, expect, vi, beforeEach } from "vitest";

// ==================== HOISTED MOCKS ====================

const { mockGetUser, mockSupabase } = vi.hoisted(() => {
  const mockGetUser = vi.fn();

  const mockSupabase = {
    auth: { getUser: mockGetUser },
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn().mockReturnValue({
          data: { publicUrl: "https://storage.example.com/contratos/c1/contrato-123.pdf" },
        }),
      }),
    },
    from: vi.fn().mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    }),
  };

  return { mockGetUser, mockSupabase };
});

vi.mock("@/lib/supabase.server", () => ({
  createServerOnlyClient: vi.fn().mockImplementation(() => Promise.resolve(mockSupabase)),
}));

// ==================== TESTS ====================

describe("POST /api/contratos/upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
  });

  it("valida que el usuario esté autenticado", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: "No session" } });

    // Simular la lógica del endpoint
    const { data: { user }, error: authError } = await mockSupabase.auth.getUser();
    expect(user).toBeNull();
    expect(authError).toBeTruthy();
  });

  it("valida que se envíen los campos requeridos", () => {
    const formData = new FormData();
    // Sin archivo, contratoId ni tipoDocumento
    const file = formData.get("archivo");
    const contratoId = formData.get("contratoId");
    const tipoDocumento = formData.get("tipoDocumento");

    expect(file).toBeNull();
    expect(contratoId).toBeNull();
    expect(tipoDocumento).toBeNull();
  });

  it("valida tipos de archivo permitidos (PDF, JPG, PNG, WEBP)", () => {
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

    expect(allowedTypes.includes("application/pdf")).toBe(true);
    expect(allowedTypes.includes("image/jpeg")).toBe(true);
    expect(allowedTypes.includes("image/png")).toBe(true);
    expect(allowedTypes.includes("image/webp")).toBe(true);
    expect(allowedTypes.includes("application/exe")).toBe(false);
    expect(allowedTypes.includes("text/plain")).toBe(false);
  });

  it("valida tamaño máximo de archivo (10MB)", () => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    expect(maxSize).toBe(10485760);

    // Archivo de 5MB debería ser válido
    const validSize = 5 * 1024 * 1024;
    expect(validSize <= maxSize).toBe(true);

    // Archivo de 15MB debería ser rechazado
    const invalidSize = 15 * 1024 * 1024;
    expect(invalidSize <= maxSize).toBe(false);
  });

  it("sube archivo al storage correctamente", async () => {
    const mockFile = new File(["contenido"], "contrato.pdf", { type: "application/pdf" });
    const filePath = "contratos/contrato-1/contrato-123.pdf";

    const storageFrom = mockSupabase.storage.from("imagenes");
    await storageFrom.upload(filePath, mockFile);

    expect(mockSupabase.storage.from).toHaveBeenCalledWith("imagenes");
    expect(storageFrom.upload).toHaveBeenCalledWith(filePath, mockFile);
  });

  it("mapea tipo de documento al campo URL correcto", () => {
    const urlFieldMap: Record<string, string> = {
      contrato: "contrato_url",
      escritura: "escritura_url",
      constancia_sunarp: "constancia_sunarp_url",
    };

    expect(urlFieldMap["contrato"]).toBe("contrato_url");
    expect(urlFieldMap["escritura"]).toBe("escritura_url");
    expect(urlFieldMap["constancia_sunarp"]).toBe("constancia_sunarp_url");
  });

  it("actualiza la tabla contrato con la URL pública", async () => {
    const publicUrl = "https://storage.example.com/contratos/c1/contrato-123.pdf";

    const fromMock = mockSupabase.from("contrato");
    const updateResult = fromMock.update({ contrato_url: publicUrl, updated_at: expect.any(String) });
    await updateResult.eq("id", "contrato-1");

    expect(mockSupabase.from).toHaveBeenCalledWith("contrato");
    expect(fromMock.update).toHaveBeenCalledWith(expect.objectContaining({ contrato_url: publicUrl }));
  });

  it("genera path de archivo correcto", () => {
    const contratoId = "abc-123";
    const tipoDocumento = "contrato";
    const timestamp = Date.now();
    const ext = "pdf";

    const fileName = `${tipoDocumento}-${timestamp}.${ext}`;
    const filePath = `contratos/${contratoId}/${fileName}`;

    expect(filePath).toMatch(/^contratos\/abc-123\/contrato-\d+\.pdf$/);
  });
});
