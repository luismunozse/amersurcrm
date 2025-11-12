# 📱 Integración de Twilio - WhatsApp y SMS

Guía completa para configurar y usar Twilio en el CRM AMERSUR.

---

## 🎯 ¿Qué hace esta integración?

Permite enviar:
- ✅ **WhatsApp** - Mensajes de WhatsApp a tus clientes
- ✅ **SMS** - Mensajes de texto tradicionales
- ✅ **Campañas masivas** - Enviar a múltiples clientes a la vez
- ✅ **Conversaciones** - Recibir y responder mensajes

---

## 🚀 Configuración Inicial

### 1. Crear cuenta en Twilio

1. Ve a [twilio.com](https://www.twilio.com/)
2. Crea una cuenta (puedes empezar con la versión de prueba)
3. Ve al Dashboard de Twilio

### 2. Obtener credenciales

En tu Dashboard de Twilio, busca:

- **Account SID** - Lo encuentras en la página principal
- **Auth Token** - Está justo debajo del Account SID (haz click en "Show" para verlo)
- **Phone Number** - Compra un número de teléfono Twilio (para SMS)
- **WhatsApp Sandbox Number** - Para pruebas, usa el sandbox de WhatsApp

### 3. Configurar variables de entorno

Edita tu archivo `.env.local` y agrega:

```bash
# Twilio API (WhatsApp + SMS Marketing)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+15551234567
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

**Importante:**
- `TWILIO_ACCOUNT_SID` - Tu Account SID de Twilio
- `TWILIO_AUTH_TOKEN` - Tu Auth Token (¡mantenlo secreto!)
- `TWILIO_PHONE_NUMBER` - Número de teléfono para SMS
- `TWILIO_WHATSAPP_FROM` - Número de WhatsApp (sandbox o número aprobado)

### 4. Configurar WhatsApp Business (Producción)

Para usar WhatsApp en producción (no sandbox):

1. Ve a Twilio Console → Messaging → Try it out → WhatsApp
2. Solicita acceso a WhatsApp Business API
3. Completa el proceso de verificación de Facebook
4. Una vez aprobado, actualiza `TWILIO_WHATSAPP_FROM` con tu número aprobado

### 5. Configurar Webhook

Para recibir respuestas de clientes:

1. Ve a Twilio Console → Phone Numbers → Manage → Active Numbers
2. Selecciona tu número
3. En "Messaging", configura:
   - **A MESSAGE COMES IN:** `https://crm.amersursac.com/api/twilio/webhook`
   - **HTTP POST**

---

## 💻 Cómo Usar

### Enviar WhatsApp individual

```typescript
// Desde tu código frontend
const respuesta = await fetch('/api/twilio/send-whatsapp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    telefono: '+51987654321',
    contenido_texto: '¡Hola! Te escribimos desde AMERSUR',
    conversacion_id: 'uuid-de-conversacion', // Opcional
  })
});

const resultado = await respuesta.json();
console.log(resultado.tw_message_sid); // ID del mensaje en Twilio
```

### Enviar SMS individual

```typescript
const respuesta = await fetch('/api/twilio/send-sms', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    telefono: '+51987654321',
    contenido_texto: 'Recordatorio: Tu cita es mañana a las 3pm',
  })
});
```

### Enviar WhatsApp masivo

```typescript
const respuesta = await fetch('/api/twilio/send-whatsapp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    masivo: true,
    telefonos: ['+51987654321', '+51912345678', '+51998765432'],
    contenido_texto: 'Mensaje para todos los clientes',
    campana_id: 'uuid-de-campana', // Opcional
  })
});

const resultado = await respuesta.json();
console.log(`Enviados: ${resultado.exitosos}/${resultado.total}`);
```

### Ejecutar una campaña completa

```typescript
const respuesta = await fetch('/api/twilio/campanas/ejecutar', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    campana_id: 'uuid-de-tu-campana',
    canal: 'whatsapp', // o 'sms'
    destinatarios_config: {
      tipo: 'todos', // o 'proyecto', 'audiencia', 'manual'
    }
  })
});

const resultado = await respuesta.json();
console.log(`Campaña completada: ${resultado.enviados}/${resultado.total}`);
```

---

## 📊 Estructura de la Base de Datos

Los mensajes se guardan en `crm.marketing_mensaje` con:

```sql
{
  conversacion_id: uuid,
  campana_id: uuid,
  direccion: 'OUT' | 'IN',
  tipo: 'SESSION' | 'SMS',
  contenido_texto: string,
  tw_message_sid: string, -- ID de Twilio
  estado: 'QUEUED' | 'SENT' | 'DELIVERED' | 'FAILED' | 'READ',
  sent_at: timestamp,
  delivered_at: timestamp,
  read_at: timestamp,
  failed_at: timestamp,
  error_code: string,
  error_message: string
}
```

---

## 🔄 Webhooks y Estados

Twilio envía webhooks cuando cambia el estado de un mensaje:

1. **queued** - En cola para envío
2. **sent** - Enviado a WhatsApp/operador
3. **delivered** - Entregado al destinatario
4. **read** - Leído por el destinatario (solo WhatsApp)
5. **failed** - Falló el envío
6. **undelivered** - No se pudo entregar

El webhook en `/api/twilio/webhook` actualiza automáticamente estos estados en la base de datos.

---

## 📝 Ejemplos de Uso

### Ejemplo 1: Enviar recordatorio a un cliente

```typescript
// En tu página de agenda
async function enviarRecordatorio(clienteId: string, mensaje: string) {
  // Obtener teléfono del cliente
  const { data: cliente } = await supabase
    .from('cliente')
    .select('telefono_whatsapp, telefono')
    .eq('id', clienteId)
    .single();

  const telefono = cliente.telefono_whatsapp || cliente.telefono;

  // Enviar WhatsApp
  const respuesta = await fetch('/api/twilio/send-whatsapp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      telefono: telefono,
      contenido_texto: mensaje,
    })
  });

  if (respuesta.ok) {
    alert('✅ Recordatorio enviado');
  } else {
    alert('❌ Error al enviar');
  }
}
```

### Ejemplo 2: Campaña de lanzamiento

```typescript
// En el módulo de marketing
async function crearYEjecutarCampana() {
  // 1. Crear plantilla
  const { data: plantilla } = await supabase
    .from('marketing_template')
    .insert({
      nombre: 'Lanzamiento Proyecto X',
      contenido: '¡Hola {{nombre}}! Te invitamos al lanzamiento de nuestro nuevo proyecto. Info: {{telefono}}'
    })
    .select()
    .single();

  // 2. Crear campaña
  const { data: campana } = await supabase
    .from('marketing_campana')
    .insert({
      nombre: 'Lanzamiento Noviembre',
      template_id: plantilla.id,
      variables_valores: {
        telefono: '(01) 234-5678'
      },
      max_envios_por_segundo: 10
    })
    .select()
    .single();

  // 3. Ejecutar campaña
  const respuesta = await fetch('/api/twilio/campanas/ejecutar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      campana_id: campana.id,
      canal: 'whatsapp',
      destinatarios_config: {
        tipo: 'todos'
      }
    })
  });

  const resultado = await respuesta.json();
  alert(`Campaña completada: ${resultado.enviados} enviados`);
}
```

---

## 🐛 Solución de Problemas

### Error: "Credenciales de Twilio no configuradas"

**Solución:** Verifica que todas las variables de entorno estén configuradas en `.env.local`:
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`
- `TWILIO_WHATSAPP_FROM`

Reinicia el servidor después de cambiar las variables.

### Error: "Error al enviar WhatsApp: To number is not a valid WhatsApp number"

**Solución:**
- Asegúrate que el número incluya el código de país: `+51987654321`
- Si usas WhatsApp Sandbox, el destinatario debe unirse primero enviando un mensaje al sandbox
- Verifica que el número tenga WhatsApp activo

### Error: "Error al enviar SMS: The from phone number is not verified"

**Solución:**
- En modo Trial, solo puedes enviar SMS a números verificados
- Ve a Twilio Console → Phone Numbers → Verified Caller IDs
- Agrega y verifica el número de teléfono del destinatario
- O actualiza a una cuenta de pago

### Los webhooks no funcionan

**Solución:**
1. Verifica que la URL del webhook esté correctamente configurada en Twilio
2. Asegúrate que tu sitio sea accesible desde internet (no localhost)
3. Revisa los logs en Twilio Console → Monitor → Logs → Errors

---

## 💰 Costos de Twilio

### Precios aproximados (USA - puede variar por país):

**WhatsApp Business:**
- Mensajes de Marketing: ~$0.0042 USD por mensaje
- Mensajes de Servicio: ~$0.005 USD por mensaje
- Mensajes entrantes: Gratis

**SMS:**
- Perú: ~$0.051 USD por mensaje
- USA: ~$0.0075 USD por mensaje
- Mensajes entrantes: ~$0.0075 USD

**Números de teléfono:**
- Número local: ~$1 USD/mes
- Número toll-free: ~$2 USD/mes

**Recomendación:** Comienza con la versión Trial ($15.50 USD de crédito gratis) para probar.

---

## 🔐 Seguridad

### Variables de entorno

- **NUNCA** subas el archivo `.env.local` a GitHub
- El `.gitignore` ya está configurado para ignorarlo
- Usa `.env.example` como plantilla

### Validación de webhooks

El endpoint `/api/twilio/webhook` valida la firma de Twilio automáticamente usando `TWILIO_AUTH_TOKEN`.

---

## 📚 Recursos Adicionales

- [Documentación Twilio](https://www.twilio.com/docs)
- [WhatsApp Business API](https://www.twilio.com/docs/whatsapp)
- [SMS API](https://www.twilio.com/docs/sms)
- [Webhooks](https://www.twilio.com/docs/usage/webhooks)
- [Precios](https://www.twilio.com/pricing)

---

## ✅ Checklist de Configuración

- [ ] Crear cuenta en Twilio
- [ ] Obtener Account SID y Auth Token
- [ ] Comprar número de teléfono (para SMS)
- [ ] Configurar WhatsApp (sandbox o Business)
- [ ] Agregar variables de entorno en `.env.local`
- [ ] Reiniciar servidor Next.js
- [ ] Configurar webhook en Twilio Console
- [ ] Probar envío de WhatsApp
- [ ] Probar envío de SMS
- [ ] Verificar que webhooks funcionen

---

## 🎉 ¡Listo!

Ya puedes enviar WhatsApp y SMS desde tu CRM. Si tienes dudas, revisa la documentación de Twilio o contacta a soporte.

**Siguiente paso:** Integra el envío de mensajes en tu módulo de marketing y agenda.

---

*Última actualización: Noviembre 2025*
