"use server";

import { createServerActionClient } from "@/lib/supabase.server-actions";
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

  const { count } = await supabase
    .from("proforma")
    .select("id", { count: "exact", head: true })
    .gte("created_at", `${year}-01-01`)
    .lt("created_at", `${year + 1}-01-01`);

  const consecutivo = ((count ?? 0) + 1).toString().padStart(4, "0");
  return `PF-${year}-${consecutivo}`;
}

export async function crearProformaAction(input: CrearProformaInput): Promise<CrearProformaResult> {
  try {
    const supabase = await createServerActionClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Sesión expirada" };
    }

    const { data: asesorPerfil, error: asesorError } = await supabase
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
      .from("proforma")
      .select("*")
      .eq("id", proformaId)
      .maybeSingle();

    if (existenteError || !existente) {
      return { success: false, error: "Proforma no encontrada" };
    }

    const { data, error } = await supabase
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
