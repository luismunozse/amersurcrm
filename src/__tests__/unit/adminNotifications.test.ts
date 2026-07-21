import { describe, it, expect, vi, beforeEach } from "vitest";

import { notifyAdminsOfSecurityEvent } from "@/lib/security/adminNotifications";

function makeUsuarioPerfilChain(result: { data: any; error: any }) {
  const chain: any = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  // `usuario_perfil.select().eq('activo', true)` is awaited directly (no
  // terminal method) — make the chain itself thenable.
  chain.then = (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject);
  return chain;
}

function makeNotificacionChain(result: { data: any; error: any } = { data: null, error: null }) {
  const chain: any = { insertCalls: [] as any[] };
  chain.insert = vi.fn().mockImplementation((rows: any) => {
    chain.insertCalls.push(rows);
    return Promise.resolve(result);
  });
  return chain;
}

describe("notifyAdminsOfSecurityEvent", () => {
  let usuarioPerfilChain: ReturnType<typeof makeUsuarioPerfilChain>;
  let notificacionChain: ReturnType<typeof makeNotificacionChain>;
  let fromMock: ReturnType<typeof vi.fn>;
  let schemaMock: ReturnType<typeof vi.fn>;
  let supabase: any;

  beforeEach(() => {
    usuarioPerfilChain = makeUsuarioPerfilChain({
      data: [
        { id: "admin-1", email: "admin1@test.com", nombre_completo: "Admin Uno", rol: { nombre: "ROL_ADMIN" } },
        { id: "vend-1", email: "vend1@test.com", nombre_completo: "Vendedor Uno", rol: { nombre: "ROL_VENDEDOR" } },
        { id: "admin-2", email: "admin2@test.com", nombre_completo: "Admin Dos", rol: [{ nombre: "ROL_ADMIN" }] },
      ],
      error: null,
    });
    notificacionChain = makeNotificacionChain();

    fromMock = vi.fn((table: string) => {
      if (table === "usuario_perfil") return usuarioPerfilChain;
      if (table === "notificacion") return notificacionChain;
      throw new Error(`Unexpected table: ${table}`);
    });
    schemaMock = vi.fn((schemaName: string) => {
      expect(schemaName).toBe("crm");
      return { from: fromMock };
    });
    supabase = { schema: schemaMock, from: vi.fn() };
  });

  it("scopes the query to the crm schema (raw service-role client has no schema preset)", async () => {
    await notifyAdminsOfSecurityEvent(supabase, "Alerta", "mensaje");

    expect(schemaMock).toHaveBeenCalledWith("crm");
    expect(fromMock).toHaveBeenCalledWith("usuario_perfil");
  });

  it("only notifies usuarios whose rol is ROL_ADMIN, excluding other roles", async () => {
    await notifyAdminsOfSecurityEvent(supabase, "Alerta de seguridad", "Algo paso");

    expect(notificacionChain.insert).toHaveBeenCalledTimes(1);
    const rows = notificacionChain.insertCalls[0];
    const notifiedIds = rows.map((r: any) => r.usuario_id);

    expect(notifiedIds).toEqual(["admin-1", "admin-2"]);
    expect(notifiedIds).not.toContain("vend-1");
  });

  it("builds each notification row with tipo=sistema and the admin's own data embedded", async () => {
    await notifyAdminsOfSecurityEvent(supabase, "Alerta", "Mensaje de prueba", { ip: "1.2.3.4" });

    const rows = notificacionChain.insertCalls[0];
    expect(rows[0]).toMatchObject({
      usuario_id: "admin-1",
      tipo: "sistema",
      titulo: "Alerta",
      mensaje: "Mensaje de prueba",
      data: {
        ip: "1.2.3.4",
        admin: { id: "admin-1", nombre: "Admin Uno", email: "admin1@test.com" },
      },
    });
  });

  it("does nothing (no insert) when there are no active ROL_ADMIN users", async () => {
    usuarioPerfilChain = makeUsuarioPerfilChain({
      data: [{ id: "vend-1", email: "v@test.com", nombre_completo: "V", rol: { nombre: "ROL_VENDEDOR" } }],
      error: null,
    });
    fromMock.mockImplementation((table: string) => {
      if (table === "usuario_perfil") return usuarioPerfilChain;
      if (table === "notificacion") return notificacionChain;
      throw new Error(`Unexpected table: ${table}`);
    });

    await notifyAdminsOfSecurityEvent(supabase, "Alerta", "mensaje");

    expect(notificacionChain.insert).not.toHaveBeenCalled();
  });

  it("logs and returns without throwing when the usuario_perfil query errors", async () => {
    usuarioPerfilChain = makeUsuarioPerfilChain({ data: null, error: { message: "boom" } });
    fromMock.mockImplementation((table: string) => {
      if (table === "usuario_perfil") return usuarioPerfilChain;
      if (table === "notificacion") return notificacionChain;
      throw new Error(`Unexpected table: ${table}`);
    });

    await expect(notifyAdminsOfSecurityEvent(supabase, "Alerta", "mensaje")).resolves.toBeUndefined();
    expect(notificacionChain.insert).not.toHaveBeenCalled();
  });

  it("never throws even if the client itself throws (fire-and-forget contract)", async () => {
    supabase.schema = vi.fn(() => {
      throw new Error("network down");
    });

    await expect(notifyAdminsOfSecurityEvent(supabase, "Alerta", "mensaje")).resolves.toBeUndefined();
  });
});
