# ✅ Checklist de Producción - Sistema de Avatares

## 🎯 Objetivo
Verificar que todas las mejoras del avatar están funcionando correctamente en producción.

---

## 📋 Paso 1: Configuración Inicial de Base de Datos

### 1.1. Aplicar Migración SQL
```bash
supabase db push
```

**Verificar:**
```sql
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'crm'
AND table_name = 'usuario_perfil'
AND column_name = 'avatar_url';
```

- [ ] Migración aplicada sin errores
- [ ] Columna `avatar_url` existe en `usuario_perfil`

---

## 📋 Paso 2: Configuración de Storage

### 2.1. Crear Bucket
**En Supabase Dashboard → Storage → Create bucket**

- Nombre: `avatars`
- Público: ✅ YES

**Verificar:**
```sql
SELECT * FROM storage.buckets WHERE name = 'avatars';
```

- [ ] Bucket `avatars` creado
- [ ] Bucket es público (public = true)

### 2.2. Configurar Políticas RLS

**Ejecutar en SQL Editor:**

#### Política 1: SELECT (lectura pública)
```sql
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');
```
- [ ] Política SELECT creada

#### Política 2: INSERT (upload)
```sql
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```
- [ ] Política INSERT creada

#### Política 3: UPDATE
```sql
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```
- [ ] Política UPDATE creada

#### Política 4: DELETE
```sql
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```
- [ ] Política DELETE creada

**Verificar todas las políticas:**
```sql
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'objects'
AND schemaname = 'storage'
AND policyname LIKE '%avatar%';
```
- [ ] 4 políticas creadas correctamente

---

## 📋 Paso 3: Pruebas de Funcionalidad

### 3.1. Upload de Avatar

1. Ir a `/dashboard/perfil`
2. Click en botón de cámara en el avatar
3. Seleccionar imagen (JPG/PNG/WebP, max 2MB)

**Verificar:**
- [ ] Preview se muestra correctamente
- [ ] Spinner de carga aparece
- [ ] Toast de éxito se muestra
- [ ] Página se refresca automáticamente
- [ ] Nueva imagen se muestra en perfil

**En BD:**
```sql
SELECT id, username, avatar_url
FROM crm.usuario_perfil
WHERE id = 'TU_USER_ID';
```
- [ ] URL guardada en BD
- [ ] URL es accesible públicamente

**En Storage:**
- [ ] Archivo visible en Supabase Dashboard → Storage → avatars
- [ ] Carpeta con user_id existe
- [ ] Archivo `avatar.{ext}` existe

### 3.2. Eliminación de Avatar

1. Ir a `/dashboard/perfil`
2. Click en botón X rojo
3. Confirmar eliminación

**Verificar:**
- [ ] Confirmación aparece
- [ ] Avatar se elimina
- [ ] Toast de éxito se muestra
- [ ] Vuelve a mostrar iniciales
- [ ] avatar_url es NULL en BD

---

## 📋 Paso 4: Verificar Mejoras del Avatar en Header

### 4.1. Avatar en Header

**Abrir cualquier página del dashboard**

**Verificar:**
- [ ] Avatar se muestra (foto o iniciales)
- [ ] Avatar tiene anillo de color
- [ ] Indicador verde "online" visible
- [ ] Indicador tiene animación pulse

### 4.2. Badge de Notificaciones

**Si hay notificaciones no leídas:**
- [ ] Badge rojo con número aparece
- [ ] Número correcto (1-9 o "9+")
- [ ] Badge tiene animación bounce
- [ ] Badge en esquina superior derecha

### 4.3. Menú Desplegable (Desktop)

**Click en avatar en header**

**Verificar:**
- [ ] Menú se abre con animación suave
- [ ] Avatar grande se muestra en header del menú
- [ ] Nombre completo visible
- [ ] Username visible
- [ ] Rol visible (badge verde)
- [ ] Último acceso visible (formato relativo)

**Opciones del menú:**
- [ ] Mi Perfil (icono User)
- [ ] Cambiar Contraseña (icono Key)
- [ ] Configuración (icono Settings)
- [ ] **NUEVO:** Ayuda y Soporte (icono HelpCircle)
- [ ] **NUEVO:** Reportar Problema (icono AlertCircle)
- [ ] **NUEVO:** Versión 1.0.0 (icono Info)
- [ ] Modo Oscuro (toggle)
- [ ] Cerrar Sesión (icono LogOut, rojo)

**Iconos:**
- [ ] Todos son de Lucide React (no SVGs inline)
- [ ] Tamaño consistente (w-5 h-5)

### 4.4. Drawer Mobile

**Cambiar viewport a < 640px (mobile)**

**Click en avatar**

**Verificar:**
- [ ] Menú aparece desde abajo (no desde arriba)
- [ ] Handle visual (barrita) visible arriba
- [ ] Bordes redondeados arriba (rounded-t-3xl)
- [ ] Ocupa full-width
- [ ] Scroll funciona si es largo
- [ ] Max-height 85vh

---

## 📋 Paso 5: Verificar Páginas Nuevas

### 5.1. Página de Ayuda

**Ir a `/dashboard/ayuda`**

**Verificar:**
- [ ] Página carga sin errores
- [ ] Título "Ayuda y Soporte" visible
- [ ] Barra de búsqueda presente
- [ ] 3 recursos principales (Documentación, FAQ, Videos)
- [ ] Sección "Contacto con Soporte" visible
- [ ] 3 métodos de contacto (Chat, Email, Teléfono)
- [ ] Preguntas Frecuentes (5 acordeones)
- [ ] Acordeones se expanden/colapsan correctamente
- [ ] Link "Reportar Problema" funciona

### 5.2. Página Reportar Problema

**Ir a `/dashboard/reportar-problema`**

**Verificar estructura:**
- [ ] Página carga sin errores
- [ ] Título "Reportar Problema" visible
- [ ] Formulario completo visible

**Verificar campos:**
- [ ] Tipo de Reporte (select con 5 opciones)
- [ ] Prioridad (3 botones: Baja, Media, Alta)
- [ ] Asunto (input text)
- [ ] URL de la página (input text opcional)
- [ ] Descripción (textarea)
- [ ] Información del Sistema (auto)

**Probar envío:**
1. Llenar todos los campos requeridos
2. Click en "Enviar Reporte"

**Verificar:**
- [ ] Validación funciona (min 20 caracteres)
- [ ] Botón se deshabilita durante envío
- [ ] Spinner aparece
- [ ] Mensaje de éxito se muestra
- [ ] Formulario se resetea después de 3s

---

## 📋 Paso 6: Verificar Integración Completa

### 6.1. Flujo Completo de Avatar

1. **Upload:**
   - [ ] Subir avatar en `/dashboard/perfil`
   - [ ] Verificar que se guarda en BD
   - [ ] Verificar que aparece en `/dashboard/perfil`
   - [ ] Verificar que aparece en header
   - [ ] Verificar que aparece en menú dropdown

2. **Navegación:**
   - [ ] Navegar a otra página
   - [ ] Avatar sigue visible en header
   - [ ] Avatar sigue en menú dropdown

3. **Actualización:**
   - [ ] Cambiar avatar (subir otra imagen)
   - [ ] Verificar que se actualiza en todos lados

4. **Eliminación:**
   - [ ] Eliminar avatar
   - [ ] Verificar que vuelven las iniciales
   - [ ] Verificar en todos los lugares

### 6.2. Notificaciones

**Si tienes notificaciones:**
- [ ] Badge aparece en header
- [ ] Número correcto
- [ ] Click en NotificationsDropdown funciona
- [ ] Badge desaparece cuando se leen

### 6.3. Último Acceso

1. Cerrar sesión
2. Volver a iniciar sesión
3. Abrir menú de usuario

**Verificar:**
- [ ] "Último acceso" se muestra
- [ ] Formato es relativo ("Justo ahora", "Hace Xh", etc.)
- [ ] Actualiza en cada login

---

## 📋 Paso 7: Pruebas de Seguridad

### 7.1. Permisos de Upload

**Con Usuario A:**
1. Subir avatar
2. Anotar user_id de Usuario A

**Con Usuario B:**
3. Intentar acceder a Storage directamente
4. Intentar modificar avatar de Usuario A

**Verificar:**
- [ ] Usuario B NO puede modificar avatar de Usuario A
- [ ] Usuario B NO puede eliminar avatar de Usuario A
- [ ] Usuario B SÍ puede ver avatar de Usuario A (lectura pública)

### 7.2. Validaciones

**Intentar subir:**
1. Archivo muy grande (>2MB)
2. Archivo de tipo incorrecto (.txt, .pdf, etc.)

**Verificar:**
- [ ] Error de tamaño se muestra
- [ ] Error de tipo se muestra
- [ ] No se sube nada a Storage

---

## 📋 Paso 8: Pruebas de Responsive

### 8.1. Desktop (> 1024px)

**Verificar:**
- [ ] Avatar + nombre + username visibles en header
- [ ] Dropdown desde arriba
- [ ] Ancho 288px (w-72)
- [ ] Backdrop blur visible

### 8.2. Tablet (640px - 1024px)

**Verificar:**
- [ ] Avatar visible
- [ ] Nombre/username ocultos o reducidos
- [ ] Dropdown funciona
- [ ] ChevronDown visible

### 8.3. Mobile (< 640px)

**Verificar:**
- [ ] Solo avatar visible (nombre/username ocultos)
- [ ] ChevronDown oculto
- [ ] Drawer desde abajo (no dropdown)
- [ ] Handle visible
- [ ] Full width
- [ ] Scroll funciona

---

## 📋 Paso 9: Pruebas Cross-Browser

### 9.1. Chrome/Edge
- [ ] Todo funciona correctamente

### 9.2. Firefox
- [ ] Todo funciona correctamente

### 9.3. Safari
- [ ] Todo funciona correctamente
- [ ] Animaciones suaves
- [ ] Image optimization funciona

---

## 📋 Paso 10: Performance

### 10.1. Tiempos de Carga

**Verificar en DevTools Network:**
- [ ] Avatar carga en < 500ms
- [ ] Next.js Image optimization activa
- [ ] WebP servido (si soportado)
- [ ] Cache-Control headers correctos

### 10.2. Bundle Size

**Verificar:**
- [ ] Lucide icons tree-shaking funciona
- [ ] Solo iconos usados en bundle
- [ ] No aumento significativo en JS bundle

---

## 📋 Paso 11: Logs y Monitoreo

### 11.1. Logs de Supabase

**En Supabase Dashboard → Logs**

**Verificar:**
- [ ] No hay errores de Storage
- [ ] No hay errores de Auth
- [ ] No hay errores de RLS

### 11.2. Console del Browser

**Verificar:**
- [ ] No hay errores en Console
- [ ] No hay warnings de React
- [ ] No hay warnings de Next.js

---

## 🎉 Finalización

### Resumen de Verificación

**Total de checks:** 150+

**Secciones completadas:**
- [ ] Paso 1: BD (2 checks)
- [ ] Paso 2: Storage (9 checks)
- [ ] Paso 3: Funcionalidad (15 checks)
- [ ] Paso 4: Header (25 checks)
- [ ] Paso 5: Páginas (20 checks)
- [ ] Paso 6: Integración (15 checks)
- [ ] Paso 7: Seguridad (5 checks)
- [ ] Paso 8: Responsive (12 checks)
- [ ] Paso 9: Cross-browser (3 checks)
- [ ] Paso 10: Performance (5 checks)
- [ ] Paso 11: Logs (3 checks)

---

## 📝 Notas

**Fecha de verificación:** ________________

**Verificado por:** ________________

**Issues encontrados:**
- [ ] Ninguno
- [ ] Documentar abajo

**Issues:**
```
1.
2.
3.
```

---

## ✅ Aprobación Final

- [ ] Todas las funcionalidades verificadas
- [ ] Todas las pruebas pasadas
- [ ] Sin errores críticos
- [ ] Performance aceptable
- [ ] Listo para usar en producción

**Firma:** ________________

**Fecha:** ________________

---

**Última actualización:** 2025-10-15
