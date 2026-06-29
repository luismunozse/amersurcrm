import { describe, it, expect } from "vitest";
import {
  clampUnidad,
  pixelANormalizado,
  poligonoASvgPoints,
  estadoColor,
  mergeLotePoly,
} from "./geometry";

describe("clampUnidad", () => {
  it("recorta a [0,1]", () => {
    expect(clampUnidad(-0.5)).toBe(0);
    expect(clampUnidad(1.5)).toBe(1);
    expect(clampUnidad(0.3)).toBe(0.3);
  });
});

describe("pixelANormalizado", () => {
  it("convierte pixel a [0,1] y recorta", () => {
    expect(pixelANormalizado(50, 25, 100, 100)).toEqual([0.5, 0.25]);
    expect(pixelANormalizado(150, -10, 100, 100)).toEqual([1, 0]);
  });
  it("devuelve [0,0] si las dimensiones son inválidas", () => {
    expect(pixelANormalizado(50, 50, 0, 100)).toEqual([0, 0]);
  });
});

describe("poligonoASvgPoints", () => {
  it("serializa los puntos para el atributo points de <polygon>", () => {
    expect(poligonoASvgPoints([[0, 0], [0.5, 0], [0.5, 0.5]])).toBe(
      "0,0 0.5,0 0.5,0.5",
    );
  });
});

describe("estadoColor", () => {
  it("mapea cada estado a un color", () => {
    expect(estadoColor("disponible").fill).not.toBe(estadoColor("vendido").fill);
    expect(estadoColor("reservado").fill).toBeTruthy();
  });
  it("estado desconocido cae en un color neutro", () => {
    expect(estadoColor("otro").fill).toBeTruthy();
  });
});

describe("mergeLotePoly", () => {
  it("agrega masterplan_poly sin pisar otras claves de data", () => {
    const data = { fotos: ["a.jpg"], plano: "p.jpg" };
    const out = mergeLotePoly(data, [[0, 0], [0.1, 0], [0.1, 0.1]]);
    expect(out.fotos).toEqual(["a.jpg"]);
    expect(out.plano).toBe("p.jpg");
    expect(out.masterplan_poly).toEqual([[0, 0], [0.1, 0], [0.1, 0.1]]);
  });
  it("elimina masterplan_poly cuando poly es null", () => {
    const data = { fotos: ["a.jpg"], masterplan_poly: [[0, 0]] };
    const out = mergeLotePoly(data, null);
    expect(out.masterplan_poly).toBeUndefined();
    expect(out.fotos).toEqual(["a.jpg"]);
  });
  it("tolera data no-objeto", () => {
    expect(mergeLotePoly(null, null)).toEqual({});
  });
});
