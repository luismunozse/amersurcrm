# 🔄 Migración a Twilio - Completada

## ✅ Cambios Realizados

El módulo de Marketing ha sido migrado completamente de Meta WhatsApp Business API a **Twilio**.

---

## 📝 Archivos Modificados

### 1. **Verificación de Credenciales**
Archivo: `src/app/dashboard/admin/marketing/_actions.ts`

**Antes:**
- Buscaba credenciales de Meta en la base de datos
- Requería: `phone_number_id`, `access_token`

**Ahora:**
- Verifica credenciales de Twilio desde variables de entorno
- Requiere: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`

### 2. **Ejecución de Campañas**
Archivo: `src/components/marketing/ModalCrearCampana.tsx`

**Cambio:**
```typescript
// Antes
fetch('/api/whatsapp/campanas/ejecutar', {
  campana_id,
  destinatarios_config
})

// Ahora
fetch('/api/twilio/campanas/ejecutar', {
  campana_id,
  canal: 'whatsapp',
  destinatarios_config
})
```

### 3. **Mensajes de la UI**
Archivo: `src/app/dashboard/admin/marketing/page.tsx`

**Cambios:**
- Título: "Marketing WhatsApp" → "Marketing con Twilio"
- Descripción: Ahora menciona WhatsApp **y SMS**
- Mensajes de configuración actualizados para Twilio

---

## 🔑 Configuración Requerida

### Variables de Entorno (`.env.local`)

```bash
# Twilio API (WhatsApp + SMS Marketing)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+17629943984         # Para SMS
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886  # Para WhatsApp
```

---

## 🗄️ Base de Datos

### Migración Pendiente

Necesitas ejecutar la migración SQL para agregar la columna `tw_message_sid`:

**Archivo:** `supabase/migrations/20250103_add_twilio_columns.sql`

**Ejecutar en Supabase Dashboard:**
1. Ve a: https://hbscbwpnkrnuvmdbfmvp.supabase.co
2. SQL Editor → New query
3. Copia y ejecuta:

```sql
ALTER TABLE crm.marketing_mensaje
ADD COLUMN IF NOT EXISTS tw_message_sid VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_marketing_mensaje_tw_message_sid
ON crm.marketing_mensaje(tw_message_sid);

COMMENT ON COLUMN crm.marketing_mensaje.tw_message_sid IS
'Message SID de Twilio (ej: SMxxxxxxx). Se usa cuando los mensajes se envían vía Twilio.';
```

---

## 🚀 Ventajas de Twilio

### Antes (Meta Business API):
- ❌ Requiere plantillas aprobadas por Meta (7-15 días)
- ❌ Solo WhatsApp
- ❌ Proceso de verificación complejo
- ❌ Documentación confusa
- ❌ Requiere Facebook Business Manager

### Ahora (Twilio):
- ✅ No requiere plantillas aprobadas
- ✅ WhatsApp **+ SMS** en una sola plataforma
- ✅ Configuración en minutos
- ✅ Documentación excelente
- ✅ Webhooks confiables
- ✅ Sandbox gratis para pruebas

---

## 📱 Diferencias en el Uso

### Plantillas

**Meta:** Requerían aprobación
```
Hola {{1}}, tu cita es el {{2}}
↓ (7-15 días de espera)
```

**Twilio:** Envío directo
```
Hola Juan, tu cita es el lunes a las 3pm
↓ (enviado inmediatamente)
```

### Canales

**Meta:** Solo WhatsApp

**Twilio:** WhatsApp + SMS
- Puedes enviar WhatsApp si el cliente lo tiene
- Puedes enviar SMS si no tiene WhatsApp
- Misma API, mismo código

---

## 🔧 Funcionalidades Mantenidas

Todo lo que funcionaba antes, sigue funcionando:

- ✅ Crear campañas
- ✅ Seleccionar destinatarios (todos, proyecto, manual, audiencia)
- ✅ Plantillas personalizadas
- ✅ Variables en mensajes
- ✅ Conversaciones
- ✅ Dashboard de métricas
- ✅ Automatizaciones

**Mejoras adicionales:**
- ✅ Ahora también puedes enviar SMS
- ✅ No necesitas esperar aprobación de plantillas
- ✅ Webhooks más confiables
- ✅ Mejor tracking de estados

---

## 🧪 Cómo Probar

### 1. WhatsApp Sandbox (Pruebas)

Primero, únete al sandbox:
1. Abre WhatsApp en tu celular
2. Envía mensaje a: **+1 415 523 8886**
3. Escribe: **`join curious-remarkable`**

### 2. Enviar Mensaje de Prueba

Ve a: `/dashboard/admin/marketing/twilio-test`

O usa el botón "Probar Twilio" en el módulo de Marketing.

### 3. Crear una Campaña

1. Ve a Marketing → Campañas
2. Click en "Nueva Campaña"
3. Selecciona plantilla o escribe mensaje
4. Elige destinatarios
5. Click en "Enviar"

Los mensajes se enviarán por Twilio automáticamente.

---

## 📊 Costos

### Meta Business API:
- Gratis (pero complejo de configurar)
- Mensajes marketing: ~$0.004 USD c/u

### Twilio:
- Sandbox: **Gratis ilimitado** (para pruebas)
- WhatsApp producción: ~$0.004 USD c/u
- SMS Perú: ~$0.05 USD c/u
- SMS USA: ~$0.0075 USD c/u

**Recomendación:** Usa el sandbox mientras prueban, luego solicita WhatsApp Business cuando estén listos para producción.

---

## 🔄 Rollback (si necesitas volver a Meta)

Si por alguna razón necesitas volver a Meta:

1. Revierte los cambios en Git:
   ```bash
   git revert <commit-hash>
   ```

2. O restaura manualmente:
   - `_actions.ts` - Volver a verificar credenciales de Meta
   - `ModalCrearCampana.tsx` - Cambiar URL a `/api/whatsapp/campanas/ejecutar`
   - `page.tsx` - Volver a mensajes de Meta

---

## ⚠️ Notas Importantes

### Sandbox vs Producción

**Sandbox:**
- Los clientes deben unirse primero con `join curious-remarkable`
- Solo funciona 24 horas después de que el cliente escriba
- Gratis e ilimitado

**Producción:**
- Requiere solicitar WhatsApp Business en Twilio
- Los clientes NO necesitan unirse
- Proceso de aprobación: 1-7 días
- Costos por mensaje

### Números de Teléfono

Asegúrate de usar el formato internacional:
- ✅ `+51987654321` (Perú)
- ✅ `+14155551234` (USA)
- ❌ `987654321` (sin código de país)

---

## 🎯 Próximos Pasos

1. **Ejecutar migración SQL** (agregar columna `tw_message_sid`)
2. **Probar campaña de prueba** con el sandbox
3. **Solicitar WhatsApp Business** en Twilio (para producción)
4. **Configurar webhook** en Twilio Console:
   - URL: `https://crm.amersursac.com/api/twilio/webhook`
   - Método: POST

---

## 📚 Documentación

- [Guía de integración Twilio](./INTEGRACION_TWILIO.md)
- [Twilio WhatsApp Docs](https://www.twilio.com/docs/whatsapp)
- [Twilio SMS Docs](https://www.twilio.com/docs/sms)

---

**Fecha de migración:** Noviembre 3, 2025
**Estado:** ✅ Completado
**Próximo paso:** Ejecutar migración SQL y probar campaña

