import { describe, it, expect } from "vitest";
import { calcularProgresoMeta, calcularDeltaMensual, calcularPeriodoAnterior } from "@/lib/dashboard/meta";

describe("calcularProgresoMeta", () => {
  it("returns 0% when no sales have been made yet", () => {
    expect(calcularProgresoMeta(0, 100_000)).toBe(0);
  });

  it("returns the mid-range percentage", () => {
    expect(calcularProgresoMeta(45_000, 100_000)).toBe(45);
  });

  it("clamps above 100% when sales exceed the goal", () => {
    expect(calcularProgresoMeta(150_000, 100_000)).toBe(100);
  });

  it("returns 0% when the goal is zero or missing (avoids divide-by-zero)", () => {
    expect(calcularProgresoMeta(50_000, 0)).toBe(0);
  });

  it("never returns a negative percentage", () => {
    expect(calcularProgresoMeta(-10, 100_000)).toBe(0);
  });
});

describe("calcularDeltaMensual", () => {
  it("returns a positive percentage when sales grew vs. last month", () => {
    expect(calcularDeltaMensual(120_000, 100_000)).toBe(20);
  });

  it("returns a negative percentage when sales dropped vs. last month", () => {
    expect(calcularDeltaMensual(80_000, 100_000)).toBe(-20);
  });

  it("returns -100 when this month has no sales but last month did", () => {
    expect(calcularDeltaMensual(0, 100_000)).toBe(-100);
  });

  it("returns null when there were no prior-month sales to compare against", () => {
    expect(calcularDeltaMensual(50_000, 0)).toBeNull();
  });

  it("returns null when the prior-month figure is negative (defensive guard)", () => {
    expect(calcularDeltaMensual(50_000, -10)).toBeNull();
  });

  it("returns null for non-finite inputs", () => {
    expect(calcularDeltaMensual(NaN, 100_000)).toBeNull();
    expect(calcularDeltaMensual(50_000, NaN)).toBeNull();
  });
});

describe("calcularPeriodoAnterior", () => {
  it("returns the previous month within the same year", () => {
    expect(calcularPeriodoAnterior(2026, 7)).toEqual({ anio: 2026, mes: 6 });
  });

  it("wraps to December of the prior year when the current month is January", () => {
    expect(calcularPeriodoAnterior(2026, 1)).toEqual({ anio: 2025, mes: 12 });
  });
});
