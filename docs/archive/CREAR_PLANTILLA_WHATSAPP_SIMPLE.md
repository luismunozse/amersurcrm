# 📝 Crear Plantilla de WhatsApp - Guía Rápida

## 🎯 Para enviar campañas de WhatsApp NECESITAS una plantilla aprobada por Meta

WhatsApp requiere que todas las conversaciones que tú inicies usen plantillas pre-aprobadas.

---

## 📍 PASO 1: Ir a Meta Business Suite

1. Abre: [https://business.facebook.com](https://business.facebook.com)
2. Inicia sesión con tu cuenta
3. Selecciona tu cuenta de WhatsApp Business

---

## 📍 PASO 2: Crear Plantilla

1. En el menú lateral, busca **"Plantillas de mensajes"**
2. Click en **"Crear plantilla"**

---

## 📍 PASO 3: Configurar Plantilla Básica

### **Información básica:**
- **Categoría**: `Marketing`
- **Nombre**: `bienvenida_inmobiliaria` (sin espacios, minúsculas)
- **Idiomas**: `Español (es)`

### **Contenido:**

**Encabezado** (opcional - déjalo vacío por ahora):
```
[Deja vacío]
```

**Cuerpo** (obligatorio):
```
Hola {{1}}, bienvenido a AMERSUR Inmobiliaria.

Tenemos excelentes propiedades disponibles en tu zona de interés.

¿Te gustaría recibir más información?
```

**Pie de página** (opcional):
```
AMERSUR - Tu hogar, nuestra pasión
```

**Botones** (opcional - por ahora ninguno):
```
[Deja vacío]
```

### **Variables:**
- `{{1}}` = Nombre del cliente (lo completarás al enviar la campaña)

---

## 📍 PASO 4: Enviar para Aprobación

1. Click en **"Enviar"**
2. Meta revisará tu plantilla
3. **Tiempo**: 1-24 horas (normalmente menos de 2 horas)
4. Recibirás email cuando esté aprobada

---

## ⏳ MIENTRAS ESPERAS: Agregar Número de Prueba

Mientras tu plantilla es aprobada, agrega tu número personal para probar:

1. Ve a [Meta Developers](https://developers.facebook.com)
2. Selecciona tu app: **AMERSUR Wsp**
3. Click en **"WhatsApp"** → **"Primeros pasos"**
4. Busca **"Enviar y recibir mensajes"**
5. Click en **"Administrar números de teléfono"**
6. Click en **"Agregar número de teléfono"**
7. Ingresa tu WhatsApp: `+51987654321` (formato internacional)
8. WhatsApp te enviará un código de verificación
9. Ingresa el código
10. ✅ ¡Listo! Ahora puedes recibir mensajes en ese número

⚠️ **Importante**: Solo puedes agregar hasta 5 números en modo desarrollo.

---

## ✅ CHECKLIST

- [ ] Plantilla creada en Meta Business Suite
- [ ] Plantilla enviada para aprobación
- [ ] Al menos 1 número de prueba agregado en Meta Developers
- [ ] Credenciales guardadas en Supabase (Phone Number ID + Access Token)

---

## 🎉 CUANDO LA PLANTILLA ESTÉ APROBADA

Te enviaré instrucciones para:
1. Agregar la plantilla al CRM
2. Crear tu primera campaña
3. Enviar el mensaje de prueba

---

## 📌 EJEMPLO DE PLANTILLA ALTERNATIVA (Más Simple)

Si la primera es rechazada, prueba con esta súper simple:

**Nombre**: `mensaje_simple`

**Cuerpo**:
```
Hola, soy de AMERSUR Inmobiliaria.

¿Estás buscando una propiedad?
```

Sin variables, sin encabezado, sin botones. Súper simple, se aprueba rápido.

---

**Siguiente paso**: Avísame cuando tengas la plantilla aprobada y los 3 datos (App ID, Phone Number ID, Access Token)
