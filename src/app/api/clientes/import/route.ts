import { NextRequest, NextResponse } from "next/server";
import { createServerActionClient } from "@/lib/supabase.server-actions";
import { z } from "zod";

const ClienteImportSchema = z.object({
  codigo_cliente: z.string().optional(),
  nombre: z.string().min(1, "Nombre requerido"),
  tipo_cliente: z.enum(['persona', 'empresa']).optional().default('persona'),
  documento_identidad: z.string().optional(),
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

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const dataJson = formData.get("data");
    
    if (!dataJson) {
      return NextResponse.json({ error: "No data provided" }, { status: 400 });
    }

    const clientesData = JSON.parse(dataJson as string);
    
    if (!Array.isArray(clientesData)) {
      return NextResponse.json({ error: "Data must be an array" }, { status: 400 });
    }

    const supabase = await createServerActionClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // Validar y transformar datos
    const validatedClientes = [];
    const errors = [];

    for (let i = 0; i < clientesData.length; i++) {
      try {
        const cliente = ClienteImportSchema.parse(clientesData[i]);
        
        // Preparar datos para inserción
        const insertData = {
          ...cliente,
          email: cliente.email && cliente.email.trim() !== '' ? cliente.email : null,
          telefono: cliente.telefono && cliente.telefono.trim() !== '' ? cliente.telefono : null,
          telefono_whatsapp: cliente.telefono_whatsapp && cliente.telefono_whatsapp.trim() !== '' ? cliente.telefono_whatsapp : null,
          documento_identidad: cliente.documento_identidad && cliente.documento_identidad.trim() !== '' ? cliente.documento_identidad : null,
          origen_lead: cliente.origen_lead && cliente.origen_lead.trim() !== '' ? cliente.origen_lead : null,
          vendedor_asignado: cliente.vendedor_asignado && cliente.vendedor_asignado.trim() !== '' ? cliente.vendedor_asignado : null,
          proxima_accion: cliente.proxima_accion && cliente.proxima_accion.trim() !== '' ? cliente.proxima_accion : null,
          interes_principal: cliente.interes_principal && cliente.interes_principal.trim() !== '' ? cliente.interes_principal : null,
          capacidad_compra_estimada: cliente.capacidad_compra_estimada || null,
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
        };

        validatedClientes.push(insertData);
      } catch (error) {
        if (error instanceof z.ZodError) {
          errors.push({
            row: i + 1,
            errors: error.errors.map(e => e.message)
          });
        } else {
          errors.push({
            row: i + 1,
            errors: [String(error)]
          });
        }
      }
    }

    if (errors.length > 0) {
      return NextResponse.json({ 
        error: "Validation errors", 
        errors 
      }, { status: 400 });
    }

    // Insertar en lotes para mejor rendimiento
    const BATCH_SIZE = 50;
    const results = [];

    for (let i = 0; i < validatedClientes.length; i += BATCH_SIZE) {
      const batch = validatedClientes.slice(i, i + BATCH_SIZE);
      
      const { error } = await supabase
        .from("cliente")
        .insert(batch);

      if (error) {
        return NextResponse.json({ 
          error: "Database error", 
          details: error.message 
        }, { status: 500 });
      }

      results.push(batch.length);
    }

    return NextResponse.json({ 
      success: true, 
      imported: validatedClientes.length,
      batches: results.length
    });

  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: String(error)
    }, { status: 500 });
  }
}
