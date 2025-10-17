# Cómo Renovar el Access Token de WhatsApp

## Problema
Error: `"Error validating access token: The session is invalid because the user logged out"`

Esto significa que tu Access Token ha expirado o fue invalidado.

## Solución Rápida (Token Temporal - 24 horas)

### 1. Ve a Meta for Developers
1. Abre: https://developers.facebook.com/apps
2. Selecciona tu aplicación de WhatsApp

### 2. Obtén un nuevo Access Token
1. En el menú lateral, ve a **WhatsApp** → **API Setup**
2. En la sección **"Temporary access token"**, verás tu token temporal
3. Click en **"Copy"** para copiar el token
4. **IMPORTANTE**: Este token expira en 24 horas

### 3. Actualiza en Supabase
1. Ve a tu proyecto en Supabase
2. Abre el **SQL Editor**
3. Ejecuta esta query (reemplaza `TU_NUEVO_TOKEN` con el token que copiaste):

```sql
UPDATE crm.marketing_channel_credential
SET
  access_token = 'TU_NUEVO_TOKEN_AQUI',
  updated_at = now()
WHERE canal_tipo = 'whatsapp'
  AND activo = true;
```

### 4. Verifica que se actualizó
```sql
SELECT
  id,
  phone_number_id,
  substring(access_token, 1, 20) || '...' as token_preview,
  activo,
  updated_at
FROM crm.marketing_channel_credential
WHERE canal_tipo = 'whatsapp';
```

### 5. Prueba enviando un mensaje
Ahora intenta crear una campaña nuevamente desde el CRM.

---

## Solución Permanente (Access Token de Sistema - No expira)

Los tokens temporales expiran cada 24 horas. Para producción, necesitas un **System User Access Token** que no expira.

### Paso 1: Crear un System User

1. Ve a **Meta Business Suite**: https://business.facebook.com/settings/system-users
2. Click en **"Add"** → **"Add system user"**
3. Nombre: `WhatsApp CRM System User`
4. Role: **Admin**
5. Click **"Create system user"**

### Paso 2: Asignar permisos al System User

1. Click en el System User que acabas de crear
2. Click en **"Add Assets"**
3. Selecciona **"Apps"**
4. Busca y selecciona tu aplicación de WhatsApp
5. Marca **"Manage app"**
6. Click **"Save Changes"**

### Paso 3: Generar Access Token permanente

1. Dentro del System User, click en **"Generate new token"**
2. Selecciona tu **App de WhatsApp**
3. En los permisos, selecciona:
   - ✅ `whatsapp_business_messaging`
   - ✅ `whatsapp_business_management`
   - ✅ `business_management`
4. Duración: Selecciona **"60 días"** o **"Never expire"** (si está disponible)
5. Click **"Generate token"**
6. **IMPORTANTE**: Copia el token INMEDIATAMENTE y guárdalo en un lugar seguro
   - Este token solo se muestra UNA VEZ
   - Si lo pierdes, tendrás que generar uno nuevo

### Paso 4: Actualizar en Supabase

```sql
UPDATE crm.marketing_channel_credential
SET
  access_token = 'TU_TOKEN_PERMANENTE_AQUI',
  updated_at = now()
WHERE canal_tipo = 'whatsapp'
  AND activo = true;
```

### Paso 5: Guardar token en variables de entorno (Recomendado)

Para mayor seguridad, guarda el token en variables de entorno:

1. Crea/edita `.env.local`:
```bash
WHATSAPP_ACCESS_TOKEN=tu_token_permanente_aqui
WHATSAPP_PHONE_NUMBER_ID=tu_phone_number_id
```

2. En Vercel (para producción):
   - Ve a tu proyecto → Settings → Environment Variables
   - Agrega `WHATSAPP_ACCESS_TOKEN`
   - Redeploy tu aplicación

---

## Verificar que el Token funciona

### Usando CURL:
```bash
curl -X POST "https://graph.facebook.com/v21.0/TU_PHONE_NUMBER_ID/messages" \
  -H "Authorization: Bearer TU_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "TU_NUMERO_DE_PRUEBA",
    "type": "template",
    "template": {
      "name": "hello_world",
      "language": {
        "code": "en_US"
      }
    }
  }'
```

Si recibes una respuesta con `"messages": [{"id": "..."}]`, el token funciona correctamente.

---

## Troubleshooting

### Error: "Invalid OAuth access token"
- El token está mal copiado o es incorrecto
- Genera un nuevo token siguiendo los pasos de arriba

### Error: "Unsupported post request"
- El `phone_number_id` está incorrecto
- Verifica en **WhatsApp API Setup** cuál es tu Phone Number ID correcto

### Error: "Message failed to send because more than 24 hours have passed"
- Solo puedes enviar mensajes de sesión si el cliente te escribió en las últimas 24h
- Usa **mensajes de plantilla** (template) para iniciar conversaciones

### El token sigue expirando cada 24 horas
- Asegúrate de haber creado un **System User Token**, no un token temporal
- Los tokens de usuario regular expiran, los de System User no

---

## Próximos Pasos

Una vez que tengas el token permanente configurado:

1. ✅ Actualiza el token en Supabase
2. ✅ Prueba enviando una campaña desde el CRM
3. ✅ Verifica que los mensajes se envíen correctamente
4. ✅ Monitorea en WhatsApp Business Manager las métricas de envío

## Recursos Adicionales

- [WhatsApp Cloud API - Tokens](https://developers.facebook.com/docs/whatsapp/business-management-api/get-started#system-user-access-tokens)
- [Meta System Users](https://www.facebook.com/business/help/503306463479099)
- [WhatsApp API Setup](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started)
