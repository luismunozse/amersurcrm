import { describe, it, expect, vi } from "vitest";

// Mock revalidatePath before importing
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const { mockSupabase: _mockSupabase, createChainMock: _createChainMock } = vi.hoisted(() => {
  function createChainMock(finalResult: any = { data: null, error: null }) {
    const chain: any = {};
    const methods = ["select", "insert", "update", "eq", "single", "limit", "order", "maybeSingle"];
    for (const method of methods) { chain[method] = vi.fn().mockReturnValue(chain); }
    chain.single.mockImplementation(() => Promise.resolve(finalResult));
    chain.maybeSingle.mockImplementation(() => Promise.resolve(finalResult));
    return chain;
  }
  const mockSupabase = {
    auth: { getUser: vi.fn() },
    from: vi.fn().mockReturnValue(createChainMock()),
    schema: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue(createChainMock()) }),
  };
  return { mockSupabase, createChainMock };
});

import {
  validarMonto,
  validarFechaFutura,
  revalidarCliente,
} from "@/app/dashboard/clientes/_actions-crm-helpers";

describe("validarMonto", () => {
  it("acepta monto positivo", () => {
    const result = validarMonto(5000);
    expect(result.valid).toBe(true);
  });

  it("rechaza monto cero", () => {
    const result = validarMonto(0);
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("rechaza monto negativo", () => {
    const result = validarMonto(-100);
    expect(result.valid).toBe(false);
  });

  it("rechaza NaN", () => {
    const result = validarMonto(NaN);
    expect(result.valid).toBe(false);
  });

  it("incluye nombre del campo en el error", () => {
    const result = validarMonto(0, "monto de reserva");
    expect(result.error).toContain("monto de reserva");
  });

  it("acepta montos decimales", () => {
    const result = validarMonto(0.01);
    expect(result.valid).toBe(true);
  });

  it("acepta montos grandes", () => {
    const result = validarMonto(999999999);
    expect(result.valid).toBe(true);
  });
});

describe("validarFechaFutura", () => {
  it("acepta fecha futura", () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    const result = validarFechaFutura(futureDate.toISOString());
    expect(result.valid).toBe(true);
  });

  it("rechaza fecha pasada", () => {
    const result = validarFechaFutura("2020-01-01");
    expect(result.valid).toBe(false);
  });

  it("rechaza fecha inválida", () => {
    const result = validarFechaFutura("no-es-fecha");
    expect(result.valid).toBe(false);
  });

  it("incluye nombre del campo en el error", () => {
    const result = validarFechaFutura("2020-01-01", "fecha de vencimiento");
    expect(result.error).toContain("fecha de vencimiento");
  });
});

describe("revalidarCliente", () => {
  it("no lanza error con clienteId válido", () => {
    expect(() => revalidarCliente("c-123")).not.toThrow();
  });

  it("no lanza error sin clienteId", () => {
    expect(() => revalidarCliente()).not.toThrow();
  });
});
