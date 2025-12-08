import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase.server";
import { extractRequestMetadata } from "@/lib/api/requestContext";
import { logLoginAudit } from "@/lib/loginAudit";

const DNI_REGEX = /^\d{6,12}$/;

type PerfilConRol = {
  id: string;
  nombre_completo: string | null;
  email: string | null;
  username: string | null;
  activo: boolean | null;
  rol: { nombre: string | null } | null;
};

type AdminPerfil = {
  id: string;
  email: string | null;
  nombre_completo: string | null;
};

export async function POST(request: NextRequest) {
  try {
    const { dni } = await request.json();
    const dniSanitized = typeof dni === "string" ? dni.trim() : String(dni ?? "").trim();

    if (!DNI_REGEX.test(dniSanitized)) {
      return NextResponse.json(
        { error: "Ingresa un DNI válido (solo números, 6 a 12 dígitos)." },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();
    const { ipAddress, userAgent } = extractRequestMetadata(request);

    const [{ data: perfil, error: perfilError }, { data: adminRole, error: adminRoleError }] =
      await Promise.all([
        supabase
          .from("usuario_perfil")
          .select("id, nombre_completo, email, username, activo, rol:rol!usuario_perfil_rol_id_fkey(nombre)")
          .eq("dni", dniSanitized)
          .maybeSingle<PerfilConRol>(),
        supabase
          .from("rol")
          .select("id")
          .eq("nombre", "ROL_ADMIN")
          .maybeSingle<{ id: string }>(),
      ]);

    if (perfilError) {
      console.error("Error consultando perfil por DNI:", perfilError);
      return NextResponse.json(
        { error: "No se pudo validar el DNI. Intenta nuevamente más tarde." },
        { status: 500 }
      );
    }

    if (adminRoleError) {
      console.error("Error consultando rol de administrador:", adminRoleError);
      return NextResponse.json(
        { error: "No se pudo contactar al administrador. Intenta nuevamente más tarde." },
        { status: 500 }
      );
    }

    if (!adminRole?.id) {
      console.warn("No existe rol ROL_ADMIN configurado.");
      return NextResponse.json(
        { error: "No hay administradores disponibles. Comunícate con soporte." },
        { status: 503 }
      );
    }

    const { data: adminUsers, error: adminError } = await supabase
      .from("usuario_perfil")
      .select("id, email, nombre_completo")
      .eq("activo", true)
      .eq("rol_id", adminRole.id);

    if (adminError) {
      console.error("Error consultando administradores:", adminError);
      return NextResponse.json(
        { error: "No se pudo contactar al administrador. Intenta nuevamente más tarde." },
        { status: 500 }
      );
    }

    const admins: AdminPerfil[] = adminUsers ?? [];

    if (admins.length === 0) {
      console.warn("No hay administradores activos para recibir la solicitud de reseteo.");
      return NextResponse.json(
        { error: "No hay administradores disponibles. Comunícate con soporte." },
        { status: 503 }
      );
    }

    const displayName =
      perfil?.nombre_completo?.trim() ||
      perfil?.username ||
      perfil?.email ||
      null;

    const metadata = {
      dni: dniSanitized,
      requester: {
        perfilId: perfil?.id ?? null,
        nombre: displayName,
        email: perfil?.email ?? null,
        username: perfil?.username ?? null,
        activo: perfil?.activo ?? null,
        rol: perfil?.rol?.nombre ?? null,
      },
      request: {
        ipAddress,
        userAgent,
        createdAt: new Date().toISOString(),
      },
    };

    const titulo = "Solicitud de blanqueo de contraseña";
    const mensaje = displayName
      ? `Se solicitó restablecer la contraseña del usuario ${displayName} (DNI ${dniSanitized}).`
      : `Se solicitó restablecer la contraseña para el DNI ${dniSanitized}.`;

    const { error: insertError } = await supabase.from("notificacion").insert(
      admins.map((admin) => ({
        usuario_id: admin.id,
        tipo: "sistema",
        titulo,
        mensaje,
        data: {
          ...metadata,
          admin: {
            id: admin.id,
            nombre: admin.nombre_completo ?? null,
            email: admin.email ?? null,
          },
        },
      }))
    );

    if (insertError) {
      console.error("Error creando notificaciones de reseteo:", insertError);
      return NextResponse.json(
        { error: "No se pudo registrar la solicitud. Intenta nuevamente." },
        { status: 500 }
      );
    }

    const loginType =
      perfil?.rol?.nombre === "ROL_VENDEDOR" ? "vendedor" : "admin";

    await logLoginAudit(
      supabase,
      {
        dni: dniSanitized,
        username: perfil?.username ?? null,
        login_type: loginType,
        stage: "recovery",
        success: true,
        error_message: null,
        ip_address: ipAddress,
        user_agent: userAgent,
        metadata,
      },
      "reset-request:recovery"
    );

    return NextResponse.json({
      success: true,
      message: "Solicitud enviada al administrador. Te contactarán cuando esté lista.",
    });
  } catch (error) {
    console.error("Error procesando solicitud de reseteo:", error);
    return NextResponse.json(
      { error: "No se pudo procesar la solicitud." },
      { status: 500 }
    );
  }
}
