import { NextRequest, NextResponse } from "next/server";
import { createServerOnlyClient, createServiceRoleClient } from "@/lib/supabase.server";
import { z } from "zod";

const ClienteImportSchema = z.object({
  nombre: z.string().min(1, "Nombre requerido"),
  apellido: z.string().min(1, "Apellido requerido"),
  telefono: z.string().min(1, "Teléfono requerido"),
  proyecto_interes: z.string().optional(),
  vendedor_asignado: z.string().optional(),
  _proyecto_id: z.string().optional(), // ID del proyecto encontrado
  _proyecto_nombre: z.string().optional(), // Nombre del proyecto encontrado
});

type ClienteImportSchemaType = z.infer<typeof ClienteImportSchema>;

interface ClienteInsertPayload {
  nombre: string;
  tipo_cliente: 'persona';
  telefono: string;
  telefono_e164: string;
  estado_cliente: 'por_contactar';
  notas: string | null;
  created_by: string;
  vendedor_asignado?: string | null;
  vendedor_username?: string | null;
}

interface ClienteInsertWithMetadata extends ClienteInsertPayload {
  _proyecto_id?: string;
  _proyecto_nombre?: string;
  _phone_key: string;
  _row_number: number;
  _vendedor_input?: string | null;
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
    const serviceSupabase = createServiceRoleClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // Validar y transformar datos
    const provisionalClientes: ClienteInsertWithMetadata[] = [];
    const errors: ClienteImportErrorDetail[] = [];
    const vendorInputs = new Set<string>();

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
        const phoneKey = normalizePhoneForKey(cliente.telefono);
        if (!phoneKey) {
          throw new Error("No se pudo normalizar el teléfono del cliente");
        }

        const vendedorInput = cliente.vendedor_asignado?.trim() || null;
        if (vendedorInput) {
          vendorInputs.add(vendedorInput.toLowerCase());
        }

        const insertData: ClienteInsertWithMetadata = {
          nombre: nombreCompleto,
          tipo_cliente: 'persona',
          telefono: cliente.telefono.trim(),
          telefono_e164: phoneKey,
          estado_cliente: 'por_contactar',
          notas,
          created_by: user.id,
          vendedor_asignado: null,
          vendedor_username: null,
          _proyecto_id: cliente._proyecto_id,
          _proyecto_nombre: cliente._proyecto_nombre,
          _phone_key: phoneKey,
          _row_number: i + 1,
          _vendedor_input: vendedorInput,
        };

        provisionalClientes.push(insertData);
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

    // Validar vendedores asignados
    type VendedorRow = {
      id?: string;
      username?: string;
      nombre_completo?: string | null;
      rol?: { nombre?: string | null } | Array<{ nombre?: string | null }>;
    };

    let vendedoresMap = new Map<string, { username: string }>();
    if (vendorInputs.size > 0) {
      const { data: vendedoresData, error: vendedoresError } = await serviceSupabase
        .from("usuario_perfil")
        .select("id, username, nombre_completo, activo, rol:rol!usuario_perfil_rol_fk(nombre)");

      if (vendedoresError) {
        console.error("Error obteniendo vendedores:", vendedoresError);
        return NextResponse.json({
          error: "Database error",
          details: vendedoresError.message
        }, { status: 500 });
      }

      (vendedoresData || []).forEach((rawRow) => {
        const row = rawRow as VendedorRow;
        const rolNombre = Array.isArray(row?.rol)
          ? row.rol[0]?.nombre
          : row?.rol?.nombre;
        if (!row?.username) return;
        if (!["ROL_VENDEDOR", "ROL_COORDINADOR_VENTAS"].includes(String(rolNombre || ''))) return;
        vendedoresMap.set(row.username.toLowerCase(), { username: row.username });
      });
    }

    const validatedClientes: ClienteInsertWithMetadata[] = [];
    for (const cliente of provisionalClientes) {
      if (cliente._vendedor_input) {
        const vendedor = vendedoresMap.get(cliente._vendedor_input.toLowerCase());
        if (!vendedor) {
          errors.push({
            row: cliente._row_number,
            errors: [`Vendedor "${cliente._vendedor_input}" no existe o no tiene permisos para recibir clientes`],
          });
          continue;
        }
        cliente.vendedor_asignado = vendedor.username;
        cliente.vendedor_username = vendedor.username;
      } else {
        cliente.vendedor_asignado = null;
        cliente.vendedor_username = null;
      }

      validatedClientes.push(cliente);
    }

    // Deduplicar por teléfono normalizado antes de consultar la BD
    const uniqueClientes = new Map<string, ClienteInsertWithMetadata>();
    let skippedDuplicates = 0;

    for (const cliente of validatedClientes) {
      if (!uniqueClientes.has(cliente._phone_key)) {
        uniqueClientes.set(cliente._phone_key, cliente);
      } else {
        skippedDuplicates++;
      }
    }

    const clientesList = Array.from(uniqueClientes.values());

    // Eliminar teléfonos ya existentes en la BD
    if (clientesList.length > 0) {
      const phoneChunks = chunkArray(Array.from(uniqueClientes.keys()), 500);
      const existingPhones = new Set<string>();

      for (const chunk of phoneChunks) {
        const { data: existing, error } = await serviceSupabase
          .from("cliente")
          .select("telefono_e164")
          .in("telefono_e164", chunk);

        if (error) {
          console.error("Error consultando teléfonos existentes:", error);
          return NextResponse.json({
            error: "Database error",
            details: error.message
          }, { status: 500 });
        }

        (existing || []).forEach((row) => {
          if (row?.telefono_e164) {
            existingPhones.add(row.telefono_e164);
          }
        });
      }

      for (const phone of existingPhones) {
        if (uniqueClientes.has(phone)) {
          uniqueClientes.delete(phone);
          skippedDuplicates++;
        }
      }
    }

    const clientesParaInsertar = Array.from(uniqueClientes.values());

    // Inserción por lotes para mejorar performance
    let importedCount = 0;

    if (clientesParaInsertar.length > 0) {
      const batches = chunkArray(clientesParaInsertar, 200);

      for (const batch of batches) {
        const batchPayload = batch.map(stripMetadata);

        const { data: inserted, error } = await serviceSupabase
          .from("cliente")
          .insert(batchPayload)
          .select('id');

        if (error) {
          if (isDuplicateError(error)) {
            // Insertar fila por fila para identificar duplicados adicionales (carreras)
            for (const cliente of batch) {
              const clienteData = stripMetadata(cliente);
              const { _proyecto_id, _proyecto_nombre } = cliente;
              const { data: nuevoCliente, error: singleError } = await serviceSupabase
                .from("cliente")
                .insert(clienteData)
                .select('id')
                .single();

              if (singleError) {
                if (isDuplicateError(singleError)) {
                  skippedDuplicates++;
                  continue;
                }
                return NextResponse.json({
                  error: "Database error",
                  details: singleError.message
                }, { status: 500 });
              }

              importedCount++;

              if (nuevoCliente && _proyecto_id) {
                await serviceSupabase
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
            continue;
          }

          return NextResponse.json({
            error: "Database error",
            details: error.message
          }, { status: 500 });
        }

        importedCount += inserted?.length || 0;

        if (inserted && inserted.length > 0) {
          const intereses = inserted
            .map((row, index) => {
              const source = batch[index];
              if (row?.id && source?._proyecto_id) {
                return {
                  cliente_id: row.id,
                  proyecto_id: source._proyecto_id,
                  prioridad: 2,
                  notas: `Proyecto: ${source._proyecto_nombre || 'sin nombre'}. Agregado automáticamente desde importación.`,
                  agregado_por: 'sistema'
                };
              }
              return null;
            })
            .filter(Boolean) as Array<{
              cliente_id: string;
              proyecto_id: string;
              prioridad: number;
              notas: string;
              agregado_por: string;
            }>;

          if (intereses.length > 0) {
            await serviceSupabase
              .from("cliente_propiedad_interes")
              .insert(intereses);
          }
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

function normalizePhoneForKey(value: string): string {
  return String(value || '').replace(/\D/g, '');
}

function isDuplicateError(error: { message?: string }): boolean {
  const message = String(error?.message || '');
  return message.includes('duplicate key value') && (
    message.includes('telefono_e164') ||
    message.includes('uniq_cliente_phone') ||
    message.includes('unique_telefono')
  );
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function stripMetadata(cliente: ClienteInsertWithMetadata): ClienteInsertPayload {
  const {
    _proyecto_id: _ignoreProyectoId,
    _proyecto_nombre: _ignoreProyectoNombre,
    _phone_key: _ignorePhoneKey,
    _row_number: _ignoreRowNumber,
    _vendedor_input: _ignoreVendedorInput,
    ...clienteData
  } = cliente;
  void _ignoreProyectoId;
  void _ignoreProyectoNombre;
  void _ignorePhoneKey;
  void _ignoreRowNumber;
  void _ignoreVendedorInput;
  return clienteData;
}
