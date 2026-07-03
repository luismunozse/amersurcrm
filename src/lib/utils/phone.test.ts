import { describe, it, expect } from "vitest";
import {
  normalizePhoneE164,
  isValidPhone,
  isValidPeruvianPhone,
  formatPhoneDisplay,
} from "./phone";

describe("normalizePhoneE164 (default Perú)", () => {
  it("normaliza un número peruano local sin código de país", () => {
    expect(normalizePhoneE164("987654321")).toBe("51987654321");
  });

  it("limpia formato con +, espacios y guiones", () => {
    expect(normalizePhoneE164("+51 987 654 321")).toBe("51987654321");
  });

  it("acepta número con código de país pero sin '+'", () => {
    expect(normalizePhoneE164("51987654321")).toBe("51987654321");
  });

  it("normaliza con país explícito (Chile, Paraguay, Uruguay, Perú)", () => {
    expect(normalizePhoneE164("912345678", "CL")).toBe("56912345678");
    expect(normalizePhoneE164("981234567", "PY")).toBe("595981234567");
    expect(normalizePhoneE164("99123456", "UY")).toBe("59899123456");
    expect(normalizePhoneE164("987654321", "PE")).toBe("51987654321");
  });

  it("normaliza números internacionales con '+' sin importar el default", () => {
    expect(normalizePhoneE164("+56 9 1234 5678")).toBe("56912345678");
    expect(normalizePhoneE164("+595 981 234567")).toBe("595981234567");
  });

  it("devuelve '' para vacío, null o muy corto", () => {
    expect(normalizePhoneE164("")).toBe("");
    expect(normalizePhoneE164(null)).toBe("");
    expect(normalizePhoneE164(undefined)).toBe("");
    expect(normalizePhoneE164("12345")).toBe("");
  });
});

describe("normalizePhoneE164 (país explícito Argentina)", () => {
  it("normaliza un número argentino local con código de área", () => {
    expect(normalizePhoneE164("3517734676", "AR")).toBe("543517734676");
    expect(normalizePhoneE164("11 1234-5678", "AR")).toBe("541112345678");
  });

  it("preserva el 9 de móvil argentino cuando viene en el número", () => {
    expect(normalizePhoneE164("09 351 773 4676", "AR")).toBe("5493517734676");
  });

  it("limpia formato con +, espacios y guiones", () => {
    expect(normalizePhoneE164("+54 351 773-4676")).toBe("543517734676");
  });
});

describe("isValidPhone / isValidPeruvianPhone", () => {
  it("valida un número peruano", () => {
    expect(isValidPhone("987654321")).toBe(true);
  });

  it("valida un peruano solo con país explícito", () => {
    expect(isValidPeruvianPhone("+51 987 654 321")).toBe(true);
    expect(isValidPeruvianPhone("+54 351 773 4676")).toBe(false);
  });

  it("rechaza basura", () => {
    expect(isValidPhone("abc")).toBe(false);
    expect(isValidPhone("123")).toBe(false);
  });
});

describe("formatPhoneDisplay", () => {
  it("formatea en internacional según país", () => {
    expect(formatPhoneDisplay("543517734676")).toContain("+54");
    expect(formatPhoneDisplay("+56912345678")).toContain("+56");
  });

  it("devuelve '' para inválido", () => {
    expect(formatPhoneDisplay("")).toBe("");
    expect(formatPhoneDisplay("123")).toBe("");
  });
});
