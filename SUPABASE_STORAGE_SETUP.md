# 🗂️ CONFIGURACIÓN DE SUPABASE STORAGE PARA FOTOS

## 🚨 **PASO CRÍTICO: Configurar Storage en Supabase**

Para que las fotos funcionen correctamente, necesitas configurar Supabase Storage.

### **1. Ejecutar SQL de Configuración**

Ve a tu dashboard de Supabase → **SQL Editor** y ejecuta:

```sql
-- Configuración de Supabase Storage para el CRM
-- Ejecutar en el SQL Editor de Supabase

-- Crear buckets para multimedia
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('lotes', 'lotes', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('renders', 'renders', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('planos', 'planos', true, 52428800, ARRAY['application/pdf', 'image/jpeg', 'image/png'])
ON CONFLICT (id) DO NOTHING;

-- Políticas RLS para el bucket 'lotes'
CREATE POLICY "Usuarios autenticados pueden subir fotos de lotes" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'lotes' AND 
  auth.role() = 'authenticated'
);

CREATE POLICY "Usuarios autenticados pueden ver fotos de lotes" ON storage.objects
FOR SELECT USING (
  bucket_id = 'lotes' AND 
  auth.role() = 'authenticated'
);

CREATE POLICY "Usuarios autenticados pueden eliminar fotos de lotes" ON storage.objects
FOR DELETE USING (
  bucket_id = 'lotes' AND 
  auth.role() = 'authenticated'
);

-- Políticas RLS para el bucket 'renders'
CREATE POLICY "Usuarios autenticados pueden subir renders" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'renders' AND 
  auth.role() = 'authenticated'
);

CREATE POLICY "Usuarios autenticados pueden ver renders" ON storage.objects
FOR SELECT USING (
  bucket_id = 'renders' AND 
  auth.role() = 'authenticated'
);

CREATE POLICY "Usuarios autenticados pueden eliminar renders" ON storage.objects
FOR DELETE USING (
  bucket_id = 'renders' AND 
  auth.role() = 'authenticated'
);

-- Políticas RLS para el bucket 'planos'
CREATE POLICY "Usuarios autenticados pueden subir planos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'planos' AND 
  auth.role() = 'authenticated'
);

CREATE POLICY "Usuarios autenticados pueden ver planos" ON storage.objects
FOR SELECT USING (
  bucket_id = 'planos' AND 
  auth.role() = 'authenticated'
);

CREATE POLICY "Usuarios autenticados pueden eliminar planos" ON storage.objects
FOR DELETE USING (
  bucket_id = 'planos' AND 
  auth.role() = 'authenticated'
);
```

### **2. Verificar Configuración**

Después de ejecutar el SQL, verifica que:
- ✅ Los buckets `lotes`, `renders`, `planos` existen
- ✅ Las políticas RLS están activas
- ✅ Los buckets son públicos

### **3. Reiniciar la Aplicación**

```bash
npm run dev
```

## ✅ **FUNCIONALIDADES IMPLEMENTADAS**

### **Sistema de Storage:**
- ✅ **3 Buckets**: `lotes`, `renders`, `planos`
- ✅ **Políticas RLS**: Solo usuarios autenticados
- ✅ **Límites de tamaño**: 10MB para imágenes, 50MB para planos
- ✅ **Formatos permitidos**: JPEG, PNG, WebP, PDF

### **Wizard de Lotes:**
- ✅ **Subida automática**: Archivos se suben a Storage
- ✅ **URLs públicas**: Se generan automáticamente
- ✅ **Manejo de errores**: Si falla la subida, continúa
- ✅ **Organización**: Archivos organizados por lote

### **Tarjetas de Lotes:**
- ✅ **Imágenes reales**: URLs de Supabase Storage
- ✅ **Loading states**: Spinner mientras carga
- ✅ **Error handling**: Placeholder si falla
- ✅ **Optimización**: Carga lazy y responsive

## 🎯 **CÓMO FUNCIONA**

### **Flujo de Subida:**
1. **Usuario selecciona archivos** en el wizard
2. **Archivos se suben** a Supabase Storage
3. **URLs públicas se generan** automáticamente
4. **URLs se guardan** en la columna `data` de la BD
5. **Imágenes se muestran** en las tarjetas

### **Estructura de Storage:**
```
lotes/
  └── lote-{uuid}/
      ├── fotos/
      │   ├── 1234567890-0-foto1.jpg
      │   └── 1234567890-1-foto2.jpg
      ├── renders/
      │   └── 1234567890-0-render1.jpg
      └── plano-1234567890.pdf
```

### **Datos en Base de Datos:**
```json
{
  "fotos": [
    "https://supabase.co/storage/v1/object/public/lotes/lote-123/fotos/1234567890-0-foto1.jpg"
  ],
  "renders": [
    "https://supabase.co/storage/v1/object/public/renders/lote-123/renders/1234567890-0-render1.jpg"
  ],
  "plano": "https://supabase.co/storage/v1/object/public/planos/lote-123/plano-1234567890.pdf"
}
```

## 🔍 **VERIFICACIÓN**

### **Si las fotos NO aparecen:**
1. ✅ Verifica que ejecutaste el SQL de Storage
2. ✅ Revisa que los buckets existen en Supabase
3. ✅ Verifica que las políticas RLS están activas
4. ✅ Revisa la consola del navegador para errores

### **Si hay errores de Storage:**
- **Error 403**: Políticas RLS no configuradas
- **Error 413**: Archivo muy grande
- **Error 415**: Formato no permitido

## 🚀 **VENTAJAS DE SUPABASE STORAGE**

### **Profesional:**
- ✅ **CDN global**: Imágenes se cargan rápido
- ✅ **Escalabilidad**: Maneja millones de archivos
- ✅ **Seguridad**: Políticas RLS granulares
- ✅ **Optimización**: Compresión automática

### **Desarrollo:**
- ✅ **APIs simples**: Fácil de usar
- ✅ **Integración**: Perfecta con Supabase
- ✅ **Monitoreo**: Logs y métricas
- ✅ **Backup**: Respaldo automático

¡Una vez que ejecutes el SQL, el sistema de fotos funcionará perfectamente con Supabase Storage!
