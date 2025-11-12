# Activar WhatsApp Business en Twilio (Producción)

**Fecha:** 3 de Noviembre de 2025

---

## 🎯 Objetivo

Configurar WhatsApp Business API en Twilio para enviar mensajes a cualquier número sin necesidad de verificación previa.

---

## 📝 Requisitos Previos

- ✅ Cuenta de Twilio con suscripción paga
- ✅ Acceso a Twilio Console
- 📱 Número de teléfono para WhatsApp Business (puede ser uno nuevo que compres en Twilio)
- 🏢 Información de tu negocio (nombre, dirección, sitio web)

---

## 🚀 Paso 1: Solicitar WhatsApp Business Profile

### Opción A: Comprar número nuevo en Twilio (Recomendado)

1. **Ir a Twilio Console:**
   - URL: https://console.twilio.com/

2. **Navegar a WhatsApp:**
   - Click en "Messaging" → "Try it out" → "Send a WhatsApp message"
   - O ir directo a: https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn

3. **Solicitar número de WhatsApp:**
   - Click en "Request to enable my Twilio number for WhatsApp"
   - Seleccionar "Buy a new number for WhatsApp"
   - Elegir país (Perú +51 o USA +1)
   - Comprar el número

4. **Completar perfil de negocio:**
   - Business Name: AMERSUR SAC
   - Business Category: Real Estate
   - Business Website: https://amersursac.com (o tu sitio web)
   - Business Address: Tu dirección comercial
   - Business Description: Breve descripción de tu empresa

### Opción B: Usar número existente

1. **Si ya tienes un número de teléfono:**
   - Puedes usar tu número actual de Twilio
   - Click en "Request to enable my Twilio number for WhatsApp"
   - Seleccionar tu número existente

2. **Completar verificación:**
   - Twilio te enviará un código de verificación
   - Ingresar el código para verificar

---

## ⏱️ Paso 2: Esperar Aprobación

- **Tiempo de aprobación:** 1-3 días hábiles
- **Notificación:** Recibirás un email cuando esté aprobado
- **Estado:** Puedes verificar en https://console.twilio.com/us1/develop/sms/senders/whatsapp-senders

---

## 🔧 Paso 3: Actualizar Variables de Entorno

Una vez aprobado, actualiza tu archivo `.env.local`:

```bash
# Credenciales de Twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here

# 🔄 ACTUALIZAR ESTOS:
# Reemplazar con tu nuevo número de WhatsApp Business aprobado
TWILIO_WHATSAPP_FROM=whatsapp:+51XXXXXXXXX  # Tu nuevo número

# Número de SMS (puede ser el mismo o diferente)
TWILIO_PHONE_NUMBER=+51XXXXXXXXX
```

---

## 📋 Paso 4: Configurar Templates de WhatsApp (Opcional)

Con WhatsApp Business, puedes crear plantillas pre-aprobadas:

1. **Ir a Content Templates:**
   - https://console.twilio.com/us1/develop/sms/content-editor/templates

2. **Crear plantilla:**
   - Click en "Create Template"
   - Llenar formulario (similar a como lo haces en el CRM)
   - Enviar para aprobación de WhatsApp

3. **Usar plantillas aprobadas:**
   - Las plantillas aprobadas pueden enviarse a cualquier usuario
   - Sin plantilla aprobada, solo puedes enviar dentro de la ventana de 24 horas

---

## 🌐 Paso 5: Configurar Webhook (Opcional)

Para recibir respuestas de clientes:

1. **Ir a WhatsApp Senders:**
   - https://console.twilio.com/us1/develop/sms/senders/whatsapp-senders

2. **Configurar webhook:**
   - Seleccionar tu número de WhatsApp
   - En "Webhook URL": `https://crm.amersursac.com/api/twilio/webhook`
   - Método: POST
   - Guardar

---

## ✅ Verificar Configuración

Después de completar los pasos:

```bash
# Reiniciar el servidor de desarrollo
npm run dev
```

Probar envío:
1. Ir a Marketing → Campañas
2. Crear nueva campaña
3. Enviar a cualquier número (sin necesidad de verificación previa)

---

## 📊 Diferencias: Sandbox vs Producción

| Característica | Sandbox (Gratis) | Producción (Pago) |
|---------------|------------------|-------------------|
| **Destinatarios** | Solo números verificados en sandbox | Cualquier número válido |
| **Límite de mensajes** | ~5 por día | Según tu plan (miles/día) |
| **Plantillas** | Plantillas de prueba | Plantillas personalizadas |
| **Número de WhatsApp** | `whatsapp:+14155238886` (Twilio) | Tu propio número |
| **Confianza del cliente** | Baja (número extraño) | Alta (tu número de negocio) |
| **Display Name** | "Twilio Sandbox" | Tu nombre de negocio |
| **Verificación previa** | Sí (join código) | No |

---

## 💰 Costos Aproximados

- **Número de WhatsApp:** ~$1.50 USD/mes (varía por país)
- **Mensajes salientes:** ~$0.005 - $0.01 USD por mensaje
- **Mensajes entrantes:** Gratis
- **Plantillas aprobadas:** Sin costo adicional

---

## 🆘 Solución de Problemas

### Error: "Not a valid WhatsApp number"
**Causa:** El número aún no está aprobado para WhatsApp
**Solución:** Esperar aprobación de Twilio (1-3 días)

### Error: "Template not found"
**Causa:** Intentando usar plantilla que no existe
**Solución:** Usar mensajes de sesión o crear plantillas en Twilio Console

### Mensaje no llega
**Causa:** Fuera de ventana de 24 horas y sin plantilla aprobada
**Solución:** Usar plantillas pre-aprobadas para mensajes iniciales

---

## 📞 Soporte

- **Twilio Console:** https://console.twilio.com/
- **Documentación:** https://www.twilio.com/docs/whatsapp
- **Soporte:** https://support.twilio.com/
- **Status:** https://status.twilio.com/

---

## ✨ Ventajas de WhatsApp Business

1. **Sin restricciones:** Envía a cualquier número válido
2. **Profesional:** Tu propio número de negocio
3. **Escalable:** Miles de mensajes por día
4. **Confiable:** Display name verificado
5. **Analítica:** Métricas completas de entrega y lectura

---

**Última actualización:** 3 de Noviembre de 2025
**Estado:** Guía de activación de WhatsApp Business en Twilio
