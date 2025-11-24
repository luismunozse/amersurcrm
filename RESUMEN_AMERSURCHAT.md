# Resumen: AmersurChat - Extensión de Chrome

## Qué se implementó

### 1. Extensión de Chrome completa

**Ubicación**: `/chrome-extension/`

**Tecnologías**:
- React 18 + TypeScript
- Tailwind CSS (misma UI del CRM)
- Vite para build
- Manifest V3 (estándar Chrome)

**Componentes principales**:
- `Sidebar.tsx` - Componente principal del sidebar
- `LoginForm.tsx` - Formulario de autenticación con usuario/contraseña
- `ContactInfo.tsx` - Muestra información del cliente
- `CreateLeadForm.tsx` - Formulario para crear leads (DEPRECATED - ahora es automático)
- `MessageTemplates.tsx` - Plantillas de mensajes rápidos
- `ClientHistory.tsx` - Historial de interacciones del cliente
- `UpdateLeadStatus.tsx` - Actualización de estado del lead
- `content.ts` - Script que inyecta sidebar en WhatsApp Web
- `background.ts` - Service worker para gestión de estado

### 2. Funcionalidades implementadas

✅ **Detección automática de contactos**
- Extrae número de teléfono del chat activo (desde URL y DOM)
- Extrae nombre del contacto (con selectores actualizados)
- Detecta cambios de chat en tiempo real
- Optimización: polling cada 10s para reducir consumo

✅ **Captura automática de leads** ⭐ NUEVO
- **Cero clics**: Leads se crean automáticamente al abrir chat desconocido
- Detecta si contacto ya existe en CRM
- Si no existe, crea lead sin intervención manual
- Origen registrado como "whatsapp_web"
- Asignación automática de vendedor al usuario logueado

✅ **Búsqueda en CRM**
- Busca si el contacto ya existe
- Muestra estado del cliente
- Muestra vendedor asignado
- Muestra notas y origen

✅ **Gestión de leads desde sidebar** ⭐ NUEVO
- Plantillas de mensajes rápidos (8 templates en 4 categorías)
- Historial de interacciones del cliente
- Actualización de estado del lead (6 estados disponibles)
- Sincronización en tiempo real con CRM

✅ **Autenticación**
- Login con usuario y contraseña (no email)
- Ejemplo: usuario "admin2"
- Storage persistente de sesión
- Múltiples URLs (localhost / producción)
- Integración con Supabase Auth

✅ **UI integrada**
- Botón flotante verde en WhatsApp Web
- Sidebar deslizante con iframe aislado
- Diseño responsive
- Iconos personalizados con logo Amersur (16px, 48px, 128px)
- Colores corporativos de Amersur

### 3. APIs del CRM creadas

**Nuevos endpoints para la extensión**:
- `GET /api/clientes/search?phone=+51999999999`
  - Busca cliente por teléfono
  - Retorna info completa del cliente
  - Usado por la extensión

- `POST /api/clientes/create-lead` ⭐ NUEVO
  - Crea lead desde la extensión de Chrome
  - Autenticación con JWT token (no API key)
  - Origen: "whatsapp_web"
  - Asigna vendedor al usuario logueado
  - Notas: "Lead capturado automáticamente desde WhatsApp Web"

- `POST /api/auth/login` ⭐ NUEVO
  - Autenticación con usuario/contraseña
  - Soporta login con username (ej: "admin2") o email
  - Retorna JWT token para las demás APIs
  - Usa Service Role Client para lookup de usuarios

- `PATCH /api/clientes/[id]/estado` ⭐ NUEVO
  - Actualiza estado del lead desde la extensión
  - Estados: nuevo, contactado, interesado, negociacion, ganado, perdido

**Endpoints del bot (separados)**:
- `POST /api/whatsapp/lead/create` - Crear lead desde bot (requiere API key)
- `POST /api/whatsapp/bot/status` - Estado del bot

### 4. Comparación con Sperant

| Característica | Sperant | AmersurChat |
|---|---|---|
| Tipo | Manual | **Automático** + manual opcional |
| Plataforma | Solo Chrome | Chrome (expandible) |
| Crear leads | Manual (sidebar) | **Automático (cero clics)** + Bot 24/7 |
| Gestión de leads | No | ✅ Actualizar estado, templates, historial |
| Riesgo de ban | Bajo | Bajo (extensión) / Medio (bot) |
| Sesión | Permanente | Permanente (extensión) / 30 días (bot) |
| Asignación vendedores | Manual | Automática al usuario logueado |
| Funcionamiento | Solo con alguien conectado | 24/7 con bot + automático con extensión |
| UX | Clicks manuales | **Sin clicks** - detección automática |

### 5. Arquitectura final

```
┌─────────────────────────────────────────────────────────┐
│                    Captura de Leads                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────┐         ┌──────────────────┐    │
│  │  WhatsApp Bot    │         │  AmersurChat     │    │
│  │  (Automático)    │         │  (Manual)        │    │
│  │                  │         │                  │    │
│  │  • 24/7          │         │  • Extensión     │    │
│  │  • Fuera horario │         │  • Horario       │    │
│  │  • QR cada 30d   │         │  • Sin QR        │    │
│  │  • Sin UI        │         │  • Con UI        │    │
│  └────────┬─────────┘         └────────┬─────────┘    │
│           │                            │              │
│           ├────────────┬───────────────┤              │
│           ↓            ↓               ↓              │
│    ┌──────────────────────────────────────┐          │
│    │      Amersur CRM APIs                │          │
│    │                                      │          │
│    │  • POST /api/whatsapp/lead/create   │          │
│    │  • GET  /api/clientes/search        │          │
│    │  • POST /api/whatsapp/bot/status    │          │
│    └──────────────────────────────────────┘          │
│                     ↓                                 │
│    ┌──────────────────────────────────────┐          │
│    │      Supabase Database               │          │
│    │                                      │          │
│    │  • Tabla: cliente                   │          │
│    │  • RPC: create_whatsapp_lead        │          │
│    │  • Round-robin assignment           │          │
│    └──────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────┘
```

## Cómo usar

### Opción 1: Solo bot automático (actual)
```bash
# Terminal 1: CRM
npm run dev

# Terminal 2: Bot
cd whatsapp-bot
npm start
```

Leads se crean automáticamente cuando alguien escribe.

### Opción 2: Solo extensión (manual)
```bash
# Terminal: CRM
npm run dev
```

1. Cargar extensión en Chrome desde `chrome-extension/dist/`
2. Abrir WhatsApp Web
3. Click en botón verde
4. Iniciar sesión
5. Seleccionar chat → Crear lead manualmente

### Opción 3: Ambos (recomendado)
```bash
# Terminal 1: CRM
npm run dev

# Terminal 2: Bot (para leads automáticos fuera de horario)
cd whatsapp-bot
npm start
```

- **Durante el día**: Vendedores usan WhatsApp Web con extensión
- **Fuera de horario**: Bot captura leads automáticamente
- **Lo mejor de ambos mundos**

## Archivos creados

```
chrome-extension/
├── src/
│   ├── components/
│   │   ├── Sidebar.tsx (con auto-captura de leads)
│   │   ├── LoginForm.tsx (usuario/contraseña)
│   │   ├── ContactInfo.tsx
│   │   ├── CreateLeadForm.tsx (DEPRECATED - ahora automático)
│   │   ├── MessageTemplates.tsx ⭐ NUEVO
│   │   ├── ClientHistory.tsx ⭐ NUEVO
│   │   └── UpdateLeadStatus.tsx ⭐ NUEVO
│   ├── lib/
│   │   ├── api.ts (actualizado con nuevos endpoints)
│   │   └── whatsapp.ts (selectores actualizados)
│   ├── types/
│   │   └── crm.ts
│   ├── content.ts (ES6 imports, iframe communication)
│   ├── content.css
│   ├── background.ts
│   ├── sidebar.tsx
│   ├── popup.tsx
│   └── index.css
├── public/
│   ├── icons/
│   │   ├── icon16.png ⭐ NUEVO (logo Amersur)
│   │   ├── icon48.png ⭐ NUEVO
│   │   └── icon128.png ⭐ NUEVO
│   ├── sidebar.html
│   └── popup.html
├── dist/ (compilado y listo)
├── manifest.json
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── README.md
└── INSTALACION.md

src/app/api/
├── auth/login/
│   └── route.ts ⭐ NUEVO (autenticación con username)
├── clientes/
│   ├── search/
│   │   └── route.ts (búsqueda por teléfono)
│   ├── create-lead/
│   │   └── route.ts ⭐ NUEVO (crear lead desde extensión)
│   └── [id]/estado/
│       └── route.ts ⭐ NUEVO (actualizar estado)
└── whatsapp/
    └── lead/create/
        └── route.ts (crear lead desde bot - separado)
```

## Próximos pasos sugeridos

### Corto plazo (MVP listo) ✅ COMPLETADO
- [x] Extensión funcional
- [x] Búsqueda de clientes
- [x] Creación de leads
- [x] Autenticación
- [x] Captura automática de leads (cero clics)

### Mediano plazo (mejoras) ✅ COMPLETADO
- [x] Crear endpoint `/api/auth/login`
- [x] Agregar iconos personalizados con logo Amersur (16px, 48px, 128px)
- [x] Implementar plantillas de mensajes rápidos (8 templates)
- [x] Mostrar historial de interacciones
- [x] Permitir actualizar estado del lead desde extensión
- [x] Origen de lead correctamente configurado como "whatsapp_web"
- [x] Optimización de polling para reducir consumo

### Largo plazo (avanzado)
- [ ] Notificaciones de tareas pendientes
- [ ] Ver proyectos/propiedades del CRM en sidebar
- [ ] Enviar cotizaciones desde WhatsApp Web
- [ ] Publicar en Chrome Web Store
- [ ] Migrar bot a WhatsApp Business API oficial

## Estado actual

✅ **AmersurChat v2.0 - COMPLETADO CON MEJORAS**
- Código compilado y listo
- Estructura profesional
- Documentación completa
- Integración con CRM existente
- **Captura automática de leads (cero intervención manual)**
- **Gestión completa de leads desde sidebar**
- **Iconos personalizados con logo Amersur**
- **4 nuevos endpoints API**

✨ **Características destacadas**:
- Login con usuario/contraseña (ej: "admin2")
- Detección automática y creación de leads sin clicks
- Plantillas de mensajes rápidos
- Historial de interacciones
- Actualización de estado de leads
- Optimizado para bajo consumo (polling cada 10s)

📦 **Listo para**:
- Cargar en Chrome desde `chrome-extension/dist/`
- Usar en producción con leads reales
- Publicar en Chrome Web Store (opcional)
- Entrenar a vendedores (cero capacitación necesaria)

## Workflow de captura automática ⭐

**Antes (manual con Sperant)**:
1. Usuario abre chat en WhatsApp Web
2. Usuario hace click en extensión
3. Usuario hace click en "Crear lead"
4. Usuario llena formulario
5. Usuario hace click en "Guardar"

**Ahora (automático con AmersurChat v2.0)**:
1. Usuario abre chat en WhatsApp Web
2. ✨ **Lead se crea automáticamente**
3. Sidebar muestra info del nuevo lead
4. Usuario puede actualizar estado o usar templates (opcional)

**Resultado**: De 5 pasos manuales a **CERO pasos** 🚀

## Ventajas sobre solución anterior

| Aspecto | Bot solo | AmersurChat v2.0 |
|---|---|---|
| Cobertura | 24/7 | 24/7 |
| Intervención | Cero | **Cero** (automático) |
| Contexto | Sin UI | Con info completa en sidebar |
| Gestión de leads | Automática | Automática + gestión avanzada |
| Templates | No | ✅ 8 templates en 4 categorías |
| Historial | No | ✅ Timeline de interacciones |
| Actualizar estado | No | ✅ 6 estados desde sidebar |
| Riesgo ban | Medio | Bajo (extensión oficial) |
| UX vendedores | N/A | Excelente - sin capacitación |
| Asignación | Round-robin | Al usuario logueado |

## Instalación y troubleshooting

### Instalación en Chrome

1. **Build de la extensión**:
   ```bash
   cd chrome-extension
   npm install
   npm run build
   ```

2. **Cargar en Chrome**:
   - Abrir Chrome y navegar a `chrome://extensions/`
   - Activar "Modo de desarrollador" (esquina superior derecha)
   - Click en "Cargar extensión sin empaquetar"
   - Seleccionar carpeta `chrome-extension/dist/` ⚠️ NO la carpeta `chrome-extension/`

3. **Verificar archivos en dist/**:
   ```bash
   ls chrome-extension/dist/
   # Debe contener: manifest.json, content.css, *.js, icons/
   ```

### Uso diario

1. **Abrir WhatsApp Web**: [https://web.whatsapp.com](https://web.whatsapp.com)
2. **Iniciar sesión en extensión**:
   - Click en botón verde flotante
   - Ingresar usuario (ej: "admin2") y contraseña
   - URL del CRM (localhost:3000 o producción)
3. **Uso automático**:
   - Abrir cualquier chat
   - Si el contacto no existe, se crea automáticamente
   - Ver info en sidebar
   - Actualizar estado o usar templates (opcional)

### Problemas comunes

**Error: "No se ha podido cargar JavaScript"**
- ✅ Cargar la carpeta `dist/` no `chrome-extension/`

**Error: "Falta el archivo de manifiesto"**
- ✅ Ejecutar `cp manifest.json dist/` y `cp src/content.css dist/`

**Error: Login falla con 401**
- ✅ Verificar que el CRM esté corriendo (`npm run dev`)
- ✅ Verificar URL del CRM en el formulario de login

**Contacto no se detecta**
- ✅ Abrir consola del navegador (F12) y buscar logs `[WhatsApp]`
- ✅ Verificar que la URL del chat contenga el número
- ✅ Esperar 10 segundos (polling automático)

**Leads duplicados**
- ✅ El sistema detecta duplicados automáticamente
- ✅ Si el teléfono ya existe, no crea un nuevo lead

## Changelog

### v2.0 (Actual) - Captura automática
- ✅ Captura automática de leads sin clicks
- ✅ Login con usuario/contraseña (no email)
- ✅ Plantillas de mensajes rápidos
- ✅ Historial de interacciones
- ✅ Actualización de estado de leads
- ✅ Iconos personalizados con logo Amersur
- ✅ 4 nuevos endpoints API
- ✅ Origen "whatsapp_web" en database
- ✅ Optimización de polling (10s)
- ✅ Selectores de WhatsApp actualizados
- ✅ ES6 imports y comunicación iframe mejorada

### v1.0 - MVP inicial
- ✅ Extensión funcional básica
- ✅ Búsqueda manual de clientes
- ✅ Creación manual de leads
- ✅ Autenticación básica
