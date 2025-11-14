"use server";

import { NextRequest, NextResponse } from "next/server";
import { createServerOnlyClient } from "@/lib/supabase.server";
import { esAdmin } from "@/lib/auth/roles";
import { z } from "zod";
import { invalidateTwilioClientCache } from "@/lib/services/twilio";

const normalizeOptionalPhone = z.preprocess((val) => {
  if (typeof val !== "string") return val;
  const trimmed = val.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}, z.string().min(8, "Número SMS inválido").optional());

const TwilioConfigSchema = z.object({
  accountSid: z.string().min(10, "Account SID inválido"),
  authToken: z.string().min(10, "Auth token inválido").optional(),
  whatsappFrom: z.string().min(8, "Número de WhatsApp inválido"),
  smsFrom: normalizeOptionalPhone,
  webhookVerifyToken: z.string().min(6, "Verify token muy corto"),
  esSandbox: z.boolean().optional(),
});

async function ensureAdmin() {
  const supabase = await createServerOnlyClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { supabase: null, error: NextResponse.json({ error: "No autorizado" }, { status: 401 }) };
  }

  const isAdmin = await esAdmin();
  if (!isAdmin) {
    return { supabase: null, error: NextResponse.json({ error: "Solo administradores" }, { status: 403 }) };
  }

  return { supabase, error: null };
}

export async function GET() {
  const { supabase, error } = await ensureAdmin();
  if (error || !supabase) return error!;

  const { data } = await supabase
    .schema('crm')
    .from('marketing_channel_credential')
    .select('id, provider, account_sid, whatsapp_from, sms_from, webhook_verify_token, es_sandbox, updated_at')
    .eq('canal_tipo', 'whatsapp')
    .eq('provider', 'twilio')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({
    hasCredential: Boolean(data),
    accountSid: data?.account_sid ?? null,
    whatsappFrom: data?.whatsapp_from ?? null,
    smsFrom: data?.sms_from ?? null,
    webhookVerifyToken: data?.webhook_verify_token ?? null,
    esSandbox: data?.es_sandbox ?? true,
    updatedAt: data?.updated_at ?? null,
  });
}

export async function PUT(request: NextRequest) {
  const { supabase, error } = await ensureAdmin();
  if (error || !supabase) return error!;

  const body = await request.json().catch(() => null);
  const parsed = TwilioConfigSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const payload = parsed.data;

  const { data: existente } = await supabase
    .schema('crm')
    .from('marketing_channel_credential')
    .select('id')
    .eq('canal_tipo', 'whatsapp')
    .eq('provider', 'twilio')
    .limit(1)
    .maybeSingle();

  if (!existente && !payload.authToken) {
    return NextResponse.json({ error: "Debes ingresar el Auth Token la primera vez." }, { status: 400 });
  }

  const registroBase = {
    canal_tipo: 'whatsapp' as const,
    provider: 'twilio' as const,
    nombre: 'Twilio Principal',
    descripcion: 'Credenciales para Twilio WhatsApp/SMS',
    account_sid: payload.accountSid.trim(),
    whatsapp_from: payload.whatsappFrom.trim(),
    sms_from: payload.smsFrom?.trim() || null,
    webhook_verify_token: payload.webhookVerifyToken.trim(),
    es_sandbox: payload.esSandbox ?? true,
    activo: true,
    updated_at: new Date().toISOString(),
    phone_number_id: payload.whatsappFrom.trim(),
  };

  const datosGuardar: Record<string, unknown> = { ...registroBase };

  if (payload.authToken && payload.authToken.trim().length > 0) {
    datosGuardar.auth_token = payload.authToken.trim();
  }

  if (existente?.id) {
    const { error: updateError } = await supabase
      .schema('crm')
      .from('marketing_channel_credential')
      .update(datosGuardar)
      .eq('id', existente.id);

    if (updateError) {
      console.error('[Twilio] Error actualizando credenciales:', updateError);
      return NextResponse.json({ error: "No se pudo guardar las credenciales" }, { status: 500 });
    }
  } else {
    const insertar = {
      ...datosGuardar,
      auth_token: payload.authToken?.trim(),
    };

    const { error: insertError } = await supabase
      .schema('crm')
      .from('marketing_channel_credential')
      .insert(insertar);

    if (insertError) {
      console.error('[Twilio] Error guardando credenciales:', insertError);
      return NextResponse.json({ error: "No se pudo guardar las credenciales" }, { status: 500 });
    }
  }

  invalidateTwilioClientCache();

  return NextResponse.json({
    success: true,
    accountSid: registroBase.account_sid,
    whatsappFrom: registroBase.whatsapp_from,
    smsFrom: registroBase.sms_from,
    esSandbox: registroBase.es_sandbox,
    webhookVerifyToken: registroBase.webhook_verify_token,
  });
}
