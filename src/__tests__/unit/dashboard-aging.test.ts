import { describe, it, expect } from "vitest";
import { isAgingLead, AGING_THRESHOLD_DAYS } from "@/lib/dashboard/aging";

const NOW = new Date("2026-07-05T12:00:00.000Z");

function cliente(overrides: Partial<{ estado_cliente: string; ultimo_contacto: string | null }> = {}) {
  return {
    id: "c1",
    estado_cliente: "contactado",
    ultimo_contacto: null,
    ...overrides,
  };
}

describe("AGING_THRESHOLD_DAYS", () => {
  it("is 3 days (user-ratified threshold)", () => {
    expect(AGING_THRESHOLD_DAYS).toBe(3);
  });
});

describe("isAgingLead", () => {
  it("counts as aging: exactly 3 days since last contact, no future action (spec boundary scenario)", () => {
    const tresDiasAtras = new Date(NOW.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const resultado = isAgingLead(cliente({ ultimo_contacto: tresDiasAtras }), false, NOW);
    expect(resultado).toBe(true);
  });

  it("excludes a stale-contact lead that has a future scheduled action (spec: AND semantics)", () => {
    const diezDiasAtras = new Date(NOW.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString();
    const resultado = isAgingLead(cliente({ ultimo_contacto: diezDiasAtras }), true, NOW);
    expect(resultado).toBe(false);
  });

  it("counts as aging when ultimo_contacto is null and there is no future action", () => {
    const resultado = isAgingLead(cliente({ ultimo_contacto: null }), false, NOW);
    expect(resultado).toBe(true);
  });

  it("excludes a lead contacted less than 3 days ago even without a future action", () => {
    const unDiaAtras = new Date(NOW.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString();
    const resultado = isAgingLead(cliente({ ultimo_contacto: unDiaAtras }), false, NOW);
    expect(resultado).toBe(false);
  });

  it.each(["desestimado", "transferido", "propietario"])(
    "never counts a %s cliente as aging, regardless of contact staleness",
    (estado_cliente) => {
      const resultado = isAgingLead(cliente({ estado_cliente, ultimo_contacto: null }), false, NOW);
      expect(resultado).toBe(false);
    },
  );

  it("excludes a propietario cliente even with a stale (non-null) ultimo_contacto (fix 1 — terminal state added by 20260512000000_estado_propietario.sql)", () => {
    const diezDiasAtras = new Date(NOW.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString();
    const resultado = isAgingLead(
      cliente({ estado_cliente: "propietario", ultimo_contacto: diezDiasAtras }),
      false,
      NOW,
    );
    expect(resultado).toBe(false);
  });

  it("still counts an en_proceso cliente as aging (mid-sale-process clients can go stale too)", () => {
    const diezDiasAtras = new Date(NOW.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString();
    const resultado = isAgingLead(
      cliente({ estado_cliente: "en_proceso", ultimo_contacto: diezDiasAtras }),
      false,
      NOW,
    );
    expect(resultado).toBe(true);
  });

  it("respects a custom threshold override", () => {
    const cincoDiasAtras = new Date(NOW.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString();
    expect(isAgingLead(cliente({ ultimo_contacto: cincoDiasAtras }), false, NOW, 7)).toBe(false);
    expect(isAgingLead(cliente({ ultimo_contacto: cincoDiasAtras }), false, NOW, 3)).toBe(true);
  });
});
