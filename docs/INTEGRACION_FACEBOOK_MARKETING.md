# Integración de Facebook Marketing en el CRM

**Fecha:** 3 de Noviembre de 2025
**Estado:** En Progreso

---

## 🎯 Objetivo

Integrar Facebook en el CRM de AMERSUR para:
1. 📢 **Crear y gestionar anuncios pagados** (Facebook Ads)
2. 📱 **Publicar contenido orgánico** en la página de Facebook
3. 📋 **Capturar leads** de Facebook Lead Ads automáticamente

---

## 📋 Requisitos Previos

- ✅ Página de Facebook Business activa
- ✅ Meta Business Manager configurado
- ✅ Método de pago configurado en Facebook Ads (para anuncios)
- ✅ Acceso a Facebook Developers

---

## 🚀 Paso 1: Crear Facebook App

### 1.1 Acceder a Facebook Developers

Ve a: https://developers.facebook.com/

**Login** con tu cuenta de administrador de la página de Facebook.

### 1.2 Crear Nueva App

1. Click en **"My Apps"** (arriba derecha)
2. Click en **"Create App"**
3. Selecciona tipo: **"Business"**
4. Click **"Next"**

### 1.3 Configurar App Básica

**Información requerida:**
- **Display Name:** `AMERSUR CRM`
- **App Contact Email:** tu@email.com
- **Business Account:** Selecciona tu Business Manager
- Click **"Create App"**

### 1.4 Configurar Productos

Una vez creada la app, agrega estos productos:

**A. Facebook Login:**
1. En el dashboard, busca **"Facebook Login"**
2. Click **"Set Up"**
3. Plataforma: **"Web"**
4. Site URL: `https://crm.amersursac.com`
5. Click **"Save"**

**B. Marketing API:**
1. Busca **"Marketing API"**
2. Click **"Set Up"**
3. Acepta términos y condiciones

**C. Webhooks:**
1. Busca **"Webhooks"**
2. Click **"Set Up"**
3. Lo configuraremos más adelante

### 1.5 Obtener Credenciales

1. En el menú lateral, ve a **"Settings"** → **"Basic"**
2. Copia estos valores:
   - **App ID:** (ej: 123456789012345)
   - **App Secret:** Click en "Show" y copia

**⚠️ IMPORTANTE:** Guarda estas credenciales de forma segura.

---

## 🔐 Paso 2: Configurar Permisos

### 2.1 Permisos Requeridos

Tu app necesita estos permisos:

**Para Facebook Ads:**
- `ads_management` - Crear y gestionar anuncios
- `ads_read` - Leer información de anuncios
- `business_management` - Gestionar Business Manager

**Para Publicaciones:**
- `pages_manage_posts` - Publicar en la página
- `pages_read_engagement` - Leer engagement de posts

**Para Lead Ads:**
- `leads_retrieval` - Acceder a leads capturados
- `pages_manage_metadata` - Configurar webhooks

### 2.2 Solicitar Permisos Avanzados

Algunos permisos requieren revisión de Facebook:

1. Ve a **"App Review"** → **"Permissions and Features"**
2. Busca cada permiso listado arriba
3. Click en **"Request Advanced Access"**
4. Completa el formulario de solicitud
5. **Tiempo de revisión:** 1-5 días hábiles

---

## 🔧 Paso 3: Configurar en el CRM

### 3.1 Agregar Variables de Entorno

Edita tu archivo `.env.local`:

```bash
# Facebook Marketing API
FACEBOOK_APP_ID=123456789012345
FACEBOOK_APP_SECRET=tu_app_secret_aqui
FACEBOOK_PAGE_ID=tu_page_id
FACEBOOK_ACCESS_TOKEN=token_de_larga_duracion

# Lead Ads Webhook
META_PAGE_ACCESS_TOKEN=token_largo_de_pagina
META_LEAD_VERIFY_TOKEN=tu_token_unico
CRM_AUTOMATION_USER_ID=uuid_usuario_sistema

# Opcional: Business Manager
FACEBOOK_BUSINESS_ID=tu_business_id
FACEBOOK_AD_ACCOUNT_ID=act_123456789
```

### 3.2 Obtener Page ID

1. Ve a tu página de Facebook
2. Click en **"About"** o **"Acerca de"**
3. Scroll hasta el final
4. Copia el **Page ID** (número largo)

### 3.3 Obtener Ad Account ID

1. Ve a: https://business.facebook.com/settings/ad-accounts
2. Selecciona tu cuenta de anuncios
3. Copia el **Ad Account ID** (formato: act_123456789)

### 3.4 Generar Access Token de Larga Duración

**Método 1: Graph API Explorer (Desarrollo)**

1. Ve a: https://developers.facebook.com/tools/explorer/
2. Selecciona tu app en el dropdown
3. Click en **"Generate Access Token"**
4. Selecciona los permisos necesarios
5. Autoriza
6. Copia el token

**Método 2: OAuth (Producción - Recomendado)**

Implementaremos un flujo OAuth en el CRM donde los usuarios autorizarán la app y el sistema obtendrá tokens automáticamente.

### 3.5 Configurar Webhook de Lead Ads

1. En la app de Meta, ve a **Webhooks → Add Callback URL**.<br/>
2. URL de callback: `https://{TU_DOMINIO}/api/meta/webhook`.<br/>
3. Verify Token: usa el valor definido en `META_LEAD_VERIFY_TOKEN`.<br/>
4. Suscribe el objeto **`leadgen`** de la página donde corren los formularios.<br/>
5. Una vez verificado, cada envío de formulario invocará automáticamente el endpoint del CRM.

> ⚠️ En producción asegúrate de usar el dominio público (ej. `crm.amersursac.com`). En entornos locales puedes usar un túnel (ngrok) solo para pruebas.

---

## 📊 Paso 4: Funcionalidades a Implementar

### 4.1 Facebook Ads (Anuncios Pagados)

**Capacidades:**
- ✅ Crear campañas de anuncios
- ✅ Definir audiencia (edad, ubicación, intereses)
- ✅ Establecer presupuesto y duración
- ✅ Subir creativos (imágenes, videos)
- ✅ Monitorear rendimiento (impresiones, clicks, conversiones)
- ✅ Pausar/reanudar campañas

**API Endpoint:** `/api/facebook/ads/create`

### 4.2 Publicaciones Orgánicas

**Capacidades:**
- ✅ Publicar texto, imágenes, videos
- ✅ Programar publicaciones futuras
- ✅ Ver engagement (likes, comentarios, shares)
- ✅ Responder a comentarios

**API Endpoint:** `/api/facebook/posts/create`

### 4.3 Facebook Lead Ads

**Capacidades:**
- ✅ Recibir leads en tiempo real vía webhook
- ✅ Guardar leads automáticamente en el CRM
- ✅ Asignar leads a vendedores
- ✅ Crear tareas de seguimiento automáticas

**API Endpoint:** `/api/meta/webhook` (Meta Lead Ads Webhook)

Cada lead se:
- Recupera vía Graph API (`leadgen_id`).
- Inserta automáticamente en la tabla `cliente` con origen `facebook_ads`.
- Asigna a un vendedor activo (round-robin). Si no hay vendedores disponibles, usa el usuario definido en `CRM_AUTOMATION_USER_ID`.

---

## 🔗 Endpoints de la Integración

### Anuncios (Ads)

```
POST   /api/facebook/ads/create          - Crear campaña de anuncios
GET    /api/facebook/ads/list            - Listar campañas activas
GET    /api/facebook/ads/[id]/insights   - Obtener métricas de campaña
PATCH  /api/facebook/ads/[id]/status     - Pausar/reanudar campaña
DELETE /api/facebook/ads/[id]            - Eliminar campaña
```

### Publicaciones (Posts)

```
POST   /api/facebook/posts/create        - Crear publicación
GET    /api/facebook/posts/list          - Listar publicaciones
GET    /api/facebook/posts/[id]/insights - Obtener engagement
DELETE /api/facebook/posts/[id]          - Eliminar publicación
```

### Lead Ads (Webhooks)

```
POST   /api/facebook/webhook/leads       - Recibir leads (webhook)
GET    /api/facebook/leads/list          - Listar leads capturados
GET    /api/facebook/leads/[id]          - Ver detalle de lead
```

---

## 🎨 UI en el CRM

### Nueva Sección: Marketing → Facebook

**Tabs:**
1. **Dashboard** - Métricas generales
2. **Anuncios** - Gestionar campañas pagadas
3. **Publicaciones** - Posts orgánicos
4. **Leads** - Leads capturados de anuncios

### Componentes a Crear

```
/src/components/facebook/
├── FacebookAuthButton.tsx          - Botón de autenticación
├── CreateAdCampaign.tsx            - Formulario de crear anuncio
├── AdCampaignList.tsx              - Lista de campañas
├── CreatePost.tsx                  - Formulario de publicación
├── PostsList.tsx                   - Lista de publicaciones
├── LeadsList.tsx                   - Lista de leads de Facebook
└── FacebookMetricsDashboard.tsx    - Dashboard de métricas
```

---

## 📦 Dependencias Necesarias

Instalar SDK oficial de Facebook:

```bash
npm install facebook-nodejs-business-sdk
npm install @types/facebook-nodejs-business-sdk --save-dev
```

---

## ⏱️ Timeline de Implementación

| Tarea | Tiempo Estimado | Estado |
|-------|----------------|--------|
| Crear Facebook App | 30 minutos | ⏳ Pendiente |
| Solicitar permisos avanzados | 1-5 días (Facebook) | ⏳ Pendiente |
| Implementar OAuth | 2 horas | ⏳ Pendiente |
| Crear servicio de Ads | 4 horas | ⏳ Pendiente |
| Crear servicio de Posts | 2 horas | ⏳ Pendiente |
| Configurar webhook Lead Ads | 2 horas | ⏳ Pendiente |
| Crear UI de Facebook | 6 horas | ⏳ Pendiente |
| Pruebas y ajustes | 2 horas | ⏳ Pendiente |
| **TOTAL** | **~20 horas + 1-5 días** | ⏳ En Progreso |

---

## 🚨 Consideraciones Importantes

### Límites de la API

- **Llamadas por hora:** ~200 llamadas/hora (varía según tier)
- **Anuncios activos:** Depende de tu cuenta publicitaria
- **Lead Ads webhook:** Tiempo real, sin límite

### Costos

- **API de Facebook:** Gratis
- **Anuncios:** Según presupuesto configurado (CPC/CPM)
- **Publicaciones orgánicas:** Gratis

### Seguridad

- ⚠️ Nunca exponer `FACEBOOK_APP_SECRET` en el frontend
- ⚠️ Usar tokens de usuario, no tokens de app
- ⚠️ Validar webhook signature para Lead Ads
- ⚠️ Implementar rate limiting en endpoints

---

## 📞 Recursos

**Documentación:**
- Facebook Marketing API: https://developers.facebook.com/docs/marketing-apis
- Graph API: https://developers.facebook.com/docs/graph-api
- Lead Ads: https://developers.facebook.com/docs/marketing-api/guides/lead-ads

**Herramientas:**
- Graph API Explorer: https://developers.facebook.com/tools/explorer/
- Access Token Debugger: https://developers.facebook.com/tools/debug/accesstoken/

---

**Última actualización:** 3 de Noviembre de 2025
**Estado:** Paso 1 - Configuración de Facebook App
