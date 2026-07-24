import { describe, it, expect } from "vitest";
import { agruparVendedoresPorRol } from "@/lib/clientes/agrupar-vendedores";

const vendedor = (username: string) => ({
  id: username,
  username,
  nombre_completo: username.toUpperCase(),
  rol: "ROL_VENDEDOR",
});
const coordinador = (username: string) => ({
  id: username,
  username,
  nombre_completo: username.toUpperCase(),
  rol: "ROL_COORDINADOR_VENTAS",
});

describe("agruparVendedoresPorRol", () => {
  it("splits coordinadores from vendedores", () => {
    const { vendedores, coordinadores } = agruparVendedoresPorRol([
      vendedor("v1"),
      coordinador("c1"),
      vendedor("v2"),
      coordinador("c2"),
    ]);

    expect(vendedores.map((v) => v.username)).toEqual(["v1", "v2"]);
    expect(coordinadores.map((c) => c.username)).toEqual(["c1", "c2"]);
  });

  it("treats unknown or null roles as vendedores (safe fallback)", () => {
    const { vendedores, coordinadores } = agruparVendedoresPorRol([
      { id: "x", username: "x", nombre_completo: "X", rol: null },
      { id: "y", username: "y", nombre_completo: "Y" }, // rol undefined
      { id: "z", username: "z", nombre_completo: "Z", rol: "ROL_OTRO" },
    ]);

    expect(vendedores.map((v) => v.username)).toEqual(["x", "y", "z"]);
    expect(coordinadores).toHaveLength(0);
  });

  it("preserves input order within each group", () => {
    const { vendedores, coordinadores } = agruparVendedoresPorRol([
      coordinador("cB"),
      vendedor("vB"),
      coordinador("cA"),
      vendedor("vA"),
    ]);

    expect(vendedores.map((v) => v.username)).toEqual(["vB", "vA"]);
    expect(coordinadores.map((c) => c.username)).toEqual(["cB", "cA"]);
  });

  it("handles an empty list", () => {
    expect(agruparVendedoresPorRol([])).toEqual({ vendedores: [], coordinadores: [] });
  });
});
