import { describe, it, expect } from "vitest";
import {
  ESTADOS_CLIENTE_VALIDOS,
  ESTADOS_ACTIVOS,
  ESTADOS_AVANZADOS,
  ESTADOS_CONVERTIDOS,
  esEstadoActivo,
  esEstadoConvertido,
} from "@/lib/reportes/estados";
import { ESTADOS_CLIENTE_OPTIONS } from "@/lib/types/clientes";

// Literales legacy que NUNCA deben aparecer en ningún grupo exportado
// (spec: "Client-state filters use only the valid EstadoCliente model").
const LITERALES_LEGACY_MUERTOS = [
  "lead",
  "prospecto",
  "activo",
  "cliente",
  "en_seguimiento",
  "interesado",
  "reserva",
  "comprador",
];

const GRUPOS_EXPORTADOS: Array<[string, readonly string[]]> = [
  ["ESTADOS_CLIENTE_VALIDOS", ESTADOS_CLIENTE_VALIDOS],
  ["ESTADOS_ACTIVOS", ESTADOS_ACTIVOS],
  ["ESTADOS_AVANZADOS", ESTADOS_AVANZADOS],
  ["ESTADOS_CONVERTIDOS", ESTADOS_CONVERTIDOS],
];

describe("lib/reportes/estados — vocabulario canónico", () => {
  it("ESTADOS_CLIENTE_VALIDOS tiene exactamente los 8 valores de ESTADOS_CLIENTE_OPTIONS", () => {
    const esperados = ESTADOS_CLIENTE_OPTIONS.map((o) => o.value).sort();
    expect([...ESTADOS_CLIENTE_VALIDOS].sort()).toEqual(esperados);
    expect(ESTADOS_CLIENTE_VALIDOS).toHaveLength(8);
  });

  it("ESTADOS_ACTIVOS excluye únicamente desestimado/transferido", () => {
    expect([...ESTADOS_ACTIVOS].sort()).toEqual(
      ["por_contactar", "contactado", "intermedio", "potencial", "en_proceso", "propietario"].sort(),
    );
    expect(ESTADOS_ACTIVOS).not.toContain("desestimado");
    expect(ESTADOS_ACTIVOS).not.toContain("transferido");
  });

  it("ESTADOS_AVANZADOS = contactado, intermedio, potencial, en_proceso, propietario", () => {
    expect([...ESTADOS_AVANZADOS].sort()).toEqual(
      ["contactado", "intermedio", "potencial", "en_proceso", "propietario"].sort(),
    );
  });

  it("ESTADOS_CONVERTIDOS = [propietario]", () => {
    expect(ESTADOS_CONVERTIDOS).toEqual(["propietario"]);
  });

  it.each(GRUPOS_EXPORTADOS)("%s no contiene ningún literal legacy muerto", (_nombre, grupo) => {
    for (const muerto of LITERALES_LEGACY_MUERTOS) {
      expect(grupo).not.toContain(muerto);
    }
  });

  describe("esEstadoActivo", () => {
    it("true para estados dentro del pipeline", () => {
      expect(esEstadoActivo("por_contactar")).toBe(true);
      expect(esEstadoActivo("en_proceso")).toBe(true);
      expect(esEstadoActivo("propietario")).toBe(true);
    });

    it("false para desestimado/transferido y para literales legacy inválidos", () => {
      expect(esEstadoActivo("desestimado")).toBe(false);
      expect(esEstadoActivo("transferido")).toBe(false);
      expect(esEstadoActivo("activo")).toBe(false);
      expect(esEstadoActivo("cliente")).toBe(false);
    });
  });

  describe("esEstadoConvertido", () => {
    it("true únicamente para propietario", () => {
      expect(esEstadoConvertido("propietario")).toBe(true);
    });

    it("false para cualquier otro estado válido o literal legacy", () => {
      expect(esEstadoConvertido("en_proceso")).toBe(false);
      expect(esEstadoConvertido("potencial")).toBe(false);
      expect(esEstadoConvertido("cliente")).toBe(false);
    });
  });
});
