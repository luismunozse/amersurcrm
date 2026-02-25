import { NextRequest, NextResponse } from "next/server";
import { createServerOnlyClient, createServiceRoleClient } from "@/lib/supabase.server";
import { esAdmin } from "@/lib/permissions/server";
import { uploadFile, deleteFile, getPublicUrl } from "@/lib/storage";

const BUCKET = "avatars";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerOnlyClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const isAdminUser = await esAdmin();
    if (!isAdminUser) return NextResponse.json({ error: "No tienes permisos" }, { status: 403 });

    const formData = await request.formData();
    const file = formData.get("firma") as File;
    const userId = formData.get("userId") as string;

    if (!file || !userId) {
      return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 });
    }

    // Validate file
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: "Solo se permiten JPG, PNG o WebP" }, { status: 400 });
    }
    if (file.size > 1 * 1024 * 1024) {
      return NextResponse.json({ error: "La firma no debe superar 1MB" }, { status: 400 });
    }

    const ext = file.name.split(".").pop() || "png";
    const path = `firmas/${userId}/firma-${Date.now()}.${ext}`;

    const { data, error } = await uploadFile(BUCKET, file, path);
    if (error || !data) {
      return NextResponse.json({ error: "Error subiendo firma" }, { status: 500 });
    }

    const publicUrl = getPublicUrl(BUCKET, data.path);

    // Update profile
    const serviceRole = createServiceRoleClient();
    const { error: updateError } = await serviceRole
      .schema("crm")
      .from("usuario_perfil")
      .update({ firma_url: publicUrl, updated_at: new Date().toISOString() })
      .eq("id", userId);

    if (updateError) {
      return NextResponse.json({ error: "Error actualizando perfil" }, { status: 500 });
    }

    return NextResponse.json({ success: true, firmaUrl: publicUrl });
  } catch (error) {
    console.error("Error en POST /api/admin/usuarios/firma:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerOnlyClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const isAdminUser = await esAdmin();
    if (!isAdminUser) return NextResponse.json({ error: "No tienes permisos" }, { status: 403 });

    const body = await request.json();
    const { userId } = body;
    if (!userId) return NextResponse.json({ error: "Falta userId" }, { status: 400 });

    const serviceRole = createServiceRoleClient();

    // Get current firma URL to delete file
    const { data: perfil } = await serviceRole
      .schema("crm")
      .from("usuario_perfil")
      .select("firma_url")
      .eq("id", userId)
      .single();

    if (perfil?.firma_url) {
      // Extract path from URL
      const url = new URL(perfil.firma_url);
      const pathMatch = url.pathname.match(/\/object\/public\/avatars\/(.+)/);
      if (pathMatch) {
        await deleteFile(BUCKET, pathMatch[1]);
      }
    }

    // Clear firma_url in profile
    const { error: updateError } = await serviceRole
      .schema("crm")
      .from("usuario_perfil")
      .update({ firma_url: null, updated_at: new Date().toISOString() })
      .eq("id", userId);

    if (updateError) {
      return NextResponse.json({ error: "Error actualizando perfil" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error en DELETE /api/admin/usuarios/firma:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
