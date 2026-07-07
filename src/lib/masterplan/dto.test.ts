import { describe, it, expect } from "vitest";
import { toPlanoLoteDTO } from "./dto";

const SAFE_KEYS = ["id", "codigo", "estado", "area", "manzana", "etapa", "poly"];
const FORBIDDEN_KEYS = ["precio", "moneda", "descuento", "precio_m2", "condiciones"];

describe("toPlanoLoteDTO", () => {
  it("picks exactly the safe whitelist keys, in that order, even when the row carries price fields", () => {
    const rowWithPrice = {
      id: "l1",
      codigo: "A1",
      estado: "disponible",
      sup_m2: 120,
      precio: 50000,
      moneda: "USD",
      data: {
        manzana: "A",
        etapa: "1",
        masterplan_poly: [[0, 0], [0.1, 0], [0.1, 0.1]],
        descuento: 10,
        condiciones: "contado",
        precio_m2: 400,
      },
    };

    const dto = toPlanoLoteDTO(rowWithPrice);

    expect(Object.keys(dto)).toEqual(SAFE_KEYS);
    for (const key of FORBIDDEN_KEYS) {
      expect(dto).not.toHaveProperty(key);
    }
    expect(JSON.stringify(dto)).not.toContain("50000");
  });

  it("maps sup_m2 -> area, data.manzana, data.etapa, data.masterplan_poly -> poly", () => {
    const row = {
      id: "l2",
      codigo: "B2",
      estado: "reservado",
      sup_m2: 200,
      data: { manzana: "B", etapa: "2", masterplan_poly: [[0, 0], [0.2, 0], [0.2, 0.2]] },
    };

    expect(toPlanoLoteDTO(row)).toEqual({
      id: "l2",
      codigo: "B2",
      estado: "reservado",
      area: 200,
      manzana: "B",
      etapa: "2",
      poly: [[0, 0], [0.2, 0], [0.2, 0.2]],
    });
  });

  it("defaults area/manzana/etapa/poly to null when sup_m2/data are absent", () => {
    const row = { id: "l3", codigo: "C3", estado: "vendido" };

    expect(toPlanoLoteDTO(row)).toEqual({
      id: "l3",
      codigo: "C3",
      estado: "vendido",
      area: null,
      manzana: null,
      etapa: null,
      poly: null,
    });
  });

  it("falls back to poly: null when masterplan_poly has an invalid shape", () => {
    const row = { id: "l4", codigo: "D4", estado: "disponible", data: { masterplan_poly: "not-an-array" } };

    expect(toPlanoLoteDTO(row).poly).toBeNull();
  });
});
