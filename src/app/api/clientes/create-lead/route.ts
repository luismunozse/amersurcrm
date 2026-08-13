import { NextRequest, NextResponse } from "next/server";
import { createServerOnlyClient, createServiceRoleClient } from "@/lib/supabase.server";

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

/**
 * Normaliza un username de WhatsApp: quita el "@" inicial, pasa a
 * minúsculas y valida el formato. Si no valida, devuelve null en vez de
 * lanzar — un username inválido se ignora silenciosamente, no bloquea la
 * creación del lead.
 */
function normalizarWhatsappUsername(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const limpio = raw.trim().replace(/^@/, "").toLowerCase();
  return /^[a-z0-9._]{3,30}$/.test(limpio) ? limpio : null;
}

/**
 * POST /api/clientes/create-lead
 *
 * Crea un nuevo lead desde la extensión de Chrome (AmersurChat)
 * Requiere autenticación con JWT token de usuario
 */
export async function POST(request: NextRequest) {
  try {
    // Intentar obtener el token del header Authorization (para extensión)
    const authHeader = request.headers.get("authorization");
    let supabase;
    let user;

    if (authHeader?.startsWith("Bearer ")) {
      // Token desde header (extensión de Chrome)
      const token = authHeader.substring(7);
      const supabaseAdmin = createServiceRoleClient();

      const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(token);

      if (authError || !authUser) {
        console.error("[CreateLead] Error de autenticación con token:", authError);
        return NextResponse.json(
          { error: "No autenticado" },
          { status: 401, headers: corsHeaders }
        );
      }

      user = authUser;
      supabase = supabaseAdmin;
    } else {
      // Token desde cookies (sesión web normal)
      supabase = await createServerOnlyClient();
      const { data: { user: sessionUser }, error: authError } = await supabase.auth.getUser();

      if (authError || !sessionUser) {
        console.error("[CreateLead] Error de autenticación:", authError);
        return NextResponse.json(
          { error: "No autenticado" },
          { status: 401, headers: corsHeaders }
        );
      }

      user = sessionUser;
    }

    // Guard: verify the caller has a valid CRM profile/role before any privileged write.
    // Any authenticated Supabase user (including service accounts with no CRM profile)
    // could otherwise reach the service-role DB writes below. This check is intentionally
    // lightweight — it does NOT require a global-visibility role; any CRM-profiled user
    // (including vendors) may create leads via this endpoint.
    const { data: callerPerfil } = await supabase
      .schema("crm")
      .from("usuario_perfil")
      .select("username, rol:rol!rol_id(nombre)")
      .eq("id", user.id)
      .single();

    // PostgREST may return the joined rol as an array or as a plain object depending
    // on the relationship cardinality hint it resolves at query time. Normalize both.
    const callerRolData = (callerPerfil as any)?.rol;
    const callerRol = Array.isArray(callerRolData) ? callerRolData[0]?.nombre : callerRolData?.nombre;

    if (!callerPerfil || !callerRol) {
      return NextResponse.json(
        { error: "Permiso insuficiente" },
        { status: 403, headers: corsHeaders }
      );
    }

    // Parsear body
    const body = await request.json();
    const { telefono, telefono_whatsapp, chat_id, whatsapp_username, nombre, mensaje_inicial, origen_lead, asignado_a } = body;

    // Limpiar número: solo dígitos (sin +, espacios, guiones, paréntesis, etc.)
    const telefonoLimpio = typeof telefono === "string" ? telefono.replace(/[^\d]/g, "") : "";
    const tieneTelefono = telefonoLimpio.length >= 8;

    // telefono_whatsapp puede venir distinto del teléfono principal; si no
    // viene o queda vacío tras limpiar, cae al mismo valor que telefono.
    const telefonoWhatsappLimpio = typeof telefono_whatsapp === "string" ? telefono_whatsapp.replace(/[^\d]/g, "") : "";
    const telefonoWhatsappFinal = telefonoWhatsappLimpio || telefonoLimpio;

    const chatIdLimpio = typeof chat_id === "string" ? chat_id.trim() : "";
    const whatsappUsernameNormalizado = normalizarWhatsappUsername(whatsapp_username);

    // Con WhatsApp usernames (Meta, jun 2026) un chat puede no exponer el
    // teléfono real del contacto: se identifica con un LID pseudónimo
    // (chat_id) o con su username. Se acepta cualquiera de los tres, pero
    // se requiere al menos uno.
    if (!tieneTelefono && !chatIdLimpio && !whatsappUsernameNormalizado) {
      return NextResponse.json(
        { error: "Se requiere 'telefono' (mínimo 8 dígitos), 'chat_id' o 'whatsapp_username'" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Service-role is used for all DB ops in this route:
    // (1) The dedup phone lookup must scan ALL clients across vendors to prevent duplicates.
    // (2) create_whatsapp_lead RPC performs round-robin vendor assignment and requires
    //     full table visibility that RLS would deny to a per-user session.
    // The CRM profile gate above guarantees only known CRM users reach this point.
    const supabaseAdmin = createServiceRoleClient();

    // Verificar si ya existe un cliente con este teléfono/chat_id/username.
    // Orden: teléfono (dedup histórico) > chat_id (LID estable) > username.
    // Cascada POR MISS (cada paso corre si el anterior NO encontró nada),
    // no else-if por presencia: un contacto puede tener chat_id Y username
    // a la vez, y si el chat_id no matchea (ej. el lead se creó antes de
    // que WhatsApp expusiera el LID real, cuando solo había username) hay
    // que seguir intentando por username — si esto fuera else-if, el
    // branch de username nunca se alcanzaría y se crearía un duplicado.
    // NUNCA se ejecuta el .or() de teléfonos con cleanPhone vacío — PostgREST
    // interpretaría "telefono.eq." como filtro por string vacío, no como
    // "sin filtro", y matchearía filas con telefono = "".
    let clienteExistente: { id: string; nombre: string; estado_cliente: string } | null = null;

    if (tieneTelefono) {
      const telefonoConPlus = `+${telefonoLimpio}`;
      const { data } = await supabaseAdmin
        .schema("crm")
        .from("cliente")
        .select("id, nombre, estado_cliente")
        .or(`telefono.eq.${telefonoLimpio},telefono.eq.${telefonoConPlus},telefono_whatsapp.eq.${telefonoLimpio},telefono_whatsapp.eq.${telefonoConPlus}`)
        .limit(1)
        .maybeSingle();
      clienteExistente = data;
    }

    if (!clienteExistente && chatIdLimpio) {
      const { data } = await supabaseAdmin
        .schema("crm")
        .from("cliente")
        .select("id, nombre, estado_cliente")
        .eq("whatsapp_chat_id", chatIdLimpio)
        .limit(1)
        .maybeSingle();
      clienteExistente = data;
    }

    if (!clienteExistente && whatsappUsernameNormalizado) {
      const { data } = await supabaseAdmin
        .schema("crm")
        .from("cliente")
        .select("id, nombre, estado_cliente")
        .eq("whatsapp_username", whatsappUsernameNormalizado)
        .limit(1)
        .maybeSingle();
      clienteExistente = data;
    }

    if (clienteExistente) {
      console.log(`[CreateLead] Cliente ya existe: ${clienteExistente.id}`);
      return NextResponse.json({
        success: false,
        message: "El cliente ya existe en el CRM",
        clienteId: clienteExistente.id,
        existente: true,
        cliente: clienteExistente,
      }, { headers: corsHeaders });
    }

    // Preparar datos del lead. Nombre por defecto según qué identificador
    // esté disponible: teléfono > username > genérico.
    const nombreLead = nombre || (tieneTelefono
      ? `Lead WhatsApp ${telefonoLimpio.slice(-4)}`
      : whatsappUsernameNormalizado
        ? `Lead WhatsApp @${whatsappUsernameNormalizado}`
        : "Lead WhatsApp");

    let notas = "Lead capturado automáticamente desde WhatsApp Web";
    if (mensaje_inicial) {
      notas += `\n\nMensaje inicial: "${mensaje_inicial.substring(0, 200)}"`;
    }

    const direccion = {
      calle: "",
      numero: "",
      barrio: "",
      ciudad: "",
      provincia: "",
      pais: "Perú",
    };

    // Resolver a quién se asigna el lead.
    // Por defecto (y única vía para usuarios no privilegiados): NULL = round-robin
    // automático. Un admin/gerente puede fijar el lead a un COORDINADOR activo:
    // el coordinador queda como dueño (vendedor_asignado = su username) y luego
    // lo reparte a su equipo. Cualquier valor inválido o no autorizado cae
    // silenciosamente al round-robin.
    let vendedorAsignadoParam: string | null = null;
    const asignadoALimpio = typeof asignado_a === "string" ? asignado_a.trim() : "";

    if (asignadoALimpio && ["ROL_ADMIN", "ROL_GERENTE"].includes(callerRol)) {
      const { data: coordinador } = await supabaseAdmin
        .schema("crm")
        .from("usuario_perfil")
        .select("username, activo, rol:rol!usuario_perfil_rol_id_fkey(nombre)")
        .eq("username", asignadoALimpio)
        .maybeSingle();

      const coordRolData = (coordinador as any)?.rol;
      const coordRol = Array.isArray(coordRolData) ? coordRolData[0]?.nombre : coordRolData?.nombre;

      if (coordinador?.activo === true && coordRol === "ROL_COORDINADOR_VENTAS") {
        vendedorAsignadoParam = coordinador.username ?? asignadoALimpio;
      }
    }

    // Crear el lead usando la función RPC con asignación automática round-robin
    // Si vendedor_asignado es NULL, la función asigna automáticamente al siguiente vendedor activo
    const rpcResult = await supabaseAdmin
      .schema("crm")
      .rpc("create_whatsapp_lead", {
        p_nombre: nombreLead,
        // NULL (no string vacío) cuando no hay dígitos de teléfono — el
        // contacto se identifica solo por chat_id/username.
        p_telefono: tieneTelefono ? telefonoLimpio : null,
        p_telefono_whatsapp: telefonoWhatsappFinal || null,
        p_origen_lead: origen_lead || "whatsapp_web",
        p_vendedor_asignado: vendedorAsignadoParam, // NULL = round-robin; username = coordinador dueño
        p_created_by: user.id,
        p_notas: notas,
        p_direccion: direccion,
        p_whatsapp_username: whatsappUsernameNormalizado,
        p_whatsapp_chat_id: chatIdLimpio || null,
      })
      .single();

    const nuevoCliente = rpcResult.data as { id: string } | null;
    const insertError = rpcResult.error;

    if (insertError) {
      console.error("[CreateLead] Error creando lead:", insertError);
      console.error("[CreateLead] Detalles del error:", JSON.stringify(insertError, null, 2));

      const message = String(insertError.message ?? "");
      if (message.includes("duplicate key value") || message.includes("duplicate")) {
        return NextResponse.json({
          success: false,
          message: "El cliente ya existe (duplicado)",
          existente: true,
        }, { headers: corsHeaders });
      }

      // DB internals already logged above — do not expose them to the client.
      return NextResponse.json(
        { error: "Error creando lead en base de datos" },
        { status: 500, headers: corsHeaders }
      );
    }

    if (!nuevoCliente) {
      throw new Error("No se pudo crear el lead");
    }

    // Obtener el cliente creado con todos sus datos
    const { data: clienteCreado } = await supabaseAdmin
      .schema("crm")
      .from("cliente")
      .select("id, nombre, telefono, telefono_whatsapp, email, estado_cliente, origen_lead, vendedor_asignado, created_at, notas, whatsapp_username, whatsapp_chat_id")
      .eq("id", nuevoCliente.id)
      .single();

    // Obtener el nombre del vendedor si hay uno asignado
    // vendedor_asignado es un username (TEXT), no un UUID
    let vendedorNombre: string | null = null;
    if (clienteCreado?.vendedor_asignado) {
      const { data: vendedor } = await supabaseAdmin
        .schema("crm")
        .from("usuario_perfil")
        .select("nombre_completo, username")
        .eq("username", clienteCreado.vendedor_asignado)
        .single();

      vendedorNombre = vendedor?.nombre_completo || vendedor?.username || null;
    }

    // Construir objeto de respuesta completo
    const clienteData = {
      id: clienteCreado?.id || nuevoCliente.id,
      nombre: clienteCreado?.nombre || nombreLead,
      telefono: clienteCreado?.telefono ?? (tieneTelefono ? telefonoLimpio : null),
      telefono_whatsapp: clienteCreado?.telefono_whatsapp ?? (telefonoWhatsappFinal || null),
      email: clienteCreado?.email || null,
      estado_cliente: clienteCreado?.estado_cliente || 'por_contactar',
      origen_lead: clienteCreado?.origen_lead || origen_lead || 'whatsapp_web',
      vendedor_asignado: vendedorNombre,
      created_at: clienteCreado?.created_at || new Date().toISOString(),
      notas: clienteCreado?.notas || null,
      whatsapp_username: clienteCreado?.whatsapp_username ?? whatsappUsernameNormalizado,
      whatsapp_chat_id: clienteCreado?.whatsapp_chat_id ?? (chatIdLimpio || null),
    };

    console.log(`✅ [CreateLead] Lead creado: ${clienteData.id}, vendedor: ${vendedorNombre}`);

    return NextResponse.json({
      success: true,
      message: "Lead creado exitosamente",
      clienteId: clienteData.id,
      cliente: clienteData,
      vendedor: vendedorNombre,
      existente: false,
    }, { headers: corsHeaders });

  } catch (error) {
    console.error("[CreateLead] Error completo:", error);

    if (error instanceof Error) {
      console.error("[CreateLead] Error message:", error.message);
      console.error("[CreateLead] Error stack:", error.stack);
    } else {
      console.error("[CreateLead] Error object:", JSON.stringify(error, null, 2));
    }

    const err = error as { message?: string; code?: string; details?: string; hint?: string; stack?: string } | null;
    const resolvedMessage =
      (error instanceof Error && error.message) ||
      err?.message ||
      (typeof error === "string" ? error : null) ||
      "Error desconocido";

    // Full error (including message, code, details, hint, stack) already logged above.
    // Do not expose DB internals to the client.
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500, headers: corsHeaders }
    );
  }
}
