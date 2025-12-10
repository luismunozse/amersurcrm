import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase.server";
import { extractRequestMetadata } from "@/lib/api/requestContext";
import { notifyAdminsOfSecurityEvent } from "@/lib/security/adminNotifications";
import { logLoginAudit, resolveLoginAuditCount } from "@/lib/loginAudit";

type AuditStage = "lookup" | "authentication" | "recovery" | "security";

const RATE_LIMIT_WINDOW_MINUTES = 5;
const RATE_LIMIT_MAX_IDENTIFIER_ATTEMPTS = 5;
const RATE_LIMIT_MAX_IP_ATTEMPTS = 15;

interface RolRelacion {
  nombre: string | null;
}

type RolData = RolRelacion | RolRelacion[] | null;

interface UsuarioConRol {
  id: string;
  email: string | null;
  activo: boolean | null;
  username: string | null;
  rol: RolData;
}

/**
 * API endpoint para login de administradores usando username
 * Convierte el username a email para que Supabase Auth pueda autenticar
 */
export async function POST(request: NextRequest) {
  const supabase = createServiceRoleClient();
  let identifier = "";

  try {
    const body = await request.json();
    const { username, password } = body;

    const { ipAddress, userAgent } = extractRequestMetadata(request);
    identifier = typeof username === "string" ? username.trim() : "";

    const logAttempt = async (
      success: boolean,
      errorMessage?: string | null,
      stage: AuditStage = "lookup",
      metadata?: Record<string, unknown>
    ) => {
      await logLoginAudit(
        supabase,
        {
          username: identifier || null,
          login_type: "admin",
          stage,
          success,
          error_message: errorMessage ?? null,
          ip_address: ipAddress,
          user_agent: userAgent,
          metadata: metadata ?? null,
        },
        `login-username:${stage}`
      );
    };

    if (!identifier || !password) {
      await logAttempt(false, "missing_credentials");
      return NextResponse.json(
        { error: "Username y contraseña son requeridos" },
        { status: 400 }
      );
    }

    const windowStartIso = new Date(
      Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000
    ).toISOString();

    const [identifierResult, ipResult] = await Promise.all([
      identifier
        ? supabase
            .from("login_audit")
            .select("id", { count: "exact", head: true })
            .eq("username", identifier)
            .eq("success", false)
            .in("stage", ["lookup", "authentication", "security"])
            .gte("created_at", windowStartIso)
        : Promise.resolve({ count: 0, error: null }),
      ipAddress
        ? supabase
            .from("login_audit")
            .select("id", { count: "exact", head: true })
            .eq("ip_address", ipAddress)
            .eq("success", false)
            .in("stage", ["lookup", "authentication", "security"])
            .gte("created_at", windowStartIso)
        : Promise.resolve({ count: 0, error: null }),
    ]);

    const identifierFailureCount = identifier
      ? resolveLoginAuditCount(
          identifierResult.count ?? null,
          identifierResult.error ?? null,
          "login-username:rate-limit-identifier"
        )
      : 0;

    const ipFailureCount = ipAddress
      ? resolveLoginAuditCount(
          ipResult.count ?? null,
          ipResult.error ?? null,
          "login-username:rate-limit-ip"
        )
      : 0;

    const rateLimitExceeded =
      identifierFailureCount >= RATE_LIMIT_MAX_IDENTIFIER_ATTEMPTS ||
      ipFailureCount >= RATE_LIMIT_MAX_IP_ATTEMPTS;

    if (rateLimitExceeded) {
      const metadata = {
        reason: "rate_limit_exceeded",
        identifier,
        ipAddress,
        windowMinutes: RATE_LIMIT_WINDOW_MINUTES,
        counts: {
          identifier: identifierFailureCount,
          ip: ipFailureCount,
        },
      };

      await logAttempt(false, "rate_limit_exceeded", "security", metadata);

      const reachedIdentifierThreshold =
        identifierFailureCount === RATE_LIMIT_MAX_IDENTIFIER_ATTEMPTS;
      const reachedIpThreshold =
        ipAddress !== null && ipFailureCount === RATE_LIMIT_MAX_IP_ATTEMPTS;

      if (reachedIdentifierThreshold || reachedIpThreshold) {
        const mensaje = identifier
          ? `Se bloquearon intentos de acceso para el usuario ${identifier} (IP ${ipAddress ?? "desconocida"}).`
          : `Se detectaron múltiples intentos fallidos desde la IP ${ipAddress ?? "desconocida"}.`;

        await notifyAdminsOfSecurityEvent(
          supabase,
          "Alerta de seguridad: intentos de login",
          mensaje,
          metadata
        );
      }

      return NextResponse.json(
        { error: "Demasiados intentos fallidos. Intenta nuevamente más tarde." },
        {
          status: 429,
          headers: {
            "Retry-After": String(RATE_LIMIT_WINDOW_MINUTES * 60),
          },
        }
      );
    }

    // Buscar el perfil por username (o email para compatibilidad)
    const { data: usuario, error: usuarioError } = await supabase
      .schema('crm')
      .from('usuario_perfil')
      .select('id, email, activo, username, rol:rol!usuario_perfil_rol_id_fkey(nombre)')
      .or(`username.eq.${identifier},email.eq.${identifier}`)
      .single<UsuarioConRol>();


    if (usuarioError || !usuario) {
      console.error('Error buscando usuario:', usuarioError);
      await logAttempt(false, usuarioError?.message ?? "usuario_no_encontrado");
      return NextResponse.json(
        { error: "Usuario no encontrado", debug: usuarioError?.message },
        { status: 404 }
      );
    }

    // Verificar que el usuario esté activo
    if (!usuario.activo) {
      await logAttempt(false, "usuario_inactivo");
      return NextResponse.json(
        { error: "Usuario inactivo. Contacta al administrador." },
        { status: 403 }
      );
    }

    // Obtener el email DIRECTAMENTE de Supabase Auth (no del perfil)
    // Esto desliga el email del perfil del login
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(usuario.id);

    if (authError || !authUser?.user?.email) {
      await logAttempt(false, "usuario_auth_no_encontrado");
      return NextResponse.json(
        { error: "Usuario no encontrado en el sistema de autenticación" },
        { status: 401 }
      );
    }

    const rol = usuario.rol;
    const rolNombre = Array.isArray(rol) ? rol[0]?.nombre : rol?.nombre;

    // Retornar el email de Auth para que el cliente pueda hacer signInWithPassword
    return NextResponse.json({
      success: true,
      email: authUser.user.email,
      rol: rolNombre
    });

  } catch (error) {
    console.error("Error en login-username:", error);
    const { ipAddress, userAgent } = extractRequestMetadata(request);
    await logLoginAudit(
      supabase,
      {
        username: identifier || null,
        login_type: "admin",
        stage: "lookup",
        success: false,
        error_message: error instanceof Error ? error.message : "error_desconocido",
        ip_address: ipAddress,
        user_agent: userAgent,
      },
      "login-username:error"
    );
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
