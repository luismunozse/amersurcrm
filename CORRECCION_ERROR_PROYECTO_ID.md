# 🔧 CORRECCIÓN: Error de proyecto_id NULL

## ❌ **PROBLEMA IDENTIFICADO**

```
Error: null value in column "proyecto_id" of relation "propiedad" violates not-null constraint
```

**Causa**: La columna `proyecto_id` en la base de datos no permite valores `NULL`, pero el sistema está intentando crear propiedades independientes (sin proyecto).

## ✅ **SOLUCIONES IMPLEMENTADAS**

### **1. Código Corregido:**
- ✅ **Wizard**: Manejo correcto de string vacío vs null
- ✅ **Acción del servidor**: Conversión de string vacío a null
- ✅ **Validación**: Verificación antes de insertar

### **2. Script SQL de Corrección:**
- ✅ **Archivo creado**: `supabase/fix_proyecto_id_nullable.sql`
- ✅ **Comando**: `ALTER TABLE crm.propiedad ALTER COLUMN proyecto_id DROP NOT NULL;`

## 🚀 **PASOS PARA CORREGIR**

### **Opción 1: Ejecutar Script SQL (Recomendado)**

1. **Abrir Supabase Dashboard**
2. **Ir a SQL Editor**
3. **Ejecutar el script** `supabase/fix_proyecto_id_nullable.sql`:

```sql
-- Verificar estado actual
SELECT column_name, is_nullable, data_type 
FROM information_schema.columns 
WHERE table_schema = 'crm' 
AND table_name = 'propiedad' 
AND column_name = 'proyecto_id';

-- Corregir la columna
ALTER TABLE crm.propiedad ALTER COLUMN proyecto_id DROP NOT NULL;

-- Verificar que se aplicó
SELECT column_name, is_nullable, data_type 
FROM information_schema.columns 
WHERE table_schema = 'crm' 
AND table_name = 'propiedad' 
AND column_name = 'proyecto_id';
```

### **Opción 2: Recrear la Tabla (Si es necesario)**

Si la opción 1 no funciona, ejecutar la migración completa:

```sql
-- Eliminar tabla existente (¡CUIDADO: esto borra los datos!)
DROP TABLE IF EXISTS crm.propiedad CASCADE;

-- Ejecutar la migración completa
-- (Copiar y pegar todo el contenido de supabase/migrations/2025-09-14_050_propiedades.sql)
```

## 🔍 **VERIFICACIÓN**

Después de ejecutar la corrección, verificar que:

1. **La columna permite NULL**:
   ```sql
   SELECT column_name, is_nullable 
   FROM information_schema.columns 
   WHERE table_schema = 'crm' 
   AND table_name = 'propiedad' 
   AND column_name = 'proyecto_id';
   ```
   Debe mostrar: `is_nullable = 'YES'`

2. **El sistema funciona**:
   - Crear una propiedad independiente (sin proyecto)
   - Crear una propiedad vinculada a proyecto
   - Ambas deben funcionar sin errores

## 📋 **ARCHIVOS MODIFICADOS**

### **Código:**
- ✅ `src/components/PropiedadWizard.tsx` - Manejo de string vacío
- ✅ `src/app/dashboard/propiedades/_actions.ts` - Conversión a null

### **Base de Datos:**
- ✅ `supabase/fix_proyecto_id_nullable.sql` - Script de corrección

## 🎯 **RESULTADO ESPERADO**

Después de aplicar la corrección:

- ✅ **Propiedades independientes** se crean correctamente
- ✅ **Propiedades vinculadas** a proyecto funcionan
- ✅ **Sin errores** de constraint
- ✅ **Sistema completamente funcional**

## ⚠️ **NOTA IMPORTANTE**

Si tienes datos existentes en la tabla `propiedad`, la **Opción 1** es segura y no afecta los datos existentes. La **Opción 2** solo debe usarse si la primera no funciona y estás dispuesto a perder los datos existentes.
