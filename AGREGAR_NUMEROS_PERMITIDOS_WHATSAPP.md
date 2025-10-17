# Cómo Agregar Números Permitidos en WhatsApp (Modo Desarrollo)

## ⚠️ Problema

Error: **"Recipient phone number not in allowed list"** (Número de teléfono del destinatario no incluido en la lista de autorizados)

**Código de error**: `131030`

## ¿Por qué pasa esto?

Tu aplicación de WhatsApp Business está en **modo de desarrollo/prueba**. Meta restringe el envío de mensajes SOLO a números que hayas registrado previamente como "números de prueba permitidos".

Esto es una medida de seguridad para evitar spam mientras desarrollas tu aplicación.

---

## Solución 1: Agregar Números a la Lista Permitida (Para Pruebas)

### Paso 1: Ve a Meta for Developers

1. Abre: https://developers.facebook.com/apps
2. Selecciona tu aplicación de WhatsApp
3. En el menú lateral, ve a **WhatsApp** → **API Setup**

### Paso 2: Agregar números de prueba

1. Busca la sección **"To"** (Destinatario) o **"Phone numbers"**
2. Click en **"Manage phone number list"** o **"Add phone number"**
3. Ingresa el número en formato internacional (SIN el `+`):
   - ✅ Correcto: `5493517734676`
   - ❌ Incorrecto: `+5493517734676`
   - ❌ Incorrecto: `3517734676`
4. Click en **"Add"** o **"Verify"**
5. **Importante**: El número recibirá un código de verificación por WhatsApp
6. Ingresa el código de verificación en Meta
7. El número ahora está autorizado ✅

### Paso 3: Repetir para cada número

Debes agregar CADA número al que quieras enviar mensajes:
- `5493517734676` ✅
- `51965416388` ← Agregar este también
- Cualquier otro número que uses para pruebas

### Límite en Modo Desarrollo

- Máximo **5 números** permitidos en modo desarrollo
- Si necesitas más, debes pasar a producción

---

## Solución 2: Pasar la Aplicación a Producción (Enviar a Cualquier Número)

Para enviar mensajes a CUALQUIER número sin restricciones, necesitas que Meta apruebe tu aplicación.

### Requisitos previos

Antes de enviar a revisión:
1. ✅ Plantillas aprobadas (ya las tienes)
2. ✅ Cuenta de WhatsApp Business verificada
3. ✅ Cumplir con las políticas de WhatsApp
4. ✅ Tener un caso de uso legítimo

### Paso 1: Configurar Business Verification

1. Ve a **Meta Business Settings**: https://business.facebook.com/settings
2. En el menú lateral, ve a **Security Center** → **Business verification**
3. Click en **"Start verification"**
4. Necesitarás:
   - Documento de identidad oficial (DNI/Pasaporte)
   - Comprobante de domicilio fiscal
   - Documentos de la empresa (si aplica)
5. Sube los documentos y espera la aprobación (1-3 días hábiles)

### Paso 2: Solicitar Revisión de la App

1. En tu app de WhatsApp, ve a **App Review** → **Permissions and Features**
2. Busca **"whatsapp_business_messaging"**
3. Click en **"Request"**
4. Completa el formulario:
   - **Use case**: Describe cómo usarás WhatsApp (ej: "Notificaciones de proyectos inmobiliarios a clientes")
   - **Screenshots**: Capturas de pantalla del CRM enviando mensajes
   - **Video**: Opcional pero recomendado
   - **Privacy Policy URL**: URL de tu política de privacidad
   - **Terms of Service URL**: URL de términos y condiciones

### Paso 3: Esperar Aprobación

- Meta revisará tu solicitud (3-7 días hábiles)
- Si aprueban: Podrás enviar a cualquier número ✅
- Si rechazan: Te dirán qué cambiar

### Paso 4: Cambiar a Modo Producción

Una vez aprobado:
1. En **WhatsApp** → **API Setup**
2. Cambia de **"Development mode"** a **"Production mode"**
3. Ahora puedes enviar mensajes a CUALQUIER número sin restricciones

---

## Mientras Tanto: Cómo Probar con Números Limitados

### Opción A: Agregar tus números de prueba

Agrega los 5 números con los que vas a probar:
1. Tu número personal
2. Número de otro miembro del equipo
3. Números de prueba adicionales

### Opción B: Usar números virtuales

Si necesitas más números para pruebas:
- Twilio (números virtuales)
- Google Voice (solo USA)
- Números temporales (no recomendado, pueden ser bloqueados)

### Opción C: Simular envíos en desarrollo

Puedes modificar temporalmente el código para NO enviar realmente, solo simular:

```typescript
// En src/app/api/whatsapp/campanas/ejecutar/route.ts
// Línea ~150, TEMPORAL SOLO PARA DESARROLLO:

if (process.env.NODE_ENV === 'development') {
  console.log(`[SIMULATED] Enviando a ${telefono}:`, {
    template: template.nombre,
    variables
  });

  // Simular respuesta exitosa
  waResponse = {
    messages: [{ id: `simulated_${Date.now()}` }]
  };
} else {
  // Envío real
  waResponse = await whatsappClient.enviarMensajePlantilla(
    telefono,
    template.nombre,
    template.idioma,
    components.length > 0 ? components : undefined
  );
}
```

---

## Verificar qué números están permitidos

### En Meta for Developers:

1. Ve a **WhatsApp** → **API Setup**
2. En la sección **"Phone numbers"** verás la lista de números permitidos
3. Puedes agregar/eliminar números desde ahí

### Formato correcto de números:

- ✅ Argentina: `5493517734676` (código país 54 + código área sin 0 + número)
- ✅ Perú: `51965416388` (código país 51 + número)
- ✅ Chile: `56912345678` (código país 56 + número)
- ✅ Colombia: `573001234567` (código país 57 + número)

**Importante**: SIN el `+` al inicio

---

## Resumen de Estados

### Modo Desarrollo (Estado Actual)
- ⚠️ Solo 5 números permitidos
- ⚠️ Debes verificar cada número
- ✅ Gratis
- ✅ Ideal para pruebas

### Modo Producción (Requiere Aprobación)
- ✅ Enviar a cualquier número
- ✅ Sin límite de destinatarios
- ✅ Métricas completas
- ⚠️ Requiere Business Verification
- ⚠️ Proceso de revisión 3-7 días

---

## Próximos Pasos

### Para pruebas inmediatas:
1. ✅ Agrega los 2 números que usaste: `5493517734676` y `51965416388`
2. ✅ Verifica ambos números con el código de WhatsApp
3. ✅ Vuelve a crear la campaña
4. ✅ Los mensajes se enviarán correctamente

### Para producción (cuando estés listo):
1. Completa Business Verification
2. Solicita App Review para `whatsapp_business_messaging`
3. Espera aprobación de Meta
4. Cambia a modo Producción
5. Envía a cualquier número sin restricciones

---

## Troubleshooting

### "Phone number not verified"
- El número no completó el proceso de verificación
- Revisa WhatsApp para ver si llegó el código

### "Maximum number of test phone numbers reached"
- Ya tienes 5 números registrados
- Elimina uno para agregar otro
- O pasa a modo producción

### "Invalid phone number format"
- Usa formato internacional sin el `+`
- Ejemplo correcto: `5493517734676`
- Ejemplo incorrecto: `+54 9 351 773 4676`

---

## Recursos Adicionales

- [WhatsApp Business Platform - Test Numbers](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started#test-numbers)
- [Business Verification](https://www.facebook.com/business/help/2058515294227817)
- [App Review Process](https://developers.facebook.com/docs/whatsapp/overview/app-review)
