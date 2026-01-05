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
 * GET /api/clientes/search?phone=+51999999999
 *
 * Busca un cliente por número de teléfono
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
    const esAdmin = rolNombre === "admin" || rolNombre === "ROL_ADMIN";
    const vendedorUsername = perfil?.username;

    console.log(`[ClienteSearch] Usuario: ${vendedorUsername}, Rol: ${rolNombre}, EsAdmin: ${esAdmin}`);

    // Obtener parámetro de búsqueda
    const searchParams = request.nextUrl.searchParams;
    const phone = searchParams.get("phone");

    if (!phone) {
      return NextResponse.json(
        { error: "Parámetro 'phone' requerido" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Limpiar número: solo dígitos (sin +, espacios, guiones, paréntesis, etc.)
    const cleanPhone = phone.replace(/[^\d]/g, "");
    const cleanPhoneWithPlus = `+${cleanPhone}`;

    console.log(`[ClienteSearch] Buscando cliente con teléfono: ${cleanPhone} o ${cleanPhoneWithPlus}`);

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
      notas
    `;

    // Intentar query con JOIN para obtener vendedor en una sola consulta (O(1))
    // Si la FK no existe, hacemos fallback a query sin JOIN
    const orFilter = `telefono.eq.${cleanPhone},telefono.eq.${cleanPhoneWithPlus},telefono_whatsapp.eq.${cleanPhone},telefono_whatsapp.eq.${cleanPhoneWithPlus}`;

    let cliente: Record<string, unknown> | null = null;
    let usedJoin = false;

    // Primero intentar con JOIN (más eficiente si la FK existe)
    let queryWithJoin = supabase
      .schema("crm")
      .from("cliente")
      .select(`${camposCliente}, vendedor:usuario_perfil!cliente_vendedor_asignado_fkey(nombre_completo)`)
      .or(orFilter);

    if (!esAdmin && vendedorUsername) {
      queryWithJoin = queryWithJoin.eq("vendedor_asignado", vendedorUsername);
    }

    const { data: clienteWithJoin, error: errorJoin } = await queryWithJoin
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!errorJoin && clienteWithJoin) {
      cliente = clienteWithJoin;
      usedJoin = true;
    } else if (errorJoin?.message?.includes("relationship") || errorJoin?.code === "PGRST200") {
      // FK no existe, hacer query sin JOIN
      console.log("[ClienteSearch] FK no existe, usando query sin JOIN");
      let queryBasic = supabase
        .schema("crm")
        .from("cliente")
        .select(camposCliente)
        .or(orFilter);

      if (!esAdmin && vendedorUsername) {
        queryBasic = queryBasic.eq("vendedor_asignado", vendedorUsername);
      }

      const { data: clienteBasic, error: errorBasic } = await queryBasic
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (errorBasic) {
        console.error("[ClienteSearch] Error en query:", errorBasic);
        return NextResponse.json(
          { error: "Error buscando cliente", details: errorBasic.message },
          { status: 500, headers: corsHeaders }
        );
      }
      cliente = clienteBasic;
    } else if (errorJoin) {
      console.error("[ClienteSearch] Error en query:", errorJoin);
      return NextResponse.json(
        { error: "Error buscando cliente", details: errorJoin.message },
        { status: 500, headers: corsHeaders }
      );
    }

    if (!cliente) {
      // Si es vendedor y no encontró cliente, verificar si existe pero está asignado a otro
      if (!esAdmin && vendedorUsername) {
        const { data: clienteExiste } = await supabase
          .schema("crm")
          .from("cliente")
          .select("id, vendedor_asignado")
          .or(`telefono.eq.${cleanPhone},telefono.eq.${cleanPhoneWithPlus},telefono_whatsapp.eq.${cleanPhone},telefono_whatsapp.eq.${cleanPhoneWithPlus}`)
          .limit(1)
          .maybeSingle();

        if (clienteExiste) {
          console.log(`[ClienteSearch] Cliente existe pero está asignado a: ${clienteExiste.vendedor_asignado}`);
          return NextResponse.json({
            cliente: null,
            asignadoAOtro: true,
            mensaje: `Este cliente está asignado a otro vendedor (${clienteExiste.vendedor_asignado || 'sin asignar'})`,
          }, { headers: corsHeaders });
        }
      }

      console.log(`[ClienteSearch] Cliente no encontrado`);
      return NextResponse.json({ cliente: null }, { headers: corsHeaders });
    }

    console.log(`[ClienteSearch] Cliente encontrado: ${cliente.id}, vendedor: ${cliente.vendedor_asignado}, usedJoin: ${usedJoin}`);

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
