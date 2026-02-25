import { describe, it, expect } from "vitest";
import {
  generarUsername,
  generarUsernameConNumero,
  validarUsername,
  sugerirUsernames,
} from "@/lib/utils/username-generator";

describe("generarUsername", () => {
  it("genera username de un solo nombre", () => {
    expect(generarUsername("Carlos")).toBe("carlos");
  });

  it("genera username de nombre + apellido", () => {
    expect(generarUsername("Juan Pérez")).toBe("jperez");
  });

  it("genera username de nombre compuesto + apellido", () => {
    expect(generarUsername("José Luis Rodríguez")).toBe("jrodriguez");
  });

  it("maneja nombres con múltiples espacios", () => {
    expect(generarUsername("  Juan   Pérez  ")).toBe("jperez");
  });

  it("elimina tildes y caracteres especiales", () => {
    expect(generarUsername("María López")).toBe("mlopez");
    expect(generarUsername("Ángel Ñúñez")).toBe("anunez");
  });

  it("lanza error con nombre vacío", () => {
    expect(() => generarUsername("")).toThrow("Nombre completo inválido");
    expect(() => generarUsername("   ")).toThrow("Nombre completo inválido");
  });

  it("maneja nombres con tres partes (nombre + 2 apellidos)", () => {
    expect(generarUsername("Ana María García López")).toBe("alopez");
  });
});

describe("generarUsernameConNumero", () => {
  it("agrega número al username base", () => {
    expect(generarUsernameConNumero("jperez", 2)).toBe("jperez2");
    expect(generarUsernameConNumero("jperez", 99)).toBe("jperez99");
  });
});

describe("validarUsername", () => {
  it("acepta username válido", () => {
    expect(validarUsername("jperez")).toEqual({ valido: true });
    expect(validarUsername("admin1")).toEqual({ valido: true });
    expect(validarUsername("abc")).toEqual({ valido: true });
  });

  it("rechaza username muy corto", () => {
    const result = validarUsername("ab");
    expect(result.valido).toBe(false);
    expect(result.error).toContain("al menos 3");
  });

  it("rechaza username vacío", () => {
    const result = validarUsername("");
    expect(result.valido).toBe(false);
  });

  it("rechaza username que empieza con número", () => {
    const result = validarUsername("1admin");
    expect(result.valido).toBe(false);
    expect(result.error).toContain("empezar con una letra");
  });

  it("rechaza username con caracteres especiales", () => {
    const result = validarUsername("j.perez");
    expect(result.valido).toBe(false);
    expect(result.error).toContain("letras minúsculas y números");
  });

  it("rechaza username con mayúsculas", () => {
    const result = validarUsername("JPerez");
    expect(result.valido).toBe(false);
  });

  it("rechaza username demasiado largo", () => {
    const result = validarUsername("a".repeat(51));
    expect(result.valido).toBe(false);
    expect(result.error).toContain("más de 50");
  });

  it("acepta username con exactamente 50 caracteres", () => {
    const result = validarUsername("a".repeat(50));
    expect(result.valido).toBe(true);
  });
});

describe("sugerirUsernames", () => {
  it("genera sugerencias para nombre compuesto", () => {
    const sugerencias = sugerirUsernames("Juan Pérez");
    expect(sugerencias.length).toBeGreaterThan(0);
    expect(sugerencias).toContain("jperez");
    expect(sugerencias).toContain("juanperez");
    expect(sugerencias).toContain("juanp");
  });

  it("retorna array vacío para un solo nombre corto", () => {
    const sugerencias = sugerirUsernames("Jo");
    // Un solo nombre no genera sugerencias (partes.length < 2)
    expect(sugerencias).toEqual([]);
  });

  it("elimina tildes en sugerencias", () => {
    const sugerencias = sugerirUsernames("María López García");
    sugerencias.forEach((s) => {
      expect(s).toMatch(/^[a-z0-9]+$/);
    });
  });
});
