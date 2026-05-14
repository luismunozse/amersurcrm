import { describe, it, expect } from "vitest";
import {
  renderTemplate,
  extractVariables,
  extractSections,
  extractSnippetSlugs,
  findMissingVariables,
  prependMedia,
  normalizeWhatsAppPhone,
  buildWhatsAppUrl,
} from "./whatsapp";

describe("renderTemplate — variables simples", () => {
  it("sustituye variables presentes", () => {
    expect(
      renderTemplate("Hola {{nombre}}, gracias.", { nombre: "Luis" }),
    ).toBe("Hola Luis, gracias.");
  });

  it("deja el placeholder si la variable no existe", () => {
    expect(renderTemplate("Hola {{nombre}}", {})).toBe("Hola {{nombre}}");
  });

  it("deja el placeholder si el valor es vacío o nulo", () => {
    expect(renderTemplate("Hola {{x}}", { x: "" })).toBe("Hola {{x}}");
    expect(renderTemplate("Hola {{x}}", { x: null })).toBe("Hola {{x}}");
    expect(renderTemplate("Hola {{x}}", { x: undefined })).toBe(
      "Hola {{x}}",
    );
  });

  it("convierte valores numéricos a string", () => {
    expect(renderTemplate("Cuota {{n}}", { n: 3 })).toBe("Cuota 3");
  });

  it("acepta espacios alrededor del nombre", () => {
    expect(renderTemplate("Hola {{ nombre }}", { nombre: "X" })).toBe(
      "Hola X",
    );
  });

  it("soporta varias apariciones de la misma variable", () => {
    expect(
      renderTemplate("{{x}} y {{x}} y {{x}}", { x: "A" }),
    ).toBe("A y A y A");
  });
});

describe("renderTemplate — secciones condicionales", () => {
  it("muestra contenido cuando #var es truthy", () => {
    const out = renderTemplate(
      "Hola{{#tieneReserva}}, tu reserva está lista{{/tieneReserva}}.",
      { tieneReserva: true },
    );
    expect(out).toBe("Hola, tu reserva está lista.");
  });

  it("omite contenido cuando #var es falsy", () => {
    const out = renderTemplate(
      "Hola{{#tieneReserva}}, tu reserva está lista{{/tieneReserva}}.",
      { tieneReserva: false },
    );
    expect(out).toBe("Hola.");
  });

  it("omite contenido si #var es undefined", () => {
    const out = renderTemplate("A{{#x}}B{{/x}}C", {});
    expect(out).toBe("AC");
  });

  it("muestra contenido cuando ^var es falsy (inverso)", () => {
    const out = renderTemplate(
      "{{^sinTelefono}}Tel disponible{{/sinTelefono}}",
      { sinTelefono: false },
    );
    expect(out).toBe("Tel disponible");
  });

  it("omite contenido cuando ^var es truthy", () => {
    const out = renderTemplate(
      "{{^sinTelefono}}Tel disponible{{/sinTelefono}}",
      { sinTelefono: true },
    );
    expect(out).toBe("");
  });

  it("string vacío es falsy", () => {
    expect(renderTemplate("{{#x}}sí{{/x}}", { x: "" })).toBe("");
    expect(renderTemplate("{{#x}}sí{{/x}}", { x: "valor" })).toBe("sí");
  });

  it("número 0 es falsy, otros son truthy", () => {
    expect(renderTemplate("{{#n}}sí{{/n}}", { n: 0 })).toBe("");
    expect(renderTemplate("{{#n}}sí{{/n}}", { n: 5 })).toBe("sí");
  });

  it("renderiza variables internas a la sección activa", () => {
    const out = renderTemplate(
      "{{#tieneReserva}}Lote: {{lote}}{{/tieneReserva}}",
      { tieneReserva: true, lote: "Mz B Lt 14" },
    );
    expect(out).toBe("Lote: Mz B Lt 14");
  });

  it("secciones anidadas funcionan", () => {
    const out = renderTemplate(
      "{{#a}}A{{#b}}B{{/b}}{{/a}}",
      { a: true, b: true },
    );
    expect(out).toBe("AB");
    expect(
      renderTemplate("{{#a}}A{{#b}}B{{/b}}{{/a}}", { a: true, b: false }),
    ).toBe("A");
    expect(
      renderTemplate("{{#a}}A{{#b}}B{{/b}}{{/a}}", { a: false, b: true }),
    ).toBe("");
  });

  it("contenido multilínea dentro de sección", () => {
    const out = renderTemplate("{{#x}}\nlinea1\nlinea2\n{{/x}}", { x: true });
    expect(out).toContain("linea1");
    expect(out).toContain("linea2");
  });
});

describe("renderTemplate — snippets", () => {
  it("expande {{>slug}} con contenido del snippet", () => {
    const out = renderTemplate(
      "Cuerpo del mensaje.\n{{>firma}}",
      {},
      { snippets: { firma: "Saludos,\nCarla" } },
    );
    expect(out).toBe("Cuerpo del mensaje.\nSaludos,\nCarla");
  });

  it("deja el placeholder si el snippet no existe", () => {
    const out = renderTemplate("{{>noexiste}}", {}, { snippets: {} });
    expect(out).toBe("{{>noexiste}}");
  });

  it("snippet puede contener variables que se resuelven en el padre", () => {
    const out = renderTemplate(
      "Cuerpo. {{>firma}}",
      { vendedor: "Luis" },
      { snippets: { firma: "Atte. {{vendedor}}" } },
    );
    expect(out).toBe("Cuerpo. Atte. Luis");
  });

  it("snippet puede invocar otro snippet (anidado)", () => {
    const out = renderTemplate(
      "{{>outer}}",
      {},
      {
        snippets: {
          outer: "OUT-{{>inner}}-OUT",
          inner: "IN",
        },
      },
    );
    expect(out).toBe("OUT-IN-OUT");
  });

  it("no entra en bucle infinito con snippets recursivos", () => {
    // Snippet que se auto-referencia. La expansión se detiene en MAX_DEPTH.
    const out = renderTemplate(
      "{{>loop}}",
      {},
      { snippets: { loop: "x{{>loop}}" } },
    );
    expect(out.startsWith("xxxxx")).toBe(true); // expandió varias veces y se detuvo
    expect(out).toContain("{{>loop}}"); // último nivel no resuelto
  });

  it("snippet dentro de sección solo se expande si la sección renderiza", () => {
    const out = renderTemplate(
      "{{#mostrar}}{{>firma}}{{/mostrar}}",
      { mostrar: false },
      { snippets: { firma: "Carla" } },
    );
    expect(out).toBe("");
  });
});

describe("extractVariables", () => {
  it("retorna nombres únicos", () => {
    expect(extractVariables("Hola {{a}} y {{b}} y {{a}}")).toEqual(["a", "b"]);
  });

  it("excluye nombres de sección (#/^/)", () => {
    expect(
      extractVariables("{{#tieneReserva}}{{lote}}{{/tieneReserva}}"),
    ).toEqual(["lote"]);
  });

  it("excluye snippets {{>slug}}", () => {
    expect(extractVariables("hola {{cliente}} {{>firma}}")).toEqual(["cliente"]);
  });

  it("retorna vacío si no hay variables", () => {
    expect(extractVariables("solo texto plano")).toEqual([]);
  });
});

describe("extractSections", () => {
  it("retorna nombres de secciones #", () => {
    expect(
      extractSections("{{#a}}…{{/a}} y {{#b}}…{{/b}}"),
    ).toEqual(["a", "b"]);
  });

  it("retorna nombres de secciones ^", () => {
    expect(extractSections("{{^x}}…{{/x}}")).toEqual(["x"]);
  });

  it("retorna únicos", () => {
    expect(extractSections("{{#a}}1{{/a}}{{#a}}2{{/a}}")).toEqual(["a"]);
  });
});

describe("extractSnippetSlugs", () => {
  it("retorna slugs únicos", () => {
    expect(
      extractSnippetSlugs("a {{>firma}} b {{>disclaimer}} c {{>firma}}"),
    ).toEqual(["firma", "disclaimer"]);
  });

  it("acepta slugs con guion bajo y guion medio", () => {
    expect(extractSnippetSlugs("{{>firma_asesor}} {{>horario-atencion}}")).toEqual([
      "firma_asesor",
      "horario-atencion",
    ]);
  });

  it("retorna vacío si no hay snippets", () => {
    expect(extractSnippetSlugs("{{var}}")).toEqual([]);
  });
});

describe("findMissingVariables", () => {
  it("retorna variables sin valor", () => {
    expect(findMissingVariables("Hola {{a}} {{b}}", { a: "X" })).toEqual(["b"]);
  });

  it("ignora variables dentro de sección NO activa", () => {
    const faltantes = findMissingVariables(
      "{{#mostrar}}{{lote}}{{/mostrar}}",
      { mostrar: false },
    );
    expect(faltantes).toEqual([]);
  });

  it("cuenta variables dentro de sección activa", () => {
    const faltantes = findMissingVariables(
      "{{#mostrar}}{{lote}}{{/mostrar}}",
      { mostrar: true },
    );
    expect(faltantes).toEqual(["lote"]);
  });

  it("variables dentro de snippet expandido también se chequean", () => {
    const faltantes = findMissingVariables(
      "{{>firma}}",
      {},
      { snippets: { firma: "Atte. {{vendedor}}" } },
    );
    expect(faltantes).toEqual(["vendedor"]);
  });
});

describe("prependMedia", () => {
  it("antepone URL al body con doble salto", () => {
    expect(prependMedia("Hola", "https://x.com/foto.jpg")).toBe(
      "https://x.com/foto.jpg\n\nHola",
    );
  });

  it("retorna body sin cambios si media es null/undefined/vacío", () => {
    expect(prependMedia("Hola", null)).toBe("Hola");
    expect(prependMedia("Hola", undefined)).toBe("Hola");
    expect(prependMedia("Hola", "")).toBe("Hola");
    expect(prependMedia("Hola", "   ")).toBe("Hola");
  });

  it("trimea URL", () => {
    expect(prependMedia("Hola", "  https://x.com  ")).toBe(
      "https://x.com\n\nHola",
    );
  });
});

describe("normalizeWhatsAppPhone", () => {
  it("número peruano local 9 dígitos agrega 51", () => {
    expect(normalizeWhatsAppPhone("987654321")).toBe("51987654321");
  });

  it("número con + respeta el código país", () => {
    expect(normalizeWhatsAppPhone("+51987654321")).toBe("51987654321");
    expect(normalizeWhatsAppPhone("+34612345678")).toBe("34612345678");
  });

  it("limpia caracteres no numéricos", () => {
    expect(normalizeWhatsAppPhone("(987) 654-321")).toBe("51987654321");
  });

  it("retorna vacío si no hay dígitos", () => {
    expect(normalizeWhatsAppPhone("abc")).toBe("");
    expect(normalizeWhatsAppPhone("")).toBe("");
  });
});

describe("buildWhatsAppUrl", () => {
  it("genera URL wa.me con texto encoded", () => {
    const url = buildWhatsAppUrl("987654321", "Hola mundo");
    expect(url).toBe("https://wa.me/51987654321?text=Hola%20mundo");
  });

  it("encoda caracteres especiales en el mensaje", () => {
    const url = buildWhatsAppUrl("987654321", "Hola {{x}} & test");
    expect(url).toContain("Hola%20%7B%7Bx%7D%7D%20%26%20test");
  });

  it("lanza error con teléfono vacío", () => {
    expect(() => buildWhatsAppUrl("", "x")).toThrow();
    expect(() => buildWhatsAppUrl("abc", "x")).toThrow();
  });
});
