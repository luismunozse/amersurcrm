# Checklist: Verificar Configuración de WhatsApp en Meta

## El problema persiste después de agregar los números

Si los números ya están agregados en Meta pero sigues recibiendo el error **"Recipient phone number not in allowed list"**, sigue este checklist paso por paso:

---

## ✅ Paso 1: Verificar el formato de los números en Meta

1. Ve a https://developers.facebook.com/apps
2. Selecciona tu app de WhatsApp
3. Ve a **WhatsApp** → **API Setup**
4. En la sección **"To"** o **"Phone numbers"**, verifica:

### ¿Cómo deben verse los números?

**FORMATO CORRECTO** (solo dígitos, SIN `+`):
- ✅ `5493517734676` (Argentina)
- ✅ `51965416388` (Perú)

**FORMATO INCORRECTO**:
- ❌ `+5493517734676` (con +)
- ❌ `+54 9 351 773 4676` (con espacios)
- ❌ `93517734676` (sin código de país)

### ¿Los números están verificados?

- Cada número debe mostrar un ✅ verde o "Verified"
- Si dice "Pending" o no tiene check, el número NO está activo aún
- Debes verificar con el código de 6 dígitos que llegó por WhatsApp

---

## ✅ Paso 2: Verificar que los números coincidan EXACTAMENTE

Los números que estás intentando enviar **DEBEN ser EXACTAMENTE iguales** a los registrados en Meta.

### Verifica en los logs del servidor

Después de actualizar el código, ahora verás logs como este en tu servidor:

```
[CAMPAÑA xxx] Destinatarios normalizados: [ '5493517734676', '51965416388' ]
```

### Compara con Meta:

1. Copia el número del log: `5493517734676`
2. Ve a Meta Developer Console
3. Busca ese EXACTO número en tu lista de números permitidos
4. Debe ser **idéntico, carácter por carácter**

### Si los números NO coinciden:

**Opción A**: Edita los números en Meta para que coincidan con los logs
**Opción B**: Edita los números en tu CRM para que coincidan con Meta

---

## ✅ Paso 3: Verificar el Access Token

Un token inválido también puede dar este error en algunos casos.

### Verifica que el token es válido:

```bash
curl -X GET "https://graph.facebook.com/v21.0/debug_token?input_token=TU_ACCESS_TOKEN&access_token=TU_ACCESS_TOKEN"
```

Deberías ver:
```json
{
  "data": {
    "is_valid": true,
    "app_id": "...",
    "user_id": "..."
  }
}
```

Si `is_valid: false`, necesitas renovar el token (ver [RENOVAR_ACCESS_TOKEN_WHATSAPP.md](RENOVAR_ACCESS_TOKEN_WHATSAPP.md))

---

## ✅ Paso 4: Verificar que la plantilla está aprobada

### En Meta for Developers:

1. Ve a **WhatsApp** → **Message Templates**
2. Busca la plantilla que estás usando (ej: "bienvenida_cliente")
3. Verifica que el estado sea **"APPROVED"** (verde)

### Estados posibles:

- ✅ **APPROVED**: La plantilla está lista para usar
- ⏳ **PENDING**: Aún está en revisión (no puedes usarla)
- ❌ **REJECTED**: Fue rechazada (no puedes usarla)

### Verifica el nombre exacto:

En los logs verás:
```
[CAMPAÑA xxx] Plantilla: nombre_plantilla (es)
```

El `nombre_plantilla` debe coincidir EXACTAMENTE con el nombre en Meta (case-sensitive).

---

## ✅ Paso 5: Verificar Phone Number ID

El `phone_number_id` debe ser el correcto.

### Cómo obtenerlo:

1. En **WhatsApp** → **API Setup**
2. Busca la sección **"Phone Number ID"**
3. Copia el ID (ej: `123456789012345`)

### Verifica en tu base de datos:

```sql
SELECT phone_number_id, substring(access_token, 1, 20) || '...' as token_preview
FROM crm.marketing_channel_credential
WHERE canal_tipo = 'whatsapp' AND activo = true;
```

El `phone_number_id` debe coincidir EXACTAMENTE con el de Meta.

---

## ✅ Paso 6: Revisar los logs detallados

Con la actualización reciente, ahora verás logs completos al intentar enviar:

```
[CAMPAÑA xxx] Destinatarios normalizados: [ '5493517734676', '51965416388' ]
[CAMPAÑA xxx] Plantilla: bienvenida_cliente (es)
[CAMPAÑA xxx] Variables: { '1': 'Juan', '2': 'Proyecto ABC' }
[CAMPAÑA xxx] Enviando mensaje a: 5493517734676
```

### Si el envío falla:

```
[CAMPAÑA xxx] ❌ Error enviando mensaje a 5493517734676: Error: WhatsApp API Error: {...}
```

### Analiza el error:

**Error 131030**: Número no permitido
- Ve a Meta y asegúrate que `5493517734676` esté en la lista

**Error 190**: Token inválido
- Renueva el Access Token

**Error 100**: Plantilla no encontrada
- Verifica el nombre de la plantilla en Meta

---

## ✅ Paso 7: Prueba con un solo número primero

En lugar de enviar a múltiples números, prueba con UNO solo:

1. Crea una nueva campaña
2. Selecciona **"Lista Manual"**
3. Ingresa UN SOLO número (el tuyo, que sabes que está verificado)
4. Envía

Si funciona con uno pero no con otros:
- Los otros números no están agregados/verificados en Meta
- Hay un problema de formato en esos números específicos

---

## ✅ Paso 8: Modo de la aplicación

### Verifica que estás en el modo correcto:

1. En tu app de WhatsApp, busca en la parte superior
2. Verás **"Development Mode"** o **"Production Mode"**

### Si estás en Development Mode:
- Solo puedes enviar a los 5 números registrados
- Los números DEBEN estar verificados

### Si estás en Production Mode:
- Puedes enviar a cualquier número
- No necesitas registrarlos previamente
- Pero la app debe estar aprobada por Meta

---

## 🔍 Ejemplo de verificación completa

### Paso a paso con un ejemplo real:

**Número que quieres usar**: `+54 9 351 773 4676`

1. **Normaliza el número** (el código ya lo hace):
   - Resultado: `5493517734676`

2. **Ve a Meta** → WhatsApp → API Setup → Phone numbers

3. **Busca ese número**: ¿Ves `5493517734676`?
   - ✅ SÍ → Verifica que tenga el check verde
   - ❌ NO → Agrégalo ahora

4. **Agrega el número en Meta**:
   - Click en "Add phone number"
   - Ingresa: `5493517734676` (sin `+`, sin espacios)
   - Verificar con el código de WhatsApp

5. **Vuelve a intentar** desde el CRM

6. **Revisa los logs** del servidor:
   ```
   [CAMPAÑA xxx] ✅ Mensaje enviado exitosamente a 5493517734676
   ```

---

## 📋 Checklist Final

Antes de intentar enviar, confirma:

- [ ] Los números están en formato correcto: solo dígitos, sin `+`
- [ ] Los números están agregados en Meta Developer Console
- [ ] Los números tienen el check ✅ verde (verificados)
- [ ] Los números en Meta coinciden EXACTAMENTE con los logs
- [ ] El Access Token es válido (no expirado)
- [ ] La plantilla está en estado APPROVED
- [ ] El phone_number_id es correcto
- [ ] Estás en Development Mode con máximo 5 números, o en Production Mode
- [ ] Has revisado los logs del servidor después de intentar enviar

---

## 🆘 Si nada funciona

### Opción 1: Prueba directa con CURL

Prueba enviar directamente a la API de WhatsApp para aislar el problema:

```bash
curl -X POST "https://graph.facebook.com/v21.0/TU_PHONE_NUMBER_ID/messages" \
  -H "Authorization: Bearer TU_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "5493517734676",
    "type": "template",
    "template": {
      "name": "hello_world",
      "language": {
        "code": "en_US"
      }
    }
  }'
```

**Si funciona con CURL pero no con el CRM**:
- Problema en el código del CRM
- Revisa los logs detallados

**Si NO funciona con CURL**:
- Problema en la configuración de Meta
- Revisa Access Token, Phone Number ID, números permitidos

### Opción 2: Revisa el Meta Business Manager

A veces los permisos están en Meta Business Manager, no en Developer Console:

1. Ve a https://business.facebook.com
2. **Business Settings** → **WhatsApp Accounts**
3. Selecciona tu cuenta de WhatsApp
4. Revisa **Phone Numbers** y **Message Templates**

### Opción 3: Contacta a Meta Support

Si todo está correcto y sigue sin funcionar:
- Soporte de Meta: https://business.facebook.com/direct-support
- WhatsApp Business Help Center: https://www.facebook.com/business/help/whatsapp

---

## 🎯 Próximos pasos

Una vez que funcione:

1. ✅ Los mensajes se enviarán exitosamente
2. ✅ Verás `[CAMPAÑA xxx] ✅ Mensaje enviado` en los logs
3. ✅ El destinatario recibirá el mensaje en WhatsApp
4. ✅ Se guardará en `marketing_mensaje` con estado `SENT`
5. ✅ Verás el contador actualizado en la campaña

Cuando estés listo para producción:
- Solicita Business Verification
- Solicita App Review
- Pasa a Production Mode
- Envía a cualquier número sin restricciones
