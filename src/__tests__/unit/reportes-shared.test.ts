import { describe, it, expect } from "vitest";
import { calcularFechas, calcularVentanaAnterior, mesesEnRango } from "@/app/dashboard/admin/reportes/actions/shared";

describe("calcularVentanaAnterior", () => {
  it("returns a window of equal length immediately before startDate, normalized to day boundaries", () => {
    const { startDate, endDate } = calcularFechas("30", "2026-06-01", "2026-06-30");

    const { prevStart, prevEnd } = calcularVentanaAnterior(startDate, endDate);

    // prevEnd is the instant right before startDate (previous day, end of day).
    expect(prevEnd.getTime()).toBe(startDate.getTime() - 1);
    expect(prevEnd.getHours()).toBe(23);
    expect(prevEnd.getMinutes()).toBe(59);
    expect(prevEnd.getSeconds()).toBe(59);
    expect(prevEnd.getMilliseconds()).toBe(999);

    // prevStart is normalized to day-start.
    expect(prevStart.getHours()).toBe(0);
    expect(prevStart.getMinutes()).toBe(0);
    expect(prevStart.getSeconds()).toBe(0);
    expect(prevStart.getMilliseconds()).toBe(0);

    // The previous window has the same day-count as the original window.
    const originalDays = Math.round((endDate.getTime() - startDate.getTime()) / 86400000);
    const prevDays = Math.round((prevEnd.getTime() - prevStart.getTime()) / 86400000);
    expect(prevDays).toBe(originalDays);

    // Immediately before startDate — no gap, no overlap.
    expect(prevEnd.getTime()).toBeLessThan(startDate.getTime());
  });

  it("never overlaps the current window even across a month boundary", () => {
    const { startDate, endDate } = calcularFechas("30", "2026-07-01", "2026-07-15");
    const { prevStart, prevEnd } = calcularVentanaAnterior(startDate, endDate);

    expect(prevEnd.getTime()).toBeLessThan(startDate.getTime());
    expect(prevStart.getTime()).toBeLessThan(prevEnd.getTime());
    // Crosses into June.
    expect(prevStart.getMonth()).toBe(5); // June (0-indexed)
  });
});

describe("mesesEnRango", () => {
  it("returns a single entry for a period contained in one calendar month", () => {
    const { startDate, endDate } = calcularFechas("30", "2026-06-05", "2026-06-20");

    const meses = mesesEnRango(startDate, endDate);

    expect(meses).toEqual([{ anio: 2026, mes: 6 }]);
  });

  it("returns every month a 45-day span crossing a month boundary overlaps", () => {
    const { startDate, endDate } = calcularFechas("45", "2026-06-20", "2026-08-03");

    const meses = mesesEnRango(startDate, endDate);

    expect(meses).toEqual([
      { anio: 2026, mes: 6 },
      { anio: 2026, mes: 7 },
      { anio: 2026, mes: 8 },
    ]);
  });

  it("returns two entries when the range spans a year boundary", () => {
    const { startDate, endDate } = calcularFechas("30", "2025-12-15", "2026-01-10");

    const meses = mesesEnRango(startDate, endDate);

    expect(meses).toEqual([
      { anio: 2025, mes: 12 },
      { anio: 2026, mes: 1 },
    ]);
  });
});
