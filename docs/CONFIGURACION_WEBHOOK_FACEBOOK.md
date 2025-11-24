# Configuración del Webhook de Facebook Lead Ads

**Última actualización:** Noviembre 2025
**Estado:** Producción

---

## 📋 Descripción

Este documento describe cómo configurar el webhook de Facebook Lead Ads para capturar automáticamente leads de tus campañas publicitarias de Facebook y almacenarlos en el CRM.

## 🎯 Flujo del Sistema

1. Usuario completa un formulario de Facebook Lead Ads
2. Facebook envía notificación al webhook del CRM
3. El CRM obtiene los detalles completos del lead desde Facebook Graph API
4. El lead se guarda automáticamente en la base de datos
5. Se asigna automáticamente a un vendedor (distribución equitativa)
6. El vendedor puede ver y gestionar el lead en `/dashboard/leads`

---

## 🔧 Prerequisitos

Antes de configurar el webhook necesitas:

1. ✅ Una cuenta de Meta Business Manager
2. ✅ Una página de Facebook Business
3. ✅ Una app de Facebook Developers
4. ✅ Campañas con formularios de Lead Ads activos
5. ✅ Acceso al servidor donde está desplegado el CRM (Vercel, Railway, etc.)

---

## 📝 Paso 1: Crear la App de Facebook

### 1.1 Acceder a Facebook Developers

Ve a: [https://developers.facebook.com/](https://developers.facebook.com/)

### 1.2 Crear Nueva App

1. Click en **"My Apps"** → **"Create App"**
2. Selecciona tipo: **"Business"**
3. Información básica:
   - **Display Name:** `AMERSUR CRM`
   - **App Contact Email:** tu@email.com
   - **Business Account:** Selecciona tu Business Manager

### 1.3 Agregar el Producto Webhooks

1. En el dashboard de la app, busca **"Webhooks"**
2. Click en **"Set Up"**
3. Selecciona **"Page"** como objeto

---

## 🔐 Paso 2: Obtener Credenciales

### 2.1 Page Access Token

**Opción A: Graph API Explorer (Desarrollo/Testing)**

1. Ve a: [https://developers.facebook.com/tools/explorer/](https://developers.facebook.com/tools/explorer/)
2. Selecciona tu app en el dropdown
3. Click en **"Generate Access Token"**
4. Selecciona los permisos:
   - `leads_retrieval`
   - `pages_manage_metadata`
5. Autoriza y copia el token

**Opción B: Token de Larga Duración (Producción - Recomendado)**

```bash
# 1. Obtén un token de corta duración desde Graph API Explorer
SHORT_LIVED_TOKEN="tu_token_corto"

# 2. Intercambia por uno de larga duración (60 días)
curl -X GET "https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=TU_APP_ID&client_secret=TU_APP_SECRET&fb_exchange_token=$SHORT_LIVED_TOKEN"

# 3. El resultado tendrá un access_token válido por 60 días
```

**Opción C: Token Permanente de Página**

1. Ve a: [https://developers.facebook.com/tools/explorer/](https://developers.facebook.com/tools/explorer/)
2. Genera un User Access Token de larga duración
3. Ejecuta este request:

```bash
curl -X GET "https://graph.facebook.com/v19.0/me/accounts?access_token=TU_USER_TOKEN"
```

4. Busca tu página y copia el `access_token` (es permanente)

### 2.2 Generar Verify Token

Crea un token único y seguro para verificar el webhook:

```bash
# Ejemplo de generación de token aleatorio
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

O simplemente usa una contraseña fuerte única.

### 2.3 Obtener CRM Automation User ID

Este es el UUID de un usuario del sistema que se usará como creador de los leads automáticos:

1. Accede a tu base de datos (Supabase)
2. Ejecuta:

```sql
SELECT id, username, nombre_completo
FROM crm.usuario_perfil
WHERE activo = true
ORDER BY created_at ASC
LIMIT 1;
```

3. Copia el `id` (UUID)

---

## ⚙️ Paso 3: Configurar Variables de Entorno

### 3.1 En tu archivo `.env.local` (Desarrollo)

```bash
# Facebook Lead Ads
META_PAGE_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxxxxxxx
META_LEAD_VERIFY_TOKEN=tu_token_unico_secreto_aqui
CRM_AUTOMATION_USER_ID=550e8400-e29b-41d4-a716-446655440000
```

### 3.2 En Vercel/Railway (Producción)

**Vercel:**

```bash
vercel env add META_PAGE_ACCESS_TOKEN
# Pega el token cuando te lo pida

vercel env add META_LEAD_VERIFY_TOKEN
# Pega el verify token

vercel env add CRM_AUTOMATION_USER_ID
# Pega el UUID
```

**Railway:**

1. Ve a tu proyecto en Railway
2. Settings → Variables
3. Agrega cada variable con su valor

---

## 🌐 Paso 4: Configurar el Webhook en Facebook

### 4.1 Configurar Callback URL

1. En la app de Facebook → Webhooks → Page
2. Click en **"Edit Callback URL"**
3. Ingresa:
   - **Callback URL:** `https://TU_DOMINIO.com/api/meta/webhook`
   - **Verify Token:** El mismo valor que `META_LEAD_VERIFY_TOKEN`

**Ejemplos de URL:**
- Producción: `https://crm.amersursac.com/api/meta/webhook`
- Vercel: `https://tu-app.vercel.app/api/meta/webhook`
- Railway: `https://tu-app.up.railway.app/api/meta/webhook`

4. Click en **"Verify and Save"**

Si todo está bien, verás un ✅ check verde.

### 4.2 Suscribirse al Objeto leadgen

1. En la misma sección de Webhooks
2. Busca **"leadgen"** en la lista de campos
3. Marca el checkbox de **"leadgen"**
4. Click en **"Save"**

### 4.3 Vincular la Página de Facebook

1. En Webhooks → Page subscriptions
2. Click en **"Add Page Subscription"**
3. Selecciona tu página de Facebook
4. Autoriza los permisos solicitados

---

## ✅ Paso 5: Probar el Webhook

### 5.1 Verificar que el Webhook Está Activo

```bash
curl -X GET "https://TU_DOMINIO.com/api/meta/webhook?hub.mode=subscribe&hub.verify_token=TU_VERIFY_TOKEN&hub.challenge=test123"

# Debería devolver: test123
```

### 5.2 Probar con un Lead Real

1. Ve a tu página de Facebook
2. Abre un anuncio con formulario de Lead Ads
3. Completa el formulario como si fueras un cliente
4. Envía el formulario

### 5.3 Verificar en el CRM

1. Ve a: `https://TU_DOMINIO.com/dashboard/leads`
2. Busca el lead recién creado
3. Verifica que:
   - ✅ El nombre y datos son correctos
   - ✅ El origen es "Facebook Lead Ads (Automático)"
   - ✅ Está asignado a un vendedor
   - ✅ Las notas incluyen información de la campaña

---

## 🐛 Solución de Problemas

### El webhook no se verifica

**Error:** "The URL couldn't be validated"

**Soluciones:**
1. Verifica que la app esté desplegada y accesible públicamente
2. Asegúrate de que `META_LEAD_VERIFY_TOKEN` coincida exactamente
3. Revisa los logs del servidor

### Los leads no llegan al CRM

**Posibles causas:**

1. **Token expirado:**
   ```bash
   # Verifica si el token es válido
   curl "https://graph.facebook.com/v19.0/debug_token?input_token=TU_TOKEN&access_token=TU_TOKEN"
   ```

2. **Permisos insuficientes:**
   - Verifica que la app tenga `leads_retrieval` aprobado
   - Revisa que la página esté suscrita al webhook

3. **Errores en el código:**
   ```bash
   # Ver logs en Vercel
   vercel logs

   # Ver logs en Railway
   railway logs
   ```

### Error: "No hay un usuario disponible para created_by"

**Solución:**
- Asegúrate de que `CRM_AUTOMATION_USER_ID` esté configurado
- Verifica que el UUID exista en la tabla `usuario_perfil`
- O asegúrate de que haya al menos un vendedor activo

---

## 📊 Monitoreo y Mantenimiento

### Ver Actividad del Webhook

1. Ve a: [https://developers.facebook.com/tools/webhooks/](https://developers.facebook.com/tools/webhooks/)
2. Selecciona tu app
3. Verás:
   - Número de eventos enviados
   - Tasa de éxito
   - Errores recientes

### Renovar Token de Acceso

Los tokens de larga duración expiran después de ~60 días. Para renovarlos:

```bash
# 1. Obtén un nuevo token de corta duración desde Graph API Explorer
# 2. Intercambia por uno de larga duración
curl -X GET "https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=TU_APP_ID&client_secret=TU_APP_SECRET&fb_exchange_token=NUEVO_TOKEN_CORTO"

# 3. Actualiza la variable de entorno
vercel env add META_PAGE_ACCESS_TOKEN production
```

### Logs Importantes

Revisa los logs para detectar problemas:

```bash
# Vercel
vercel logs --follow

# Railway
railway logs --follow

# Busca estos mensajes:
# ✅ "[MetaLeadWebhook] Lead procesado exitosamente"
# ⚠️ "[MetaLeadWebhook] Error procesando lead"
# ℹ️ "[MetaLeadWebhook] Lead duplicado ignorado"
```

---

## 🔒 Seguridad

### Validación de Firma (Opcional - Recomendado)

Para mayor seguridad, valida que las peticiones realmente vienen de Facebook:

1. Agrega `META_APP_SECRET` a tus variables de entorno
2. Implementa validación de firma en el webhook:

```typescript
import crypto from 'crypto';

function validateSignature(body: string, signature: string): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', process.env.META_APP_SECRET!)
    .update(body)
    .digest('hex');

  return `sha256=${expectedSignature}` === signature;
}
```

### Rate Limiting

Implementa rate limiting para evitar abuso:

```typescript
// Máximo 100 leads por minuto
const maxLeadsPerMinute = 100;
```

---

## 📈 Mejoras Futuras

- [ ] Implementar validación de firma de Facebook
- [ ] Agregar notificaciones en tiempo real cuando llega un lead
- [ ] Crear reglas de asignación personalizadas (por región, producto, etc.)
- [ ] Implementar respuesta automática vía WhatsApp al recibir el lead
- [ ] Dashboard de rendimiento de campañas publicitarias

---

## 📞 Recursos Útiles

- [Documentación oficial de Facebook Lead Ads](https://developers.facebook.com/docs/marketing-api/guides/lead-ads)
- [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
- [Webhook Tester](https://developers.facebook.com/tools/webhooks/)
- [Permisos de la API](https://developers.facebook.com/docs/permissions/reference)

---

## ✨ Resumen de URLs del Sistema

| Endpoint | Descripción |
|----------|-------------|
| `GET /api/meta/webhook` | Verificación del webhook (Facebook) |
| `POST /api/meta/webhook` | Recepción de notificaciones de leads |
| `/dashboard/leads` | Visualización de leads (Admins y Vendedores) |
| `/dashboard/clientes/[id]` | Detalle de un lead específico |

---

**¿Problemas?** Revisa los logs del servidor o contacta al equipo de desarrollo.
