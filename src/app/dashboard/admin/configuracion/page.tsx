import { redirect } from "next/navigation";
import { createServerOnlyClient } from "@/lib/supabase.server";
import { esAdmin } from "@/lib/auth/roles";
import { ConfiguracionForm, type ConfiguracionInicial } from "./ConfiguracionForm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SupabaseServerClient = Awaited<ReturnType<typeof createServerOnlyClient>>;

export default async function AdminConfiguracionPage() {
  const supabase = await createServerOnlyClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const isAdminUser = await esAdmin();
  if (!isAdminUser) {
    redirect("/dashboard");
  }

  const configuracion = await obtenerConfiguracionInicial(supabase);

  return (
    <div className="min-h-screen bg-crm-bg-primary">
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-crm-text-primary">Configuración del Sistema</h1>
          <p className="text-crm-text-secondary mt-2">
            Personaliza y configura parámetros clave del CRM
          </p>
        </div>

        <ConfiguracionForm config={configuracion} />
      </div>
    </div>
  );
}

async function obtenerConfiguracionInicial(supabase: SupabaseServerClient): Promise<ConfiguracionInicial> {
  const { data } = await supabase
    .from("configuracion_sistema")
    .select(
      "empresa_nombre, moneda_principal, zona_horaria, idioma, comision_lote, comision_casa, comision_alquiler, notificaciones_email, notificaciones_push, notificaciones_recordatorios, campos_cliente, campos_propiedad, whatsapp_token, whatsapp_token_updated_at, smtp_host, smtp_host_updated_at"
    )
    .eq("id", 1)
    .maybeSingle();

  const camposCliente = Array.isArray(data?.campos_cliente)
    ? (data?.campos_cliente ?? []).filter((item): item is string => typeof item === "string")
    : [];
  const camposPropiedad = Array.isArray(data?.campos_propiedad)
    ? (data?.campos_propiedad ?? []).filter((item): item is string => typeof item === "string")
    : [];

  // Obtener configuración de Google Drive
  const { data: googleDriveData } = await supabase
    .from("google_drive_sync_config")
    .select("access_token, refresh_token, token_expires_at, root_folder_id")
    .eq("activo", true)
    .maybeSingle();

  const googleDriveConectado = Boolean(googleDriveData?.access_token || googleDriveData?.refresh_token);

  return {
    empresaNombre: data?.empresa_nombre ?? "AMERSUR Inmobiliaria",
    monedaPrincipal: (data?.moneda_principal as "PEN" | "USD") ?? "PEN",
    zonaHoraria: data?.zona_horaria ?? "America/Lima",
    idioma: (data?.idioma as "es" | "en") ?? "es",
    comisionLote: Number(data?.comision_lote ?? 0),
    comisionCasa: Number(data?.comision_casa ?? 0),
    comisionAlquiler: Number(data?.comision_alquiler ?? 0),
    notificacionesEmail: data?.notificaciones_email ?? true,
    notificacionesPush: data?.notificaciones_push ?? true,
    notificacionesRecordatorios: data?.notificaciones_recordatorios ?? true,
    camposCliente,
    camposPropiedad,
    whatsappTokenConfigurado: Boolean(data?.whatsapp_token),
    whatsappTokenActualizadoEn: data?.whatsapp_token_updated_at ?? null,
    smtpHost: data?.smtp_host ?? "",
    smtpHostActualizadoEn: data?.smtp_host_updated_at ?? null,
    googleDriveConectado,
    googleDriveFolderId: googleDriveData?.root_folder_id ?? null,
    googleDriveTokenExpiresAt: googleDriveData?.token_expires_at ?? null,
  };
}

