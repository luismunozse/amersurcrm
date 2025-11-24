# 📱 GUÍA COMPLETA: CONFIGURAR WHATSAPP BUSINESS API

## 🎯 OBJETIVO
Obtener las credenciales necesarias para integrar WhatsApp Business API con tu CRM.

---

## 📋 REQUISITOS PREVIOS

Antes de comenzar, necesitas:

1. ✅ **Cuenta de Facebook Business** (gratuita)
2. ✅ **Número de teléfono** dedicado para WhatsApp Business
   - **NO** puede estar registrado en WhatsApp personal
   - **NO** puede estar en uso en otra cuenta de WhatsApp Business
   - Recomendado: Número nuevo o línea corporativa
3. ✅ **Dominio verificado** (para producción)
4. ✅ **Tarjeta de crédito** (para verificación, no se cobra inicialmente)

---

## 🚀 PASO A PASO

### **PASO 1: Crear Cuenta en Meta Business Suite**

1. **Ir a:** https://business.facebook.com
2. **Hacer clic en:** "Crear cuenta"
3. **Completar información:**
   - Nombre del negocio: "AMERSUR Inmobiliaria"
   - Tu nombre
   - Email empresarial
4. **Verificar email** y completar configuración

---

### **PASO 2: Crear App de WhatsApp Business**

1. **Ir a:** https://developers.facebook.com
2. **Hacer clic en:** "Mis Apps" → "Crear App"
3. **Seleccionar tipo:** "Empresa" o "Otro"
4. **Completar información:**
   - Nombre de la app: "AMERSUR CRM WhatsApp"
   - Email de contacto
   - Cuenta de empresa (seleccionar la que creaste)
5. **Hacer clic en:** "Crear app"

---

### **PASO 3: Agregar Producto WhatsApp**

1. **En el dashboard de tu app**, buscar "WhatsApp"
2. **Hacer clic en:** "Configurar" en WhatsApp
3. **Seleccionar:** "Configuración rápida" (Quick Setup)
4. **Crear o seleccionar:** Cuenta de WhatsApp Business
   - Si no tienes: "Crear nueva cuenta de WhatsApp Business"
   - Nombre: "AMERSUR Inmobiliaria"

---

### **PASO 4: Configurar Número de Teléfono**

1. **En la sección WhatsApp**, ir a "Números de teléfono"
2. **Opciones:**

   **Opción A: Usar número de prueba (RECOMENDADO PARA TESTING)**
   - Meta te da un número temporal
   - Puedes enviar mensajes a 5 números de prueba
   - **Ideal para desarrollo**
   - ✅ No requiere verificación
   - ✅ Gratis
   - ❌ Limitado a 5 destinatarios

   **Opción B: Agregar tu propio número**
   - Hacer clic en "Agregar número de teléfono"
   - Ingresar número (formato: +54 9 11 1234-5678)
   - Verificar por SMS o llamada
   - ⚠️ El número quedará vinculado a WhatsApp Business

3. **Anotar el `Phone Number ID`** (lo necesitarás después)

---

### **PASO 5: Obtener Credenciales**

#### **A. App ID**
1. En el dashboard de tu app, ir a "Configuración" → "Básica"
2. Copiar el **"ID de la app"**
3. Ejemplo: `123456789012345`

#### **B. Phone Number ID**
1. En "WhatsApp" → "Números de teléfono"
2. Hacer clic en tu número
3. Copiar el **"Phone Number ID"**
4. Ejemplo: `109876543210987`

#### **C. Access Token (Token de Acceso)**

**Para Testing (Temporal - 24 horas):**
1. En "WhatsApp" → "Primeros pasos"
2. Copiar el **"Token de acceso temporal"**
3. ⚠️ Expira en 24 horas

**Para Producción (Permanente):**
1. Ir a "Configuración" → "Básica" → "Tokens de acceso de la app"
2. Hacer clic en "Generar token"
3. Seleccionar permisos:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
4. Copiar y **guardar de forma segura** (no se mostrará de nuevo)
5. Ejemplo: `EAABsbCS1iHgBO7ZC9yc...` (muy largo)

#### **D. Webhook Verify Token**
1. **Tú lo creas** - Es una contraseña secreta que eliges
2. Ejemplo: `amersur_webhook_secret_2025`
3. Debe ser aleatorio y seguro
4. Lo usarás para verificar que los webhooks vienen de WhatsApp

---

### **PASO 6: Configurar Webhook**

1. **En tu app**, ir a "WhatsApp" → "Configuración"
2. **Hacer clic en:** "Editar" en "Webhook"
3. **Configurar:**
   - **URL de devolución de llamada:**
     ```
     https://tu-dominio.com/api/whatsapp/webhook
     ```
     ⚠️ Debe ser HTTPS (no HTTP)
     ⚠️ Para desarrollo local, usa ngrok o similar
   
   - **Token de verificación:**
     ```
     amersur_webhook_secret_2025
     ```
     (El que creaste en el paso anterior)

4. **Hacer clic en:** "Verificar y guardar"
   - Meta hará una petición GET a tu webhook
   - Tu servidor debe responder con el challenge

5. **Suscribirse a campos:**
   - ✅ `messages` - Mensajes entrantes
   - ✅ `message_status` - Estados de mensajes

---

### **PASO 7: Guardar Credenciales en el CRM**

Una vez que tengas todas las credenciales, guárdalas en tu base de datos:

```sql
-- Ejecutar en Supabase SQL Editor
INSERT INTO crm.marketing_channel_credential (
  canal_tipo,
  nombre,
  descripcion,
  app_id,
  phone_number_id,
  access_token,
  webhook_verify_token,
  activo,
  es_sandbox,
  max_messages_per_second,
  max_messages_per_day
) VALUES (
  'whatsapp',
  'WhatsApp Business Principal',
  'Cuenta principal de WhatsApp para AMERSUR',
  '123456789012345',                    -- Tu App ID
  '109876543210987',                    -- Tu Phone Number ID
  'EAABsbCS1iHgBO7ZC9yc...',           -- Tu Access Token (completo)
  'amersur_webhook_secret_2025',       -- Tu Verify Token
  true,                                 -- Activo
  false,                                -- No es sandbox (true si usas número de prueba)
  15,                                   -- Max 15 mensajes por segundo
  10000                                 -- Max 10,000 mensajes por día
);
```

---

## 🧪 TESTING CON NÚMERO DE PRUEBA

### **Ventajas del Número de Prueba:**
- ✅ Disponible inmediatamente
- ✅ No requiere verificación de negocio
- ✅ Gratis
- ✅ Perfecto para desarrollo

### **Limitaciones:**
- ❌ Solo 5 números de destino permitidos
- ❌ Debes agregar los números manualmente en Meta
- ❌ No puedes usarlo en producción

### **Cómo agregar números de prueba:**
1. En "WhatsApp" → "Primeros pasos"
2. Sección "Enviar y recibe mensajes"
3. Hacer clic en "Agregar número de teléfono"
4. Ingresar número (formato internacional: +54 9 11 1234-5678)
5. El destinatario recibirá un código para confirmar

---

## 🏢 PRODUCCIÓN: VERIFICACIÓN DE NEGOCIO

Para usar en producción con clientes reales:

### **Requisitos:**
1. **Verificación de Negocio en Meta**
   - Documentos legales de la empresa
   - Información fiscal
   - Sitio web verificado
   - Proceso toma 1-3 días hábiles

2. **Número de Teléfono Verificado**
   - Debe estar a nombre de la empresa
   - Verificación por SMS o llamada

3. **Display Name Aprobado**
   - Nombre que verán tus clientes
   - Debe coincidir con tu negocio
   - Aprobación toma 1-2 días

### **Límites por Tier:**

| Tier | Mensajes/día | Costo |
|------|--------------|-------|
| **Tier 1** | 1,000 | Gratis hasta 1,000 conversaciones/mes |
| **Tier 2** | 10,000 | Luego ~$0.03-0.10 USD por conversación |
| **Tier 3** | 100,000 | Según país y categoría |
| **Unlimited** | Sin límite | Requiere aprobación especial |

---

## 🔧 DESARROLLO LOCAL CON NGROK

Para recibir webhooks en tu máquina local:

### **1. Instalar ngrok:**
```bash
# Descargar de https://ngrok.com
# O instalar con snap
sudo snap install ngrok
```

### **2. Crear túnel:**
```bash
ngrok http 3001
```

### **3. Copiar URL pública:**
```
Forwarding: https://abc123.ngrok.io -> http://localhost:3001
```

### **4. Configurar en Meta:**
```
URL del Webhook: https://abc123.ngrok.io/api/whatsapp/webhook
```

⚠️ **Nota:** La URL de ngrok cambia cada vez que reinicias, deberás actualizar en Meta.

---

## 📝 PLANTILLAS DE WHATSAPP

### **Crear tu Primera Plantilla:**

1. **Ir a:** Meta Business Suite → WhatsApp Manager
2. **Hacer clic en:** "Plantillas de mensajes" → "Crear plantilla"
3. **Configurar:**
   - **Categoría:** Marketing / Utility / Authentication
   - **Nombre:** `bienvenida_amersur` (sin espacios, minúsculas)
   - **Idioma:** Español (es)
   
4. **Contenido:**
   ```
   Encabezado (opcional):
   ¡Bienvenido a AMERSUR! 🏠
   
   Cuerpo:
   Hola {{1}}, gracias por tu interés en nuestras propiedades.
   
   Soy {{2}}, tu asesor inmobiliario. Estoy aquí para ayudarte a encontrar tu hogar ideal.
   
   ¿En qué zona te gustaría vivir?
   
   Pie de página (opcional):
   AMERSUR - Tu hogar, nuestra pasión
   
   Botones:
   [Botón 1] Ver Propiedades → https://amersur.com/propiedades
   [Botón 2] Hablar con Asesor → +54 9 11 1234-5678
   ```

5. **Enviar para aprobación**
   - Revisión toma 1-24 horas
   - Meta verifica que cumpla políticas

### **Variables en Plantillas:**
- `{{1}}` = Primera variable (ej: nombre del cliente)
- `{{2}}` = Segunda variable (ej: nombre del vendedor)
- Máximo 10 variables por plantilla

---

## 💰 COSTOS DE WHATSAPP BUSINESS API

### **Modelo de Precios (2025):**

**Conversaciones Gratis:**
- Primeras 1,000 conversaciones/mes: **GRATIS**

**Después de 1,000:**
- **Marketing:** ~$0.05-0.10 USD por conversación
- **Utility:** ~$0.03-0.07 USD por conversación
- **Authentication:** ~$0.02-0.05 USD por conversación
- **Service:** ~$0.03-0.08 USD por conversación

**¿Qué es una conversación?**
- Ventana de 24 horas desde el primer mensaje
- Múltiples mensajes en 24h = 1 conversación
- Se cobra por conversación iniciada, no por mensaje

### **Ejemplo de Costos:**
```
Campaña de 500 clientes:
- 500 template messages enviados
- 300 responden (60% tasa de respuesta)
- 300 conversaciones iniciadas

Costo aproximado:
- Si estás bajo 1,000/mes: GRATIS
- Si superas 1,000/mes: 300 × $0.05 = $15 USD
```

---

## 🔐 SEGURIDAD Y MEJORES PRÁCTICAS

### **1. Proteger Access Token:**
```bash
# NUNCA lo subas a GitHub
# Guárdalo en variables de entorno
# Rótalo periódicamente (cada 60-90 días)
```

### **2. Webhook Verify Token:**
```bash
# Usa un string aleatorio y largo
# Ejemplo: openssl rand -base64 32
# Guárdalo de forma segura
```

### **3. Validar Firma del Webhook:**
```typescript
// Implementado en: src/app/api/whatsapp/webhook/route.ts
// Verifica que los webhooks vengan realmente de WhatsApp
```

---

## 🧪 TESTING PASO A PASO

### **1. Verificar Webhook (sin código):**

```bash
# En tu navegador, ir a:
https://tu-dominio.com/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=TU_VERIFY_TOKEN&hub.challenge=test123

# Debe retornar: test123
```

### **2. Enviar Mensaje de Prueba (con curl):**

```bash
curl -X POST "http://localhost:3001/api/whatsapp/send" \
  -H "Content-Type: application/json" \
  -H "Cookie: tu-cookie-de-sesion" \
  -d '{
    "telefono": "+5491123456789",
    "tipo": "TEMPLATE",
    "template_id": "uuid-de-tu-plantilla",
    "template_variables": {
      "1": "Juan Pérez",
      "2": "María García"
    },
    "credential_id": "uuid-de-credencial"
  }'
```

### **3. Probar desde la UI:**

1. Ir a `/dashboard/admin/marketing`
2. Tab "Plantillas" → Crear plantilla
3. Tab "Campañas" → Crear campaña
4. Seleccionar plantilla y audiencia
5. Hacer clic en "Enviar"

---

## 🎓 RECURSOS DE APRENDIZAJE

### **Documentación Oficial:**
- [WhatsApp Business Platform](https://developers.facebook.com/docs/whatsapp)
- [Cloud API Quick Start](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started)
- [Message Templates Guide](https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates)
- [Webhooks Setup](https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks)

### **Videos Tutoriales:**
- [WhatsApp Cloud API Setup (YouTube)](https://www.youtube.com/results?search_query=whatsapp+cloud+api+setup)
- [Meta Business Suite Tutorial](https://www.youtube.com/results?search_query=meta+business+suite+tutorial)

---

## 🆘 PROBLEMAS COMUNES

### **Problema 1: "Número ya registrado"**
**Solución:** El número está en uso en WhatsApp personal o en otra cuenta Business. Usa un número diferente.

### **Problema 2: "Webhook verification failed"**
**Solución:** 
- Verifica que tu servidor esté accesible públicamente (usa ngrok para local)
- Verifica que el verify token sea exactamente el mismo
- Revisa los logs de tu servidor

### **Problema 3: "Template rejected"**
**Solución:**
- Evita lenguaje promocional agresivo ("GRATIS", "DESCUENTO 50%")
- No uses mayúsculas excesivas
- Sé claro y profesional
- Revisa las [políticas de WhatsApp](https://www.whatsapp.com/legal/business-policy)

### **Problema 4: "Session expired"**
**Solución:**
- Después de 24h sin mensaje del cliente, debes usar template message
- No puedes enviar session messages fuera de la ventana de 24h

### **Problema 5: "Rate limit exceeded"**
**Solución:**
- Respeta los límites de tu tier
- Implementa throttling en campañas masivas
- Aumenta tu tier si necesitas más capacidad

---

## 📊 MONITOREO Y MÉTRICAS

### **En Meta Business Suite:**
1. Ir a "WhatsApp Manager" → "Información"
2. Ver métricas:
   - Mensajes enviados/entregados
   - Tasa de lectura
   - Calidad del número (Quality Rating)
   - Límites de mensajería

### **En tu CRM:**
1. Ir a `/dashboard/admin/marketing`
2. Ver dashboard con métricas en tiempo real
3. Revisar campañas individuales
4. Analizar conversaciones

---

## 🎯 CHECKLIST FINAL

Antes de usar en producción, verifica:

- [ ] Cuenta de Meta Business creada
- [ ] App de WhatsApp configurada
- [ ] Número de teléfono verificado
- [ ] Credenciales obtenidas (App ID, Phone Number ID, Access Token)
- [ ] Webhook configurado y verificado
- [ ] Credenciales guardadas en la base de datos
- [ ] Al menos 1 plantilla aprobada por WhatsApp
- [ ] Testing realizado con número de prueba
- [ ] Verificación de negocio completada (para producción)
- [ ] Display name aprobado
- [ ] Políticas de privacidad publicadas en tu sitio web

---

## 📞 SOPORTE

### **Meta Business Support:**
- [Centro de Ayuda](https://www.facebook.com/business/help)
- [Comunidad de Desarrolladores](https://developers.facebook.com/community/)

### **Documentación del CRM:**
- Ver: `SISTEMA_WHATSAPP_MARKETING.md`
- Código: `src/lib/whatsapp/client.ts`

---

## 🚀 SIGUIENTE PASO

Una vez que tengas las credenciales:

1. **Ejecutar el SQL del Paso 7** para guardar credenciales
2. **Crear tu primera plantilla** en Meta Business Suite
3. **Esperar aprobación** (1-24 horas)
4. **Probar envío** desde el CRM
5. **Configurar automatizaciones** para leads nuevos

¡Tu sistema de WhatsApp Marketing estará listo para usar! 🎉
