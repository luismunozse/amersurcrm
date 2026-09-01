import { describe, it, expect } from "vitest";
import { sanitizarTerminoBusqueda } from "./postgrest";

describe("sanitizarTerminoBusqueda", () => {
  it("deja pasar un término normal sin tocarlo", () => {
    expect(sanitizarTerminoBusqueda("María Quispe")).toBe("María Quispe");
  });

  it("neutraliza la coma, que separa condiciones dentro de .or()", () => {
    expect(sanitizarTerminoBusqueda("a,estado_cliente.eq.propietario")).toBe(
      "a estado_cliente.eq.propietario"
    );
  });

  it("neutraliza paréntesis, comillas y backslash", () => {
    expect(sanitizarTerminoBusqueda('x(y)"z\\w')).toBe("x y  z w");
  });

  it("descarta el comodín % para que no lo controle el usuario", () => {
    expect(sanitizarTerminoBusqueda("%")).toBe("");
  });

  it("recorta los espacios de los extremos", () => {
    expect(sanitizarTerminoBusqueda("  ,Juan,  ")).toBe("Juan");
  });

  it("tolera vacío, null y undefined", () => {
    expect(sanitizarTerminoBusqueda("")).toBe("");
    expect(sanitizarTerminoBusqueda(null)).toBe("");
    expect(sanitizarTerminoBusqueda(undefined)).toBe("");
  });
});
