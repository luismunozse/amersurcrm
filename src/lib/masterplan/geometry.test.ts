import { describe, it, expect } from "vitest";
import {
  clampUnidad,
  pixelANormalizado,
  poligonoASvgPoints,
  estadoColor,
  mergeLotePoly,
  moverVertice,
  eliminarVertice,
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
  it("es invariante ante el zoom: el mismo punto normalizado se obtiene a escala 1x y 2x", () => {
    // Simula un rect de imagen a escala 1x (100x100) y a escala 2x (200x200,
    // como lo reportaría getBoundingClientRect() bajo un TransformWrapper con zoom).
    // El offset del click también se duplica bajo zoom, así que la razón se mantiene.
    const escala1 = pixelANormalizado(30, 60, 100, 100);
    const escala2 = pixelANormalizado(60, 120, 200, 200);
    expect(escala2).toEqual(escala1);
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

describe("moverVertice", () => {
  const poly: [number, number][] = [[0, 0], [0.5, 0], [0.5, 0.5], [0, 0.5]];

  it("actualiza solo el vértice indicado", () => {
    const out = moverVertice(poly, 1, [0.6, 0.1]);
    expect(out[1]).toEqual([0.6, 0.1]);
    expect(out[0]).toEqual(poly[0]);
    expect(out[2]).toEqual(poly[2]);
    expect(out[3]).toEqual(poly[3]);
  });

  it("recorta el nuevo punto a [0,1]", () => {
    const out = moverVertice(poly, 0, [-0.3, 1.8]);
    expect(out[0]).toEqual([0, 1]);
  });

  it("no muta el polígono original", () => {
    const original = [...poly];
    moverVertice(poly, 1, [0.9, 0.9]);
    expect(poly).toEqual(original);
  });

  it("devuelve el mismo polígono si el índice está fuera de rango", () => {
    const out = moverVertice(poly, 10, [0.9, 0.9]);
    expect(out).toEqual(poly);
  });
});

describe("eliminarVertice", () => {
  it("elimina el vértice indicado cuando hay más de 3", () => {
    const poly: [number, number][] = [[0, 0], [0.5, 0], [0.5, 0.5], [0, 0.5]];
    const out = eliminarVertice(poly, 1);
    expect(out).toEqual([[0, 0], [0.5, 0.5], [0, 0.5]]);
  });

  it("no hace nada (no-op) cuando el polígono tiene exactamente 3 vértices", () => {
    const poly: [number, number][] = [[0, 0], [0.5, 0], [0.5, 0.5]];
    const out = eliminarVertice(poly, 1);
    expect(out).toEqual(poly);
  });

  it("no muta el polígono original", () => {
    const poly: [number, number][] = [[0, 0], [0.5, 0], [0.5, 0.5], [0, 0.5]];
    const original = [...poly];
    eliminarVertice(poly, 1);
    expect(poly).toEqual(original);
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
