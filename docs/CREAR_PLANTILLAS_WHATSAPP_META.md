# Crear Plantillas de WhatsApp en Meta Business Manager

**Fecha:** 3 de Noviembre de 2025

---

## 🎯 Objetivo

Crear plantillas de mensajes aprobadas por Meta para enviar mensajes de WhatsApp sin restricciones de ventana de 24 horas.

---

## 📋 Requisitos

- ✅ Número de WhatsApp Business activado: +1 (831) 215-4070
- ✅ Cuenta de Meta Business Manager
- ✅ WhatsApp Business Account ID: 701576472986735

---

## 🚀 Paso a Paso

### 1. Acceder a WhatsApp Manager

**Opción A - URL Directa:**
```
https://business.facebook.com/wa/manage/message-templates/?business_id=1004237931815032&waba_id=701576472986735
```

**Opción B - Navegación Manual:**
1. Ve a: https://business.facebook.com/
2. Selecciona tu negocio
3. Menú lateral: **WhatsApp Manager** → **Message Templates**

---

### 2. Crear Primera Plantilla

Click en **"Create Template"** y llena:

#### Información Básica
- **Template name:** `bienvenida_amersur`
  (Solo letras minúsculas, números y guiones bajos)
- **Category:** MARKETING
- **Languages:** Spanish

#### Contenido de la Plantilla

**Header (Opcional):**
```
AMERSUR Propiedades
```

**Body (Requerido):**
```
Hola {{1}},

Gracias por tu interés en AMERSUR. Somos especialistas en bienes raíces con más de 10 años de experiencia.

Tenemos propiedades exclusivas que podrían interesarte. ¿Te gustaría recibir más información?
```

**Footer (Opcional):**
```
AMERSUR - Tu hogar soñado te espera
```

**Buttons (Opcional):**
- Type: Quick Reply
- Text: "Sí, me interesa ✓"

- Type: Quick Reply
- Text: "Ver catálogo 📋"

#### Variables

Las variables se definen con `{{1}}`, `{{2}}`, etc.

En este ejemplo: `{{1}}` será el nombre del cliente.

---

### 3. Enviar para Aprobación

1. **Review** tu plantilla
2. Click en **"Submit"**
3. **Espera aprobación:** 1-3 días hábiles
4. **Recibirás email** cuando esté aprobada

---

## 📝 Plantillas Recomendadas para AMERSUR

### Plantilla 1: Bienvenida General (MARKETING)

```
Nombre: bienvenida_general
Categoría: MARKETING

Body:
Hola {{1}},

Bienvenido a AMERSUR. Somos tu mejor opción en bienes raíces.

Contamos con propiedades en las mejores ubicaciones. ¿En qué tipo de propiedad estás interesado?

Buttons:
- Casas 🏠
- Departamentos 🏢
- Terrenos 🏞️
```

### Plantilla 2: Seguimiento de Lead (UTILITY)

```
Nombre: seguimiento_lead
Categoría: UTILITY

Body:
Hola {{1}},

Te contactamos de AMERSUR para darte seguimiento sobre tu consulta.

¿Sigues interesado en conocer más sobre nuestras propiedades?

Buttons:
- Sí, cuéntame más ✓
- Agendar visita 📅
```

### Plantilla 3: Recordatorio de Cita (UTILITY)

```
Nombre: recordatorio_cita
Categoría: UTILITY

Body:
Hola {{1}},

Te recordamos tu cita programada:

📅 Fecha: {{2}}
🕐 Hora: {{3}}
📍 Propiedad: {{4}}

¿Confirmas tu asistencia?

Buttons:
- Confirmo asistencia ✓
- Necesito reagendar 📅
```

### Plantilla 4: Nueva Propiedad (MARKETING)

```
Nombre: nueva_propiedad
Categoría: MARKETING

Header:
🏠 Nueva Propiedad Disponible

Body:
Hola {{1}},

Tenemos una nueva propiedad que podría interesarte:

{{2}}

¿Te gustaría recibir más detalles?

Footer:
AMERSUR - Las mejores propiedades del mercado

Buttons:
- Ver detalles 📋
- Agendar visita 📅
```

---

## ⏱️ Tiempos de Aprobación

| Categoría | Tiempo Típico |
|-----------|---------------|
| UTILITY | 1-2 días |
| MARKETING | 2-3 días |
| AUTHENTICATION | 1 día |

---

## 🔧 Después de la Aprobación

Una vez aprobada la plantilla:

### 1. Sincronizar con Twilio

Las plantillas aprobadas en Meta se sincronizan automáticamente con Twilio en 1-24 horas.

### 2. Obtener Content SID

1. Ve a: https://console.twilio.com/us1/develop/sms/content-editor/templates
2. Busca tu plantilla aprobada
3. Copia el **Content SID** (comienza con `HX...`)

### 3. Usar en el CRM

El CRM ya está preparado para usar plantillas. Solo necesitas:

1. Crear la plantilla en la base de datos del CRM
2. Asociarla con el Content SID de Twilio
3. Enviar campañas usando esa plantilla

---

## 📊 Límites y Restricciones

### Mensajes con Plantilla Aprobada:
- ✅ Se pueden enviar en cualquier momento (sin ventana de 24h)
- ✅ A cualquier número válido
- ✅ Con variables personalizadas

### Mensajes de Texto Libre:
- ⏰ Solo dentro de la ventana de 24 horas
- 📝 Solo como respuesta a mensajes del cliente

---

## 🚨 Errores Comunes

### Error: "Template not approved"
**Causa:** La plantilla aún no ha sido aprobada por Meta
**Solución:** Espera 1-3 días y verifica el estado en WhatsApp Manager

### Error: "Template not found"
**Causa:** La plantilla no está sincronizada con Twilio
**Solución:** Espera 24h o contacta soporte de Twilio

### Error: "Failed to send message outside window"
**Causa:** Intentando enviar mensaje de texto libre fuera de ventana
**Solución:** Usa una plantilla aprobada

---

## ✅ Checklist

- [ ] Acceder a Meta Business Manager
- [ ] Crear al menos 3 plantillas (bienvenida, seguimiento, recordatorio)
- [ ] Enviar para aprobación
- [ ] Esperar aprobación (1-3 días)
- [ ] Verificar sincronización en Twilio Console
- [ ] Obtener Content SIDs
- [ ] Configurar plantillas en el CRM
- [ ] Probar envío

---

## 📞 Soporte

**Meta Business Manager:**
- Help Center: https://www.facebook.com/business/help
- WhatsApp Business API: https://developers.facebook.com/docs/whatsapp

**Twilio:**
- Content Templates: https://www.twilio.com/docs/content
- Console: https://console.twilio.com/

---

**Última actualización:** 3 de Noviembre de 2025
**Estado:** Guía para crear plantillas de WhatsApp aprobadas
