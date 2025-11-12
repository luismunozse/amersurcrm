# Guía: Crear una Plantilla con Twilio

## Pasos para Crear una Plantilla

### PASO 1: Ir a la Página de Marketing
1. Abre el navegador en: `http://localhost:3000`
2. Inicia sesión con tu usuario admin
3. Ve a: **Admin** → **Marketing con Twilio**

### PASO 2: Hacer Click en "Nueva Plantilla"
En la sección de "Plantillas de Mensajes", haz click en el botón **"Nueva Plantilla"** (botón azul con ícono de +)

### PASO 3: Llenar el Formulario

#### Ejemplo de Plantilla de Bienvenida:

**Nombre de la Plantilla:** `Bienvenida AMERSUR`

**Código Interno (opcional):** `bienvenida_amersur`
- Este código es solo para identificar fácilmente la plantilla
- Con Twilio NO es necesario (a diferencia de Meta)

**Categoría:** Seleccionar `MARKETING`
- Opciones: MARKETING, UTILITY, AUTHENTICATION

**Estado:** Seleccionar `Activa (lista para usar)`
- **Activa** = APPROVED (se puede usar inmediatamente)
- **Borrador** = DRAFT (guardar sin activar)
- Con Twilio NO necesitas aprobación previa!

**Idioma:** `es` (español)

**Cuerpo del Mensaje:**
```
Hola {{nombre}}, bienvenido a AMERSUR Inmobiliaria!

Tu vendedor {{vendedor}} te atenderá personalmente.

Estamos ubicados en {{direccion}}.

¿En qué podemos ayudarte hoy?
```

**Variables (se extraen automáticamente):**
El sistema detectará: `nombre`, `vendedor`, `direccion`

**Botones (opcional):**
Puedes agregar botones como:
- **Tipo:** QUICK_REPLY
- **Texto:** "Ver proyectos disponibles"

### PASO 4: Guardar la Plantilla
Haz click en **"Crear Plantilla"**

## Diferencias con Meta WhatsApp Business

| Aspecto | Meta Business | Twilio |
|---------|---------------|--------|
| Aprobación | 7-15 días | Inmediata |
| Variables | `{{1}}`, `{{2}}` | `{{nombre}}`, `{{vendedor}}` |
| Estados | APPROVED, PENDING, REJECTED, DRAFT | APPROVED, DRAFT |
| Código requerido | Sí (obligatorio) | No (opcional) |
| Costo por mensaje | ~$0.005 USD | ~$0.004 USD |

## Ejemplo 2: Plantilla de Seguimiento

**Nombre:** `Seguimiento de Interesado`

**Cuerpo:**
```
Hola {{nombre}},

Gracias por tu interés en nuestro proyecto {{proyecto}}!

Te compartimos más información:
- Precio: {{precio}}
- Ubicación: {{ubicacion}}
- Área: {{area}}

{{vendedor}} te contactará pronto para coordinar una visita.
```

**Variables:** `nombre`, `proyecto`, `precio`, `ubicacion`, `area`, `vendedor`

## Ejemplo 3: Plantilla de Recordatorio

**Nombre:** `Recordatorio de Cita`

**Cuerpo:**
```
Hola {{nombre}},

Te recordamos tu cita con {{vendedor}} para ver el proyecto {{proyecto}}.

Fecha: {{fecha}}
Hora: {{hora}}
Lugar: {{direccion}}

¡Te esperamos!
```

**Variables:** `nombre`, `vendedor`, `proyecto`, `fecha`, `hora`, `direccion`

## Probar la Plantilla

Después de crearla, puedes:

1. **Crear una campaña** usando esa plantilla
2. **Enviar un mensaje de prueba** desde la página de pruebas Twilio
3. **Ver la plantilla** en la lista de plantillas (aparecerá con badge verde "APPROVED")

## Notas Importantes

- Con Twilio puedes usar la plantilla INMEDIATAMENTE después de crearla
- No necesitas esperar aprobación como con Meta
- Las variables son más flexibles y legibles
- Puedes editar las plantillas cuando quieras
