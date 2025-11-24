# 📱 Cómo Enviar Mensajes de WhatsApp desde el CRM

Tu CRM tiene **3 formas** de enviar mensajes de WhatsApp. Te explico cada una paso a paso.

---

## 🎯 MÉTODO 1: Desde Conversaciones (Responder a Cliente)

Esta es la forma más rápida para responder cuando un cliente te escribe.

### **Pasos:**

1. **Abre el CRM**:
   ```
   http://localhost:3000/dashboard/admin/marketing
   ```

2. **Ve al tab "Conversaciones"**

3. **Selecciona una conversación** de la lista

4. **Escribe tu respuesta** en el campo de texto

5. **Haz clic en "Enviar"**

### **Tipos de mensajes:**

#### **A) Mensaje de Texto Libre** (dentro de 24 horas)
- ✅ Funciona si el cliente te escribió hace menos de 24 horas
- ✅ Puedes escribir lo que quieras
- ✅ No necesitas plantilla aprobada
- ❌ Después de 24h, debes usar plantilla

#### **B) Mensaje con Plantilla** (después de 24 horas)
- ✅ Funciona siempre, incluso después de 24h
- ✅ Reabre la ventana de conversación
- ⚠️ Debes seleccionar una plantilla aprobada
- ⚠️ Completa las variables requeridas

---

## 🚀 MÉTODO 2: Crear una Campaña (Envío Masivo)

Para enviar el mismo mensaje a múltiples clientes.

### **Paso 1: Crear Audiencia** (Segmento)

1. **Ve al tab "Campañas"** (o crea desde "Dashboard")

2. **Haz clic en "Nueva Audiencia"** (si no tienes una)

3. **Completa:**
   - **Nombre**: "Clientes Interesados Octubre"
   - **Tipo**: Dinámico (se actualiza automático) o Estático (fijo)
   - **Filtros**:
     - ✅ Proyecto específico
     - ✅ Estado del cliente (interesado, seguimiento, etc.)
     - ✅ Última interacción (ej: hace más de 7 días)
     - ✅ Tags personalizados

4. **Guardar**

El sistema mostrará cuántos clientes coinciden con los filtros.

### **Paso 2: Crear Campaña**

1. **Haz clic en "+ Nueva Campaña"**

2. **Completa Información Básica:**
   - **Nombre**: "Lanzamiento Proyecto Los Álamos"
   - **Descripción**: "Invitación a evento de lanzamiento"
   - **Plantilla**: Selecciona una de tus plantillas aprobadas
   - **Audiencia**: Selecciona la audiencia que creaste

3. **Completa Variables:**

   Si tu plantilla tiene variables {{1}}, {{2}}, etc., completa:

   ```
   Variable {{1}} = nombre_cliente
   Variable {{2}} = nombre_proyecto
   Variable {{3}} = fecha_evento
   ```

   **Opciones:**
   - ✅ **Valor fijo**: Mismo para todos (ej: "Los Álamos")
   - ✅ **Campo dinámico**: Diferente por cliente (ej: `{nombre}` usa el nombre de cada cliente)

4. **Programación:**
   - **Enviar inmediatamente**: Se envía ahora
   - **Programar**: Selecciona fecha y hora

5. **Límites de Envío:**
   - **Mensajes por segundo**: 10 (recomendado)
   - **Total**: Según tu audiencia

6. **Haz clic en "Crear Campaña"**

### **Paso 3: Monitorear**

1. **En el Dashboard** verás:
   - 📊 Total enviados
   - ✅ Total entregados (✓✓)
   - 👁️ Total leídos (✓✓ azul)
   - 💬 Total respondidos
   - ⚠️ Total fallidos

2. **Haz clic en la campaña** para ver detalles por cliente

---

## ⚡ MÉTODO 3: Envío Rápido desde Perfil de Cliente

Enviar mensaje individual desde la ficha del cliente.

### **Pasos:**

1. **Ve a** `http://localhost:3000/dashboard/clientes`

2. **Busca y abre** el perfil de un cliente

3. **Busca el botón de WhatsApp** (con ícono verde)

4. **Haz clic en "Enviar WhatsApp"**

5. **Selecciona plantilla** y completa variables

6. **Enviar**

El mensaje se enviará y se creará automáticamente una conversación.

---

## 📋 REQUISITOS ANTES DE ENVIAR

### ✅ **Checklist:**

#### **1. Credenciales Configuradas**

Verifica que tengas las credenciales en Supabase:

```sql
SELECT * FROM crm.marketing_channel_credential
WHERE canal_tipo = 'whatsapp' AND activo = true;
```

Si no existe, sigue: [CONFIGURAR_PLANTILLAS_APROBADAS.md - Paso 5](CONFIGURAR_PLANTILLAS_APROBADAS.md)

#### **2. Plantillas Agregadas**

Verifica que tengas plantillas en el CRM:
1. Ve a Marketing → Plantillas
2. Deberías ver al menos 1 plantilla con estado "APPROVED"

Si no tienes, sigue: [CONFIGURAR_PLANTILLAS_APROBADAS.md](CONFIGURAR_PLANTILLAS_APROBADAS.md)

#### **3. Número de Destino Agregado** (Modo Desarrollo)

Si estás en modo desarrollo (sandbox), el número debe estar en Meta:

1. Ve a [Meta Developers](https://developers.facebook.com)
2. Tu app → WhatsApp → Primeros pasos
3. Administrar números de teléfono
4. Verifica que el número esté en la lista

#### **4. Cliente tiene Número de WhatsApp**

Verifica que el cliente tenga número con formato internacional:

- ✅ Correcto: `+51987654321`
- ✅ Correcto: `+5491123456789`
- ❌ Incorrecto: `987654321`
- ❌ Incorrecto: `051987654321`

---

## 🔍 VERIFICAR QUE EL MENSAJE SE ENVIÓ

### **Método 1: Ver en Conversaciones**

1. Ve a Marketing → Conversaciones
2. Busca la conversación con el cliente
3. Verás el mensaje con estado:
   - 🟡 `PENDING` - Enviando...
   - 🔵 `SENT` - Enviado al servidor de WhatsApp
   - ✅ `DELIVERED` - Entregado al cliente (✓✓)
   - 💙 `READ` - Leído por el cliente (✓✓ azul)
   - ❌ `FAILED` - Error (ver motivo)

### **Método 2: Ver en WhatsApp**

1. Abre WhatsApp en tu teléfono
2. Busca el número de tu negocio
3. Deberías ver el mensaje enviado

### **Método 3: Verificar en Meta Business Suite**

1. Ve a [Meta Business Suite](https://business.facebook.com)
2. WhatsApp Manager → Información
3. Verás estadísticas de mensajes enviados hoy

---

## ⚠️ PROBLEMAS COMUNES

### **Problema 1: "Template not found"**

**Causa**: El código de la plantilla no coincide con Meta

**Solución**:
1. Ve a Marketing → Plantillas
2. Haz clic en editar la plantilla
3. Verifica que el "Código de WhatsApp" sea EXACTO:
   - En Meta: `bienvenida_amersur`
   - En CRM: debe ser `bienvenida_amersur` (igual)

### **Problema 2: "The number is not registered"**

**Causa**: El número no está agregado en Meta (modo desarrollo)

**Solución**:
1. Ve a [Meta Developers](https://developers.facebook.com)
2. Tu app → WhatsApp → Primeros pasos
3. Administrar números de teléfono
4. Agrega el número destino
5. Verifica el código que WhatsApp te envía

### **Problema 3: "Session expired"**

**Causa**: Pasaron más de 24h desde el último mensaje del cliente

**Solución**:
- No puedes enviar texto libre
- Debes usar una plantilla aprobada
- Selecciona "Mensaje con Plantilla" en lugar de texto libre

### **Problema 4: "Invalid OAuth access token"**

**Causa**: El token expiró (tokens temporales duran 24h)

**Solución**:
1. Ve a [Meta Developers](https://developers.facebook.com)
2. Genera un nuevo token
3. Actualiza en Supabase:
   ```sql
   UPDATE crm.marketing_channel_credential
   SET access_token = '<NUEVO_TOKEN>'
   WHERE canal_tipo = 'whatsapp';
   ```

### **Problema 5: "Message failed - Quality Rating"**

**Causa**: Tu número tiene mala calificación (muchos bloqueos o reportes)

**Solución**:
1. Ve a Meta Business Suite → WhatsApp Manager → Información
2. Revisa tu Quality Rating
3. Si está en rojo o amarillo:
   - Reduce frecuencia de mensajes
   - Envía contenido más relevante
   - No envíes spam
   - Responde rápido a clientes

### **Problema 6: "Rate limit exceeded"**

**Causa**: Superaste el límite de mensajes

**En modo desarrollo**: Máximo 250 mensajes / 24h

**Solución**:
- Espera 24 horas para que se resetee
- O pasa a producción (requiere verificación de negocio)

---

## 💡 TIPS PARA ENVÍOS EXITOSOS

### **1. Horarios Recomendados**
- ✅ Lunes a Viernes: 9am - 6pm
- ✅ Sábados: 10am - 2pm
- ❌ Domingos y feriados (salvo urgente)
- ❌ Después de 8pm

### **2. Frecuencia**
- ✅ Máximo 2-3 mensajes por semana por cliente
- ❌ No envíes diario (saturarás)
- ✅ Espacia campañas al menos 48 horas

### **3. Contenido**
- ✅ Personaliza con nombre del cliente
- ✅ Sé breve y directo
- ✅ Incluye llamada a acción clara
- ❌ No uses CAPS LOCK en exceso
- ❌ No uses lenguaje promocional agresivo

### **4. Segmentación**
- ✅ Segmenta por interés (proyecto específico)
- ✅ Segmenta por etapa (interesados, seguimiento)
- ❌ No envíes a toda tu base
- ✅ Excluye clientes que ya compraron o se dieron de baja

### **5. Respuestas**
- ✅ Responde dentro de 1 hora (ideal)
- ✅ Máximo 24 horas (crítico)
- ✅ Usa respuestas rápidas para preguntas comunes
- ✅ Asigna conversaciones a vendedores

---

## 📊 MONITOREO Y MÉTRICAS

### **Dashboard de Marketing**

Ve a `http://localhost:3000/dashboard/admin/marketing`

Verás:

#### **Métricas Generales:**
- 📧 Mensajes enviados hoy
- ✅ Tasa de entrega
- 👁️ Tasa de lectura
- 💬 Conversaciones activas
- ⏱️ Tiempo promedio de respuesta

#### **Por Campaña:**
- Total contactos
- Enviados / Entregados / Leídos
- Respondidos (engagement)
- Conversiones (si trackeas)
- Tasa de error

#### **Por Conversación:**
- Historial completo de mensajes
- Estado de cada mensaje
- Tiempo de primera respuesta
- Total mensajes intercambiados

---

## 🎓 FLUJO TÍPICO

### **Caso de Uso: Campaña de Lanzamiento**

1. **Preparación (Día 1)**:
   - Crea plantilla en Meta: "lanzamiento_proyecto"
   - Espera aprobación (1-24 horas)
   - Agrega plantilla al CRM

2. **Configuración (Día 2)**:
   - Crea audiencia: "Clientes interesados en departamentos"
   - Crea campaña con plantilla
   - Programa para mañana 10am

3. **Envío (Día 3 - 10am)**:
   - Sistema envía automáticamente
   - 10 mensajes por segundo
   - Total: 500 clientes

4. **Monitoreo (Día 3)**:
   - 10am: 500 enviados
   - 10:30am: 480 entregados (96%)
   - 12pm: 320 leídos (64%)
   - 6pm: 45 respondieron (9%)

5. **Seguimiento (Día 4)**:
   - Revisa respuestas
   - Asigna conversaciones a vendedores
   - Responde preguntas
   - Programa visitas

---

## 🚀 PRÓXIMOS PASOS

### **Nivel Básico** ✅
- [x] Configurar credenciales
- [x] Agregar plantillas aprobadas
- [x] Enviar primer mensaje de prueba
- [x] Crear primera audiencia
- [x] Enviar primera campaña

### **Nivel Intermedio** 🔨
- [ ] Crear 3-5 plantillas para diferentes casos de uso
- [ ] Definir audiencias por proyecto/etapa
- [ ] Programar campañas recurrentes
- [ ] Configurar respuestas rápidas
- [ ] Asignar conversaciones a vendedores

### **Nivel Avanzado** 🚀
- [ ] Crear automatizaciones (respuesta automática)
- [ ] Integrar con CRM (oportunidades)
- [ ] A/B testing de plantillas
- [ ] Análisis de conversión
- [ ] Pasar a producción (número corporativo)

---

## 📞 RECURSOS

- **Documentación Completa**: [CONFIGURAR_PLANTILLAS_APROBADAS.md](CONFIGURAR_PLANTILLAS_APROBADAS.md)
- **Sistema Técnico**: [SISTEMA_WHATSAPP_MARKETING.md](SISTEMA_WHATSAPP_MARKETING.md)
- **API de WhatsApp**: [developers.facebook.com/docs/whatsapp](https://developers.facebook.com/docs/whatsapp)
- **Meta Business Suite**: [business.facebook.com](https://business.facebook.com)

---

## ❓ PREGUNTAS FRECUENTES

### **¿Puedo enviar imágenes?**
Sí, pero debes usar plantillas con imágenes aprobadas en Meta, o enviar dentro de la ventana de 24h.

### **¿Cuántos mensajes puedo enviar?**
- **Modo desarrollo**: 250 mensajes / 24h
- **Producción Tier 1**: 1,000 mensajes / 24h
- **Tier 2+**: 10,000+ (requiere verificación)

### **¿Puedo enviar a cualquier número?**
- **Modo desarrollo**: Solo números agregados en Meta (máx 5)
- **Producción**: Cualquier número de WhatsApp

### **¿Cuánto cuesta?**
- **Mensajes de plantilla**: ~$0.005-0.01 por mensaje (varía por país)
- **Mensajes de sesión**: Gratis (dentro de 24h)
- **Primer 1,000 conversaciones/mes**: Gratis

### **¿Puedo automatizar respuestas?**
Sí, ve al tab "Automatizaciones" en el CRM para configurar respuestas automáticas.

---

**¿Listo para enviar tu primer mensaje?**

1. Verifica que tengas credenciales y plantillas configuradas
2. Ve a Marketing → Plantillas (asegúrate de tener al menos 1)
3. Ve a Marketing → Campañas
4. Haz clic en "+ Nueva Campaña"
5. ¡Sigue los pasos y envía! 🚀

---

*Última actualización: 2025-10-17*
