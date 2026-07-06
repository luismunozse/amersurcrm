import { describe, it, expect } from "vitest";
import { calcularProgresoMeta } from "@/lib/dashboard/meta";

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
