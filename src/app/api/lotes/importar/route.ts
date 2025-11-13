import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { createServerOnlyClient } from "@/lib/supabase.server";

// Interfaz para los datos del lote desde Excel
interface LoteExcelRow {
  codigo: string;
  tipo_unidad?: string;
  sup_m2?: number | string;
  precio?: number | string;
  precio_m2?: number | string;
  moneda?: string;
  estado?: string;
}

// Interfaz para el resultado de la importación
interface ImportResult {
  success: boolean;
  total: number;
  imported: number;
  errors: Array<{
    row: number;
    codigo: string;
    error: string;
  }>;
  duplicados: string[];
}

// Función auxiliar para limpiar y validar un valor numérico
// Maneja formatos: "62.000,00" (Perú), "62,000.00" (USA), "62000" (sin formato)
function parseNumero(value: any): number | null {
  if (value === null || value === undefined || value === "") return null;

  // Si ya es un número, retornarlo directamente
  if (typeof value === "number") return value;

  // Convertir a string y limpiar espacios
  let strValue = String(value).trim();

  // Si está vacío después de trim, retornar null
  if (strValue === "") return null;

  // Detectar formato: si tiene punto y coma, es formato europeo/peruano (62.000,50)
  // Si tiene coma y punto, es formato USA (62,000.50)
  const hasPunto = strValue.includes(".");
  const hasComa = strValue.includes(",");

  if (hasPunto && hasComa) {
    // Determinar cuál es el separador decimal (el último)
    const lastPunto = strValue.lastIndexOf(".");
    const lastComa = strValue.lastIndexOf(",");

    if (lastComa > lastPunto) {
      // Formato europeo/peruano: 62.000,50
      strValue = strValue.replace(/\./g, "").replace(",", ".");
    } else {
      // Formato USA: 62,000.50
      strValue = strValue.replace(/,/g, "");
    }
  } else if (hasComa && !hasPunto) {
    // Solo coma: puede ser decimal europeo (1500,50) o separador de miles USA (1,500)
    // Si hay más de una coma O la coma está seguida de 3 dígitos, es separador de miles
    const comasParts = strValue.split(",");
    if (comasParts.length > 2 || (comasParts.length === 2 && comasParts[1].length === 3)) {
      // Separador de miles: 1,500 o 1,500,000
      strValue = strValue.replace(/,/g, "");
    } else {
      // Decimal europeo: 1500,50
      strValue = strValue.replace(",", ".");
    }
  } else if (hasPunto && !hasComa) {
    // Solo punto: puede ser decimal USA (1500.50) o separador de miles europeo (1.500)
    const puntoParts = strValue.split(".");
    if (puntoParts.length > 2 || (puntoParts.length === 2 && puntoParts[1].length === 3)) {
      // Separador de miles europeo: 1.500 o 1.500.000
      strValue = strValue.replace(/\./g, "");
    }
    // Si es decimal USA (1500.50), no hacer nada
  }

  const num = parseFloat(strValue);
  return isNaN(num) ? null : num;
}

// Función auxiliar para validar estado
function validarEstado(estado: any): "disponible" | "reservado" | "vendido" {
  const estadoStr = String(estado || "").toLowerCase().trim();
  if (estadoStr === "reservado") return "reservado";
  if (estadoStr === "vendido") return "vendido";
  return "disponible";
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerOnlyClient();

    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      );
    }

    // Verificar permisos de administrador
    const { data: perfil, error: perfilError } = await supabase
      .from("usuario_perfil")
      .select("rol_id")
      .eq("id", user.id)
      .single();

    if (perfilError || !perfil?.rol_id) {
      return NextResponse.json(
        { error: "No tienes permisos para importar lotes. Solo los administradores pueden realizar esta acción." },
        { status: 403 }
      );
    }

    const { data: rol, error: rolError } = await supabase
      .from("rol")
      .select("nombre")
      .eq("id", perfil.rol_id)
      .single();

    if (rolError || rol?.nombre !== "ROL_ADMIN") {
      return NextResponse.json(
        { error: "No tienes permisos para importar lotes. Solo los administradores pueden realizar esta acción." },
        { status: 403 }
      );
    }

    // Obtener el archivo y el proyecto_id del FormData
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const proyecto_id = formData.get("proyecto_id") as string;

    if (!file) {
      return NextResponse.json(
        { error: "No se proporcionó ningún archivo" },
        { status: 400 }
      );
    }

    if (!proyecto_id) {
      return NextResponse.json(
        { error: "No se proporcionó el ID del proyecto" },
        { status: 400 }
      );
    }

    // Verificar que el proyecto existe
    const { data: proyecto, error: proyectoError } = await supabase
      .from("proyecto")
      .select("id, nombre")
      .eq("id", proyecto_id)
      .single();

    if (proyectoError || !proyecto) {
      return NextResponse.json(
        { error: "Proyecto no encontrado" },
        { status: 404 }
      );
    }

    // Leer el archivo Excel
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const workbook = XLSX.read(buffer, { type: "buffer" });

    // Obtener la primera hoja
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convertir a JSON
    const rawData: any[] = XLSX.utils.sheet_to_json(worksheet, {
      raw: false,
      defval: null
    });

    if (rawData.length === 0) {
      return NextResponse.json(
        { error: "El archivo Excel está vacío o no tiene el formato correcto" },
        { status: 400 }
      );
    }

    // Función para normalizar nombres de columnas
    // Elimina acentos, espacios, convierte a minúsculas
    const normalizeColumnName = (name: string): string => {
      return name
        .toLowerCase()
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Eliminar acentos
        .replace(/\s+/g, "_"); // Reemplazar espacios por guiones bajos
    };

    // Mapeo de variaciones comunes de nombres de columna a nombres estándar
    const columnMapping: Record<string, string> = {
      "codigo": "codigo",
      "code": "codigo",
      "cod": "codigo",
      "lote": "codigo",
      "tipo_unidad": "tipo_unidad",
      "tipounidad": "tipo_unidad",
      "tipo_de_unidad": "tipo_unidad",
      "tipo": "tipo_unidad",
      "unidad": "tipo_unidad",
      "sup_m2": "sup_m2",
      "superficie": "sup_m2",
      "area": "sup_m2",
      "m2": "sup_m2",
      "metros": "sup_m2",
      "precio": "precio",
      "price": "precio",
      "valor": "precio",
      "precio_m2": "precio_m2",
      "preciom2": "precio_m2",
      "precio_por_m2": "precio_m2",
      "moneda": "moneda",
      "currency": "moneda",
      "estado": "estado",
      "status": "estado",
      "estatus": "estado",
    };

    // Normalizar las columnas de cada fila
    const normalizedData = rawData.map((row: any, index: number) => {
      const normalized: any = {};

      Object.keys(row).forEach(key => {
        const normalizedKey = normalizeColumnName(key);
        const standardKey = columnMapping[normalizedKey] || normalizedKey;
        normalized[standardKey] = row[key];
      });

      // Log para debugging (solo la primera fila)
      if (index === 0) {
        console.log("🔍 Columnas detectadas en Excel:", Object.keys(row));
        console.log("🔄 Columnas normalizadas:", Object.keys(normalized));
      }

      return normalized;
    });

    // Obtener códigos existentes en el proyecto
    const { data: lotesExistentes } = await supabase
      .from("lote")
      .select("codigo")
      .eq("proyecto_id", proyecto_id);

    const codigosExistentes = new Set(
      (lotesExistentes || []).map((l) => l.codigo.toLowerCase().trim())
    );

    const result: ImportResult = {
      success: true,
      total: normalizedData.length,
      imported: 0,
      errors: [],
      duplicados: [],
    };

    // Procesar cada fila
    for (let i = 0; i < normalizedData.length; i++) {
      const row = normalizedData[i];
      const rowNumber = i + 2; // +2 porque Excel empieza en 1 y hay 1 fila de encabezado

      try {
        // Validar que tenga el campo código
        const codigo = String(row.codigo || "").trim();
        if (!codigo) {
          result.errors.push({
            row: rowNumber,
            codigo: "",
            error: "El código del lote es obligatorio",
          });
          continue;
        }

        // Verificar si el código ya existe
        if (codigosExistentes.has(codigo.toLowerCase())) {
          result.duplicados.push(codigo);
          result.errors.push({
            row: rowNumber,
            codigo,
            error: `Ya existe un lote con código "${codigo}" en este proyecto`,
          });
          continue;
        }

        // Preparar datos del lote
        const precio_m2 = parseNumero(row.precio_m2);
        const tipo_unidad = row.tipo_unidad ? String(row.tipo_unidad).trim() : null;

        // Construir objeto data con campos adicionales
        const dataFields: Record<string, any> = {};
        if (precio_m2 !== null) dataFields.precio_m2 = precio_m2;
        if (tipo_unidad) dataFields.tipo_unidad = tipo_unidad;

        const loteData = {
          proyecto_id,
          codigo,
          sup_m2: parseNumero(row.sup_m2),
          precio: parseNumero(row.precio),
          moneda: String(row.moneda || "PEN").toUpperCase().trim(),
          estado: validarEstado(row.estado),
          created_by: user.id,
          // Guardar datos adicionales en el campo data si existen
          ...(Object.keys(dataFields).length > 0 && {
            data: dataFields
          }),
        };

        // Insertar el lote
        const { error: insertError } = await supabase
          .from("lote")
          .insert(loteData);

        if (insertError) {
          result.errors.push({
            row: rowNumber,
            codigo,
            error: insertError.message,
          });
        } else {
          result.imported++;
          // Agregar a códigos existentes para evitar duplicados en el mismo archivo
          codigosExistentes.add(codigo.toLowerCase());
        }
      } catch (error) {
        result.errors.push({
          row: rowNumber,
          codigo: row.codigo || "",
          error: error instanceof Error ? error.message : "Error desconocido",
        });
      }
    }

    // Si no se importó ninguno, marcar como error
    if (result.imported === 0) {
      result.success = false;
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Error importando lotes:", error);
    return NextResponse.json(
      {
        error: "Error procesando el archivo",
        details: error instanceof Error ? error.message : "Error desconocido"
      },
      { status: 500 }
    );
  }
}
