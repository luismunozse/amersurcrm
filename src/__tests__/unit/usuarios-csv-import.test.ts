import { describe, it, expect } from "vitest";

/**
 * Tests for CSV parsing and row validation logic used in ImportarUsuariosModal.
 * We recreate the pure functions here since they're not exported from the component.
 */

// ==================== RECREATED FUNCTIONS ====================

function parseCSV(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  return lines.map((line) => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if ((ch === "," || ch === ";") && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  });
}

type Rol = { id: string; nombre: string };
type ParsedRow = {
  nombre_completo: string;
  email: string;
  dni: string;
  telefono: string;
  rol_nombre: string;
  meta_mensual: string;
  comision: string;
  errors: string[];
};

function validateRow(
  row: string[],
  roles: Rol[],
  allEmails: Set<string>,
  allDnis: Set<string>
): ParsedRow {
  const [nombre, email, dni, telefono, rolNombre, meta, comision] = row.map(
    (v) => v?.trim() || ""
  );
  const errors: string[] = [];

  if (!nombre || nombre.length < 3) errors.push("Nombre requerido (min 3 chars)");
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    errors.push("Email inválido");
  else if (allEmails.has(email.toLowerCase()))
    errors.push("Email duplicado en CSV");
  if (!dni || !/^\d{8}$/.test(dni)) errors.push("DNI: 8 dígitos");
  else if (allDnis.has(dni)) errors.push("DNI duplicado en CSV");

  const matchedRol = roles.find(
    (r) =>
      r.nombre.toLowerCase().includes(rolNombre.toLowerCase()) ||
      rolNombre.toLowerCase().includes(r.nombre.replace("ROL_", "").toLowerCase())
  );
  if (!matchedRol && rolNombre) errors.push(`Rol "${rolNombre}" no encontrado`);

  if (meta && (isNaN(Number(meta)) || Number(meta) < 0))
    errors.push("Meta inválida");
  if (
    comision &&
    (isNaN(Number(comision)) || Number(comision) < 0 || Number(comision) > 100)
  )
    errors.push("Comisión 0-100");

  if (email) allEmails.add(email.toLowerCase());
  if (dni) allDnis.add(dni);

  return {
    nombre_completo: nombre,
    email: email.toLowerCase(),
    dni,
    telefono,
    rol_nombre: matchedRol?.nombre || rolNombre,
    meta_mensual: meta,
    comision,
    errors,
  };
}

// ==================== TESTS ====================

const MOCK_ROLES: Rol[] = [
  { id: "rol-1", nombre: "ROL_ADMIN" },
  { id: "rol-2", nombre: "ROL_VENDEDOR" },
  { id: "rol-3", nombre: "ROL_COORDINADOR_VENTAS" },
];

describe("parseCSV", () => {
  it("parsea CSV básico con comas", () => {
    const csv = "Juan Pérez,juan@mail.com,12345678,987654321,vendedor,50000,5";
    const result = parseCSV(csv);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual([
      "Juan Pérez",
      "juan@mail.com",
      "12345678",
      "987654321",
      "vendedor",
      "50000",
      "5",
    ]);
  });

  it("parsea CSV con punto y coma como separador", () => {
    const csv =
      "Juan Pérez;juan@mail.com;12345678;987654321;vendedor;50000;5";
    const result = parseCSV(csv);

    expect(result).toHaveLength(1);
    expect(result[0][0]).toBe("Juan Pérez");
    expect(result[0][1]).toBe("juan@mail.com");
  });

  it("parsea valores con comillas dobles", () => {
    const csv = '"Pérez, Juan",juan@mail.com,12345678,987654321,vendedor,50000,5';
    const result = parseCSV(csv);

    expect(result[0][0]).toBe("Pérez, Juan");
  });

  it("parsea comillas escapadas dentro de comillas", () => {
    const csv = '"Juan ""El Jefe"" Pérez",juan@mail.com,12345678,,,50000,5';
    const result = parseCSV(csv);

    expect(result[0][0]).toBe('Juan "El Jefe" Pérez');
  });

  it("parsea múltiples líneas", () => {
    const csv = `nombre_completo,email,dni,telefono,rol,meta_mensual,comision
Juan Pérez,juan@mail.com,12345678,987654321,vendedor,50000,5
María López,maria@mail.com,87654321,912345678,vendedor,60000,7`;

    const result = parseCSV(csv);
    expect(result).toHaveLength(3); // header + 2 rows
  });

  it("ignora líneas vacías", () => {
    const csv = `Juan Pérez,juan@mail.com,12345678,987654321,vendedor,50000,5

María López,maria@mail.com,87654321,912345678,vendedor,60000,7
`;
    const result = parseCSV(csv);
    expect(result).toHaveLength(2);
  });

  it("maneja saltos de línea Windows (\\r\\n)", () => {
    const csv =
      "Juan,juan@mail.com,12345678,987654321,vendedor,50000,5\r\nMaría,maria@mail.com,87654321,912345678,vendedor,60000,7";
    const result = parseCSV(csv);
    expect(result).toHaveLength(2);
  });

  it("maneja campos vacíos", () => {
    const csv = "Juan Pérez,juan@mail.com,12345678,,vendedor,,";
    const result = parseCSV(csv);
    expect(result[0][3]).toBe(""); // telefono vacío
    expect(result[0][5]).toBe(""); // meta vacía
    expect(result[0][6]).toBe(""); // comision vacía
  });
});

describe("validateRow", () => {
  it("valida fila correcta sin errores", () => {
    const row = ["Juan Pérez", "juan@mail.com", "12345678", "987654321", "vendedor", "50000", "5"];
    const emails = new Set<string>();
    const dnis = new Set<string>();

    const result = validateRow(row, MOCK_ROLES, emails, dnis);

    expect(result.errors).toHaveLength(0);
    expect(result.nombre_completo).toBe("Juan Pérez");
    expect(result.email).toBe("juan@mail.com");
    expect(result.dni).toBe("12345678");
    expect(result.rol_nombre).toBe("ROL_VENDEDOR");
  });

  it("genera error si nombre es muy corto", () => {
    const row = ["JJ", "juan@mail.com", "12345678", "", "vendedor", "", ""];
    const result = validateRow(row, MOCK_ROLES, new Set(), new Set());

    expect(result.errors).toContainEqual(expect.stringContaining("Nombre"));
  });

  it("genera error si nombre está vacío", () => {
    const row = ["", "juan@mail.com", "12345678", "", "vendedor", "", ""];
    const result = validateRow(row, MOCK_ROLES, new Set(), new Set());

    expect(result.errors).toContainEqual(expect.stringContaining("Nombre"));
  });

  it("genera error si email es inválido", () => {
    const row = ["Juan Pérez", "not-an-email", "12345678", "", "vendedor", "", ""];
    const result = validateRow(row, MOCK_ROLES, new Set(), new Set());

    expect(result.errors).toContainEqual(expect.stringContaining("Email"));
  });

  it("genera error si email está vacío", () => {
    const row = ["Juan Pérez", "", "12345678", "", "vendedor", "", ""];
    const result = validateRow(row, MOCK_ROLES, new Set(), new Set());

    expect(result.errors).toContainEqual(expect.stringContaining("Email"));
  });

  it("detecta emails duplicados dentro del CSV", () => {
    const emails = new Set<string>(["juan@mail.com"]);
    const row = ["Juan Pérez", "juan@mail.com", "12345678", "", "vendedor", "", ""];
    const result = validateRow(row, MOCK_ROLES, emails, new Set());

    expect(result.errors).toContainEqual(expect.stringContaining("duplicado"));
  });

  it("genera error si DNI no tiene 8 dígitos", () => {
    const row = ["Juan Pérez", "juan@mail.com", "1234567", "", "vendedor", "", ""];
    const result = validateRow(row, MOCK_ROLES, new Set(), new Set());

    expect(result.errors).toContainEqual(expect.stringContaining("8 dígitos"));
  });

  it("genera error si DNI contiene letras", () => {
    const row = ["Juan Pérez", "juan@mail.com", "1234567A", "", "vendedor", "", ""];
    const result = validateRow(row, MOCK_ROLES, new Set(), new Set());

    expect(result.errors).toContainEqual(expect.stringContaining("8 dígitos"));
  });

  it("detecta DNIs duplicados dentro del CSV", () => {
    const dnis = new Set<string>(["12345678"]);
    const row = ["Juan Pérez", "juan@mail.com", "12345678", "", "vendedor", "", ""];
    const result = validateRow(row, MOCK_ROLES, new Set(), dnis);

    expect(result.errors).toContainEqual(expect.stringContaining("DNI duplicado"));
  });

  it("genera error si el rol no existe", () => {
    const row = ["Juan Pérez", "juan@mail.com", "12345678", "", "supervisor", "", ""];
    const result = validateRow(row, MOCK_ROLES, new Set(), new Set());

    expect(result.errors).toContainEqual(expect.stringContaining('Rol "supervisor"'));
  });

  it("hace match parcial de rol (vendedor -> ROL_VENDEDOR)", () => {
    const row = ["Juan Pérez", "juan@mail.com", "12345678", "", "vendedor", "", ""];
    const result = validateRow(row, MOCK_ROLES, new Set(), new Set());

    expect(result.rol_nombre).toBe("ROL_VENDEDOR");
    expect(result.errors.filter((e) => e.includes("Rol"))).toHaveLength(0);
  });

  it("genera error si meta es negativa", () => {
    const row = ["Juan Pérez", "juan@mail.com", "12345678", "", "vendedor", "-100", ""];
    const result = validateRow(row, MOCK_ROLES, new Set(), new Set());

    expect(result.errors).toContainEqual(expect.stringContaining("Meta"));
  });

  it("genera error si meta no es número", () => {
    const row = ["Juan Pérez", "juan@mail.com", "12345678", "", "vendedor", "abc", ""];
    const result = validateRow(row, MOCK_ROLES, new Set(), new Set());

    expect(result.errors).toContainEqual(expect.stringContaining("Meta"));
  });

  it("genera error si comisión > 100", () => {
    const row = ["Juan Pérez", "juan@mail.com", "12345678", "", "vendedor", "", "150"];
    const result = validateRow(row, MOCK_ROLES, new Set(), new Set());

    expect(result.errors).toContainEqual(expect.stringContaining("Comisión"));
  });

  it("genera error si comisión < 0", () => {
    const row = ["Juan Pérez", "juan@mail.com", "12345678", "", "vendedor", "", "-5"];
    const result = validateRow(row, MOCK_ROLES, new Set(), new Set());

    expect(result.errors).toContainEqual(expect.stringContaining("Comisión"));
  });

  it("acepta comisión 0", () => {
    const row = ["Juan Pérez", "juan@mail.com", "12345678", "", "vendedor", "", "0"];
    const result = validateRow(row, MOCK_ROLES, new Set(), new Set());

    expect(result.errors.filter((e) => e.includes("Comisión"))).toHaveLength(0);
  });

  it("acepta comisión 100", () => {
    const row = ["Juan Pérez", "juan@mail.com", "12345678", "", "vendedor", "", "100"];
    const result = validateRow(row, MOCK_ROLES, new Set(), new Set());

    expect(result.errors.filter((e) => e.includes("Comisión"))).toHaveLength(0);
  });

  it("acepta fila sin meta ni comisión (opcionales)", () => {
    const row = ["Juan Pérez", "juan@mail.com", "12345678", "987654321", "vendedor", "", ""];
    const result = validateRow(row, MOCK_ROLES, new Set(), new Set());

    expect(result.errors).toHaveLength(0);
  });

  it("acumula emails y dnis en los sets para detectar duplicados", () => {
    const emails = new Set<string>();
    const dnis = new Set<string>();

    validateRow(["Juan", "juan@mail.com", "12345678", "", "vendedor", "", ""], MOCK_ROLES, emails, dnis);

    expect(emails.has("juan@mail.com")).toBe(true);
    expect(dnis.has("12345678")).toBe(true);
  });

  it("trimea espacios en todos los campos", () => {
    const row = ["  Juan Pérez  ", "  juan@mail.com  ", " 12345678 ", "  987654321  ", " vendedor ", " 50000 ", " 5 "];
    const result = validateRow(row, MOCK_ROLES, new Set(), new Set());

    expect(result.nombre_completo).toBe("Juan Pérez");
    expect(result.email).toBe("juan@mail.com");
    expect(result.dni).toBe("12345678");
  });

  it("convierte email a lowercase", () => {
    const row = ["Juan Pérez", "Juan@Mail.COM", "12345678", "", "vendedor", "", ""];
    const result = validateRow(row, MOCK_ROLES, new Set(), new Set());

    expect(result.email).toBe("juan@mail.com");
  });
});

describe("parseCSV + validateRow integration", () => {
  it("procesa un CSV completo de ejemplo", () => {
    const csv = `nombre_completo,email,dni,telefono,rol,meta_mensual,comision
Juan Pérez,juan@gmail.com,12345678,987654321,vendedor,50000,5
María López,maria@gmail.com,87654321,912345678,vendedor,60000,7
Carlos Ruiz,carlos@gmail.com,11223344,999888777,admin,,`;

    const rows = parseCSV(csv);
    const dataRows = rows.slice(1); // Skip header

    const emails = new Set<string>();
    const dnis = new Set<string>();
    const results = dataRows.map((row) => validateRow(row, MOCK_ROLES, emails, dnis));

    expect(results).toHaveLength(3);
    expect(results[0].errors).toHaveLength(0);
    expect(results[1].errors).toHaveLength(0);
    expect(results[2].errors).toHaveLength(0);
    expect(results[0].rol_nombre).toBe("ROL_VENDEDOR");
    expect(results[2].rol_nombre).toBe("ROL_ADMIN");
  });

  it("detecta errores en CSV con datos inválidos", () => {
    const csv = `nombre_completo,email,dni,telefono,rol,meta_mensual,comision
AB,not-email,1234,987654321,inexistente,-100,200`;

    const rows = parseCSV(csv);
    const dataRows = rows.slice(1);

    const emails = new Set<string>();
    const dnis = new Set<string>();
    const results = dataRows.map((row) => validateRow(row, MOCK_ROLES, emails, dnis));

    // Should have multiple errors
    expect(results[0].errors.length).toBeGreaterThanOrEqual(4);
  });

  it("detecta duplicados entre filas", () => {
    const csv = `nombre_completo,email,dni,telefono,rol,meta_mensual,comision
Juan Pérez,juan@gmail.com,12345678,987654321,vendedor,50000,5
María López,juan@gmail.com,12345678,912345678,vendedor,60000,7`;

    const rows = parseCSV(csv);
    const dataRows = rows.slice(1);

    const emails = new Set<string>();
    const dnis = new Set<string>();
    const results = dataRows.map((row) => validateRow(row, MOCK_ROLES, emails, dnis));

    // Second row should have duplicate errors
    expect(results[0].errors).toHaveLength(0);
    expect(results[1].errors).toContainEqual(expect.stringContaining("Email duplicado"));
    expect(results[1].errors).toContainEqual(expect.stringContaining("DNI duplicado"));
  });
});
