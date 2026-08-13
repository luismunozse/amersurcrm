import { NextRequest, NextResponse } from "next/server";
import { createServerOnlyClient, createServiceRoleClient } from "@/lib/supabase.server";
import { resolveEquipoScope, equipoOrFilter } from "@/lib/auth/equipo-scope.server";
import { normalizePhoneE164 } from "@/lib/utils/phone";

export const dynamic = "force-dynamic";

// CORS headers para extensión de Chrome
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Handler OPTIONS para preflight CORS
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function esUuidValido(raw: unknown): raw is string {
  return typeof raw === "string" && UUID_PATTERN.test(raw);
}

/**
 * Filtro barato de forma: solo cuenta dígitos (8-15, acepta con o sin "+").
 * OJO: esto NO valida que sea un número posible — "1111111111" pasa este
 * filtro. Es apenas un guard de tipo/largo antes de la validación real con
 * normalizePhoneE164 (ver más abajo). Devuelve null si no pasa ni el conteo.
 */
function limpiarTelefonoValido(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const digitos = raw.replace(/[^\d]/g, "");
  return digitos.length >= 8 && digitos.length <= 15 ? digitos : null;
}

// Campos del cliente devueltos — mismo set que /api/clientes/search.
const camposCliente = `
  id,
  nombre,
  telefono,
  telefono_whatsapp,
  email,
  tipo_cliente,
  estado_cliente,
  origen_lead,
  vendedor_asignado,
  created_at,
  notas,
  whatsapp_username,
  whatsapp_chat_id
`;

/**
 * POST /api/clientes/update-phone
 * Body: { cliente_id: string (UUID), telefono: string }
 *
 * Completa el teléfono de un cliente que fue creado sin número real
 * (WhatsApp username, ver whatsapp_username/whatsapp_chat_id) cuando el
 * contacto lo comparte voluntariamente en el chat y el vendedor lo confirma
 * desde la extensión (ver SharedPhoneBanner). NUNCA pisa un teléfono
 * existente ni fusiona clientes automáticamente.
 *
 * Usado por AmersurChat Chrome Extension.
 */
export async function POST(request: NextRequest) {
  try {
    // Intentar obtener el token del header Authorization (para extensión)
    const authHeader = request.headers.get("authorization");
    let supabase;
    let userId: string;

    if (authHeader?.startsWith("Bearer ")) {
      // Token desde header (extensión de Chrome)
      const token = authHeader.substring(7);
      const supabaseAdmin = createServiceRoleClient();

      const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(token);

      if (authError || !authUser) {
        console.error("[UpdateClientePhone] Error de autenticación con token:", authError);
        return NextResponse.json({ error: "No autenticado" }, { status: 401, headers: corsHeaders });
      }

      userId = authUser.id;
      supabase = supabaseAdmin;
    } else {
      // Token desde cookies (sesión web normal)
      supabase = await createServerOnlyClient();
      const { data: { user: sessionUser } } = await supabase.auth.getUser();

      if (!sessionUser) {
        return NextResponse.json({ error: "No autenticado" }, { status: 401, headers: corsHeaders });
      }

      userId = sessionUser.id;
    }

    // Obtener perfil del usuario para verificar rol y username
    const { data: perfilData } = await supabase
      .schema("crm")
      .from("usuario_perfil")
      .select(`
        username,
        rol:rol!usuario_perfil_rol_id_fkey (
          nombre
        )
      `)
      .eq("id", userId)
      .single();

    const perfil = perfilData as { username: string; rol: { nombre: string } | { nombre: string }[] | null } | null;
    const rolData = perfil?.rol;
    const rolNombre = Array.isArray(rolData) ? rolData[0]?.nombre : rolData?.nombre;

    // Igual que en search: sin perfil/rol resolvible, no hay forma segura de scopear.
    if (!perfil || !rolNombre) {
      return NextResponse.json(
        { error: "Permiso insuficiente" },
        { status: 403, headers: corsHeaders }
      );
    }

    const scope = await resolveEquipoScope(supabase, userId);

    if (scope.tier === "anonimo") {
      return NextResponse.json(
        { error: "Permiso insuficiente" },
        { status: 403, headers: corsHeaders }
      );
    }

    const vendedorUsername = perfil.username ?? undefined;

    if (scope.tier === "propio" && !vendedorUsername) {
      console.error("[UpdateClientePhone] vendor profile has no username — rejecting");
      return NextResponse.json(
        { error: "Permiso insuficiente" },
        { status: 403, headers: corsHeaders }
      );
    }

    // Parsear y validar body
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Body inválido" }, { status: 400, headers: corsHeaders });
    }

    const { cliente_id, telefono } = body as { cliente_id?: unknown; telefono?: unknown };

    if (!esUuidValido(cliente_id)) {
      return NextResponse.json({ error: "cliente_id inválido" }, { status: 400, headers: corsHeaders });
    }

    const telefonoLimpio = limpiarTelefonoValido(telefono);
    if (!telefonoLimpio) {
      return NextResponse.json(
        { error: "El teléfono debe tener entre 8 y 15 dígitos" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validación real (no solo conteo de dígitos): el validador canónico del
    // CRM (libphonenumber-js, asume Perú si no trae código de país) rechaza
    // basura numérica que igual pasa el filtro de 8-15 dígitos de arriba
    // (ej. "1111111111" — 10 dígitos, pero no es un número posible).
    const telefonoE164 = normalizePhoneE164(telefono as string);
    if (!telefonoE164) {
      return NextResponse.json(
        { error: "El teléfono no es un número válido" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Cargar cliente por id (sin scope todavía — para distinguir 404 de 403)
    const { data: clienteRaw, error: clienteError } = await supabase
      .schema("crm")
      .from("cliente")
      .select("id, telefono")
      .eq("id", cliente_id)
      .maybeSingle();

    if (clienteError) {
      console.error("[UpdateClientePhone] Error cargando cliente:", clienteError);
      return NextResponse.json(
        { error: "Error buscando cliente", details: clienteError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    if (!clienteRaw) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404, headers: corsHeaders });
    }

    // Scope: un vendedor/coordinador solo puede tocar clientes dentro de su
    // scope (mismo criterio que search — equipoOrFilter). global no restringe.
    if (scope.tier !== "global") {
      const filtroEquipo = equipoOrFilter(scope);
      if (filtroEquipo) {
        const { data: enScope } = await supabase
          .schema("crm")
          .from("cliente")
          .select("id")
          .eq("id", cliente_id)
          .or(filtroEquipo)
          .maybeSingle();

        if (!enScope) {
          return NextResponse.json(
            { error: "Permiso insuficiente" },
            { status: 403, headers: corsHeaders }
          );
        }
      }
    }

    // No pisar un teléfono ya registrado — el vendedor debe resolver el
    // conflicto a mano (no fusionamos ni sobrescribimos automáticamente).
    const telefonoActual = clienteRaw.telefono as string | null;
    if (telefonoActual) {
      return NextResponse.json(
        { error: "El cliente ya tiene un teléfono registrado", telefono_actual: telefonoActual },
        { status: 409, headers: corsHeaders }
      );
    }

    // Colisión: ¿otro cliente ya tiene este teléfono? Mismo .or() de
    // dígitos/+dígitos que usa search, excluyendo al cliente que estamos
    // actualizando. Usa el valor normalizado E164 (no el telefonoLimpio
    // crudo) para no perder colisiones cuando el número llega sin código de
    // país. No fusionamos automáticamente — el vendedor decide.
    const telefonoConPlus = `+${telefonoE164}`;
    const { data: colision } = await supabase
      .schema("crm")
      .from("cliente")
      .select("id, nombre")
      .or(`telefono.eq.${telefonoE164},telefono.eq.${telefonoConPlus},telefono_whatsapp.eq.${telefonoE164},telefono_whatsapp.eq.${telefonoConPlus}`)
      .neq("id", cliente_id)
      .limit(1)
      .maybeSingle();

    if (colision) {
      return NextResponse.json(
        {
          error: "Este número ya pertenece a otro cliente",
          cliente_existente: { id: colision.id, nombre: colision.nombre },
        },
        { status: 409, headers: corsHeaders }
      );
    }

    // Formato consistente con create-lead: "+" + dígitos, ya normalizado E164.
    const telefonoFinal = `+${telefonoE164}`;
    const { data: clienteActualizado, error: updateError } = await supabase
      .schema("crm")
      .from("cliente")
      .update({ telefono: telefonoFinal, telefono_whatsapp: telefonoFinal })
      .eq("id", cliente_id)
      .select(camposCliente)
      .single();

    if (updateError) {
      console.error("[UpdateClientePhone] Error actualizando cliente:", updateError);
      return NextResponse.json(
        { error: "Error actualizando cliente", details: updateError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json({ cliente: clienteActualizado }, { headers: corsHeaders });
  } catch (error) {
    console.error("[UpdateClientePhone] Error:", error);
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
