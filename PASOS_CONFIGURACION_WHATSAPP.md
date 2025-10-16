# 🚀 CONFIGURACIÓN WHATSAPP API - PASOS SIGUIENTES

Ya tienes las credenciales de WhatsApp Business en modo desarrollo/test. Ahora vamos a configurar todo en tu CRM.

---

## ✅ LO QUE YA TIENES

- [x] ID de número de WhatsApp Business
- [x] ID de cuenta WhatsApp Business
- [x] Token de acceso (Access Token)
- [x] Código del CRM con integración WhatsApp

---

## 📝 PASO 1: GUARDAR CREDENCIALES EN LA BASE DE DATOS

### **1.1 Abrir Supabase SQL Editor**
1. Ve a [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto: `hbscbwpnkrnuvmdbfmvp`
3. En el menú lateral, haz clic en "SQL Editor"

### **1.2 Ejecutar el Script SQL**
1. Abre el archivo: `CONFIGURAR_WHATSAPP_CREDENCIALES.sql`
2. **IMPORTANTE**: Reemplaza estos valores:

```sql
-- Tus credenciales reales:
app_id = '<TU_APP_ID>'                    -- Ejemplo: 123456789012345
phone_number_id = '<TU_PHONE_NUMBER_ID>'  -- Ejemplo: 109876543210987
access_token = '<TU_ACCESS_TOKEN>'        -- Ejemplo: EAABsbCS1iHgBO7ZC9yc... (muy largo)

-- Crea un verify token (contraseña secreta para webhook):
webhook_verify_token = 'amersur_webhook_2025_xyz123'  -- Inventa uno aleatorio
```

3. Copia el script completo y pégalo en el SQL Editor
4. Haz clic en **"Run"** o presiona `Ctrl + Enter`
5. Deberías ver un mensaje de éxito

### **1.3 Verificar**
Ejecuta esta query para confirmar:

```sql
SELECT
  id,
  nombre,
  canal_tipo,
  phone_number_id,
  activo,
  es_sandbox
FROM crm.marketing_channel_credential
WHERE canal_tipo = 'whatsapp';
```

Deberías ver 1 fila con tu configuración.

---

## 🔗 PASO 2: CONFIGURAR WEBHOOK EN META

Los webhooks permiten que WhatsApp envíe mensajes entrantes a tu CRM.

### **2.1 Determinar tu URL de Webhook**

#### **Opción A: Desarrollo Local (con ngrok)**
Si estás en localhost:

```bash
# Instalar ngrok
npm install -g ngrok

# O con snap
sudo snap install ngrok

# Iniciar túnel
ngrok http 3001
```

Tu URL será algo como: `https://abc123.ngrok-free.app`

**URL del Webhook**: `https://abc123.ngrok-free.app/api/whatsapp/webhook`

⚠️ **Limitación**: La URL cambia cada vez que reinicias ngrok (en la versión gratuita)

#### **Opción B: Producción (con dominio)**
Si ya tienes tu app desplegada:

**URL del Webhook**: `https://tu-dominio.com/api/whatsapp/webhook`

### **2.2 Configurar en Meta Developers**

1. Ve a [https://developers.facebook.com](https://developers.facebook.com)
2. Selecciona tu app: **"AMERSUR CRM WhatsApp"**
3. En el menú lateral, haz clic en **"WhatsApp" → "Configuración"**
4. En la sección **"Webhook"**, haz clic en **"Editar"**
5. Ingresa:
   - **URL de devolución de llamada**: `https://tu-url/api/whatsapp/webhook`
   - **Token de verificación**: El mismo que pusiste en el SQL (`amersur_webhook_2025_xyz123`)
6. Haz clic en **"Verificar y guardar"**

### **2.3 Suscribirse a Eventos**

Después de verificar, selecciona estos campos:
- ✅ **messages** - Mensajes entrantes
- ✅ **message_status** - Estados de entrega (enviado, entregado, leído, fallido)

---

## 📱 PASO 3: AGREGAR NÚMEROS DE PRUEBA

Como estás en modo desarrollo, solo puedes enviar mensajes a números específicos que agregues manualmente.

### **3.1 En Meta Developers**

1. Ve a **"WhatsApp" → "Primeros pasos"**
2. Busca la sección **"Enviar y recibir mensajes"**
3. Haz clic en **"Agregar número de teléfono"**
4. Ingresa el número en formato internacional:
   - ✅ Correcto: `+51987654321` (Perú)
   - ✅ Correcto: `+5491123456789` (Argentina)
   - ❌ Incorrecto: `987654321`
5. El destinatario recibirá un código de verificación por WhatsApp
6. Ingresa el código para confirmar

Puedes agregar hasta **5 números de prueba**.

---

## 📝 PASO 4: CREAR TU PRIMERA PLANTILLA

WhatsApp requiere plantillas pre-aprobadas para iniciar conversaciones.

### **4.1 Ir a WhatsApp Manager**

1. Ve a [https://business.facebook.com](https://business.facebook.com)
2. Selecciona tu cuenta de WhatsApp Business
3. En el menú lateral, haz clic en **"Plantillas de mensajes"**
4. Haz clic en **"Crear plantilla"**

### **4.2 Configurar la Plantilla**

**Información básica:**
- **Categoría**: `Marketing` (para campañas) o `Utility` (para notificaciones)
- **Nombre**: `bienvenida_amersur` (solo minúsculas, sin espacios)
- **Idiomas**: `Español (es)`

**Encabezado** (opcional):
```
¡Bienvenido a AMERSUR! 🏠
```

**Cuerpo** (obligatorio):
```
Hola {{1}}, gracias por tu interés en nuestras propiedades.

Soy {{2}}, tu asesor inmobiliario en AMERSUR. Estoy aquí para ayudarte a encontrar tu hogar ideal.

¿Tienes alguna pregunta sobre nuestros proyectos?
```

**Variables:**
- `{{1}}` = Nombre del cliente
- `{{2}}` = Nombre del vendedor

**Pie de página** (opcional):
```
AMERSUR - Tu hogar, nuestra pasión
```

**Botones** (opcional):
- **Botón 1**: `Ver Propiedades` → `https://amersur.com/propiedades`
- **Botón 2**: `Llamar ahora` → `+51987654321`

### **4.3 Enviar para Aprobación**

1. Haz clic en **"Enviar"**
2. WhatsApp revisará tu plantilla
3. **Tiempo de aprobación**: 1-24 horas
4. Recibirás notificación por email cuando esté aprobada

### **4.4 Agregar Plantilla al CRM**

Una vez aprobada la plantilla en Meta, agrégala a tu CRM:

1. Ve a tu CRM: `http://localhost:3001/dashboard/admin/marketing`
2. Haz clic en el tab **"Plantillas"**
3. Haz clic en **"+ Nueva Plantilla"**
4. Completa:
   - **Nombre**: `Bienvenida AMERSUR`
   - **Código**: `bienvenida_amersur` (exactamente como en Meta)
   - **Canal**: `WhatsApp`
   - **Categoría**: `Marketing`
   - **Idioma**: `es`
   - **Contenido**: (copia el cuerpo de la plantilla)
   - **Variables**:
     - `{{1}}` = `nombre_cliente`
     - `{{2}}` = `nombre_vendedor`
5. Haz clic en **"Guardar"**

---

## 🧪 PASO 5: PROBAR ENVÍO DE MENSAJE

### **5.1 Desde la UI del CRM**

1. Ve a `http://localhost:3001/dashboard/admin/marketing`
2. Haz clic en el tab **"Campañas"**
3. Haz clic en **"+ Nueva Campaña"**
4. Completa:
   - **Nombre**: `Prueba WhatsApp`
   - **Canal**: `WhatsApp`
   - **Plantilla**: Selecciona `Bienvenida AMERSUR`
   - **Audiencia**: Selecciona un cliente de prueba (o agrega uno)
5. En la sección de **Variables**, completa:
   - `nombre_cliente`: `Juan Pérez`
   - `nombre_vendedor`: `María García`
6. Haz clic en **"Programar"** o **"Enviar Ahora"**

### **5.2 Verificar Envío**

1. El mensaje debería aparecer en el WhatsApp del destinatario
2. En el CRM, ve a la sección de **"Conversaciones"**
3. Deberías ver el mensaje enviado con estado: `enviado` → `entregado` → `leído`

### **5.3 Responder al Mensaje**

1. Responde desde WhatsApp: `Hola, me interesa`
2. En el CRM, ve a **"Conversaciones"**
3. Deberías ver la respuesta del cliente en tiempo real
4. Puedes responder directamente desde el CRM

---

## 🔍 PASO 6: VERIFICAR QUE TODO FUNCIONA

### **Checklist de Verificación:**

- [ ] Credenciales guardadas en la base de datos
- [ ] Webhook configurado y verificado en Meta
- [ ] Al menos 1 número de prueba agregado
- [ ] Plantilla creada y aprobada en Meta
- [ ] Plantilla agregada al CRM
- [ ] Mensaje de prueba enviado exitosamente
- [ ] Mensaje recibido en WhatsApp del destinatario
- [ ] Respuesta del cliente recibida en el CRM

---

## 🚨 PROBLEMAS COMUNES

### **Problema 1: Webhook no verifica**

**Error**: "The callback URL or verify token couldn't be validated"

**Solución**:
1. Verifica que tu servidor esté corriendo (`npm run dev`)
2. Si usas ngrok, verifica que el túnel esté activo
3. Verifica que el verify token sea exactamente el mismo
4. Prueba manualmente:
   ```bash
   curl "http://localhost:3001/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=TU_VERIFY_TOKEN&hub.challenge=test123"
   ```
   Debería retornar: `test123`

### **Problema 2: Mensaje no se envía**

**Error**: "The number is not registered"

**Solución**:
- El número de destino debe estar agregado en Meta Developers (en modo desarrollo)
- Formato debe ser internacional: `+51987654321`

### **Problema 3: Plantilla rechazada**

**Solución**:
- Evita lenguaje promocional agresivo: "GRATIS", "DESCUENTO 50%"
- No uses muchas mayúsculas
- Sé claro y profesional
- Revisa las [políticas de WhatsApp](https://www.whatsapp.com/legal/business-policy)

### **Problema 4: Access Token expirado**

**Error**: "Invalid OAuth access token"

**Solución**:
- Si usas token temporal (24h), debes renovarlo diariamente
- Copia el nuevo token de Meta Developers
- Actualiza en la base de datos:
  ```sql
  UPDATE crm.marketing_channel_credential
  SET access_token = '<NUEVO_TOKEN>'
  WHERE canal_tipo = 'whatsapp';
  ```

---

## 📊 PASO 7: MONITOREO

### **En el CRM:**
1. Ve a `/dashboard/admin/marketing`
2. Verás métricas en tiempo real:
   - Mensajes enviados hoy
   - Tasa de entrega
   - Tasa de lectura
   - Conversaciones activas

### **En Meta Business Suite:**
1. Ve a [https://business.facebook.com](https://business.facebook.com)
2. Selecciona **"WhatsApp Manager"**
3. Haz clic en **"Información"**
4. Verás:
   - Quality Rating (calidad del número)
   - Límites de mensajería
   - Tier actual
   - Mensajes enviados/entregados

---

## 🎯 SIGUIENTE PASO: PRODUCCIÓN

Cuando estés listo para pasar a producción:

### **1. Verificación de Negocio**
- Completa la verificación de negocio en Meta
- Proporciona documentos legales
- Proceso toma 1-3 días hábiles

### **2. Cambiar a Número Real**
- Agrega tu número de teléfono corporativo
- Verifica el número
- Espera aprobación del Display Name (1-2 días)

### **3. Actualizar Credenciales**
```sql
UPDATE crm.marketing_channel_credential
SET
  es_sandbox = false,
  max_messages_per_day = 10000  -- Ajusta según tu tier
WHERE canal_tipo = 'whatsapp';
```

### **4. Configurar Dominio del Webhook**
- Despliega tu app en producción
- Actualiza la URL del webhook en Meta con tu dominio real
- Ejemplo: `https://crm.amersur.com/api/whatsapp/webhook`

---

## 🎉 ¡LISTO!

Tu sistema de WhatsApp Marketing está configurado y listo para usar.

**Próximas funcionalidades a explorar:**
- Automatizaciones (respuestas automáticas)
- Campañas programadas
- Segmentación de audiencias
- Reportes avanzados
- Integración con CRM (asignar conversaciones a vendedores)

---

## 📞 RECURSOS

- **Documentación**: Ver `GUIA_CONFIGURACION_WHATSAPP_API.md`
- **Sistema completo**: Ver `SISTEMA_WHATSAPP_MARKETING.md`
- **Soporte Meta**: [https://developers.facebook.com/support](https://developers.facebook.com/support)
- **Políticas WhatsApp**: [https://www.whatsapp.com/legal/business-policy](https://www.whatsapp.com/legal/business-policy)

---

**Última actualización**: 2025-10-16
