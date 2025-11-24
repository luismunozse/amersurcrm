# Instrucciones para Configurar Avatares en Producción

## 📋 Resumen

Este documento contiene las instrucciones paso a paso para completar la configuración del sistema de avatares de usuario en producción.

---

## ✅ Ya Implementado

- ✅ Componente `AvatarUpload` con drag & drop
- ✅ Integración completa en página de perfil
- ✅ Validación de archivos (JPG, PNG, WebP, max 2MB)
- ✅ Preview antes de subir
- ✅ Botones para cambiar/eliminar avatar
- ✅ Migración SQL para agregar campo `avatar_url`
- ✅ Props actualizados en Header, DashboardClient, Layout
- ✅ Página de Ayuda completa
- ✅ Página de Reportar Problema con formulario

---

## 🚀 Pasos para Producción

### **Paso 1: Aplicar Migración SQL**

```bash
# Opción 1: Usando Supabase CLI
supabase db push

# Opción 2: Ejecutar directamente en Supabase Dashboard
# Ve a SQL Editor y ejecuta el contenido de:
# supabase/migrations/20251014000000_add_avatar_url_to_usuario_perfil.sql
```

**Verificar que se ejecutó correctamente:**
```sql
-- Verificar que la columna existe
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'crm'
AND table_name = 'usuario_perfil'
AND column_name = 'avatar_url';

-- Debería retornar:
-- column_name | data_type
-- avatar_url  | text
```

---

### **Paso 2: Crear Bucket de Storage en Supabase**

1. **Ir a Supabase Dashboard** → Storage → Create a new bucket

2. **Configuración del Bucket:**
   - **Bucket name**: `avatars`
   - **Public bucket**: ✅ YES (para que las imágenes sean accesibles públicamente)
   - Click en "Create bucket"

3. **Verificar que se creó:**
   ```sql
   SELECT id, name, public
   FROM storage.buckets
   WHERE name = 'avatars';

   -- Debería retornar:
   -- id      | name    | public
   -- avatars | avatars | true
   ```

---

### **Paso 3: Configurar Políticas de RLS para Storage**

**En Supabase Dashboard → Storage → avatars → Policies**

#### **Política 1: Lectura Pública**
```sql
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');
```

#### **Política 2: Upload (INSERT)**
```sql
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

#### **Política 3: Update**
```sql
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

#### **Política 4: Delete**
```sql
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

**Explicación:**
- `auth.uid()` = ID del usuario autenticado
- `(storage.foldername(name))[1]` = Primer segmento del path (user_id)
- Los archivos se guardan como: `avatars/{user_id}/avatar.{ext}`

---

### **Paso 4: Verificar Configuración**

#### **4.1. Verificar Bucket:**
```sql
-- Debe retornar el bucket avatars
SELECT * FROM storage.buckets WHERE name = 'avatars';
```

#### **4.2. Verificar Políticas:**
```sql
-- Debe retornar 4 políticas
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'objects'
AND schemaname = 'storage'
AND policyname LIKE '%avatar%';
```

#### **4.3. Verificar Columna:**
```sql
-- Verificar que avatar_url existe en usuario_perfil
SELECT id, username, avatar_url
FROM crm.usuario_perfil
LIMIT 5;
```

---

### **Paso 5: Probar el Sistema**

#### **5.1. Probar Upload:**

1. Ir a `/dashboard/perfil`
2. Click en el botón de cámara en el avatar
3. Seleccionar una imagen (JPG, PNG o WebP, max 2MB)
4. Verificar que:
   - Se muestra un preview
   - Aparece el spinner de carga
   - Se muestra el toast de éxito
   - La página se refresca y muestra la nueva imagen

#### **5.2. Verificar en BD:**
```sql
-- Verificar que se guardó la URL
SELECT id, username, avatar_url
FROM crm.usuario_perfil
WHERE avatar_url IS NOT NULL;
```

#### **5.3. Verificar en Storage:**
En Supabase Dashboard → Storage → avatars → Debería ver carpetas con los user IDs

#### **5.4. Verificar URL pública:**
La URL debe ser accesible directamente:
```
https://[project-id].supabase.co/storage/v1/object/public/avatars/[user-id]/avatar.jpg
```

---

### **Paso 6: Probar Otras Funcionalidades**

#### **6.1. Probar Badge de Notificaciones:**
- El avatar en el header debe mostrar un badge rojo con número si hay notificaciones

#### **6.2. Probar Último Acceso:**
- Abrir el menú de usuario (click en avatar)
- Debe mostrar "Último acceso: hace Xh" debajo del rol

#### **6.3. Probar Drawer en Mobile:**
- Abrir en viewport < 640px
- El menú debe aparecer desde abajo como drawer
- Debe tener handle visual (barrita)

#### **6.4. Probar Páginas Nuevas:**
- `/dashboard/ayuda` → Debe mostrar recursos y soporte
- `/dashboard/reportar-problema` → Debe mostrar formulario

---

## 🐛 Troubleshooting

### **Error: "Error al subir la imagen"**

**Posibles causas:**
1. Bucket no existe → Verificar Paso 2
2. Políticas de RLS incorrectas → Verificar Paso 3
3. Usuario no autenticado → Verificar sesión

**Solución:**
```sql
-- Verificar políticas
SELECT * FROM pg_policies
WHERE tablename = 'objects'
AND schemaname = 'storage';

-- Si no hay políticas, ejecutar Paso 3 nuevamente
```

---

### **Error: "Error al actualizar el perfil"**

**Posibles causas:**
1. Campo `avatar_url` no existe → Verificar Paso 1
2. RLS de `usuario_perfil` bloquea la actualización

**Solución:**
```sql
-- Verificar columna
\d crm.usuario_perfil

-- Verificar RLS
SELECT * FROM pg_policies
WHERE tablename = 'usuario_perfil';
```

---

### **Avatar no se muestra en el header**

**Posibles causas:**
1. Props no se pasan correctamente
2. URL no es pública

**Solución:**
```typescript
// Verificar en DevTools Console
console.log('Avatar URL:', userAvatarUrl);

// Debe imprimir la URL completa
// Si es null/undefined, verificar que se pasa desde layout.tsx
```

---

### **Imagen no carga (error 404)**

**Posibles causas:**
1. Bucket no es público
2. Política de SELECT falta

**Solución:**
```sql
-- Hacer bucket público
UPDATE storage.buckets
SET public = true
WHERE name = 'avatars';

-- Agregar política de SELECT (Paso 3 - Política 1)
```

---

## 📊 Estructura de Archivos

```
avatars/
  └── {user-id}/
      └── avatar.{ext}
```

**Ejemplo:**
```
avatars/
  └── 123e4567-e89b-12d3-a456-426614174000/
      └── avatar.jpg
```

---

## 🔐 Seguridad

### **Validaciones Implementadas:**

1. **Tipo de archivo:**
   - Solo JPG, PNG, WebP
   - Validado en el cliente

2. **Tamaño:**
   - Máximo 2MB
   - Validado en el cliente

3. **Permisos:**
   - Usuarios solo pueden subir/modificar/eliminar su propio avatar
   - Controlado por RLS de Storage

4. **Paths:**
   - Formato forzado: `{user_id}/avatar.{ext}`
   - No permite paths arbitrarios

---

## 📈 Monitoreo

### **Queries Útiles:**

```sql
-- 1. Contar usuarios con avatar
SELECT COUNT(*)
FROM crm.usuario_perfil
WHERE avatar_url IS NOT NULL;

-- 2. Tamaño total de avatares
SELECT pg_size_pretty(SUM(metadata->>'size')::bigint)
FROM storage.objects
WHERE bucket_id = 'avatars';

-- 3. Avatares subidos recientemente
SELECT created_at, name, (metadata->>'size')::bigint as size_bytes
FROM storage.objects
WHERE bucket_id = 'avatars'
ORDER BY created_at DESC
LIMIT 10;

-- 4. Usuarios sin avatar
SELECT id, username, nombre_completo
FROM crm.usuario_perfil
WHERE avatar_url IS NULL
AND activo = true;
```

---

## 🎯 Mejoras Futuras (Opcionales)

1. **Crop de Imágenes:**
   - Integrar librería de crop (react-image-crop)
   - Permitir al usuario recortar antes de subir

2. **Compresión Automática:**
   - Usar browser-image-compression
   - Reducir tamaño antes de upload

3. **Generación de Thumbnails:**
   - Crear versiones 64x64, 128x128, 256x256
   - Usar Supabase Edge Functions

4. **Validación de Contenido:**
   - Integrar servicio de moderación (AWS Rekognition, etc.)
   - Prevenir contenido inapropiado

5. **Avatar Defaults:**
   - Generar avatares con iniciales personalizadas
   - Integrar UI Avatars API

---

## ✅ Checklist Final

Antes de marcar como completado, verificar:

- [ ] Migración SQL aplicada
- [ ] Bucket `avatars` creado y público
- [ ] 4 políticas de RLS configuradas
- [ ] Upload funciona correctamente
- [ ] Imagen se muestra en perfil
- [ ] Imagen se muestra en header
- [ ] Botón de eliminar funciona
- [ ] Badge de notificaciones visible
- [ ] Último acceso se muestra
- [ ] Drawer funciona en mobile
- [ ] Página de ayuda accesible
- [ ] Página reportar problema funciona

---

## 📞 Soporte

Si encuentras problemas:

1. Verificar logs en Supabase Dashboard → Logs
2. Verificar Network tab en DevTools
3. Verificar Console en DevTools
4. Reportar en `/dashboard/reportar-problema`

---

**Última actualización:** 2025-10-15
**Versión del sistema:** 1.0.0
