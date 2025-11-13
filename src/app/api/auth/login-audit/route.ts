import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase.server";
import { extractRequestMetadata } from "@/lib/api/requestContext";
import { handleLoginAuditError } from "@/lib/loginAudit";

type LoginType = "admin" | "vendedor";
type Stage = "lookup" | "authentication" | "recovery";

const VALID_LOGIN_TYPES: LoginType[] = ["admin", "vendedor"];
const VALID_STAGES: Stage[] = ["lookup", "authentication", "recovery"];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      identifier,
      loginType,
      success,
      errorMessage = null,
      stage = "authentication",
      metadata = null,
    } = body as {
      identifier?: string | null;
      loginType?: LoginType;
      success?: boolean;
      errorMessage?: string | null;
      stage?: Stage;
      metadata?: Record<string, unknown> | null;
    };

    if (!identifier || typeof identifier !== "string") {
      return NextResponse.json(
        { error: "identifier es requerido" },
        { status: 400 }
      );
    }

    if (!loginType || !VALID_LOGIN_TYPES.includes(loginType)) {
      return NextResponse.json(
        { error: "loginType inválido" },
        { status: 400 }
      );
    }

    if (typeof success !== "boolean") {
      return NextResponse.json(
        { error: "success debe ser boolean" },
        { status: 400 }
      );
    }

    if (stage && !VALID_STAGES.includes(stage)) {
      return NextResponse.json(
        { error: "stage inválido" },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();
    const { ipAddress, userAgent } = extractRequestMetadata(request);

    const payload: Record<string, unknown> = {
      login_type: loginType,
      stage: stage ?? "authentication",
      success,
      error_message: typeof errorMessage === "string" ? errorMessage : null,
      ip_address: ipAddress,
      user_agent: userAgent,
      metadata,
    };

    if (loginType === "admin") {
      payload.username = identifier.trim();
    } else {
      payload.dni = identifier.trim();
    }

    const { error } = await supabase.from("login_audit").insert(payload);
    if (handleLoginAuditError(error, "login-audit:insert")) {
      return NextResponse.json({ success: true });
    }
    if (error) {
      return NextResponse.json(
        { error: "No se pudo registrar el intento" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error en login-audit:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
