# AmersurChat - Extensión de Chrome

Integración de WhatsApp Web con Amersur CRM para gestión de leads inmobiliarios.

## Características

- ✅ Detecta contacto activo en WhatsApp Web automáticamente
- ✅ Busca si el contacto ya existe en el CRM
- ✅ Crea leads con un solo clic
- ✅ Muestra información completa del cliente
- ✅ Asignación automática a vendedores (round-robin)
- ✅ Interfaz integrada en WhatsApp Web con sidebar
- ✅ Autenticación segura con credenciales del CRM

## Instalación

### 1. Instalar dependencias

```bash
cd chrome-extension
npm install
```

### 2. Compilar la extensión

```bash
npm run build
```

Esto generará los archivos en el directorio `dist/`.

### 3. Cargar en Chrome

1. Abre Chrome y ve a `chrome://extensions/`
2. Activa el "Modo de desarrollador" (esquina superior derecha)
3. Click en "Cargar extensión sin empaquetar"
4. Selecciona la carpeta `chrome-extension`
5. La extensión AmersurChat debería aparecer en la lista

### 4. Usar la extensión

1. Abre [WhatsApp Web](https://web.whatsapp.com)
2. Verás un botón flotante verde en la esquina superior derecha
3. Click en el botón para abrir el sidebar de AmersurChat
4. Inicia sesión con tus credenciales del CRM
5. Selecciona cualquier chat y verás la información del contacto

## Desarrollo

### Modo desarrollo con hot-reload

```bash
npm run dev
```

Esto compilará la extensión en modo watch. Después de cada cambio, recarga la extensión en `chrome://extensions/`.

### Estructura del proyecto

```
chrome-extension/
├── src/
│   ├── components/        # Componentes React
│   │   ├── Sidebar.tsx
│   │   ├── LoginForm.tsx
│   │   ├── ContactInfo.tsx
│   │   └── CreateLeadForm.tsx
│   ├── lib/               # Utilidades
│   │   ├── api.ts         # Cliente API del CRM
│   │   └── whatsapp.ts    # Extracción de datos de WhatsApp
│   ├── types/             # Tipos TypeScript
│   │   └── crm.ts
│   ├── content.ts         # Content script (inyecta sidebar)
│   ├── background.ts      # Service worker
│   ├── sidebar.tsx        # Punto de entrada del sidebar
│   └── popup.tsx          # Popup de la extensión
├── public/
│   ├── icons/             # Iconos de la extensión
│   ├── sidebar.html
│   └── popup.html
├── manifest.json          # Configuración de la extensión
├── vite.config.ts         # Config de Vite para build
└── package.json
```

## Configuración del CRM

### URL del CRM

Por defecto, la extensión usa `http://localhost:3000`. Para cambiar a producción:

1. En el login, ingresa la URL de producción (ej: `https://crm.amersur.com`)
2. Inicia sesión con tus credenciales
3. La configuración se guardará automáticamente

### Endpoints requeridos en el CRM

La extensión requiere los siguientes endpoints:

1. **POST /api/auth/login** - Autenticación
   ```json
   { "email": "user@email.com", "password": "***" }
   ```

2. **GET /api/clientes/search?phone=+51999999999** - Buscar cliente
   ```json
   { "cliente": {...} }
   ```

3. **POST /api/whatsapp/lead/create** - Crear lead
   ```json
   {
     "nombre": "Juan Pérez",
     "telefono": "+51999999999",
     "telefono_whatsapp": "+51999999999",
     "origen_lead": "whatsapp_web",
     "canal": "whatsapp_extension",
     "mensaje_inicial": "Hola, me interesa...",
     "chat_id": "..."
   }
   ```

## Permisos de la extensión

- `storage`: Para guardar configuración y autenticación
- `activeTab`: Para interactuar con WhatsApp Web
- `https://web.whatsapp.com/*`: Acceso a WhatsApp Web
- `http://localhost:3000/*`: Comunicación con CRM local
- `https://*.vercel.app/*`: Comunicación con CRM en Vercel

## Solución de problemas

### La extensión no aparece en WhatsApp Web

1. Verifica que estés en `https://web.whatsapp.com`
2. Refresca la página (F5)
3. Revisa la consola del navegador (F12) para errores

### No puede crear leads

1. Verifica que estés autenticado
2. Comprueba que el CRM esté corriendo
3. Revisa que la URL del CRM sea correcta
4. Verifica los permisos CORS en el CRM

### El contacto no se detecta

1. Asegúrate de tener un chat abierto en WhatsApp Web
2. Espera unos segundos (la detección es cada 2 segundos)
3. Si WhatsApp Web cambió su estructura, puede requerir actualización

## Publicación en Chrome Web Store

Para publicar la extensión en la Chrome Web Store:

1. Compila la versión de producción: `npm run build`
2. Comprime el directorio `chrome-extension` en un ZIP
3. Ve a [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
4. Sube el ZIP y completa la información
5. Espera la revisión de Google (1-3 días hábiles)

## Licencia

Propiedad de Amersur Inmobiliaria - Todos los derechos reservados.
