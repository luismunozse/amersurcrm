import { describe, it, expect } from "vitest";
import { esRutaGestionUsuarios } from "@/lib/permissions/route-matchers";

describe("esRutaGestionUsuarios", () => {
  it("matches the exact usuarios route", () => {
    expect(esRutaGestionUsuarios("/dashboard/admin/usuarios")).toBe(true);
  });

  it("matches nested sub-routes under usuarios", () => {
    expect(esRutaGestionUsuarios("/dashboard/admin/usuarios/123")).toBe(true);
  });

  it("does not match other /dashboard/admin/* routes", () => {
    expect(esRutaGestionUsuarios("/dashboard/admin/configuracion")).toBe(false);
    expect(esRutaGestionUsuarios("/dashboard/admin")).toBe(false);
    expect(esRutaGestionUsuarios("/dashboard/admin/vendedores-activos")).toBe(false);
    expect(esRutaGestionUsuarios("/dashboard/admin/reportes")).toBe(false);
  });

  it("does not match routes that merely start with the same prefix", () => {
    // Guards against a naive startsWith("/dashboard/admin/usuarios") false positive
    // if a future sibling route were named e.g. "usuarios-roles".
    expect(esRutaGestionUsuarios("/dashboard/admin/usuarios-roles")).toBe(false);
  });

  it("returns false for null/undefined/empty pathname", () => {
    expect(esRutaGestionUsuarios(null)).toBe(false);
    expect(esRutaGestionUsuarios(undefined)).toBe(false);
    expect(esRutaGestionUsuarios("")).toBe(false);
  });

  it("does not match unrelated routes", () => {
    expect(esRutaGestionUsuarios("/dashboard")).toBe(false);
    expect(esRutaGestionUsuarios("/dashboard/clientes")).toBe(false);
  });
});
