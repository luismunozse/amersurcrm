# 🎉 Configurar Plantillas de WhatsApp Aprobadas

Ya tienes tus plantillas aprobadas por Meta. Ahora vamos a configurarlas en el CRM para que puedas usarlas.

---

## 📋 PASO 1: Obtener Información de Meta

Antes de agregar las plantillas al CRM, necesitas estos datos de cada plantilla aprobada:

### **Dónde encontrarlos:**

1. Ve a [Meta Business Suite](https://business.facebook.com)
2. Selecciona tu cuenta de WhatsApp Business
3. En el menú lateral, haz clic en **"Plantillas de mensajes"**
4. Verás todas tus plantillas aprobadas

### **Datos que necesitas anotar:**

Para cada plantilla aprobada, anota:

- ✅ **Nombre de la plantilla** (el código exacto, ej: `bienvenida_amersur`)
- ✅ **Categoría** (MARKETING, UTILITY o AUTHENTICATION)
- ✅ **Idioma** (ej: `es`, `es_ES`)
- ✅ **Contenido del cuerpo** (el texto completo con variables {{1}}, {{2}})
- ✅ **Pie de página** (si tiene)
- ✅ **Variables** (qué representa cada {{1}}, {{2}}, etc.)
- ✅ **Botones** (si tiene, con URLs o números de teléfono)

### **Ejemplo:**

```
Nombre: bienvenida_amersur
Categoría: MARKETING
Idioma: es
Cuerpo: "Hola {{1}}, bienvenido a AMERSUR Inmobiliaria.

Tenemos excelentes propiedades disponibles en tu zona de interés.

¿Te gustaría recibir más información?"

Pie de página: "AMERSUR - Tu hogar, nuestra pasión"

Variables:
- {{1}} = nombre del cliente

Botones: (ninguno)
```

---

## 📍 PASO 2: Agregar Plantillas al CRM

### **2.1 Acceder al Panel de Marketing**

1. Abre tu CRM: `http://localhost:3000/dashboard/admin/marketing`
2. Haz clic en el tab **"Plantillas"**
3. Verás un botón **"+ Nueva Plantilla"**

### **2.2 Completar el Formulario**

Haz clic en **"+ Nueva Plantilla"** y completa:

#### **Información Básica:**

- **Nombre de la Plantilla**: Un nombre descriptivo para el CRM
  - Ejemplo: `Bienvenida AMERSUR`
  - ⚠️ Este es DIFERENTE del código de WhatsApp

- **Código de WhatsApp**: El nombre exacto de Meta (¡MUY IMPORTANTE!)
  - Ejemplo: `bienvenida_amersur`
  - ⚠️ Debe ser EXACTO, minúsculas, sin espacios
  - ⚠️ Si no coincide, los mensajes fallarán

- **Categoría**: Selecciona la misma que en Meta
  - `Marketing`: Para campañas promocionales
  - `Utility`: Para notificaciones transaccionales
  - `Authentication`: Para códigos de verificación

- **Idioma**: Selecciona el mismo que en Meta
  - `Español (es)` - Predeterminado
  - `Español - España (es_ES)`
  - `Español - México (es_MX)`

- **Estado**: Selecciona `Aprobada`
  - Solo usa otros estados si la plantilla está pendiente o rechazada

#### **Contenido del Mensaje:**

- **Cuerpo del Mensaje**: Copia EXACTAMENTE el texto de Meta
  - Incluye los {{1}}, {{2}} tal cual
  - Mantén los saltos de línea

- **Pie de Página**: Copia el footer si tiene uno

#### **Variables:**

Para cada variable {{1}}, {{2}}, etc., agrega una descripción:

1. Escribe en el campo: `nombre_cliente`
2. Haz clic en **"Agregar"**
3. Verás: `{{1}} = nombre_cliente`
4. Repite para {{2}}, {{3}}, etc.

**Ejemplo:**
- Variable 1: `nombre_cliente` → {{1}}
- Variable 2: `nombre_vendedor` → {{2}}
- Variable 3: `nombre_proyecto` → {{3}}

#### **Botones (Opcional):**

Si tu plantilla tiene botones en Meta, agrégalos aquí:

1. Haz clic en **"Agregar Botón"**
2. Selecciona el tipo:
   - **URL**: Enlace a sitio web
   - **Respuesta Rápida**: Respuesta predefinida
   - **Teléfono**: Número para llamar
3. Completa los datos

**Ejemplo de Botón URL:**
- Tipo: `URL`
- Texto: `Ver Propiedades`
- URL: `https://amersur.com/propiedades`

#### **Objetivo (Opcional):**

Describe para qué usarás esta plantilla:
- Ejemplo: `Dar bienvenida a nuevos clientes interesados en propiedades`

### **2.3 Guardar**

Haz clic en **"Crear Plantilla"**

✅ Verás un mensaje de éxito y la plantilla aparecerá en la lista

---

## 🔄 PASO 3: Repetir para Todas tus Plantillas

Repite el PASO 2 para cada plantilla aprobada que tengas en Meta.

**Tips:**
- Agrega las plantillas más importantes primero
- Puedes agregar más plantillas después
- Mantén los nombres descriptivos y organizados

---

## ✅ PASO 4: Verificar las Plantillas

Una vez agregadas, verifica que aparezcan correctamente:

### **En la lista verás:**

- ✅ Nombre de la plantilla
- ✅ Estado: APPROVED (con ícono verde ✓)
- ✅ Categoría (badge de color)
- ✅ Contenido del cuerpo
- ✅ Variables (si tiene)
- ✅ Botones (si tiene)

### **Verifica que:**

- [ ] El código de WhatsApp sea exacto
- [ ] El estado sea "APPROVED"
- [ ] Las variables estén bien definidas
- [ ] El contenido tenga los {{1}}, {{2}} correctos

---

## 🚀 PASO 5: Configurar Credenciales de WhatsApp (Si aún no lo hiciste)

Para enviar mensajes, necesitas configurar las credenciales de WhatsApp Cloud API.

### **5.1 Obtener Credenciales de Meta**

1. Ve a [Meta Developers](https://developers.facebook.com)
2. Selecciona tu app de WhatsApp
3. En el menú, haz clic en **"WhatsApp" → "Primeros pasos"**

Necesitas estos 3 datos:

1. **Phone Number ID**:
   - En "Enviar y recibir mensajes"
   - Ejemplo: `109876543210987`

2. **WhatsApp Business Account ID**:
   - En el panel principal
   - Ejemplo: `123456789012345`

3. **Access Token** (Token de Acceso):
   - En "Enviar y recibir mensajes"
   - Haz clic en "Generar token temporal" (válido 24 horas)
   - O crea un token permanente en "Configuración del sistema"
   - Ejemplo: `EAABsbCS1iHgBO7ZC9yc...` (muy largo)

### **5.2 Crear Verify Token**

Inventa una contraseña secreta para webhooks:
- Ejemplo: `amersur_webhook_2025_xyz123`
- Anótalo, lo necesitarás después

### **5.3 Guardar en la Base de Datos**

1. Abre [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto
3. Ve a **"SQL Editor"**
4. Pega este SQL (reemplaza los valores):

```sql
-- Eliminar credenciales anteriores si existen
DELETE FROM crm.marketing_channel_credential WHERE canal_tipo = 'whatsapp';

-- Insertar nuevas credenciales
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
  'WhatsApp Business API',
  'Credenciales de WhatsApp Cloud API para AMERSUR',
  '<TU_WABA_ID>',                    -- WhatsApp Business Account ID
  '<TU_PHONE_NUMBER_ID>',            -- Phone Number ID
  '<TU_ACCESS_TOKEN>',               -- Access Token (el largo)
  '<TU_VERIFY_TOKEN>',               -- El que inventaste
  true,                              -- activo
  true,                              -- es_sandbox (true si estás en modo desarrollo)
  10,                                -- máximo 10 mensajes por segundo
  250                                -- máximo 250 mensajes por día (tier inicial)
);
```

5. Haz clic en **"Run"** o presiona `Ctrl + Enter`
6. Deberías ver: "Success. No rows returned"

### **5.4 Verificar**

Ejecuta esta query para confirmar:

```sql
SELECT
  id,
  nombre,
  canal_tipo,
  phone_number_id,
  activo,
  es_sandbox,
  created_at
FROM crm.marketing_channel_credential
WHERE canal_tipo = 'whatsapp';
```

Deberías ver 1 fila con tus datos.

---

## 🧪 PASO 6: Enviar Mensaje de Prueba

### **6.1 Agregar Número de Prueba en Meta**

Como estás en modo desarrollo, solo puedes enviar a números específicos:

1. Ve a [Meta Developers](https://developers.facebook.com)
2. Tu app → **"WhatsApp" → "Primeros pasos"**
3. En "Enviar y recibir mensajes", haz clic en **"Administrar números de teléfono"**
4. Haz clic en **"Agregar número de teléfono"**
5. Ingresa tu WhatsApp: `+51987654321` (formato internacional con +)
6. WhatsApp te enviará un código de 6 dígitos
7. Ingresa el código para verificar

⚠️ **Importante**: Puedes agregar máximo 5 números en modo desarrollo

### **6.2 Crear una Campaña de Prueba**

1. En el CRM, ve a `http://localhost:3000/dashboard/admin/marketing`
2. Haz clic en el tab **"Campañas"**
3. Haz clic en **"+ Nueva Campaña"**

Completa:

- **Nombre**: `Prueba WhatsApp - Bienvenida`
- **Plantilla**: Selecciona la plantilla que agregaste
- **Canal**: WhatsApp
- **Descripción**: `Mensaje de prueba para verificar integración`

### **6.3 Seleccionar Destinatario**

- **Opción A**: Crear un cliente con tu número de prueba
- **Opción B**: Seleccionar un cliente existente que tenga el número

### **6.4 Completar Variables**

Si tu plantilla tiene variables, completa los valores:

Ejemplo:
- `{{1}} nombre_cliente`: `Juan Pérez`
- `{{2}} nombre_vendedor`: `María García`

### **6.5 Enviar**

- Haz clic en **"Enviar Ahora"** (o programa para después)
- Espera unos segundos

### **6.6 Verificar**

1. **En WhatsApp**: Deberías recibir el mensaje
2. **En el CRM**: Ve a la sección **"Conversaciones"**
3. Verás el mensaje con estado:
   - `PENDING` → Pendiente de envío
   - `SENT` → Enviado
   - `DELIVERED` → Entregado (✓✓)
   - `READ` → Leído (✓✓ azul)

---

## 🎯 PASO 7: Enviar Campañas Masivas

Una vez que funciona el mensaje de prueba:

### **7.1 Crear Audiencia**

1. Ve al tab **"Audiencias"**
2. Crea un segmento de clientes:
   - Por proyecto
   - Por estado (interesado, seguimiento, etc.)
   - Por fecha de última interacción
   - Por tags personalizados

### **7.2 Crear Campaña Masiva**

1. Tab **"Campañas"** → **"+ Nueva Campaña"**
2. Selecciona la audiencia
3. Selecciona la plantilla
4. Completa las variables (puedes usar campos dinámicos)
5. Programa o envía inmediatamente

### **7.3 Monitorear Resultados**

En el dashboard de campañas verás:

- 📊 Total enviados
- ✅ Total entregados
- 👁️ Total leídos
- 💬 Total respondidos
- ⚠️ Total fallidos

---

## 📌 CHECKLIST FINAL

Antes de enviar campañas, verifica:

### **Configuración:**
- [ ] Plantillas agregadas al CRM con códigos exactos
- [ ] Credenciales de WhatsApp guardadas en Supabase
- [ ] Al menos 1 número de prueba agregado en Meta
- [ ] Webhook configurado (opcional, para recibir respuestas)

### **Pruebas:**
- [ ] Mensaje de prueba enviado exitosamente
- [ ] Mensaje recibido en WhatsApp
- [ ] Estado actualizado a DELIVERED/READ en el CRM
- [ ] Variables reemplazadas correctamente en el mensaje

### **Listo para Producción:**
- [ ] Múltiples plantillas configuradas
- [ ] Audiencias definidas
- [ ] Primera campaña masiva creada
- [ ] Monitoreo de métricas funcionando

---

## ⚠️ PROBLEMAS COMUNES

### **Problema 1: "Template not found"**

**Causa**: El código de WhatsApp no coincide con Meta

**Solución**:
1. Ve a Meta Business Suite → Plantillas
2. Copia el nombre EXACTO de la plantilla
3. Edita la plantilla en el CRM
4. Pega el código exacto en "Código de WhatsApp"

### **Problema 2: "The number is not registered"**

**Causa**: El número de destino no está agregado en Meta (modo desarrollo)

**Solución**:
1. Ve a Meta Developers → WhatsApp → Primeros pasos
2. Agrega el número a la lista de números de prueba
3. Verifica el código de WhatsApp que te envían

### **Problema 3: "Invalid OAuth access token"**

**Causa**: El token expiró (tokens temporales duran 24 horas)

**Solución**:
1. Genera un nuevo token en Meta Developers
2. Actualiza en Supabase:
   ```sql
   UPDATE crm.marketing_channel_credential
   SET access_token = '<NUEVO_TOKEN>'
   WHERE canal_tipo = 'whatsapp';
   ```

### **Problema 4: Variables no se reemplazan**

**Causa**: Número de variables no coincide

**Solución**:
1. Cuenta cuántas {{1}}, {{2}}, etc. tiene tu plantilla en Meta
2. En el CRM, agrega la misma cantidad de variables
3. Al enviar, completa TODAS las variables requeridas

### **Problema 5: "Message failed to send"**

**Posibles causas**:
- Límite de mensajes diarios alcanzado (250 en tier inicial)
- Calidad del número baja (Quality Rating en Meta)
- Plantilla pausada o deshabilitada en Meta

**Solución**:
1. Ve a Meta Business Suite → WhatsApp Manager → Información
2. Verifica Quality Rating y límites
3. Verifica que la plantilla siga aprobada y activa

---

## 🎓 TIPS Y MEJORES PRÁCTICAS

### **Para tus Plantillas:**

1. **Sé Conversacional**: Escribe como si hablaras con un amigo
2. **Evita CAPS LOCK**: WhatsApp puede rechazar plantillas muy promocionales
3. **Usa Variables**: Personaliza con nombre del cliente, vendedor, proyecto
4. **Agrega Footer**: Dale identidad a tu marca
5. **Botones Útiles**: Facilita la acción que quieres que tome el cliente

### **Para tus Campañas:**

1. **Segmenta**: No envíes a todos, segmenta por interés
2. **Horarios**: Envía en horarios laborales (9am - 6pm)
3. **Frecuencia**: No satures, máximo 1-2 mensajes por semana
4. **Mide**: Revisa métricas y optimiza
5. **Responde Rápido**: Si un cliente responde, atiéndelo rápido

### **Para mantener Quality Rating Alto:**

1. No envíes spam
2. Responde dentro de 24 horas
3. Mantén contenido relevante y útil
4. No compres bases de datos de números
5. Obtén consentimiento antes de agregar a listas

---

## 🚀 PRÓXIMOS PASOS

Una vez que tu sistema funciona:

1. **Crea más plantillas** para diferentes casos de uso:
   - Seguimiento post-visita
   - Recordatorio de cita
   - Invitación a evento
   - Actualización de proyecto
   - Respuesta a consulta

2. **Automatiza flujos**:
   - Auto-respuesta a mensajes entrantes
   - Seguimiento automático a clientes sin respuesta
   - Asignación automática de conversaciones a vendedores

3. **Integra con CRM**:
   - Vincula conversaciones con oportunidades
   - Registra interacciones en la ficha del cliente
   - Dispara mensajes desde el perfil del cliente

4. **Escala a Producción**:
   - Completa verificación de negocio en Meta
   - Agrega tu número de teléfono corporativo
   - Aumenta límites de mensajería (Tier 2, 3, etc.)

---

## 📞 RECURSOS

- **Documentación Meta**: [developers.facebook.com/docs/whatsapp](https://developers.facebook.com/docs/whatsapp)
- **Políticas WhatsApp**: [whatsapp.com/legal/business-policy](https://www.whatsapp.com/legal/business-policy)
- **Meta Business Suite**: [business.facebook.com](https://business.facebook.com)
- **Supabase Dashboard**: [supabase.com/dashboard](https://supabase.com/dashboard)

---

**¿Listo para empezar?**

1. Abre Meta Business Suite
2. Anota los datos de tus plantillas aprobadas
3. Ve a tu CRM: `http://localhost:3000/dashboard/admin/marketing`
4. ¡Agrega tu primera plantilla!

---

*Última actualización: 2025-10-17*
