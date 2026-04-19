import { describe, it, expect } from "vitest";
import {
  generarHTMLContrato,
  reemplazarVariables,
  type ContratoVariables,
} from "@/lib/contratos/plantilla-compraventa";

// ==================== Variables base para tests ====================

function baseVariables(overrides: Partial<ContratoVariables> = {}): ContratoVariables {
  return {
    cliente_nombre: "Carlos Alberto Franco Meléndez",
    cliente_dni: "44084124",
    proyecto_nombre: "Country Club",
    lote_codigo: "LV-59",
    lote_area: "200",
    precio_total: "75,000.00",
    moneda: "PEN",
    moneda_simbolo: "S/",
    forma_pago: "contado",
    contrato_codigo: "CON-2026-0001",
    contrato_fecha: "20/03/2026",
    ...overrides,
  };
}

describe("generarHTMLContrato", () => {
  it("genera HTML válido con todas las variables principales", () => {
    const vars = baseVariables();
    const html = generarHTMLContrato(vars);

    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("CONTRATO DE COMPRAVENTA");
    expect(html).toContain("Carlos Alberto Franco Meléndez");
    expect(html).toContain("44084124");
    expect(html).toContain("Country Club");
    expect(html).toContain("LV-59");
    expect(html).toContain("S/ 75,000.00");
    expect(html).toContain("CON-2026-0001");
  });

  it("incluye datos de estado civil y dirección del cliente", () => {
    const vars = baseVariables({
      cliente_estado_civil: "casado",
      cliente_direccion: "Av. Javier Prado 1234, San Isidro, Lima",
    });
    const html = generarHTMLContrato(vars);

    expect(html).toContain("casado");
    expect(html).toContain("Av. Javier Prado 1234, San Isidro, Lima");
  });

  it("muestra fallback '___________' cuando faltan datos opcionales", () => {
    const vars = baseVariables({ cliente_dni: "" });
    const html = generarHTMLContrato(vars);

    // Cuando DNI está vacío, debe mostrar el fallback
    expect(html).toContain("___________");
  });

  it("incluye sección de separación cuando se proporciona monto", () => {
    const vars = baseVariables({ monto_separacion: "5,000.00" });
    const html = generarHTMLContrato(vars);

    expect(html).toContain("Separación");
    expect(html).toContain("S/ 5,000.00");
  });

  it("incluye sección de cuotas cuando hay saldo pendiente", () => {
    const vars = baseVariables({
      saldo_pendiente: "60,000.00",
      numero_cuotas: "120",
    });
    const html = generarHTMLContrato(vars);

    expect(html).toContain("Saldo");
    expect(html).toContain("S/ 60,000.00");
    expect(html).toContain("120 cuotas mensuales");
  });

  it("no incluye sección de separación cuando no hay monto", () => {
    const vars = baseVariables();
    const html = generarHTMLContrato(vars);

    // Sin monto_separacion, no debería mostrar la sección de separación
    expect(html).not.toContain("abonado a la firma");
  });

  it("incluye datos de empresa cuando se proporcionan", () => {
    const vars = baseVariables({
      empresa_nombre: "AMERSUR INMOBILIARIA S.A.C.",
      empresa_ruc: "20601234567",
      empresa_direccion: "Av. La Marina 456, San Miguel, Lima",
      empresa_representante: "Juan Pérez García",
      empresa_representante_dni: "12345678",
    });
    const html = generarHTMLContrato(vars);

    expect(html).toContain("AMERSUR INMOBILIARIA S.A.C.");
    expect(html).toContain("20601234567");
    expect(html).toContain("Av. La Marina 456, San Miguel, Lima");
    expect(html).toContain("Juan Pérez García");
    expect(html).toContain("12345678");
  });

  it("genera HTML sin errores cuando se proporcionan datos de notaría", () => {
    const vars = baseVariables({
      notaria: "Notaría Fernández",
      notario: "Dr. Manuel Fernández",
    });
    const html = generarHTMLContrato(vars);

    // La plantilla genera HTML válido con estos datos (se usan en la sección de firmas)
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("CONTRATO DE COMPRAVENTA");
  });

  it("incluye partida registral y zona registral en antecedentes", () => {
    const vars = baseVariables({
      partida_registral: "13953913",
      zona_registral: "IX - Lima",
    });
    const html = generarHTMLContrato(vars);

    expect(html).toContain("13953913");
    expect(html).toContain("IX - Lima");
  });

  it("genera sección de firmas con datos del vendedor y comprador", () => {
    const vars = baseVariables({
      empresa_nombre: "AMERSUR INMOBILIARIA",
      empresa_representante: "María López",
    });
    const html = generarHTMLContrato(vars);

    expect(html).toContain("LA VENDEDORA");
    expect(html).toContain("EL COMPRADOR");
    expect(html).toContain("Carlos Alberto Franco Meléndez");
    expect(html).toContain("María López");
  });

  it("maneja correctamente moneda USD", () => {
    const vars = baseVariables({
      moneda: "USD",
      moneda_simbolo: "$",
      precio_total: "58,270.00",
    });
    const html = generarHTMLContrato(vars);

    expect(html).toContain("$ 58,270.00");
  });

  it("incluye tabla con datos del lote", () => {
    const vars = baseVariables();
    const html = generarHTMLContrato(vars);

    expect(html).toContain("<table>");
    expect(html).toContain("LOTE");
    expect(html).toContain("LV-59");
    expect(html).toContain("200");
    expect(html).toContain("TOTAL DEL PRECIO DE VENTA INCLUIDO IGV");
  });

  it("incluye estilos CSS para impresión", () => {
    const vars = baseVariables();
    const html = generarHTMLContrato(vars);

    expect(html).toContain("@page");
    expect(html).toContain("@media print");
  });

  it("muestra forma de pago en mayúsculas", () => {
    const vars = baseVariables({ forma_pago: "financiamiento bancario" });
    const html = generarHTMLContrato(vars);

    expect(html).toContain("FINANCIAMIENTO BANCARIO");
  });

  it("incluye precio en letras cuando se proporciona", () => {
    const vars = baseVariables({ precio_letras: "Setenta y cinco mil con 00/100 Soles" });
    const html = generarHTMLContrato(vars);

    expect(html).toContain("Setenta y cinco mil con 00/100 Soles");
  });
});

describe("reemplazarVariables", () => {
  it("reemplaza variables con formato {{variable}}", () => {
    const template = "Cliente: {{nombre}}, DNI: {{dni}}";
    const result = reemplazarVariables(template, { nombre: "Juan", dni: "12345678" });

    expect(result).toBe("Cliente: Juan, DNI: 12345678");
  });

  it("muestra fallback para variables no proporcionadas", () => {
    const template = "Dirección: {{direccion}}";
    const result = reemplazarVariables(template, {});

    expect(result).toBe("Dirección: ___________");
  });

  it("reemplaza múltiples ocurrencias de la misma variable", () => {
    const template = "{{nombre}} es {{nombre}}";
    const result = reemplazarVariables(template, { nombre: "Juan" });

    expect(result).toBe("Juan es Juan");
  });

  it("no modifica texto que no tiene formato de variable", () => {
    const template = "Texto sin variables";
    const result = reemplazarVariables(template, { nombre: "Juan" });

    expect(result).toBe("Texto sin variables");
  });
});
