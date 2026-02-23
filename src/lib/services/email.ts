/**
 * Servicio de Email con Resend
 *
 * Maneja el envío de emails transaccionales y de campaña.
 * La API key se configura mediante la variable de entorno RESEND_API_KEY.
 */

import { Resend } from "resend";

let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error(
        "RESEND_API_KEY no configurada. Agrega la variable de entorno para habilitar el canal email."
      );
    }
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

export function invalidateEmailClientCache() {
  resendClient = null;
}

export interface EmailSendOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string; // default: noreply@amersurcrm.com o el configurado
  replyTo?: string;
}

export interface EmailSendResult {
  id: string;
  to: string | string[];
  subject: string;
}

/**
 * Envía un email usando Resend
 */
export async function enviarEmail(opciones: EmailSendOptions): Promise<EmailSendResult> {
  const resend = getResendClient();

  const from =
    opciones.from ||
    process.env.RESEND_FROM_EMAIL ||
    "AMERSUR <noreply@amersurcrm.com>";

  const { data, error } = await resend.emails.send({
    from,
    to: Array.isArray(opciones.to) ? opciones.to : [opciones.to],
    subject: opciones.subject,
    html: opciones.html,
    text: opciones.text,
    replyTo: opciones.replyTo,
  });

  if (error || !data) {
    throw new Error(`Error enviando email: ${error?.message ?? "Respuesta vacía de Resend"}`);
  }

  return {
    id: data.id,
    to: opciones.to,
    subject: opciones.subject,
  };
}

/**
 * Envía emails masivos con control de tasa (50ms entre envíos)
 */
export async function enviarEmailMasivo(
  destinatarios: string[],
  subject: string,
  html: string,
  text?: string
): Promise<{
  exitosos: EmailSendResult[];
  fallidos: { email: string; error: string }[];
}> {
  const exitosos: EmailSendResult[] = [];
  const fallidos: { email: string; error: string }[] = [];

  for (const email of destinatarios) {
    try {
      const resultado = await enviarEmail({ to: email, subject, html, text });
      exitosos.push(resultado);
      await new Promise((resolve) => setTimeout(resolve, 50));
    } catch (err: any) {
      fallidos.push({ email, error: err.message });
    }
  }

  return { exitosos, fallidos };
}

/**
 * Verifica que las credenciales de Resend están configuradas
 */
export function verificarCredencialesEmail(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

/**
 * Convierte texto plano con variables sustituidas a HTML básico
 * (para templates que solo tienen body_texto sin body_html)
 */
export function textoAHtml(texto: string, nombre?: string): string {
  const escaped = texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  ${nombre ? `<p style="color:#666; font-size:14px;">Hola ${nombre},</p>` : ""}
  <div style="line-height:1.6; font-size:15px;">${escaped}</div>
  <hr style="border:none;border-top:1px solid #eee;margin-top:30px;">
  <p style="font-size:12px;color:#999;">AMERSUR Inmobiliaria</p>
</body>
</html>`;
}
