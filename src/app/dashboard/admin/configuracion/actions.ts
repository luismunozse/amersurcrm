'use server';

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServerOnlyClient } from "@/lib/supabase.server";
import { esAdmin } from "@/lib/permissions/server";

export type ConfiguracionFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
};

const configuracionSchema = z
  .object({
    empresaNombre: z.string().trim().min(2, "Ingresa el nombre de la empresa").max(150),
    monedaPrincipal: z.enum(["PEN", "USD"], { message: "Selecciona una moneda válida" }),
    zonaHoraria: z.string().trim().min(3, "Selecciona una zona horaria").max(120),
    idioma: z.enum(["es", "en"], { message: "Selecciona un idioma válido" }),
    comisionLote: z.coerce.number({ message: "Ingresa un porcentaje válido" }).min(0).max(100),
    comisionCasa: z.coerce.number({ message: "Ingresa un porcentaje válido" }).min(0).max(100),
    comisionAlquiler: z.coerce.number({ message: "Ingresa un porcentaje válido" }).min(0).max(100),
    notificacionesEmail: z.boolean(),
    notificacionesPush: z.boolean(),
    notificacionesRecordatorios: z.boolean(),
    camposCliente: z.string().optional(),
    camposPropiedad: z.string().optional(),
    whatsappToken: z.string().trim().optional(),
    replaceWhatsappToken: z.boolean(),
    smtpHost: z.string().trim().max(255, "El host SMTP es demasiado largo").optional(),
    googleDriveFolderId: z.string().trim().max(255, "El folder ID es demasiado largo").optional(),
  })
  .superRefine((data, ctx) => {
    if (data.replaceWhatsappToken && !data.whatsappToken) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Ingresa un token válido",
        path: ["whatsappToken"],
      });
    }
  });

function mapaErrores(fieldErrors: Record<string, string[]>): Record<string, string> {
  const errores: Record<string, string> = {};
  for (const [campo, mensajes] of Object.entries(fieldErrors)) {
    if (mensajes && mensajes.length > 0) {
      errores[campo] = mensajes.join(". ");
    }
  }
  return errores;
}

function parseCustomFields(value?: string) {
  if (!value) return [];
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getOptionalString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value : undefined;
}

export async function actualizarConfiguracion(
  prevState: ConfiguracionFormState,
  formData: FormData
): Promise<ConfiguracionFormState> {
  try {
    const supabase = await createServerOnlyClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        status: "error",
        message: "Debes iniciar sesión para actualizar la configuración.",
      };
    }

    const admin = await esAdmin();
    if (!admin) {
      return {
        status: "error",
        message: "No tienes permisos para modificar la configuración.",
      };
    }

    const rawData = {
      empresaNombre: formData.get("empresaNombre"),
      monedaPrincipal: formData.get("monedaPrincipal"),
      zonaHoraria: formData.get("zonaHoraria"),
      idioma: formData.get("idioma"),
      comisionLote: formData.get("comisionLote"),
      comisionCasa: formData.get("comisionCasa"),
      comisionAlquiler: formData.get("comisionAlquiler"),
      notificacionesEmail: formData.get("notificacionesEmail") === "on",
      notificacionesPush: formData.get("notificacionesPush") === "on",
      notificacionesRecordatorios: formData.get("notificacionesRecordatorios") === "on",
      camposCliente: getOptionalString(formData.get("camposCliente")),
      camposPropiedad: getOptionalString(formData.get("camposPropiedad")),
      whatsappToken: getOptionalString(formData.get("whatsappToken")),
      replaceWhatsappToken: formData.get("replaceWhatsappToken") === "true",
      smtpHost: getOptionalString(formData.get("smtpHost")),
      googleDriveFolderId: getOptionalString(formData.get("googleDriveFolderId")),
    };

    const parsed = configuracionSchema.safeParse(rawData);
    if (!parsed.success) {
      const errores = parsed.error.flatten();
      return {
        status: "error",
        message: "Revisa los campos marcados.",
        fieldErrors: mapaErrores(errores.fieldErrors),
      };
    }

    const camposCliente = parseCustomFields(parsed.data.camposCliente);
    const camposPropiedad = parseCustomFields(parsed.data.camposPropiedad);

    const { data: existente } = await supabase
      .from("configuracion_sistema")
      .select("whatsapp_token_updated_at, smtp_host, smtp_host_updated_at")
      .eq("id", 1)
      .maybeSingle();

    const ahora = new Date().toISOString();
    const updatePayload: Record<string, unknown> = {
      id: 1,
      empresa_nombre: parsed.data.empresaNombre,
      moneda_principal: parsed.data.monedaPrincipal,
      zona_horaria: parsed.data.zonaHoraria,
      idioma: parsed.data.idioma,
      comision_lote: parsed.data.comisionLote,
      comision_casa: parsed.data.comisionCasa,
      comision_alquiler: parsed.data.comisionAlquiler,
      notificaciones_email: parsed.data.notificacionesEmail,
      notificaciones_push: parsed.data.notificacionesPush,
      notificaciones_recordatorios: parsed.data.notificacionesRecordatorios,
      campos_cliente: camposCliente,
      campos_propiedad: camposPropiedad,
      updated_by: user.id,
    };

    if (parsed.data.replaceWhatsappToken) {
      updatePayload.whatsapp_token = parsed.data.whatsappToken;
      updatePayload.whatsapp_token_updated_at = ahora;
      updatePayload.whatsapp_token_set_by = user.id;
    }

    const smtpHostValue = parsed.data.smtpHost ? parsed.data.smtpHost : null;
    updatePayload.smtp_host = smtpHostValue;
    if ((smtpHostValue ?? null) !== (existente?.smtp_host ?? null)) {
      updatePayload.smtp_host_updated_at = ahora;
      updatePayload.smtp_host_set_by = user.id;
    }

    const { error } = await supabase.from("configuracion_sistema").upsert(updatePayload, {
      onConflict: "id",
    });

    if (error) {
      console.error("Error guardando configuración:", error);
      return {
        status: "error",
        message: "Ocurrió un error al guardar la configuración.",
      };
    }

    // Actualizar Google Drive Folder ID si se proporcionó
    if (parsed.data.googleDriveFolderId) {
      const { data: driveConfig } = await supabase
        .from("google_drive_sync_config")
        .select("id")
        .eq("activo", true)
        .maybeSingle();

      if (driveConfig) {
        const { error: driveError } = await supabase
          .from("google_drive_sync_config")
          .update({
            root_folder_id: parsed.data.googleDriveFolderId,
            updated_at: ahora,
          })
          .eq("id", driveConfig.id);

        if (driveError) {
          console.error("Error actualizando folder ID de Google Drive:", driveError);
        }
      }
    }

    revalidatePath("/dashboard/admin/configuracion");

    return {
      status: "success",
      message: "Configuración actualizada correctamente.",
    };
  } catch (error) {
    console.error("Error inesperado actualizando configuración:", error);
    return {
      status: "error",
      message: "No se pudo guardar la configuración. Intenta nuevamente.",
    };
  }
}
