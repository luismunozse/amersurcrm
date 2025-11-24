# Guía de Deployment en Vercel

## ✅ Cambios Realizados

1. ✅ Agregado campo `packageManager` a package.json
2. ✅ Creado vercel.json con configuración optimizada
3. ✅ Configurado NODE_OPTIONS para memoria adicional
4. ✅ Actualizado comando de build para compatibilidad con Vercel
5. ✅ Creado .env.example como referencia

## 📝 Pasos para Deployar en Vercel

### 1. Configurar Variables de Entorno en Vercel

Antes de hacer el deployment, debes configurar estas variables de entorno en el dashboard de Vercel:

**Variables Requeridas:**
```
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_de_supabase
```

**Variables Opcionales (según funcionalidades que uses):**
```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=tu_api_key_google_maps
WHATSAPP_BUSINESS_ACCOUNT_ID=tu_account_id
WHATSAPP_PHONE_NUMBER_ID=tu_phone_id  
WHATSAPP_ACCESS_TOKEN=tu_access_token
GOOGLE_CLIENT_ID=tu_google_client_id
GOOGLE_CLIENT_SECRET=tu_google_secret
```

### 2. Importar el Proyecto en Vercel

1. Ve a [vercel.com](https://vercel.com) e inicia sesión
2. Click en "Add New Project"
3. Importa tu repositorio de GitHub: `luismunozse/amersurcrm`
4. Vercel detectará automáticamente que es Next.js

### 3. Configuración del Proyecto

Vercel debería detectar automáticamente:
- Framework Preset: **Next.js**
- Build Command: `npm run build` (ya configurado en vercel.json)
- Output Directory: `.next` (por defecto)
- Install Command: `npm install`

### 4. Variables de Entorno

En la sección "Environment Variables":
1. Agrega cada variable listada arriba
2. Selecciona los entornos: Production, Preview, Development
3. Click en "Add"

### 5. Deploy

1. Click en "Deploy"
2. Espera a que el build termine (~5-10 minutos)
3. Tu app estará disponible en: `https://tu-proyecto.vercel.app`

## 🔧 Configuración de Build

El archivo `vercel.json` ya incluye:
- NODE_OPTIONS con 4GB de memoria
- Región óptima (iad1 - Washington DC)
- Comandos de build e instalación

## ⚠️ Problemas Comunes

### Error: "JavaScript heap out of memory"
✅ **Ya resuelto** - Configurado NODE_OPTIONS en vercel.json

### Error: "Missing packageManager field"  
✅ **Ya resuelto** - Agregado a package.json

### Error de Variables de Entorno
- Asegúrate de agregar TODAS las variables en Vercel dashboard
- Las variables con `NEXT_PUBLIC_` son expuestas al navegador
- Revisa que no haya espacios o caracteres extra

## 🚀 Después del Deployment

1. Verifica que la app funcione correctamente
2. Configura un dominio personalizado (opcional)
3. Activa "Automatic Deployments" para actualizaciones automáticas
4. Configura notificaciones de deployment

## 📊 Monitoreo

Vercel provee:
- Analytics integrado
- Logs de deployment
- Real-time logs
- Performance metrics

Accede desde: Dashboard → Tu Proyecto → Analytics/Logs

## 🔄 Actualizaciones Futuras

Cualquier push a la rama `main` activará automáticamente un nuevo deployment en Vercel.

---

**¿Problemas?** Revisa los logs en Vercel Dashboard → Deployments → [Tu deployment] → Build Logs
