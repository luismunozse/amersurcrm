import { NextRequest, NextResponse } from "next/server";
import { createServerOnlyClient, createServiceRoleClient } from "@/lib/supabase.server";
import { resolveEquipoScope, equipoOrFilter, type EquipoScope } from "@/lib/auth/equipo-scope.server";

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
 * minúsculas y valida el formato. Devuelve null si no es un username
 * válido (se ignora en vez de bloquear la búsqueda).
 */
function normalizarWhatsappUsername(raw: string | null): string | null {
  if (!raw) return null;
  const limpio = raw.trim().replace(/^@/, "").toLowerCase();
  return /^[a-z0-9._]{3,30}$/.test(limpio) ? limpio : null;
}

/**
 * Valida que un chat_id sea un identificador real de WhatsApp — un LID
 * ("<dígitos>@lid") o los dígitos de un teléfono — y por lo tanto SEGURO
 * para interpolar en un filtro `.or()` de PostgREST (sin comas, paréntesis
 * ni otros caracteres que rompan la sintaxis del filtro o inyecten arms
 * extra). Cualquier otro valor se ignora: la extensión ya evita mandar un
 * username pelado como chat_id, pero el server nunca debe confiar en el
 * query param del cliente.
 */
function chatIdValido(raw: string | null): string | null {
  if (!raw) return null;
  const limpio = raw.trim();
  return /^\d+@lid$/.test(limpio) || /^\d+$/.test(limpio) ? limpio : null;
}

/**
 * Elige, entre las filas devueltas por la búsqueda combinada, la de mayor
 * prioridad: teléfono > chat_id > username. Dentro de la misma prioridad,
 * las filas ya vienen ordenadas por created_at desc (ver buscarClientesPorFiltro),
 * así que se queda con la más reciente.
 */
function seleccionarMejorMatch(
  filas: Record<string, unknown>[],
  cleanPhone: string,
  chatId: string | null,
  usernameNormalizado: string | null,
): Record<string, unknown> | null {
  if (filas.length === 0) return null;

  const cleanPhoneWithPlus = cleanPhone ? `+${cleanPhone}` : "";
  const matchTelefono = (f: Record<string, unknown>) =>
    !!cleanPhone &&
    (f.telefono === cleanPhone || f.telefono === cleanPhoneWithPlus ||
      f.telefono_whatsapp === cleanPhone || f.telefono_whatsapp === cleanPhoneWithPlus);
  const matchChatId = (f: Record<string, unknown>) => !!chatId && f.whatsapp_chat_id === chatId;
  const matchUsername = (f: Record<string, unknown>) => !!usernameNormalizado && f.whatsapp_username === usernameNormalizado;

  return filas.find(matchTelefono) ?? filas.find(matchChatId) ?? filas.find(matchUsername) ?? null;
}

/**
 * Busca clientes que matcheen un filtro `.or()` ya armado (teléfono/chat_id
 * /username combinados), intentando primero con el JOIN a usuario_perfil
 * (más eficiente) y cayendo a una query sin JOIN solo si la FK todavía no
 * existe. `.limit(5)` (no 1): con tres identificadores en el mismo `.or()`
 * pueden matchear filas distintas — el caller elige la de mayor prioridad
 * vía seleccionarMejorMatch().
 */
async function buscarClientesPorFiltro(
  supabase: any,
  scope: EquipoScope,
  vendedorUsername: string | undefined,
  camposCliente: string,
  filtro: string,
): Promise<{ filas: Record<string, unknown>[]; usedJoin: boolean; error?: { message: string } }> {
  let queryWithJoin = supabase
    .schema("crm")
    .from("cliente")
    .select(`${camposCliente}, vendedor:usuario_perfil!cliente_vendedor_asignado_fkey(nombre_completo)`)
    .or(filtro);

  if (scope.tier === "equipo") {
    const filtroEquipo = equipoOrFilter(scope);
    if (filtroEquipo) queryWithJoin = queryWithJoin.or(filtroEquipo);
  } else if (scope.tier === "propio" && vendedorUsername) {
    queryWithJoin = queryWithJoin.eq("vendedor_asignado", vendedorUsername);
  }

  const { data: filasJoin, error: errorJoin } = await queryWithJoin
    .order("created_at", { ascending: false })
    .limit(5);

  if (!errorJoin) {
    return { filas: filasJoin ?? [], usedJoin: true };
  }

  if (!(errorJoin.message?.includes("relationship") || errorJoin.code === "PGRST200")) {
    return { filas: [], usedJoin: false, error: errorJoin };
  }

  // FK no existe todavía: fallback sin JOIN.
  let queryBasic = supabase.schema("crm").from("cliente").select(camposCliente).or(filtro);

  if (scope.tier === "equipo") {
    const filtroEquipo = equipoOrFilter(scope);
    if (filtroEquipo) queryBasic = queryBasic.or(filtroEquipo);
  } else if (scope.tier === "propio" && vendedorUsername) {
    queryBasic = queryBasic.eq("vendedor_asignado", vendedorUsername);
  }

  const { data: filasBasic, error: errorBasic } = await queryBasic
    .order("created_at", { ascending: false })
    .limit(5);

  if (errorBasic) {
    return { filas: [], usedJoin: false, error: errorBasic };
  }

  return { filas: filasBasic ?? [], usedJoin: false };
}

/**
 * GET /api/clientes/search?phone=+51999999999
 * GET /api/clientes/search?chat_id=123456789012345@lid
 * GET /api/clientes/search?username=juanperez
 *
 * Busca un cliente por teléfono, chat_id (WhatsApp LID) o username.
 * Al menos uno de los tres parámetros es requerido — con WhatsApp
 * usernames (Meta, jun 2026) un chat puede no exponer el teléfono real
 * del contacto, así que el teléfono ya no es obligatorio.
 * Usado por AmersurChat Chrome Extension
 *
 * Restricción de visibilidad:
 * - Admins: Pueden ver todos los clientes
 * - Vendedores: Solo ven clientes asignados a ellos
 */
export async function GET(request: NextRequest) {
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
        console.error("[ClienteSearch] Error de autenticación con token:", authError);
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

    // El join puede devolver un array o un objeto, normalizar
    const perfil = perfilData as { username: string; rol: { nombre: string } | { nombre: string }[] | null } | null;
    const rolData = perfil?.rol;
    const rolNombre = Array.isArray(rolData) ? rolData[0]?.nombre : rolData?.nombre;

    // Guard: reject callers with no resolvable CRM profile or role.
    // Without this, a null profile falls through to vendor-scoped queries
    // with an undefined username — causing the service-role client to skip
    // the vendor filter and return ALL clients to any authenticated user.
    if (!perfil || !rolNombre) {
      return NextResponse.json(
        { error: "Permiso insuficiente" },
        { status: 403, headers: corsHeaders }
      );
    }

    // Tiered visibility scope — replaces the old GLOBAL_ROLES boolean gate.
    // global: unfiltered search. equipo: restricted to the coordinador's team
    // via equipoOrFilter(). propio: own clients only (unchanged vendor
    // behavior). anonimo: no resolvable scope — must be rejected below.
    const scope = await resolveEquipoScope(supabase, userId);

    // CRITICAL: equipoOrFilter() returns null for BOTH 'global' and 'anonimo'.
    // If we let 'anonimo' fall through, a null filter would be treated as
    // "no restriction" and leak every client to an unresolvable caller. The
    // outer !perfil guard above already covers the common case, but this is
    // a defensive short-circuit in case resolveEquipoScope's independent
    // profile lookup diverges from the route's own.
    if (scope.tier === "anonimo") {
      return NextResponse.json(
        { error: "Permiso insuficiente" },
        { status: 403, headers: corsHeaders }
      );
    }

    const vendedorUsername = perfil.username ?? undefined;

    // Additional guard: a vendor with no username cannot be safely scoped.
    if (scope.tier === "propio" && !vendedorUsername) {
      console.error("[ClienteSearch] vendor profile has no username — rejecting");
      return NextResponse.json(
        { error: "Permiso insuficiente" },
        { status: 403, headers: corsHeaders }
      );
    }

    // Obtener parámetros de búsqueda. Con WhatsApp usernames (Meta, jun
    // 2026) un chat puede no exponer el teléfono real del contacto, así
    // que se acepta cualquiera de los tres identificadores.
    const searchParams = request.nextUrl.searchParams;
    const phoneParam = searchParams.get("phone");
    const chatIdParam = searchParams.get("chat_id");
    const usernameParam = searchParams.get("username");

    // Limpiar número: solo dígitos (sin +, espacios, guiones, paréntesis, etc.)
    const cleanPhone = phoneParam ? phoneParam.replace(/[^\d]/g, "") : "";
    // chatIdValido descarta cualquier valor que no sea un LID o dígitos de
    // teléfono — imprescindible antes de interpolarlo en un .or() (ver
    // chatIdValido). Un username pelado mandado como chat_id se ignora acá.
    const chatId = chatIdValido(chatIdParam);
    const usernameNormalizado = normalizarWhatsappUsername(usernameParam);

    if (!cleanPhone && !chatId && !usernameNormalizado) {
      return NextResponse.json(
        { error: "Se requiere al menos uno de: 'phone', 'chat_id', 'username'" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Campos base del cliente
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

    // Filtro combinado con los tres identificadores en un solo .or(): evita
    // encadenar hasta 3 round-trips secuenciales (uno por identificador) en
    // cada polling de la extensión. Nunca se agrega el arm de teléfono con
    // cleanPhone vacío — PostgREST interpretaría "telefono.eq." como filtro
    // por string vacío, no como "sin filtro". chatId y username ya vienen
    // validados (chatIdValido/normalizarWhatsappUsername), así que son
    // seguros para interpolar sin riesgo de romper/inyectar arms extra en
    // la sintaxis del filtro.
    const orParts: string[] = [];
    if (cleanPhone) {
      const cleanPhoneWithPlus = `+${cleanPhone}`;
      orParts.push(
        `telefono.eq.${cleanPhone}`,
        `telefono.eq.${cleanPhoneWithPlus}`,
        `telefono_whatsapp.eq.${cleanPhone}`,
        `telefono_whatsapp.eq.${cleanPhoneWithPlus}`,
      );
    }
    if (chatId) {
      orParts.push(`whatsapp_chat_id.eq.${chatId}`);
    }
    if (usernameNormalizado) {
      orParts.push(`whatsapp_username.eq.${usernameNormalizado}`);
    }
    const filtroCombinado = orParts.join(",");

    const resultado = await buscarClientesPorFiltro(supabase, scope, vendedorUsername, camposCliente, filtroCombinado);

    if (resultado.error) {
      console.error("[ClienteSearch] Error en query:", resultado.error);
      return NextResponse.json(
        { error: "Error buscando cliente", details: resultado.error.message },
        { status: 500, headers: corsHeaders }
      );
    }

    // Prioridad teléfono > chat_id > username entre las filas que matchearon.
    const cliente = seleccionarMejorMatch(resultado.filas, cleanPhone, chatId, usernameNormalizado);
    const usedJoin = resultado.usedJoin;

    if (!cliente) {
      // Si es vendedor y no encontró cliente, verificar si existe pero está
      // asignado a otro — mismo filtro combinado, una sola query.
      if (scope.tier !== "global" && vendedorUsername) {
        const { data: clienteExiste } = await supabase
          .schema("crm")
          .from("cliente")
          .select("id")
          .or(filtroCombinado)
          .limit(1)
          .maybeSingle();

        if (clienteExiste) {
          // Do not expose which vendor owns the record — that leaks username enumeration.
          return NextResponse.json({
            cliente: null,
            asignadoAOtro: true,
            mensaje: "Este cliente está asignado a otro vendedor",
          }, { headers: corsHeaders });
        }
      }

      return NextResponse.json({ cliente: null }, { headers: corsHeaders });
    }

    // Obtener nombre del vendedor
    let vendedorNombre: string | null = cliente.vendedor_asignado as string | null;

    if (usedJoin) {
      // El vendedor viene del JOIN (más eficiente, sin query adicional)
      const vendedorData = cliente.vendedor as { nombre_completo?: string } | null;
      if (vendedorData?.nombre_completo) {
        vendedorNombre = vendedorData.nombre_completo;
      }
    } else if (cliente.vendedor_asignado) {
      // Fallback: query separada (si FK no existe aún)
      const { data: vendedorData } = await supabase
        .schema("crm")
        .from("usuario_perfil")
        .select("nombre_completo")
        .eq("username", cliente.vendedor_asignado as string)
        .single();

      if (vendedorData?.nombre_completo) {
        vendedorNombre = vendedorData.nombre_completo;
      }
    }

    return NextResponse.json({
      cliente: {
        id: cliente.id,
        nombre: cliente.nombre,
        telefono: cliente.telefono,
        telefono_whatsapp: cliente.telefono_whatsapp,
        email: cliente.email,
        tipo_cliente: cliente.tipo_cliente,
        estado_cliente: cliente.estado_cliente,
        origen_lead: cliente.origen_lead,
        vendedor_asignado: vendedorNombre,
        created_at: cliente.created_at,
        notas: cliente.notas,
        whatsapp_username: cliente.whatsapp_username,
        whatsapp_chat_id: cliente.whatsapp_chat_id,
      },
    }, { headers: corsHeaders });
  } catch (error) {
    console.error("[ClienteSearch] Error:", error);
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
