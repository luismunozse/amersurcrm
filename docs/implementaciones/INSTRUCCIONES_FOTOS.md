# 📸 Instrucciones para Habilitar las Fotos en el CRM

## 🚨 **PASO CRÍTICO: Ejecutar SQL en Supabase**

Para que las fotos funcionen correctamente, necesitas ejecutar este SQL en tu dashboard de Supabase:

### 1. Ve a Supabase Dashboard
- Abre tu proyecto en [supabase.com](https://supabase.com)
- Ve a **SQL Editor**

### 2. Ejecuta este SQL:
```sql
-- Agregar columna data a la tabla lote
ALTER TABLE crm.lote 
ADD COLUMN IF NOT EXISTS data jsonb;

-- Crear índice para búsquedas
CREATE INDEX IF NOT EXISTS idx_lote_data ON crm.lote USING gin (data);

-- Actualizar moneda por defecto a PEN
ALTER TABLE crm.lote 
ALTER COLUMN moneda SET DEFAULT 'PEN';

-- Comentario para documentar
COMMENT ON COLUMN crm.lote.data IS 'Datos adicionales del lote: fotos, plano, renders, links3D, proyecto, ubicacion, etapa, identificador, manzana, numero, condiciones, descuento';
```

### 3. Reinicia la aplicación
```bash
npm run dev
```

## ✅ **Funcionalidades Implementadas**

### **Wizard de Lotes Mejorado:**
- ✅ **Carga de imágenes**: Drag & drop + click para subir
- ✅ **Validación**: Máximo 10 fotos, 5 renders
- ✅ **Formatos**: PNG, JPG, JPEG hasta 10MB
- ✅ **Preview**: Muestra cantidad de archivos seleccionados

### **Vista de Tarjetas:**
- ✅ **Imagen principal**: Primera foto cargada
- ✅ **Fallback**: Placeholder elegante si no hay imagen
- ✅ **Contadores**: Fotos, renders, enlaces 3D
- ✅ **Error handling**: Si la imagen falla, muestra placeholder

### **Base de Datos:**
- ✅ **Columna `data`**: JSONB para almacenar multimedia
- ✅ **Índice GIN**: Para búsquedas eficientes
- ✅ **Moneda PEN**: Por defecto para Perú

## 🎯 **Cómo Usar**

### **Crear Lote con Fotos:**
1. Haz clic en **"Crear Lote"**
2. Completa los pasos 1-3 del wizard
3. En el **Paso 4 (Multimedia)**:
   - Arrastra fotos o haz clic para seleccionar
   - Sube renders 3D si los tienes
   - Agrega enlaces 3D
4. Confirma en el **Paso 5**
5. Las fotos aparecerán en las tarjetas

### **Ver Fotos en las Tarjetas:**
- La **primera foto** se muestra como imagen principal
- Los **contadores** muestran cuántas fotos/renders hay
- Si no hay fotos, se muestra un placeholder elegante

## 🔧 **Solución de Problemas**

### **Si las fotos no se muestran:**
1. ✅ Verifica que ejecutaste el SQL en Supabase
2. ✅ Reinicia la aplicación (`npm run dev`)
3. ✅ Verifica que la columna `data` existe en la tabla `lote`

### **Si hay errores de carga:**
- Las imágenes se validan automáticamente
- Solo se aceptan formatos de imagen
- Máximo 10MB por archivo
- Máximo 10 fotos por lote

## 📱 **Resultado Final**

Después de ejecutar el SQL, tendrás:
- **Wizard completo** con carga de imágenes
- **Tarjetas visuales** con fotos reales
- **Contadores de multimedia** funcionales
- **Sistema robusto** para manejar archivos

¡Las fotos se renderizarán correctamente una vez que ejecutes el SQL!
