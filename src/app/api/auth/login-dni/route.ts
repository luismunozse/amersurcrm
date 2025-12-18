import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase.server";
import { extractRequestMetadata } from "@/lib/api/requestContext";
import { notifyAdminsOfSecurityEvent } from "@/lib/security/adminNotifications";
import { logLoginAudit, resolveLoginAuditCount } from "@/lib/loginAudit";

const DNI_REGEX = /^\d{6,12}$/;

interface PerfilConRol {
  id: string;
  rol: {
    nombre: string | null;
  } | null;
}

type AuditStage = "lookup" | "authentication" | "recovery" | "security";

const RATE_LIMIT_WINDOW_MINUTES = 5;
const RATE_LIMIT_MAX_IDENTIFIER_ATTEMPTS = 5;
const RATE_LIMIT_MAX_IP_ATTEMPTS = 15;

async function revokeUserSessions(userId: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.warn("Variables de entorno para revocar sesiones no configuradas.");
    return;
  }

  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}/logout`, {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    });

    if (!response.ok) {
      console.error(
        `No se pudieron invalidar sesiones previas para el usuario ${userId}:`,
        await response.text()
      );
    }
  } catch (error) {
    console.error("Error invalidando sesiones previas:", error);
  }
}

export async function POST(request: NextRequest) {
  const supabase = createServiceRoleClient();
  let dniSanitized = "";

  try {
    const { dni, password } = await request.json();
    dniSanitized = typeof dni === "string" ? dni.trim() : String(dni ?? "").trim();
    const { ipAddress, userAgent } = extractRequestMetadata(request);
    const logAttempt = async (
      success: boolean,
      errorMessage?: string | null,
      stage: AuditStage = "lookup",
      metadata?: Record<string, unknown>
    ) => {
      await logLoginAudit(
        supabase,
        {
          dni: dniSanitized || null,
          login_type: "vendedor",
          stage,
          success,
          error_message: errorMessage ?? null,
          ip_address: ipAddress,
          user_agent: userAgent,
          metadata: metadata ?? null,
        },
        `login-dni:${stage}`
      );
    };

    if (!dniSanitized || !password) {
      await logAttempt(false, "missing_credentials");
      return NextResponse.json(
        { error: "Credenciales inválidas" },
        { status: 400 }
      );
    }

    const windowStartIso = new Date(
      Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000
    ).toISOString();

    const [dniResult, ipResult] = await Promise.all([
      supabase
        .schema("crm")
        .from("login_audit")
        .select("id", { count: "exact", head: true })
        .eq("dni", dniSanitized)
        .eq("success", false)
        .in("stage", ["lookup", "authentication", "security"])
        .gte("created_at", windowStartIso),
      ipAddress
        ? supabase
            .schema("crm")
            .from("login_audit")
            .select("id", { count: "exact", head: true })
            .eq("ip_address", ipAddress)
            .eq("success", false)
            .in("stage", ["lookup", "authentication", "security"])
            .gte("created_at", windowStartIso)
        : Promise.resolve({ count: 0, error: null }),
    ]);

    const identifierFailureCount = resolveLoginAuditCount(
      dniResult.count ?? null,
      dniResult.error ?? null,
      "login-dni:rate-limit-dni"
    );

    const ipFailureCount = ipAddress
      ? resolveLoginAuditCount(
          ipResult.count ?? null,
          ipResult.error ?? null,
          "login-dni:rate-limit-ip"
        )
      : 0;

    const rateLimitExceeded =
      identifierFailureCount >= RATE_LIMIT_MAX_IDENTIFIER_ATTEMPTS ||
      ipFailureCount >= RATE_LIMIT_MAX_IP_ATTEMPTS;

    if (rateLimitExceeded) {
      const metadata = {
        reason: "rate_limit_exceeded",
        dni: dniSanitized,
        ipAddress,
        windowMinutes: RATE_LIMIT_WINDOW_MINUTES,
        counts: {
          dni: identifierFailureCount,
          ip: ipFailureCount,
        },
      };

      await logAttempt(false, "rate_limit_exceeded", "security", metadata);

      const reachedIdentifierThreshold =
        identifierFailureCount === RATE_LIMIT_MAX_IDENTIFIER_ATTEMPTS;
      const reachedIpThreshold =
        ipAddress !== null && ipFailureCount === RATE_LIMIT_MAX_IP_ATTEMPTS;

      if (reachedIdentifierThreshold || reachedIpThreshold) {
        const mensaje = `Se bloquearon intentos de acceso para el DNI ${dniSanitized} (IP ${ipAddress ?? "desconocida"}).`;
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

    if (!DNI_REGEX.test(dniSanitized)) {
      await logAttempt(false, "dni_invalido");
      return NextResponse.json(
        { error: "Credenciales inválidas" },
        { status: 400 }
      );
    }

    // Buscar perfil por DNI (solo para validar que existe y es vendedor activo)
    const { data: perfil, error: perfilError } = await supabase
      .schema('crm')
      .from("usuario_perfil")
      .select(
        `id, rol:rol!usuario_perfil_rol_id_fkey(nombre)`
      )
      .eq("dni", dniSanitized)
      .eq("activo", true)
      .single<PerfilConRol>();

    if (perfilError || !perfil || perfil.rol?.nombre !== "ROL_VENDEDOR") {
      await logAttempt(false, "perfil_no_encontrado");
      return NextResponse.json(
        { error: "Credenciales inválidas" },
        { status: 401 }
      );
    }

    // Obtener el email DIRECTAMENTE de Supabase Auth (no del perfil)
    // Esto desliga el email del perfil del login
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(perfil.id);
    
    if (authError || !authUser?.user?.email) {
      await logAttempt(false, "usuario_auth_no_encontrado");
      return NextResponse.json(
        { error: "Credenciales inválidas" },
        { status: 401 }
      );
    }

    await revokeUserSessions(perfil.id);

    return NextResponse.json({
      success: true,
      email: authUser.user.email, // Email de Auth, no del perfil
    });
  } catch (error) {
    console.error("Error en login con DNI:", error);
    const { ipAddress, userAgent } = extractRequestMetadata(request);
    await logLoginAudit(
      supabase,
      {
        dni: dniSanitized || null,
        login_type: "vendedor",
        stage: "lookup",
        success: false,
        error_message: error instanceof Error ? error.message : "error_desconocido",
        ip_address: ipAddress,
        user_agent: userAgent,
      },
      "login-dni:error"
    );
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
