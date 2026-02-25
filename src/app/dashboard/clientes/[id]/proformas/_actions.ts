"use server";

import { createServerActionClient } from "@/lib/supabase.server-actions";
import { createServiceRoleClient } from "@/lib/supabase.server";
import { revalidatePath } from "next/cache";
import type { ProformaDatos, ProformaMoneda, ProformaRecord, ProformaTipoOperacion } from "@/types/proforma";

export interface CrearProformaInput {
  clienteId: string;
  loteId?: string | null;
  tipoOperacion: ProformaTipoOperacion;
  moneda: ProformaMoneda;
  total?: number | null;
  descuento?: number | null;
  datos: ProformaDatos;
  estado?: "borrador" | "enviada";
}

export interface CrearProformaResult {
  success: boolean;
  error?: string;
  proforma?: ProformaRecord;
}

export interface ActualizarProformaResult {
  success: boolean;
  error?: string;
  proforma?: ProformaRecord;
}

async function generarNumeroProforma(
  supabase: Awaited<ReturnType<typeof createServerActionClient>>,
): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();

  const { count, error: countError } = await supabase
    .schema("crm")
    .from("proforma")
    .select("id", { count: "exact", head: true })
    .gte("created_at", `${year}-01-01`)
    .lt("created_at", `${year + 1}-01-01`);

  if (countError) {
    console.error("Error contando proformas para numeración:", countError);
  }

  const consecutivo = ((count ?? 0) + 1).toString().padStart(4, "0");
  return `PF-${year}-${consecutivo}`;
}

export async function crearProformaAction(input: CrearProformaInput): Promise<CrearProformaResult> {
  console.log("crearProformaAction input:", {
    tipoOperacion: input.tipoOperacion,
    loteId: input.loteId,
    clienteId: input.clienteId,
  });

  try {
    const supabase = await createServerActionClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Sesión expirada" };
    }

    const { data: asesorPerfil, error: asesorError } = await supabase
      .schema("crm")
      .from("usuario_perfil")
      .select("id, nombre_completo, username, telefono")
      .eq("id", user.id)
      .maybeSingle();

    if (asesorError || !asesorPerfil) {
      return { success: false, error: "No se encontró el perfil del asesor" };
    }

    const numero = await generarNumeroProforma(supabase);
    const estado = input.estado ?? "borrador";
    const total = input.total ?? input.datos.precios.precioFinal ?? null;
    const descuento = input.descuento ?? input.datos.precios.descuento ?? null;

    const { data, error } = await supabase
      .schema("crm")
      .from("proforma")
      .insert({
        numero,
        cliente_id: input.clienteId,
        lote_id: input.loteId ?? null,
        asesor_id: asesorPerfil.id,
        asesor_username: asesorPerfil.username,
        tipo_operacion: input.tipoOperacion,
        estado,
        moneda: input.moneda,
        total,
        descuento,
        datos: input.datos,
      })
      .select("*")
      .single();

    if (error || !data) {
      console.error("crearProformaAction insert error", error);
      return { success: false, error: "No se pudo guardar la proforma" };
    }

    // Si es tipo reserva y tiene lote, cambiar estado del lote a reservado
    if (input.tipoOperacion === "reserva" && input.loteId) {
      console.log("Actualizando lote a reservado:", input.loteId);

      const { data: loteData, error: loteError } = await supabase
        .schema("crm")
        .from("lote")
        .update({ estado: "reservado" })
        .eq("id", input.loteId)
        .select("id, estado");

      if (loteError) {
        console.error("Error actualizando estado del lote:", loteError);
      } else {
        console.log("Lote actualizado:", loteData);
      }
    } else {
      console.log("No se actualiza lote. tipoOperacion:", input.tipoOperacion, "loteId:", input.loteId);
    }

    revalidatePath(`/dashboard/clientes/${input.clienteId}`);

    return {
      success: true,
      proforma: data as unknown as ProformaRecord,
    };
  } catch (error) {
    console.error("crearProformaAction error", error);
    return { success: false, error: "Error inesperado al crear la proforma" };
  }
}

export interface EliminarProformaResult {
  success: boolean;
  error?: string;
}

export async function eliminarProformaAction(
  proformaId: string,
  clienteId: string
): Promise<EliminarProformaResult> {
  try {
    const supabase = await createServerActionClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Sesión expirada" };
    }

    // Verificar si es admin - obtener el nombre del rol
    const { data: perfil } = await supabase
      .schema("crm")
      .from("usuario_perfil")
      .select("rol:rol!usuario_perfil_rol_id_fkey(nombre)")
      .eq("id", user.id)
      .single();

    const rolNombre = perfil?.rol
      ? (Array.isArray(perfil.rol) ? perfil.rol[0]?.nombre : (perfil.rol as { nombre: string })?.nombre)
      : null;

    if (!rolNombre || !['ROL_ADMIN', 'ROL_GERENTE'].includes(rolNombre)) {
      return { success: false, error: `Solo los administradores pueden eliminar cotizaciones (rol detectado: ${rolNombre})` };
    }

    // Usar service role para bypasear RLS
    const serviceClient = createServiceRoleClient();
    const { error } = await serviceClient
      .schema("crm")
      .from("proforma")
      .delete()
      .eq("id", proformaId);

    if (error) {
      console.error("eliminarProformaAction error", error);
      return { success: false, error: "No se pudo eliminar la cotización" };
    }

    revalidatePath(`/dashboard/clientes/${clienteId}`);

    return { success: true };
  } catch (error) {
    console.error("eliminarProformaAction exception", error);
    return { success: false, error: "Error inesperado al eliminar la cotización" };
  }
}

export async function actualizarProformaAction(
  proformaId: string,
  input: CrearProformaInput,
): Promise<ActualizarProformaResult> {
  try {
    const supabase = await createServerActionClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Sesión expirada" };
    }

    const { data: existente, error: existenteError } = await supabase
      .schema("crm")
      .from("proforma")
      .select("*")
      .eq("id", proformaId)
      .maybeSingle();

    if (existenteError || !existente) {
      return { success: false, error: "Proforma no encontrada" };
    }

    const { data, error } = await supabase
      .schema("crm")
      .from("proforma")
      .update({
        lote_id: input.loteId ?? null,
        tipo_operacion: input.tipoOperacion,
        estado: input.estado ?? existente.estado,
        moneda: input.moneda,
        total: input.total ?? input.datos.precios?.precioFinal ?? existente.total,
        descuento: input.descuento ?? input.datos.precios?.descuento ?? existente.descuento,
        datos: input.datos,
        updated_at: new Date().toISOString(),
      })
      .eq("id", proformaId)
      .select("*")
      .single();

    if (error || !data) {
      console.error("actualizarProformaAction error", error);
      return { success: false, error: "No se pudo actualizar la proforma" };
    }

    // Si es tipo reserva y tiene lote, cambiar estado del lote a reservado
    if (input.tipoOperacion === "reserva" && input.loteId) {
      const { error: loteError } = await supabase
        .schema("crm")
        .from("lote")
        .update({ estado: "reservado" })
        .eq("id", input.loteId);

      if (loteError) {
        console.error("Error actualizando estado del lote:", loteError);
      }
    }

    revalidatePath(`/dashboard/clientes/${input.clienteId}`);

    return {
      success: true,
      proforma: data as unknown as ProformaRecord,
    };
  } catch (error) {
    console.error("actualizarProformaAction exception", error);
    return { success: false, error: "Error inesperado al actualizar la proforma" };
  }
}
