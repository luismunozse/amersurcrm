import { NextRequest, NextResponse } from "next/server";
import { createServerOnlyClient } from "@/lib/supabase.server";
import { z } from "zod";

type EstadoCivil = 'soltero' | 'casado' | 'viudo' | 'divorciado' | 'conviviente' | 'otro';
type TipoCliente = 'persona' | 'empresa';
type EstadoCliente = 'activo' | 'prospecto' | 'lead' | 'inactivo';

const ClienteImportSchema = z.object({
  codigo_cliente: z.string().optional(),
  nombre: z.string().min(1, "Nombre requerido"),
  tipo_cliente: z.enum(['persona', 'empresa']).optional().default('persona'),
  documento_identidad: z.string().optional(),
  estado_civil: z.enum(['soltero','casado','viudo','divorciado','conviviente','otro']).optional(),
  email: z.string().email().optional().or(z.literal('')),
  telefono: z.string().optional(),
  telefono_whatsapp: z.string().optional(),
  direccion_calle: z.string().optional(),
  direccion_numero: z.string().optional(),
  direccion_barrio: z.string().optional(),
  direccion_ciudad: z.string().optional(),
  direccion_provincia: z.string().optional(),
  direccion_pais: z.string().optional().default('Perú'),
  estado_cliente: z.enum(['activo', 'prospecto', 'lead', 'inactivo']).optional().default('prospecto'),
  origen_lead: z.string().optional(),
  vendedor_asignado: z.string().optional(),
  proxima_accion: z.string().optional(),
  interes_principal: z.string().optional(),
  capacidad_compra_estimada: z.number().optional(),
  forma_pago_preferida: z.string().optional(),
  notas: z.string().optional(),
  año: z.string().optional(), // Campo adicional para el año
});

type ClienteImportSchemaType = z.infer<typeof ClienteImportSchema>;

interface ClienteInsertPayload {
  codigo_cliente: string | null;
  nombre: string;
  tipo_cliente: TipoCliente;
  documento_identidad: string | null;
  estado_civil: EstadoCivil | null;
  email: string | null;
  telefono: string | null;
  telefono_whatsapp: string | null;
  origen_lead: string | null;
  vendedor_asignado: string | null;
  proxima_accion: string | null;
  interes_principal: string | null;
  capacidad_compra_estimada: number | null;
  forma_pago_preferida: string | null;
  notas: string | null;
  estado_cliente?: EstadoCliente;
  direccion: {
    calle: string;
    numero: string;
    barrio: string;
    ciudad: string;
    provincia: string;
    pais: string;
  };
  created_by: string;
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

        // Preparar datos para inserción (solo columnas existentes en la tabla)
        const insertData: ClienteInsertPayload = {
          codigo_cliente: cliente.codigo_cliente?.trim() || null,
          nombre: cliente.nombre,
          tipo_cliente: cliente.tipo_cliente ?? 'persona',
          documento_identidad: cliente.documento_identidad && cliente.documento_identidad.trim() !== '' ? cliente.documento_identidad : null,
          estado_civil: cliente.estado_civil ?? null,
          email: cliente.email && cliente.email.trim() !== '' ? cliente.email : null,
          telefono: cliente.telefono && cliente.telefono.trim() !== '' ? cliente.telefono : null,
          telefono_whatsapp: cliente.telefono_whatsapp && cliente.telefono_whatsapp.trim() !== '' ? cliente.telefono_whatsapp : null,
          origen_lead: cliente.origen_lead && cliente.origen_lead.trim() !== '' ? cliente.origen_lead : null,
          vendedor_asignado: cliente.vendedor_asignado && cliente.vendedor_asignado.trim() !== '' ? cliente.vendedor_asignado : null,
          proxima_accion: cliente.proxima_accion && cliente.proxima_accion.trim() !== '' ? cliente.proxima_accion : null,
          interes_principal: cliente.interes_principal && cliente.interes_principal.trim() !== '' ? cliente.interes_principal : null,
          capacidad_compra_estimada: (typeof cliente.capacidad_compra_estimada === 'number' ? cliente.capacidad_compra_estimada : null),
          forma_pago_preferida: cliente.forma_pago_preferida && cliente.forma_pago_preferida.trim() !== '' ? cliente.forma_pago_preferida : null,
          notas: cliente.notas && cliente.notas.trim() !== '' ? cliente.notas : null,
          direccion: {
            calle: cliente.direccion_calle || '',
            numero: cliente.direccion_numero || '',
            barrio: cliente.direccion_barrio || '',
            ciudad: cliente.direccion_ciudad || '',
            provincia: cliente.direccion_provincia || '',
            pais: cliente.direccion_pais || 'Perú',
          },
          created_by: user.id,
        } as const;

        if (cliente.estado_cliente) {
          insertData.estado_cliente = cliente.estado_cliente;
        }

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
      for (const row of validatedClientes) {
        const { error } = await supabase
          .from("cliente")
          .insert(row);
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
