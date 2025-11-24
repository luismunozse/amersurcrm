# 📁 Sistema de Documentos con Google Drive - Resumen

## ✅ LO QUE HEMOS CREADO

### **1. Base de Datos** ✅
- ✅ Tabla `carpeta_documento` - Organización jerárquica de carpetas
- ✅ Tabla `documento` - Almacenamiento de metadatos de archivos
- ✅ Tabla `documento_actividad` - Auditoría de acciones
- ✅ Tabla `google_drive_sync_config` - Configuración OAuth
- ✅ 8 carpetas predefinidas (Contratos, Escrituras, Planos, Fotos, etc.)
- ✅ Políticas RLS completas

**Archivo**: `supabase/migrations/20251016000000_documentos_google_drive.sql`

### **2. Servicio de Google Drive** ✅
- ✅ Clase `GoogleDriveClient` con 12 métodos:
  - Listar archivos y carpetas
  - Subir y descargar archivos
  - Crear, eliminar, mover archivos
  - Buscar archivos
  - Compartir archivos
- ✅ Clase `GoogleOAuthClient` para autenticación
- ✅ Helper para refrescar tokens automáticamente

**Archivo**: `src/lib/google-drive/client.ts`

### **3. Documentación** ✅
- ✅ Guía completa de configuración de Google Drive API
- ✅ Paso a paso para crear proyecto en Google Cloud
- ✅ Configuración de OAuth 2.0
- ✅ Troubleshooting de problemas comunes

**Archivo**: `CONFIGURAR_GOOGLE_DRIVE_API.md`

### **4. Dependencias** ✅
- ✅ `googleapis` instalado

---

## 🔄 FLUJO DEL SISTEMA

```
Usuario → CRM → Google Drive
  ↓         ↓         ↓
Sube    Almacena   Sincroniza
archivo  metadata   archivo real
         en BD      en Drive
```

### **Tipos de Almacenamiento Soportados:**

1. **Supabase Storage**: Archivos en tu propio storage de Supabase
2. **Google Drive**: Archivos sincronizados con Google Drive de la empresa
3. **Enlaces Externos**: URLs a documentos externos (ej: Dropbox, OneDrive)

---

## 📋 PRÓXIMOS PASOS

### **PASO 1: Aplicar Migración** (5 minutos)

1. Abre [Supabase SQL Editor](https://supabase.com/dashboard/project/hbscbwpnkrnuvmdbfmvp/sql/new)
2. Copia el contenido de `supabase/migrations/20251016000000_documentos_google_drive.sql`
3. Pégalo y ejecuta (Run)
4. Verifica que se crearon las tablas:
   ```sql
   SELECT table_name
   FROM information_schema.tables
   WHERE table_schema = 'crm'
   AND table_name LIKE '%documento%';
   ```

### **PASO 2: Configurar Google Drive API** (30 minutos)

Sigue la guía: `CONFIGURAR_GOOGLE_DRIVE_API.md`

**En resumen:**
1. Crear proyecto en [Google Cloud Console](https://console.cloud.google.com)
2. Habilitar Google Drive API
3. Crear credenciales OAuth 2.0
4. Copiar Client ID y Client Secret
5. Agregar a `.env.local`:
   ```bash
   GOOGLE_DRIVE_CLIENT_ID=tu-client-id
   GOOGLE_DRIVE_CLIENT_SECRET=tu-secreto
   GOOGLE_DRIVE_REDIRECT_URI=http://localhost:3001/api/google/callback
   ```

### **PASO 3: Crear APIs y Pages** (Pendiente)

**Necesitamos crear:**

1. **API Routes**:
   - `/api/google/auth` - Iniciar OAuth
   - `/api/google/callback` - Callback de OAuth
   - `/api/google/sync` - Sincronizar archivos
   - `/api/documentos/[...]` - CRUD de documentos

2. **Pages**:
   - `/dashboard/documentos` - Lista de documentos
   - `/dashboard/documentos/[id]` - Ver documento
   - Componentes para upload y gestión

3. **Componentes**:
   - `<DocumentosList />` - Vista de archivos
   - `<DocumentoUploader />` - Subir archivos
   - `<GoogleDriveSync />` - Sincronización
   - `<CarpetasTree />` - Árbol de carpetas

---

## 🎯 FUNCIONALIDADES QUE TENDRÁS

### **Para Usuarios:**
- ✅ Ver documentos organizados por carpetas
- ✅ Buscar documentos por nombre, tipo, tags
- ✅ Subir archivos a Supabase o Google Drive
- ✅ Descargar archivos
- ✅ Ver historial de actividades (quién subió, cuándo, etc.)
- ✅ Filtrar por proyecto, lote, cliente
- ✅ Compartir documentos con otros usuarios

### **Para Administradores:**
- ✅ Conectar/desconectar Google Drive
- ✅ Sincronizar automáticamente archivos
- ✅ Ver estadísticas de almacenamiento
- ✅ Gestionar carpetas
- ✅ Control de acceso por documento
- ✅ Auditoría completa

---

## 🗂️ ESTRUCTURA DE CARPETAS

Las carpetas predefinidas que se crean automáticamente:

1. **Contratos** - Contratos de compra-venta y alquiler
2. **Escrituras** - Escrituras públicas y documentos notariales
3. **Planos** - Planos arquitectónicos y técnicos
4. **Fotos** - Fotografías de propiedades
5. **Legal** - Documentos legales y jurídicos
6. **Financiero** - Documentos financieros y contables
7. **Marketing** - Material de marketing y publicidad
8. **Clientes** - Documentos de clientes

Cada carpeta puede tener subcarpetas ilimitadas.

---

## 💡 EJEMPLO DE USO

### **Caso 1: Subir contrato de cliente**

```
Usuario → Upload contrato.pdf
  ↓
CRM guarda en:
  - Google Drive: /AMERSUR CRM/Contratos/2025/cliente-123.pdf
  - Base de datos: metadata (nombre, fecha, tamaño, etc.)
  ↓
Vincula a cliente_id en la tabla documento
  ↓
Usuario puede ver el contrato en la ficha del cliente
```

### **Caso 2: Sincronización automática**

```
Admin → Conecta Google Drive
  ↓
CRM cada 1 hora:
  1. Lee carpeta raíz en Drive
  2. Compara con documentos en BD
  3. Sincroniza nuevos archivos
  4. Actualiza metadata
```

---

## 📊 ESQUEMA DE BASE DE DATOS

```
carpeta_documento
├── id
├── nombre
├── carpeta_padre_id (self-reference)
├── google_drive_folder_id
└── color, icono, posicion

documento
├── id
├── nombre, descripcion
├── carpeta_id (FK → carpeta_documento)
├── storage_tipo (supabase | google_drive | externo)
├── supabase_path
├── google_drive_file_id
├── url_externo
├── tipo_mime, extension, tamano_bytes
├── tipo_documento, tags
├── proyecto_id, lote_id, cliente_id (FKs)
├── es_publico, compartido_con
└── created_by, updated_by

documento_actividad
├── id
├── documento_id (FK → documento)
├── usuario_id (FK → auth.users)
├── accion (subido, descargado, eliminado, compartido)
├── detalles (JSONB)
└── created_at

google_drive_sync_config
├── id
├── nombre, descripcion
├── client_id, client_secret
├── refresh_token, access_token
├── root_folder_id
├── auto_sync, sync_interval_minutes
└── activo
```

---

## 🔐 SEGURIDAD

### **Implementado:**
- ✅ RLS (Row Level Security) en todas las tablas
- ✅ Solo propietarios y admins pueden editar/eliminar
- ✅ Documentos públicos vs privados
- ✅ Compartir con usuarios específicos
- ✅ Auditoría completa de acciones

### **Mejores Prácticas:**
- 🔒 Refresh tokens encriptados en BD
- 🔒 Access tokens efímeros (1h vida)
- 🔒 Scopes mínimos de Google Drive
- 🔒 Validación de tipos de archivo
- 🔒 Límites de tamaño por tipo de usuario

---

## 🚀 SIGUIENTE: Crear el Frontend

¿Quieres que creemos ahora:

1. **La página principal de Documentos** (`/dashboard/documentos`)
2. **Los API endpoints** para subir/bajar archivos
3. **El componente de sincronización** con Google Drive
4. **Probar la funcionalidad completa**

O prefieres esperar a que se aprueben las plantillas de WhatsApp primero?

---

**Estado Actual:**
- ✅ Base de datos lista
- ✅ Servicio de Google Drive listo
- ✅ Dependencias instaladas
- ⏳ Falta: APIs y Frontend
- ⏳ Falta: Configurar OAuth en Google

---

**Archivos Creados:**
- `supabase/migrations/20251016000000_documentos_google_drive.sql`
- `src/lib/google-drive/client.ts`
- `CONFIGURAR_GOOGLE_DRIVE_API.md`
- `SISTEMA_DOCUMENTOS_RESUMEN.md` (este archivo)

**Fecha**: 2025-10-16
