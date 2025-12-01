import { NextRequest, NextResponse } from "next/server";
import { createServerOnlyClient } from "@/lib/supabase.server";
import { z } from "zod";

const ClienteImportSchema = z.object({
  nombre: z.string().min(1, "Nombre requerido"),
  apellido: z.string().min(1, "Apellido requerido"),
  telefono: z.string().min(1, "Teléfono requerido"),
  proyecto_interes: z.string().optional(),
  _proyecto_id: z.string().optional(), // ID del proyecto encontrado
  _proyecto_nombre: z.string().optional(), // Nombre del proyecto encontrado
});

type ClienteImportSchemaType = z.infer<typeof ClienteImportSchema>;

interface ClienteInsertPayload {
  nombre: string;
  tipo_cliente: 'persona';
  telefono: string;
  estado_cliente: 'lead';
  notas: string | null;
  created_by: string;
  _proyecto_id?: string; // Campo interno para vinculación
  _proyecto_nombre?: string; // Campo interno para referencia
}

interface ClienteImportErrorDetail {
  row: number;
  errors: string[];
}

interface ImportResponsePayload {
  success: boolean;
  imported: number;
  skippedDuplicates: number;
  received: number;
  partial?: true;
  invalid?: number;
  errors?: ClienteImportErrorDetail[];
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const dataJson = formData.get("data");

    if (!dataJson) {
      return NextResponse.json({ error: "No data provided" }, { status: 400 });
    }

    const rawClientes: unknown = JSON.parse(dataJson as string);

    if (!Array.isArray(rawClientes)) {
      return NextResponse.json({ error: "Data must be an array" }, { status: 400 });
    }

    const clientesData: unknown[] = rawClientes;

    const supabase = await createServerOnlyClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // Validar y transformar datos
    const validatedClientes: ClienteInsertPayload[] = [];
    const errors: ClienteImportErrorDetail[] = [];

    for (let i = 0; i < clientesData.length; i++) {
      try {
        const cliente = ClienteImportSchema.parse(clientesData[i]) as ClienteImportSchemaType;

        // Construir nombre completo y notas
        const nombreCompleto = `${cliente.nombre.trim()} ${cliente.apellido.trim()}`;
        let notas = null;

        if (cliente.proyecto_interes && cliente.proyecto_interes.trim()) {
          notas = `Proyecto de interés: ${cliente.proyecto_interes.trim()}`;
        }

        // Preparar datos para inserción
        const insertData: ClienteInsertPayload = {
          nombre: nombreCompleto,
          tipo_cliente: 'persona',
          telefono: cliente.telefono.trim(),
          estado_cliente: 'lead',
          notas,
          created_by: user.id,
          _proyecto_id: cliente._proyecto_id, // Guardar para vinculación posterior
          _proyecto_nombre: cliente._proyecto_nombre,
        };

        validatedClientes.push(insertData);
      } catch (error) {
        if (error instanceof z.ZodError) {
          errors.push({
            row: i + 1,
            errors: error.issues.map((issue) => issue.message)
          });
        } else {
          errors.push({
            row: i + 1,
            errors: [error instanceof Error ? error.message : String(error)]
          });
        }
      }
    }

    // Inserción fila por fila para saltar duplicados por constraint único de teléfono normalizado
    let importedCount = 0;
    let skippedDuplicates = 0;

    if (validatedClientes.length > 0) {
      for (const cliente of validatedClientes) {
        // Extraer campos internos antes de insertar
        const { _proyecto_id, _proyecto_nombre, ...clienteData } = cliente;

        const { data: nuevoCliente, error } = await supabase
          .from("cliente")
          .insert(clienteData)
          .select('id')
          .single();

        if (error) {
          const msg = String(error.message || '');
          if (msg.includes('duplicate key value') && msg.includes('uniq_cliente_phone_normalized')) {
            skippedDuplicates++;
            continue; // ignorar duplicados y seguir
          }
          return NextResponse.json({
            error: "Database error",
            details: error.message
          }, { status: 500 });
        }

        importedCount++;

        // Si se creó el cliente y hay un proyecto vinculado, crear la relación
        if (nuevoCliente && _proyecto_id) {
          await supabase
            .from("cliente_propiedad_interes")
            .insert({
              cliente_id: nuevoCliente.id,
              proyecto_id: _proyecto_id,
              prioridad: 2,
              notas: `Proyecto: ${_proyecto_nombre || 'sin nombre'}. Agregado automáticamente desde importación.`,
              agregado_por: 'sistema'
            });
        }
      }
    }

    const responsePayload: ImportResponsePayload = {
      success: true,
      imported: importedCount,
      skippedDuplicates,
      received: clientesData.length,
    };

    if (errors.length > 0) {
      responsePayload.partial = true;
      responsePayload.errors = errors;
      responsePayload.invalid = errors.length;
      responsePayload.received = clientesData.length;
    }

    return NextResponse.json(responsePayload);

  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json({
      error: "Internal server error",
      details: String(error)
    }, { status: 500 });
  }
}
