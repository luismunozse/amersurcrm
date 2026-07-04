import { describe, it, expect } from "vitest";
import { limaToday, computeTier, buildReminderMessage } from "@/lib/cobranza/tiers";

describe("limaToday", () => {
  it("returns the Lima calendar date for a UTC afternoon instant on the same day", () => {
    // 2026-07-04T20:00:00Z = 2026-07-04 15:00 Lima (UTC-5) -> same calendar day
    expect(limaToday(new Date("2026-07-04T20:00:00Z"))).toBe("2026-07-04");
  });

  it("returns the PREVIOUS Lima calendar day when UTC has already rolled past midnight", () => {
    // 2026-07-05T03:00:00Z = 2026-07-04 22:00 Lima (UTC-5) -> still July 4 in Lima
    expect(limaToday(new Date("2026-07-05T03:00:00Z"))).toBe("2026-07-04");
  });
});

describe("computeTier", () => {
  const base = { estado: "pendiente" };

  it("returns null for a paid cuota regardless of due date", () => {
    expect(
      computeTier({ fechaVencimiento: "2026-01-01", estado: "pagada", today: "2026-07-04" }),
    ).toBeNull();
  });

  it("returns 'por_vencer_15d' when exactly 15 days remain until due date", () => {
    expect(computeTier({ ...base, fechaVencimiento: "2026-07-19", today: "2026-07-04" })).toBe(
      "por_vencer_15d",
    );
  });

  it("returns null when 16 days remain (just outside the 15-day window)", () => {
    expect(
      computeTier({ ...base, fechaVencimiento: "2026-07-20", today: "2026-07-04" }),
    ).toBeNull();
  });

  it("returns 'por_vencer_7d' when exactly 7 days remain until due date", () => {
    expect(computeTier({ ...base, fechaVencimiento: "2026-07-11", today: "2026-07-04" })).toBe(
      "por_vencer_7d",
    );
  });

  it("returns 'por_vencer_3d' when exactly 3 days remain until due date", () => {
    expect(computeTier({ ...base, fechaVencimiento: "2026-07-07", today: "2026-07-04" })).toBe(
      "por_vencer_3d",
    );
  });

  it("returns 'por_vencer_3d' when the cuota is due today (0 days remaining)", () => {
    expect(computeTier({ ...base, fechaVencimiento: "2026-07-04", today: "2026-07-04" })).toBe(
      "por_vencer_3d",
    );
  });

  it("returns 'vencida' for a cuota 1-3 days overdue", () => {
    expect(computeTier({ ...base, fechaVencimiento: "2026-07-01", today: "2026-07-04" })).toBe(
      "vencida",
    );
  });

  it("returns 'mora' for a cuota more than 3 days overdue", () => {
    expect(computeTier({ ...base, fechaVencimiento: "2026-06-01", today: "2026-07-04" })).toBe(
      "mora",
    );
  });

  it("returns 'mora' when estado is already 'en_mora', regardless of days overdue", () => {
    expect(
      computeTier({ fechaVencimiento: "2026-07-03", estado: "en_mora", today: "2026-07-04" }),
    ).toBe("mora");
  });

  it("returns 'mora' at the 90-day overdue boundary (inclusive)", () => {
    expect(computeTier({ ...base, fechaVencimiento: "2026-04-05", today: "2026-07-04" })).toBe(
      "mora",
    );
  });

  it("returns null past the 90-day overdue cap (91 days)", () => {
    expect(
      computeTier({ ...base, fechaVencimiento: "2026-04-04", today: "2026-07-04" }),
    ).toBeNull();
  });

  it("returns null past the 90-day cap even when estado is already 'en_mora'", () => {
    expect(
      computeTier({ fechaVencimiento: "2026-04-04", estado: "en_mora", today: "2026-07-04" }),
    ).toBeNull();
  });
});

describe("buildReminderMessage", () => {
  it("renders a formal Peruvian reminder with all placeholders filled", () => {
    const message = buildReminderMessage({
      clienteNombre: "Juan Pérez",
      numeroCuota: 5,
      monto: 1250.5,
      moneda: "PEN",
      fechaVencimiento: "2026-07-15",
    });

    expect(message).toContain("Estimado(a) Juan Pérez");
    expect(message).toContain("N.° 5");
    expect(message).toContain("PEN 1,250.50");
    expect(message).toContain("AMERSUR");
  });

  it("renders a different cliente/monto without leaking the previous test's values", () => {
    const message = buildReminderMessage({
      clienteNombre: "María López",
      numeroCuota: 12,
      monto: 300,
      moneda: "USD",
      fechaVencimiento: "2026-08-01",
    });

    expect(message).toContain("Estimado(a) María López");
    expect(message).toContain("N.° 12");
    expect(message).toContain("USD 300.00");
    expect(message).not.toContain("Juan Pérez");
  });
});
