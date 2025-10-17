# 🔧 CONFIGURAR GOOGLE DRIVE API - Guía Completa

## 🎯 OBJETIVO
Conectar tu CRM con Google Drive para sincronizar documentos automáticamente.

---

## 📋 REQUISITOS PREVIOS

1. ✅ Cuenta de Google Workspace o Gmail
2. ✅ Acceso a Google Cloud Console
3. ✅ Permisos de administrador en el Drive de la empresa

---

## 🚀 PASO A PASO

### **PASO 1: Crear Proyecto en Google Cloud**

1. Ve a: [https://console.cloud.google.com](https://console.cloud.google.com)
2. Click en el selector de proyectos (arriba a la izquierda)
3. Click en **"Nuevo Proyecto"**
4. Completa:
   - **Nombre del proyecto**: `AMERSUR CRM`
   - **Organización**: (tu empresa, si aplica)
5. Click en **"Crear"**
6. Espera unos segundos y selecciona el proyecto

---

### **PASO 2: Habilitar Google Drive API**

1. En el menú lateral, ve a **"APIs y servicios" → "Biblioteca"**
2. Busca: `Google Drive API`
3. Click en **"Google Drive API"**
4. Click en **"Habilitar"**
5. Espera a que se active (30 segundos)

---

### **PASO 3: Crear Credenciales OAuth 2.0**

1. En el menú lateral, ve a **"APIs y servicios" → "Credenciales"**
2. Click en **"+ Crear credenciales"**
3. Selecciona **"ID de cliente de OAuth"**

#### **3.1 Configurar Pantalla de Consentimiento**

Si es tu primera vez, te pedirá configurar la pantalla de consentimiento:

1. Click en **"Configurar pantalla de consentimiento"**
2. Selecciona **"Externo"** (o "Interno" si tienes Google Workspace)
3. Click en **"Crear"**
4. Completa:
   - **Nombre de la app**: `AMERSUR CRM`
   - **Correo electrónico de asistencia**: tu email
   - **Logo de la app**: (opcional)
   - **Dominios autorizados**: tu dominio (ej: `amersur.com`)
   - **Correo de contacto del desarrollador**: tu email
5. Click en **"Guardar y continuar"**

6. **Ámbitos (Scopes)**:
   - Click en **"Añadir o quitar ámbitos"**
   - Busca y agrega:
     - `https://www.googleapis.com/auth/drive.file`
     - `https://www.googleapis.com/auth/drive.metadata.readonly`
   - Click en **"Actualizar"**
   - Click en **"Guardar y continuar"**

7. **Usuarios de prueba** (si es externo):
   - Click en **"+ Añadir usuarios"**
   - Agrega tu email y el de tu equipo
   - Click en **"Guardar y continuar"**

8. **Resumen**:
   - Revisa y click en **"Volver al panel"**

#### **3.2 Crear ID de Cliente OAuth**

1. Ve nuevamente a **"Credenciales"**
2. Click en **"+ Crear credenciales" → "ID de cliente de OAuth"**
3. Selecciona:
   - **Tipo de aplicación**: `Aplicación web`
   - **Nombre**: `AMERSUR CRM Web Client`
4. **Orígenes de JavaScript autorizados**:
   - Para desarrollo local:
     ```
     http://localhost:3001
     ```
   - Para producción:
     ```
     https://crm.amersur.com
     ```
   (Agrega ambos si es necesario)

5. **URIs de redirección autorizados**:
   - Para desarrollo:
     ```
     http://localhost:3001/api/google/callback
     ```
   - Para producción:
     ```
     https://crm.amersur.com/api/google/callback
     ```

6. Click en **"Crear"**

#### **3.3 Copiar Credenciales**

Aparecerá un modal con tus credenciales:

- **ID de cliente**: Comienza con algo como `123456789-abc...apps.googleusercontent.com`
- **Secreto de cliente**: Algo como `GOCSPX-abc123...`

📋 **COPIA AMBOS** y guárdalos de forma segura.

---

### **PASO 4: Agregar Credenciales al CRM**

#### **4.1 Variables de Entorno**

Agrega a tu archivo `.env.local`:

```bash
# Google Drive API
GOOGLE_DRIVE_CLIENT_ID=tu-client-id-aqui.apps.googleusercontent.com
GOOGLE_DRIVE_CLIENT_SECRET=GOCSPX-tu-secreto-aqui
GOOGLE_DRIVE_REDIRECT_URI=http://localhost:3001/api/google/callback
```

#### **4.2 En Producción**

Actualiza las variables en tu hosting (Vercel, Railway, etc.):
- `GOOGLE_DRIVE_CLIENT_ID`
- `GOOGLE_DRIVE_CLIENT_SECRET`
- `GOOGLE_DRIVE_REDIRECT_URI` (con tu dominio real)

---

### **PASO 5: Crear Carpeta Raíz en Google Drive**

1. Ve a [Google Drive](https://drive.google.com)
2. Click derecho → **"Nueva carpeta"**
3. Nombre: `AMERSUR CRM Documentos`
4. Click derecho en la carpeta → **"Compartir"**
5. Agrega los usuarios de tu equipo con permisos de **"Editor"**
6. Copia el **ID de la carpeta** de la URL:
   ```
   https://drive.google.com/drive/folders/ABC123XYZ789
                                           └──────┬──────┘
                                               Esto es el ID
   ```

Guarda este ID, lo necesitarás.

---

### **PASO 6: Configurar en el CRM**

Una vez que tengas el frontend listo, podrás:

1. Ir a `/dashboard/admin/configuracion`
2. Tab **"Integraciones"**
3. Sección **"Google Drive"**
4. Click en **"Conectar con Google Drive"**
5. Autorizar la app
6. Ingresar el **Folder ID** de la carpeta raíz

---

## 🔐 SEGURIDAD

### **Mejores Prácticas:**

1. **Nunca subas credenciales a GitHub**
   - Usa `.env.local` (ya está en `.gitignore`)
   - En producción, usa variables de entorno

2. **Limita los permisos (Scopes)**
   - Solo usa `drive.file` (archivos creados por la app)
   - Evita `drive.readonly` o `drive` completo

3. **Rota credenciales periódicamente**
   - Cada 90 días, genera nuevas credenciales

4. **Usa refresh tokens**
   - No almacenes access tokens directamente
   - Guarda refresh tokens de forma segura

---

## 📊 FLUJO DE AUTORIZACIÓN

```
Usuario → CRM → Google OAuth → Google Drive
  ↓         ↓         ↓              ↓
  1. Click  2. Redirect  3. Autoriza   4. Callback
  "Conectar"  a Google     permisos      con tokens
```

---

## 🧪 TESTING

### **Probar Conexión:**

```bash
# En tu terminal
curl "http://localhost:3001/api/google/auth"
# Debería redirigir a Google para autorizar
```

### **Verificar Tokens:**

```sql
-- En Supabase SQL Editor
SELECT
  nombre,
  root_folder_name,
  activo,
  ultima_sincronizacion_at
FROM crm.google_drive_sync_config
WHERE activo = true;
```

---

## 🆘 PROBLEMAS COMUNES

### **Problema 1: "redirect_uri_mismatch"**

**Causa**: La URI de redirección no está autorizada

**Solución**:
1. Ve a Google Cloud Console → Credenciales
2. Edita tu ID de cliente OAuth
3. Agrega la URI exacta que estás usando:
   - Local: `http://localhost:3001/api/google/callback`
   - Prod: `https://tu-dominio.com/api/google/callback`

### **Problema 2: "Access blocked: Authorization Error"**

**Causa**: La app está en modo prueba y el usuario no está en la lista

**Solución**:
1. Ve a **"Pantalla de consentimiento de OAuth"**
2. En **"Usuarios de prueba"**, agrega el email del usuario
3. O publica la app (requiere verificación de Google)

### **Problema 3: Token expirado**

**Causa**: Access token tiene vida corta (1 hora)

**Solución**:
- Usa refresh token para obtener uno nuevo automáticamente
- El código del CRM lo hará automáticamente

---

## 📚 RECURSOS

- [Google Drive API Docs](https://developers.google.com/drive/api/guides/about-sdk)
- [OAuth 2.0 Guide](https://developers.google.com/identity/protocols/oauth2)
- [Drive API Scopes](https://developers.google.com/drive/api/guides/api-specific-auth)

---

## ✅ CHECKLIST

Antes de continuar, verifica:

- [ ] Proyecto creado en Google Cloud Console
- [ ] Google Drive API habilitada
- [ ] Pantalla de consentimiento configurada
- [ ] ID de cliente OAuth creado
- [ ] Client ID y Client Secret copiados
- [ ] URIs de redirección configurados
- [ ] Variables de entorno agregadas a `.env.local`
- [ ] Carpeta raíz creada en Google Drive
- [ ] Folder ID copiado

---

**Siguiente paso**: Ejecutar la migración y crear el frontend

```bash
# Aplicar migración
supabase db push

# O en producción
# Ejecutar el SQL en Supabase Dashboard
```

---

**Fecha**: 2025-10-16
**Desarrollador**: Claude Code
