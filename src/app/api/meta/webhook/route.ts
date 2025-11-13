"use server";

import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase.server";

const META_VERIFY_TOKEN = process.env.META_LEAD_VERIFY_TOKEN;
const META_PAGE_ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN;
const CRM_AUTOMATION_USER_ID = process.env.CRM_AUTOMATION_USER_ID ?? null;

interface MetaFieldData {
  name: string;
  values?: string[];
}

interface MetaLeadPayload {
  id: string;
  created_time?: string;
  field_data?: MetaFieldData[];
  form_id?: string;
  ad_id?: string;
  adset_id?: string;
  campaign_id?: string;
  ad_name?: string;
  adset_name?: string;
  campaign_name?: string;
  platform?: string;
}

const GRAPH_API_VERSION = "v19.0";

export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get("hub.mode");
  const token = request.nextUrl.searchParams.get("hub.verify_token");
  const challenge = request.nextUrl.searchParams.get("hub.challenge");

  if (mode === "subscribe" && challenge && token === META_VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
}

export async function POST(request: NextRequest) {
  if (!META_PAGE_ACCESS_TOKEN) {
    console.error("[MetaLeadWebhook] Falta META_PAGE_ACCESS_TOKEN");
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.entry) {
    return NextResponse.json({ success: true, processed: 0 });
  }

  const supabase = createServiceRoleClient();
  let processed = 0;

  for (const entry of body.entry) {
    for (const change of entry?.changes ?? []) {
      if (change?.field !== "leadgen") continue;
      const leadId = change?.value?.leadgen_id;
      if (!leadId) continue;

      try {
        const leadDetails = await fetchLeadDetails(leadId);
        await persistLead(leadDetails, supabase);
        processed += 1;
      } catch (error) {
        console.error(`[MetaLeadWebhook] Error procesando lead ${leadId}:`, error);
      }
    }
  }

  return NextResponse.json({ success: true, processed });
}

async function fetchLeadDetails(leadId: string): Promise<MetaLeadPayload> {
  const fields =
    "field_data,created_time,form_id,ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,platform";
  const url = new URL(`https://graph.facebook.com/${GRAPH_API_VERSION}/${leadId}`);
  url.searchParams.set("access_token", META_PAGE_ACCESS_TOKEN!);
  url.searchParams.set("fields", fields);

  const response = await fetch(url, { next: { revalidate: 0 } });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Graph API error (${response.status}): ${errorText}`);
  }

  return (await response.json()) as MetaLeadPayload;
}

type RawVendedor = {
  id: string;
  username: string | null;
  nombre_completo: string | null;
  rol?: { nombre?: string | null } | Array<{ nombre?: string | null }> | null;
};

type Vendedor = {
  id: string;
  username: string;
  nombre_completo: string | null;
};

async function selectVendedorDisponible(supabase: ReturnType<typeof createServiceRoleClient>) {
  const { data, error } = await supabase
    .from("usuario_perfil")
    .select("id, username, nombre_completo, rol:rol!usuario_perfil_rol_fk(nombre)")
    .eq("activo", true);

  if (error) {
    console.error("[MetaLeadWebhook] Error obteniendo vendedores:", error);
    return null;
  }

  const rawVendedores = (data ?? []) as RawVendedor[];

  const vendedores: Vendedor[] = rawVendedores
    .map((v) => {
      const rolNombre = Array.isArray(v.rol) ? v.rol[0]?.nombre : v.rol?.nombre;
      if (rolNombre !== "ROL_VENDEDOR" || !v.username) return null;
      return {
        id: v.id,
        username: v.username,
        nombre_completo: v.nombre_completo ?? null,
      };
    })
    .filter((v): v is Vendedor => v !== null);

  if (vendedores.length === 0) {
    return null;
  }

  const conteos = await Promise.all(
    vendedores.map(async (vend) => {
      const { count, error } = await supabase
        .from("cliente")
        .select("id", { count: "exact", head: true })
        .eq("vendedor_asignado", vend.username);
      return {
        vendedor: vend,
        count: error ? Number.POSITIVE_INFINITY : count ?? 0,
      };
    })
  );

  conteos.sort((a, b) => {
    if (a.count === b.count) {
      const nameA = a.vendedor.nombre_completo ?? a.vendedor.username;
      const nameB = b.vendedor.nombre_completo ?? b.vendedor.username;
      return nameA.localeCompare(nameB);
    }
    return a.count - b.count;
  });

  return conteos[0]?.vendedor ?? null;
}

function mapFieldData(fieldData?: MetaFieldData[]) {
  const fields: Record<string, string> = {};
  for (const field of fieldData ?? []) {
    if (field.name && Array.isArray(field.values) && field.values.length > 0) {
      fields[field.name.toLowerCase()] = field.values[0] ?? "";
    }
  }
  return fields;
}

async function persistLead(lead: MetaLeadPayload, supabase: ReturnType<typeof createServiceRoleClient>) {
  const fields = mapFieldData(lead.field_data);

  const nombre =
    fields["full_name"] ||
    [fields["first_name"], fields["last_name"]].filter(Boolean).join(" ") ||
    fields["name"] ||
    "Lead Meta";

  const email = fields["email"] || fields["work_email"] || null;
  const telefono = fields["phone_number"] || fields["phone"] || null;

  const direccion = {
    calle: "",
    numero: "",
    barrio: "",
    ciudad: fields["city"] || "",
    provincia: fields["state"] || fields["region"] || "",
    pais: fields["country"] || "Perú",
  };

  const vendedor = await selectVendedorDisponible(supabase);
  const createdBy = vendedor?.id ?? CRM_AUTOMATION_USER_ID;

  if (!createdBy) {
    throw new Error("No hay un usuario disponible para created_by (define CRM_AUTOMATION_USER_ID).");
  }

  const notas = [fields["message"] || null, buildNotas(lead)].filter(Boolean).join(" · ") || null;

  const insertPayload: Record<string, unknown> = {
    nombre,
    tipo_cliente: "persona",
    email,
    telefono,
    telefono_whatsapp: telefono,
    origen_lead: "facebook_ads",
    estado_cliente: "lead",
    vendedor_asignado: vendedor?.username ?? null,
    created_by: createdBy,
    direccion,
    proxima_accion: "Contactar lead generado desde Meta",
    interes_principal: fields["interes"] || null,
    notas,
  };

  const { error } = await supabase.from("cliente").insert(insertPayload);

  if (error) {
    const message = String(error.message ?? "");
    if (message.includes("duplicate key value")) {
      console.info(`[MetaLeadWebhook] Lead duplicado ignorado (${lead.id})`);
      return;
    }
    throw error;
  }
}

function buildNotas(lead: MetaLeadPayload) {
  const parts = [
    `Lead generado desde Meta (${lead.id})`,
    lead.campaign_name ? `Campaña: ${lead.campaign_name}` : null,
    lead.adset_name ? `Ad set: ${lead.adset_name}` : null,
    lead.ad_name ? `Anuncio: ${lead.ad_name}` : null,
  ].filter(Boolean);
  return parts.join(" · ") || null;
}
