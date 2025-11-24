# Guía de Publicación: AmersurChat en Chrome Web Store

## 📦 Requisitos Previos

### 1. Cuenta de Desarrollador Chrome
- **Costo**: $5 USD (pago único, vitalicio)
- **URL**: https://chrome.google.com/webstore/devconsole
- **Tiempo**: Registro instantáneo

### 2. Assets Visuales Requeridos

#### Iconos (Ya los tienes ✅)
- `icon16.png` - 16x16px ✅
- `icon48.png` - 48x48px ✅
- `icon128.png` - 128x128px ✅

#### Screenshots (Debes crear)
- **Mínimo**: 1 screenshot
- **Recomendado**: 3-5 screenshots
- **Tamaño**: 1280x800px o 640x400px
- **Formato**: PNG o JPG

**Screenshots sugeridos para AmersurChat:**
1. Sidebar con información de contacto
2. Plantillas de mensajes en acción
3. Cambio de estado de lead
4. Historial de interacciones
5. Login screen

#### Promotional Images (Opcionales pero recomendados)
- **Small tile**: 440x280px
- **Large tile**: 920x680px (opcional)
- **Marquee**: 1400x560px (opcional)

### 3. Información de la Extensión

Prepara estos textos:

**Nombre**:
```
AmersurChat - WhatsApp CRM Integration
```

**Descripción corta** (132 caracteres máx):
```
Gestiona leads directamente desde WhatsApp Web. Crea leads, actualiza estados y usa plantillas de mensajes.
```

**Descripción detallada**:
```
AmersurChat integra Amersur CRM con WhatsApp Web para que vendedores gestionen leads
de forma eficiente sin salir de WhatsApp.

CARACTERÍSTICAS:

🔍 Búsqueda Automática
- Detecta contactos automáticamente
- Busca en el CRM si ya existe
- Muestra información completa del cliente

📝 Gestión de Leads
- Crea leads con un click
- Asignación automática de vendedores
- Formularios pre-llenados

📊 Actualización de Estado
- Cambia estados directamente desde WhatsApp
- 6 estados disponibles: Por Contactar, Contactado, Interesado, Negociación, Cerrado, Perdido
- Agrega notas al cambiar estado

💬 Plantillas de Mensajes
- 8 plantillas predefinidas
- Categorías: Saludos, Consultas, Seguimiento, Cierre
- Variables dinámicas personalizables
- Copia con un click

📅 Historial de Interacciones
- Timeline completo de actividades
- Llamadas, emails, visitas, notas
- Fechas y usuarios registrados

🔐 Seguridad
- Login con credenciales del CRM
- Sesión persistente
- Datos encriptados

IDEAL PARA:
✓ Equipos de ventas inmobiliarias
✓ Agentes que usan WhatsApp para comunicarse
✓ Empresas que quieren centralizar leads

REQUISITOS:
- Cuenta en Amersur CRM
- WhatsApp Web activo

PRIVACIDAD:
Esta extensión solo funciona con el CRM de Amersur. No recopila ni comparte datos
con terceros. Todos los datos se almacenan en tu instancia privada del CRM.
```

**Categoría**:
```
Productivity
```

**Idioma**:
```
Español
```

---

## 🚀 Proceso de Publicación

### Opción A: Publicación Pública (Cualquiera puede instalar)

#### Paso 1: Crear el paquete ZIP

```bash
cd /home/luismunozse/Escritorio/amersurcrm/chrome-extension

# Crear ZIP solo del directorio dist/
cd dist
zip -r ../amersurchat-v1.1.0.zip .
cd ..

# Verificar contenido del ZIP
unzip -l amersurchat-v1.1.0.zip
```

**Contenido requerido del ZIP:**
```
amersurchat-v1.1.0.zip
├── manifest.json
├── background.js
├── content.js
├── sidebar.js
├── popup.js
├── index.js
├── index.css
├── sidebar.html
├── popup.html
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

#### Paso 2: Subir a Chrome Web Store

1. Ve a https://chrome.google.com/webstore/devconsole
2. Click en **"New Item"** (Nuevo elemento)
3. Acepta los términos de desarrollador
4. Click en **"Choose file"** y selecciona `amersurchat-v1.1.0.zip`
5. Click en **"Upload"**

#### Paso 3: Completar el Formulario

**Store Listing (Ficha de la tienda):**

1. **Product details**:
   - Name: `AmersurChat - WhatsApp CRM Integration`
   - Summary: (descripción corta de arriba)
   - Description: (descripción detallada de arriba)
   - Category: `Productivity`
   - Language: `Spanish`

2. **Graphic assets**:
   - **Icon**: Ya está en manifest.json ✅
   - **Screenshots**: Subir 3-5 capturas de pantalla (1280x800px)
   - **Promotional images**: Opcional

3. **Privacy practices**:
   - **Single purpose**:
     ```
     Integrates Amersur CRM with WhatsApp Web for lead management
     ```

   - **Permissions justification**:
     ```
     - storage: Save authentication and configuration
     - activeTab: Interact with WhatsApp Web to extract contact information
     - host_permissions (web.whatsapp.com): Required to inject sidebar
     - host_permissions (CRM URLs): API communication with CRM
     ```

   - **Data usage**:
     ```
     ☑ This extension does NOT collect user data
     ☑ This extension does NOT sell user data to third parties
     ☑ This extension does NOT use data for purposes unrelated to functionality
     ```

   - **Privacy policy URL**: (requerido)
     ```
     https://amersur.com/privacy-policy-amersurchat
     ```
     (Debes crear esta página)

4. **Distribution**:
   - **Visibility**:
     - `Public` (todos pueden verla)
     - `Unlisted` (solo con link directo)
     - `Private` (solo usuarios específicos)

   - **Regions**:
     ```
     Seleccionar: Perú, América Latina
     ```

#### Paso 4: Enviar para Revisión

1. Click en **"Submit for review"**
2. Revisión automática: ~30 minutos
3. Revisión manual (si es necesario): 1-3 días hábiles

**Estados posibles:**
- ✅ **Approved**: Publicada y disponible
- 🔄 **Pending review**: En revisión
- ❌ **Rejected**: Rechazada (te dirán el motivo)

---

### Opción B: Distribución Privada (Solo para tu empresa)

**Ventajas:**
- ✅ No requiere revisión de Google
- ✅ Instalación inmediata
- ✅ Control total sobre quién la usa
- ✅ No aparece en Chrome Web Store público

**Desventajas:**
- ❌ Requiere Google Workspace (antes G Suite)
- ❌ Costo: Desde $6/usuario/mes

#### Proceso:

1. **Admin Console** → **Devices** → **Chrome** → **Apps & Extensions**
2. Click en **"Add app or extension"**
3. Subir el ZIP de la extensión
4. Configurar a qué usuarios/grupos se les permite instalar
5. Los usuarios verán la extensión en su panel de Chrome

---

### Opción C: Distribución Manual (Desarrollo/Testing)

**Para probar antes de publicar:**

1. **Modo desarrollador** (actual):
   ```
   chrome://extensions/
   → Activar "Modo de desarrollador"
   → Cargar extensión sin empaquetar
   → Seleccionar carpeta dist/
   ```

2. **Empaquetar para distribución manual**:
   ```bash
   # Chrome creará un archivo .crx
   chrome://extensions/
   → Click en "Empaquetar extensión"
   → Seleccionar carpeta dist/
   → Se genera amersurchat.crx y amersurchat.pem
   ```

   **⚠️ Limitación**: Chrome bloqueará extensiones .crx que no vengan de Chrome Web Store

---

## 📸 Crear Screenshots

### Opción 1: Manual

1. Abre WhatsApp Web con la extensión cargada
2. Abre diferentes chats y funcionalidades
3. Toma capturas de pantalla (1280x800px)
4. Usa herramientas como:
   - Chrome DevTools → Device Toolbar
   - Snipping Tool / Captura de pantalla
   - GIMP / Photoshop para redimensionar

### Opción 2: Automatizada

```bash
# Usando Puppeteer para generar screenshots
npm install puppeteer

# Script para generar screenshots automáticamente
node scripts/generate-screenshots.js
```

### Screenshots sugeridos:

1. **Login screen**
   - Muestra el formulario de login
   - Destaca la seguridad

2. **Contacto nuevo**
   - Sidebar con "Crear Lead"
   - Plantillas de mensajes abiertas

3. **Cliente existente**
   - Info del cliente completa
   - Historial de interacciones
   - Cambio de estado

4. **Plantillas**
   - Categorías de plantillas
   - Filtros visibles

5. **Actualización de estado**
   - 6 estados mostrados
   - Nota agregada

---

## 📝 Privacy Policy (Requerida)

Debes crear una página de política de privacidad. Aquí un template:

```markdown
# Privacy Policy - AmersurChat

Last updated: November 23, 2025

## Data Collection

AmersurChat does NOT collect, store, or share any personal data with third parties.

## Data Processing

- Contact information from WhatsApp Web is processed locally
- Data is sent ONLY to your private Amersur CRM instance
- No data is stored on our servers
- No analytics or tracking is performed

## Permissions

- **storage**: Save login credentials securely in Chrome's encrypted storage
- **activeTab**: Read contact information from active WhatsApp Web tab
- **host_permissions**:
  - WhatsApp Web: Extract contact name and phone number
  - CRM URLs: Send data to YOUR private CRM instance

## Third Party Services

This extension communicates ONLY with:
- Your Amersur CRM instance (configured by you)
- WhatsApp Web (to extract contact info)

NO data is sent to any other third party.

## User Rights

- You can delete all stored data by uninstalling the extension
- You control what data is sent to your CRM
- No data is sold or shared

## Contact

For privacy concerns: [tu-email@amersur.com]
```

Sube esto a: `https://amersur.com/privacy-policy-amersurchat`

---

## ⏱️ Timeline Estimado

| Etapa | Tiempo |
|---|---|
| Crear screenshots | 30 minutos |
| Completar formulario | 30 minutos |
| Revisión automática | 30 minutos |
| Revisión manual | 1-3 días |
| **TOTAL** | **1-3 días** |

---

## 💡 Recomendaciones

### Antes de publicar:

1. ✅ Probar extensión en Chrome con múltiples usuarios
2. ✅ Verificar que todos los endpoints funcionen
3. ✅ Revisar que los iconos se vean bien
4. ✅ Preparar screenshots de calidad
5. ✅ Escribir descripciones claras y atractivas

### Después de publicar:

1. 📊 Monitorear reseñas y calificaciones
2. 🐛 Responder a reportes de bugs
3. 🔄 Publicar actualizaciones periódicas
4. 📈 Analizar estadísticas de uso (Chrome Web Store proporciona analytics)

---

## 🚨 Posibles Rechazos y Soluciones

### Rechazo común 1: Permisos excesivos
**Solución**: Justificar cada permiso en "Privacy practices"

### Rechazo común 2: Falta de privacy policy
**Solución**: Crear página y agregar URL

### Rechazo común 3: Funcionalidad no clara
**Solución**: Mejorar descripción y screenshots

### Rechazo común 4: Violación de políticas
**Solución**: Revisar https://developer.chrome.com/docs/webstore/program-policies/

---

## 📞 Soporte

**Chrome Web Store Support**:
- https://support.google.com/chrome_webstore/
- https://groups.google.com/a/chromium.org/g/chromium-extensions

**Documentación**:
- https://developer.chrome.com/docs/webstore/

---

## ✅ Checklist Final

Antes de enviar:

- [ ] Extensión probada y funcionando
- [ ] ZIP creado correctamente
- [ ] 3-5 screenshots de calidad
- [ ] Descripción completa en español
- [ ] Privacy policy publicada
- [ ] Iconos correctos (16, 48, 128)
- [ ] Permisos justificados
- [ ] Categoría seleccionada
- [ ] Regiones configuradas
- [ ] $5 USD pagados para registro de desarrollador

**¡Listo para publicar AmersurChat! 🚀**
