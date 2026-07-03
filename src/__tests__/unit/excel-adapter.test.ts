import { describe, it, expect } from "vitest";
import {
  parseExcelMatrix,
  parseExcelObjects,
  buildExcelArrayBuffer,
  objectsToCsv,
} from "@/lib/excel/adapter";

describe("excel adapter — round-trip objetos", () => {
  it("escribe objetos y los relee con los mismos encabezados y valores", async () => {
    const objects = [
      { nombre: "Juan", apellido: "Pérez", telefono: "51987654321" },
      { nombre: "María", apellido: "López", telefono: "51912345678" },
    ];
    const buffer = await buildExcelArrayBuffer([{ name: "Datos", objects }]);
    const parsed = await parseExcelObjects(buffer);

    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toEqual({
      nombre: "Juan",
      apellido: "Pérez",
      telefono: "51987654321",
    });
    expect(parsed[1].nombre).toBe("María");
  });

  it("aplica defaultValue a celdas vacías (equivale a defval)", async () => {
    const objects = [{ codigo: "A-1", precio: "" }];
    const buffer = await buildExcelArrayBuffer([{ name: "Lotes", objects }]);

    const conVacio = await parseExcelObjects(buffer, { defaultValue: "" });
    expect(conVacio[0].precio).toBe("");

    const conNull = await parseExcelObjects(buffer, { defaultValue: null });
    expect(conNull[0].precio).toBeNull();
  });

  it("preserva encabezados con acentos y los devuelve tal cual", async () => {
    const objects = [{ "Código": "L-01", "Área": "120" }];
    const buffer = await buildExcelArrayBuffer([{ name: "Hoja", objects }]);
    const parsed = await parseExcelObjects(buffer, { defaultValue: null });

    expect(Object.keys(parsed[0])).toEqual(["Código", "Área"]);
    expect(parsed[0]["Código"]).toBe("L-01");
  });
});

describe("excel adapter — round-trip matriz", () => {
  it("escribe filas y las relee como matriz preservando posición", async () => {
    const rows = [
      ["nombre", "apellido", "telefono"],
      ["Juan", "Pérez", "51987654321"],
      ["Ana", "Gómez", "51999888777"],
    ];
    const buffer = await buildExcelArrayBuffer([{ name: "Plantilla", rows }]);
    const matrix = await parseExcelMatrix(buffer);

    expect(matrix).toHaveLength(3);
    expect(matrix[0]).toEqual(["nombre", "apellido", "telefono"]);
    expect(matrix[1][0]).toBe("Juan");
    expect(matrix[2][2]).toBe("51999888777");
  });

  it("descarta filas completamente vacías", async () => {
    const rows = [
      ["a", "b"],
      ["1", "2"],
      [null, null],
      ["3", "4"],
    ];
    const buffer = await buildExcelArrayBuffer([{ name: "X", rows }]);
    const matrix = await parseExcelMatrix(buffer);

    expect(matrix).toHaveLength(3);
    expect(matrix[2]).toEqual(["3", "4"]);
  });
});

describe("excel adapter — objectsToCsv", () => {
  it("genera CSV con encabezados y filas", () => {
    const csv = objectsToCsv([
      { a: "1", b: "2" },
      { a: "3", b: "4" },
    ]);
    expect(csv).toBe("a,b\n1,2\n3,4");
  });

  it("escapa comas, comillas y saltos de línea", () => {
    const csv = objectsToCsv([{ texto: 'hola, "mundo"', otro: "línea\n2" }]);
    expect(csv).toBe('texto,otro\n"hola, ""mundo""","línea\n2"');
  });

  it("devuelve string vacío sin datos", () => {
    expect(objectsToCsv([])).toBe("");
  });
});

describe("excel adapter — multi-hoja", () => {
  it("crea múltiples hojas y lee la primera", async () => {
    const buffer = await buildExcelArrayBuffer([
      { name: "Principal", objects: [{ id: "1" }] },
      { name: "Filtros", objects: [{ filtro: "rol", valor: "admin" }] },
    ]);
    const parsed = await parseExcelObjects(buffer);
    expect(parsed[0].id).toBe("1");
  });
});
