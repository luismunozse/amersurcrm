import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetUser, mockServerActionClient, createChainMock, mockEsAdminOCoord, mockCrearNotificacion } = vi.hoisted(() => {
  function createChainMock(finalResult: any = { data: null, error: null }) {
    const chain: any = {};
    const methods = [
      "select", "insert", "update", "delete", "eq", "neq", "is", "or",
      "order", "range", "single", "in", "limit", "head", "maybeSingle", "not", "gte", "lte",
    ];
    for (const method of methods) chain[method] = vi.fn().mockReturnValue(chain);
    chain.then = (resolve: any, reject: any) =>
      Promise.resolve(finalResult).then(resolve, reject);
    return chain;
  }

  const mockGetUser = vi.fn();
  const mockEsAdminOCoord = vi.fn();

  const publicChains: Record<string, any> = {};
  const schemaChains: Record<string, Record<string, any>> = {};

  const storageRemove = vi.fn().mockResolvedValue({ data: null, error: null });
  const storageCreateSignedUrl = vi.fn().mockResolvedValue({
    data: { signedUrl: "https://signed.example/x" },
    error: null,
  });

  const mockServerActionClient: any = {
    auth: { getUser: mockGetUser },
    from: vi.fn((table: string) => publicChains[table] ?? createChainMock()),
    schema: vi.fn((schemaName: string) => ({
      from: vi.fn((table: string) => schemaChains[schemaName]?.[table] ?? createChainMock()),
    })),
    storage: {
      from: vi.fn().mockReturnValue({
        remove: storageRemove,
        createSignedUrl: storageCreateSignedUrl,
      }),
    },
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    __setPublicChain(table: string, chain: any) { publicChains[table] = chain; },
    __setSchemaChain(schemaName: string, table: string, chain: any) {
      if (!schemaChains[schemaName]) schemaChains[schemaName] = {};
      schemaChains[schemaName][table] = chain;
    },
    __reset() {
      for (const k of Object.keys(publicChains)) delete publicChains[k];
      for (const k of Object.keys(schemaChains)) delete schemaChains[k];
    },
    __storageRemove: storageRemove,
    __storageCreateSignedUrl: storageCreateSignedUrl,
  };

  const mockCrearNotificacion = vi.fn().mockResolvedValue({ id: "n-1" });

  return { mockGetUser, mockServerActionClient, createChainMock, mockEsAdminOCoord, mockCrearNotificacion };
});

vi.mock("@/lib/supabase.server-actions", () => ({
  createServerActionClient: vi.fn().mockImplementation(() => Promise.resolve(mockServerActionClient)),
}));

vi.mock("@/app/_actionsNotifications", () => ({
  crearNotificacion: mockCrearNotificacion,
}));

vi.mock("@/lib/permissions/server", () => ({
  esAdminOCoordinador: mockEsAdminOCoord,
  tienePermiso: vi.fn().mockResolvedValue(true),
  requierePermiso: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/permissions", () => ({
  PERMISOS: { VENTAS: { VER_TODAS: "ventas.ver_todas" } },
}));

vi.mock("@/app/dashboard/clientes/_actions-crm-helpers", () => ({
  obtenerUsernameActual: vi.fn().mockImplementation(async () => ({
    success: true,
    username: "vendedor1",
    userId: "uid-1",
  })),
  revalidarCliente: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import {
  cambiarEstadoRevision,
  guardarObservacionesEtapa,
  eliminarDocumentoChecklist,
  obtenerUrlDocumento,
} from "@/app/dashboard/adquisicion/_actions-proceso";

beforeEach(() => {
  vi.clearAllMocks();
  mockServerActionClient.__reset();
  mockGetUser.mockResolvedValue({ data: { user: { id: "uid-1" } } });
  mockEsAdminOCoord.mockResolvedValue(false);
});

// ============================================================
// cambiarEstadoRevision
// ============================================================

describe("cambiarEstadoRevision: validaciones", () => {
  it("rechaza sin etapaId", async () => {
    const res = await cambiarEstadoRevision("", "en_revision");
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/ID/);
  });

  it("rechaza estado invalido", async () => {
    const res = await cambiarEstadoRevision("e-1", "rechazado" as any);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/invalido|inválido/i);
  });

  it("rechaza observado sin observaciones", async () => {
    mockEsAdminOCoord.mockResolvedValue(true);
    const res = await cambiarEstadoRevision("e-1", "observado");
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/observaciones/i);
  });

  it("rechaza observado con observaciones vacias (whitespace)", async () => {
    mockEsAdminOCoord.mockResolvedValue(true);
    const res = await cambiarEstadoRevision("e-1", "observado", "   ");
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/observaciones/i);
  });
});

describe("cambiarEstadoRevision: autorizacion", () => {
  it("vendedor no privilegiado puede pasar a en_revision", async () => {
    mockEsAdminOCoord.mockResolvedValue(false);
    const chain = createChainMock({ data: null, error: null });
    mockServerActionClient.__setPublicChain("proceso_etapa", chain);

    const res = await cambiarEstadoRevision("e-1", "en_revision");
    expect(res.success).toBe(true);
  });

  it("vendedor no privilegiado NO puede aprobar", async () => {
    mockEsAdminOCoord.mockResolvedValue(false);
    const res = await cambiarEstadoRevision("e-1", "aprobado");
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/admin/i);
  });

  it("vendedor no privilegiado NO puede observar", async () => {
    mockEsAdminOCoord.mockResolvedValue(false);
    const res = await cambiarEstadoRevision("e-1", "observado", "Falta DNI");
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/admin/i);
  });

  it("vendedor no privilegiado NO puede revertir a pendiente", async () => {
    mockEsAdminOCoord.mockResolvedValue(false);
    const res = await cambiarEstadoRevision("e-1", "pendiente");
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/admin/i);
  });

  it("admin/coord puede aprobar", async () => {
    mockEsAdminOCoord.mockResolvedValue(true);
    const chain = createChainMock({ data: null, error: null });
    mockServerActionClient.__setPublicChain("proceso_etapa", chain);

    const res = await cambiarEstadoRevision("e-1", "aprobado");
    expect(res.success).toBe(true);
  });

  it("admin/coord puede observar con observaciones", async () => {
    mockEsAdminOCoord.mockResolvedValue(true);
    const chain = createChainMock({ data: null, error: null });
    mockServerActionClient.__setPublicChain("proceso_etapa", chain);

    const res = await cambiarEstadoRevision("e-1", "observado", "Falta firma");
    expect(res.success).toBe(true);
  });
});

// ============================================================
// cambiarEstadoRevision: notifica al vendedor dueño en aprobado/observado
// ============================================================

describe("cambiarEstadoRevision: notifica al vendedor dueño en aprobado/observado", () => {
  it("notifica al vendedor dueño cuando se aprueba (revisor distinto al dueño)", async () => {
    mockEsAdminOCoord.mockResolvedValue(true);
    const etapaChain = createChainMock({
      data: {
        nombre: "Firma de contrato",
        proceso: {
          codigo: "ADQ-2026-0001",
          cliente_id: "c-1",
          vendedor_username: "vendedor2",
          cliente: { id: "c-1", nombre: "Juan Perez" },
        },
      },
      error: null,
    });
    mockServerActionClient.__setPublicChain("proceso_etapa", etapaChain);

    const perfilChain = createChainMock({ data: { id: "perfil-vendedor2" }, error: null });
    mockServerActionClient.__setPublicChain("usuario_perfil", perfilChain);

    const res = await cambiarEstadoRevision("e-1", "aprobado");
    expect(res.success).toBe(true);

    expect(mockCrearNotificacion).toHaveBeenCalledTimes(1);
    const [usuarioId, tipo, titulo, mensaje] = mockCrearNotificacion.mock.calls[0];
    expect(usuarioId).toBe("perfil-vendedor2");
    expect(tipo).toBe("sistema");
    expect(titulo).toMatch(/aprobada/i);
    expect(mensaje).toContain("Firma de contrato");
    expect(mensaje).toContain("Juan Perez");
  });

  it("notifica al vendedor dueño cuando se observa, incluyendo las observaciones", async () => {
    mockEsAdminOCoord.mockResolvedValue(true);
    const etapaChain = createChainMock({
      data: {
        nombre: "Desembolso",
        proceso: {
          codigo: "ADQ-2026-0002",
          cliente_id: "c-2",
          vendedor_username: "vendedor2",
          cliente: { id: "c-2", nombre: "Maria Lopez" },
        },
      },
      error: null,
    });
    mockServerActionClient.__setPublicChain("proceso_etapa", etapaChain);

    const perfilChain = createChainMock({ data: { id: "perfil-vendedor2" }, error: null });
    mockServerActionClient.__setPublicChain("usuario_perfil", perfilChain);

    const res = await cambiarEstadoRevision("e-1", "observado", "Falta firma del banco");
    expect(res.success).toBe(true);

    expect(mockCrearNotificacion).toHaveBeenCalledTimes(1);
    const [usuarioId, , titulo, mensaje] = mockCrearNotificacion.mock.calls[0];
    expect(usuarioId).toBe("perfil-vendedor2");
    expect(titulo).toMatch(/observada/i);
    expect(mensaje).toContain("Falta firma del banco");
  });

  it("NO notifica cuando el revisor es el mismo dueño del proceso", async () => {
    mockEsAdminOCoord.mockResolvedValue(true);
    const etapaChain = createChainMock({
      data: {
        nombre: "Firma de contrato",
        proceso: {
          codigo: "ADQ-2026-0003",
          cliente_id: "c-1",
          vendedor_username: "vendedor1", // mismo username que auth mockeado (el revisor)
          cliente: { id: "c-1", nombre: "Juan Perez" },
        },
      },
      error: null,
    });
    mockServerActionClient.__setPublicChain("proceso_etapa", etapaChain);

    const res = await cambiarEstadoRevision("e-1", "aprobado");
    expect(res.success).toBe(true);
    expect(mockCrearNotificacion).not.toHaveBeenCalled();
  });

  it("no falla la accion si crearNotificacion lanza", async () => {
    mockEsAdminOCoord.mockResolvedValue(true);
    const etapaChain = createChainMock({
      data: {
        nombre: "Firma de contrato",
        proceso: {
          codigo: "ADQ-2026-0004",
          cliente_id: "c-1",
          vendedor_username: "vendedor2",
          cliente: { id: "c-1", nombre: "Juan Perez" },
        },
      },
      error: null,
    });
    mockServerActionClient.__setPublicChain("proceso_etapa", etapaChain);
    const perfilChain = createChainMock({ data: { id: "perfil-vendedor2" }, error: null });
    mockServerActionClient.__setPublicChain("usuario_perfil", perfilChain);
    mockCrearNotificacion.mockRejectedValueOnce(new Error("boom"));

    const res = await cambiarEstadoRevision("e-1", "aprobado");
    expect(res.success).toBe(true);
  });

  it("no notifica al vendedor si no se resuelve su perfil por username", async () => {
    mockEsAdminOCoord.mockResolvedValue(true);
    const etapaChain = createChainMock({
      data: {
        nombre: "Firma de contrato",
        proceso: {
          codigo: "ADQ-2026-0005",
          cliente_id: "c-1",
          vendedor_username: "vendedor-fantasma",
          cliente: { id: "c-1", nombre: "Juan Perez" },
        },
      },
      error: null,
    });
    mockServerActionClient.__setPublicChain("proceso_etapa", etapaChain);
    const perfilChain = createChainMock({ data: null, error: null });
    mockServerActionClient.__setPublicChain("usuario_perfil", perfilChain);

    const res = await cambiarEstadoRevision("e-1", "aprobado");
    expect(res.success).toBe(true);
    expect(mockCrearNotificacion).not.toHaveBeenCalled();
  });
});

// ============================================================
// guardarObservacionesEtapa
// ============================================================

describe("guardarObservacionesEtapa", () => {
  it("rechaza sin etapaId", async () => {
    const res = await guardarObservacionesEtapa("", "obs");
    expect(res.success).toBe(false);
  });

  it("guarda observaciones para usuario autenticado", async () => {
    const chain = createChainMock({ data: null, error: null });
    mockServerActionClient.__setPublicChain("proceso_etapa", chain);

    const res = await guardarObservacionesEtapa("e-1", "Pendiente respuesta del banco");
    expect(res.success).toBe(true);
  });

  it("permite observaciones vacias (limpia el campo)", async () => {
    const chain = createChainMock({ data: null, error: null });
    mockServerActionClient.__setPublicChain("proceso_etapa", chain);

    const res = await guardarObservacionesEtapa("e-1", "");
    expect(res.success).toBe(true);
  });
});

// ============================================================
// eliminarDocumentoChecklist
// ============================================================

describe("eliminarDocumentoChecklist", () => {
  it("rechaza sin itemId", async () => {
    const res = await eliminarDocumentoChecklist("");
    expect(res.success).toBe(false);
  });

  it("rechaza si item no existe", async () => {
    const itemChain = createChainMock({ data: null, error: null });
    mockServerActionClient.__setPublicChain("proceso_checklist_item", itemChain);

    const res = await eliminarDocumentoChecklist("i-x");
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/no encontrado/i);
  });

  it("rechaza si no es admin/coord ni quien subio", async () => {
    mockEsAdminOCoord.mockResolvedValue(false);
    const itemChain = createChainMock({
      data: {
        id: "i-1",
        documento_url: "https://x/storage/v1/object/proceso-documentos/p1/e1/i1/file.pdf",
        documento_subido_por: "otro_vendedor",
      },
      error: null,
    });
    mockServerActionClient.__setPublicChain("proceso_checklist_item", itemChain);

    const res = await eliminarDocumentoChecklist("i-1");
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/admin|subio|subió/i);
  });

  it("permite a admin/coord eliminar documento ajeno", async () => {
    mockEsAdminOCoord.mockResolvedValue(true);
    const itemChain = createChainMock({
      data: {
        id: "i-1",
        documento_url: "https://x/storage/v1/object/proceso-documentos/p1/e1/i1/file.pdf",
        documento_subido_por: "otro_vendedor",
      },
      error: null,
    });
    mockServerActionClient.__setPublicChain("proceso_checklist_item", itemChain);

    const res = await eliminarDocumentoChecklist("i-1");
    expect(res.success).toBe(true);
    expect(mockServerActionClient.__storageRemove).toHaveBeenCalledWith(["p1/e1/i1/file.pdf"]);
  });

  it("permite a quien subio eliminar su propio documento", async () => {
    mockEsAdminOCoord.mockResolvedValue(false);
    const itemChain = createChainMock({
      data: {
        id: "i-1",
        documento_url: "https://x/storage/v1/object/proceso-documentos/p1/e1/i1/file.pdf",
        documento_subido_por: "vendedor1",
      },
      error: null,
    });
    mockServerActionClient.__setPublicChain("proceso_checklist_item", itemChain);

    const res = await eliminarDocumentoChecklist("i-1");
    expect(res.success).toBe(true);
  });

  it("limpia campos aunque no haya archivo en bucket", async () => {
    mockEsAdminOCoord.mockResolvedValue(true);
    const itemChain = createChainMock({
      data: { id: "i-1", documento_url: null, documento_subido_por: null },
      error: null,
    });
    mockServerActionClient.__setPublicChain("proceso_checklist_item", itemChain);

    const res = await eliminarDocumentoChecklist("i-1");
    expect(res.success).toBe(true);
    expect(mockServerActionClient.__storageRemove).not.toHaveBeenCalled();
  });
});

// ============================================================
// obtenerUrlDocumento
// ============================================================

describe("obtenerUrlDocumento", () => {
  it("rechaza sin itemId", async () => {
    const res = await obtenerUrlDocumento("");
    expect(res.success).toBe(false);
  });

  it("rechaza si no autenticado", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await obtenerUrlDocumento("i-1");
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/autenticado/i);
  });

  it("rechaza si item no tiene documento", async () => {
    const itemChain = createChainMock({
      data: { documento_url: null },
      error: null,
    });
    mockServerActionClient.__setPublicChain("proceso_checklist_item", itemChain);

    const res = await obtenerUrlDocumento("i-1");
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/sin documento/i);
  });

  it("genera signed URL para item con documento", async () => {
    const itemChain = createChainMock({
      data: { documento_url: "https://x/storage/v1/object/proceso-documentos/p1/e1/i1/file.pdf" },
      error: null,
    });
    mockServerActionClient.__setPublicChain("proceso_checklist_item", itemChain);

    const res = await obtenerUrlDocumento("i-1");
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.url).toMatch(/^https:\/\//);
    }
    expect(mockServerActionClient.__storageCreateSignedUrl).toHaveBeenCalledWith(
      "p1/e1/i1/file.pdf",
      300,
    );
  });

  it("rechaza si URL es invalida", async () => {
    const itemChain = createChainMock({
      data: { documento_url: "not-a-url" },
      error: null,
    });
    mockServerActionClient.__setPublicChain("proceso_checklist_item", itemChain);

    const res = await obtenerUrlDocumento("i-1");
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/invalida|inválida/i);
  });
});
