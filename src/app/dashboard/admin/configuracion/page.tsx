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

        {/* Herramientas e Integraciones */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-crm-text-primary mb-4">Herramientas e Integraciones</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* WhatsApp Bot */}
            <a
              href="/dashboard/configuracion/whatsapp-bot"
              className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                    WhatsApp Bot
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Captura automática de leads desde publicidades
                  </p>
                </div>
              </div>
            </a>
          </div>
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

