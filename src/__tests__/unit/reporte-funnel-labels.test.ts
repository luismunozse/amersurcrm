import { describe, it, expect, vi } from "vitest";

// ReporteFunnel.tsx and ModalClientesEtapaFunnel.tsx both import from
// "../_actions" (the reportes barrel), which transitively pulls in every
// action module including cached fetchers that call `unstable_cache` at
// module load time (funnel.ts). Mocking the barrel here avoids loading that
// whole graph — we only need the pure ESTADO_LABELS/ESTADO_COLORS maps,
// no rendering, no server actions.
vi.mock("@/app/dashboard/admin/reportes/_actions", () => ({
  obtenerReporteFunnel: vi.fn(),
  obtenerClientesPorEtapaFunnel: vi.fn(),
}));

import { ESTADO_LABELS, ESTADO_COLORS } from "@/app/dashboard/admin/reportes/components/ReporteFunnel";
import { ESTADOS_CLIENTE_VALIDOS } from "@/lib/reportes/estados";

// funnel.ts's fallback bucket for a null estado_cliente.
const SENTINEL = "sin_estado";
const CLAVES_VALIDAS = new Set<string>([...ESTADOS_CLIENTE_VALIDOS, SENTINEL]);

describe("ReporteFunnel — ESTADO_LABELS / ESTADO_COLORS", () => {
  it("tiene una entrada de label y color para cada estado válido + el sentinel sin_estado", () => {
    for (const estado of CLAVES_VALIDAS) {
      expect(ESTADO_LABELS[estado]).toBeDefined();
      expect(ESTADO_COLORS[estado]).toBeDefined();
    }
  });

  it("en_proceso y propietario tienen labels humanos (no el enum crudo)", () => {
    expect(ESTADO_LABELS["en_proceso"]).toBe("En Proceso");
    expect(ESTADO_LABELS["propietario"]).toBe("Propietario");
  });

  it("no contiene ninguna clave fuera del set válido (labels legacy muertos)", () => {
    const clavesLabels = Object.keys(ESTADO_LABELS);
    const clavesColors = Object.keys(ESTADO_COLORS);

    for (const clave of clavesLabels) {
      expect(CLAVES_VALIDAS.has(clave)).toBe(true);
    }
    for (const clave of clavesColors) {
      expect(CLAVES_VALIDAS.has(clave)).toBe(true);
    }

    // Dead legacy keys explicitly must not exist.
    for (const muerto of ["nuevo", "activo", "en_negociacion", "interesado", "no_interesado", "reservado", "vendido", "perdido"]) {
      expect(clavesLabels).not.toContain(muerto);
      expect(clavesColors).not.toContain(muerto);
    }
  });
});
