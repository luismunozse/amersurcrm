# Resumen de Migración a Twilio

## ✅ Completado

### 1. Componente de Creación de Plantillas
**Archivo:** `/src/components/marketing/ModalCrearPlantilla.tsx`

**Cambios realizados:**
- Título cambiado de "Agregar Plantilla de WhatsApp" a "Crear Plantilla de Mensaje"
- Descripción actualizada para mencionar Twilio y WhatsApp/SMS
- Campo "Código de WhatsApp" ahora es opcional (antes era requerido)
- Estado simplificado: solo "Activa (APPROVED)" y "Borrador (DRAFT)"
- Removidos estados PENDING y REJECTED (no aplican para Twilio)
- Placeholder actualizado para usar `{{nombre}}` en lugar de `{{1}}`
- Agregada nota: "Con Twilio no necesitas aprobación previa"

### 2. Componente de Gestión de Plantillas
**Archivo:** `/src/components/marketing/GestionPlantillas.tsx`

**Cambios realizados:**
- Título cambiado de "Plantillas de WhatsApp" a "Plantillas de Mensajes"
- Descripción: "Gestiona tus plantillas de WhatsApp y SMS con Twilio"
- Función `getEstadoIcon()` simplificada: solo APPROVED y DRAFT
- Función `getEstadoColor()` simplificada: solo APPROVED y DRAFT
- Texto de estado vacío actualizado para mencionar Twilio

### 3. Componente de Creación de Campañas
**Archivo:** `/src/components/marketing/ModalCrearCampana.tsx`

**Cambios realizados:**
- Endpoint cambiado de `/api/whatsapp/campanas/ejecutar` a `/api/twilio/campanas/ejecutar`
- Agregado parámetro `canal: 'whatsapp'` en la llamada API

### 4. Página Principal de Marketing
**Archivo:** `/src/app/dashboard/admin/marketing/page.tsx`

**Cambios realizados:**
- Título: "Marketing con Twilio" (antes: "Marketing WhatsApp")
- Descripción actualizada para mencionar WhatsApp, SMS y automatizaciones con Twilio
- Mensajes de error/éxito actualizados para mencionar Twilio
- Link a página de pruebas: `/dashboard/admin/marketing/twilio-test`

### 5. Verificación de Credenciales
**Archivo:** `/src/app/dashboard/admin/marketing/_actions.ts`

**Cambios realizados:**
- Función `verificarCredencialesWhatsApp()` ahora verifica variables de entorno:
  - `TWILIO_ACCOUNT_SID`
  - `TWILIO_AUTH_TOKEN`
  - `TWILIO_WHATSAPP_FROM`
- Agregados logs de debug para troubleshooting
- Retorna información del proveedor: `proveedor: 'twilio'`

### 6. Panel de Configuración de Twilio (NUEVO)
**Archivos:** 
- `/src/components/marketing/ConfiguracionTwilio.tsx`
- `/src/app/api/marketing/twilio-config/route.ts`
- `/supabase/migrations/20250315_marketing_channel_twilio_columns.sql`

**Cambios realizados:**
- Nuevo tab **Configuración** dentro de `/dashboard/admin/marketing` para que los administradores gestionen las credenciales sin tocar `.env`.
- API segura (requiere rol admin) que persiste `account_sid`, `auth_token`, números remitentes y verify token en `crm.marketing_channel_credential`.
- Cache de Twilio invalidado automáticamente al actualizar, garantizando que los envíos usen la credencial más reciente.
- Recordatorio visual del webhook y botones para copiar URL/token.

## 🔧 Pendiente de Ejecutar

### 1. Migración SQL - Agregar columna `tw_message_sid`

**Archivo creado:** `/supabase/migrations/20250103_add_twilio_columns.sql`

**Debes ejecutar en Supabase Dashboard:**

```sql
-- Agregar columna tw_message_sid para mensajes de Twilio
ALTER TABLE crm.marketing_mensaje
ADD COLUMN IF NOT EXISTS tw_message_sid VARCHAR(255);

-- Agregar índice para búsquedas rápidas por SID de Twilio
CREATE INDEX IF NOT EXISTS idx_marketing_mensaje_tw_message_sid
ON crm.marketing_mensaje(tw_message_sid);

-- Comentario explicativo
COMMENT ON COLUMN crm.marketing_mensaje.tw_message_sid IS
'Message SID de Twilio (ej: SMxxxxxxx). Se usa cuando los mensajes se envían vía Twilio en lugar de Meta directo.';
```

**Error actual en logs:**
```
Could not find the 'tw_message_sid' column of 'marketing_mensaje' in the schema cache
```

### 2. Actualizar Políticas RLS (Row Level Security)

**Problema:** Los mensajes de Twilio no se pueden insertar debido a políticas de seguridad.

**Error en logs:**
```
new row violates row-level security policy for table "marketing_mensaje"
```

**Solución - Ejecutar en Supabase Dashboard:**

```sql
-- Permitir insertar mensajes desde API de Twilio
-- (los mensajes vienen del servidor, no directamente del cliente)

-- Política para INSERT
DROP POLICY IF EXISTS "Usuarios pueden insertar mensajes" ON crm.marketing_mensaje;

CREATE POLICY "Usuarios autenticados pueden insertar mensajes"
ON crm.marketing_mensaje
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Política para SELECT (si no existe)
DROP POLICY IF EXISTS "Usuarios pueden ver mensajes" ON crm.marketing_mensaje;

CREATE POLICY "Usuarios autenticados pueden ver mensajes"
ON crm.marketing_mensaje
FOR SELECT
TO authenticated
USING (true);
```

### 3. Configurar Webhook en Twilio Console

Para recibir actualizaciones de estado de mensajes (entregado, leído, fallido):

1. Ve a [Twilio Console](https://console.twilio.com/)
2. Navega a: **Messaging** → **Settings** → **WhatsApp Sandbox Settings**
3. En "When a message comes in", configura:
   - **URL:** `https://crm.amersursac.com/api/twilio/webhook`
   - **Method:** POST
4. Guarda los cambios

## 📊 Estado Actual

### ✅ Funcionando
- Envío de mensajes de prueba con Twilio (confirmado por el usuario)
- UI actualizada para reflejar Twilio en lugar de Meta
- Verificación de credenciales desde variables de entorno
- Página de pruebas de Twilio

### ⚠️ Requiere Acción
1. **Configurar webhook** en Twilio Console (obligatorio para recibir estados y respuestas)

### 🎯 Siguiente Paso Sugerido

**Prioridad 1:** Ejecutar la migración SQL en Supabase Dashboard para agregar la columna `tw_message_sid`. Esto permitirá que los mensajes se guarden correctamente en la base de datos.

## 🎉 Beneficios de la Migración

1. **Sin aprobación previa** - Crea y usa plantillas inmediatamente
2. **Más flexible** - Variables con nombres descriptivos (`{{nombre}}` en lugar de `{{1}}`)
3. **WhatsApp + SMS** - Ambos canales con el mismo proveedor
4. **Mejor documentación** - Twilio tiene docs más claras que Meta
5. **Más simple** - Sin estados PENDING/REJECTED, solo activo o borrador

## 📝 Notas Adicionales

- Las credenciales de Twilio están en `.env.local` y son verificadas correctamente
- El sandbox de WhatsApp está funcionando (el usuario lo probó exitosamente)
- Para producción, eventualmente deberás solicitar WhatsApp Business API en Twilio
- Los costos de Twilio: ~$0.004 USD por mensaje WhatsApp, ~$0.05 USD por SMS en Perú

---

*Última actualización: 3 de noviembre de 2025*
