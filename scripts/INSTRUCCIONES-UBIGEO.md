# 📋 Instrucciones para Integrar Datos INEI de Ubigeo

## 🎯 Objetivo
Integrar datos oficiales del INEI para ubigeo (departamentos, provincias, distritos) en Supabase y actualizar las APIs.

## 📝 Pasos a Seguir

### 1. 🗄️ Crear Tablas en Supabase

**Opción A: SQL Editor (Recomendado)**
1. Ve al dashboard de Supabase
2. Abre el **SQL Editor**
3. Copia y pega el contenido de `scripts/ubigeo-tables.sql`
4. Ejecuta el script

**Opción B: Terminal (Si tienes acceso)**
```bash
# Conectar a Supabase localmente
npx supabase link --project-ref TU_PROJECT_REF
npx supabase db push
```

### 2. 📊 Procesar Archivo XLSX del INEI

```bash
# 1. Coloca tu archivo XLSX del INEI en la carpeta data/
# Ejemplo: data/ubigeo-inei-completo.xlsx

# 2. Procesa el archivo para generar CSVs
node scripts/process-xlsx-manual.js data/tu-archivo-inei.xlsx

# Esto generará:
# - data/inei-csvs/departamentos.csv
# - data/inei-csvs/provincias.csv  
# - data/inei-csvs/distritos.csv
```

### 3. 📤 Importar Datos a Supabase

```bash
# Importar los CSVs generados a Supabase
export $(cat .env.local | xargs) && node scripts/import-to-supabase-manual.js

# O si prefieres cargar las variables manualmente:
export NEXT_PUBLIC_SUPABASE_URL="tu_url"
export SUPABASE_SERVICE_ROLE_KEY="tu_service_key"
node scripts/import-to-supabase-manual.js
```

### 4. 🔄 Crear Nuevos Endpoints de API

```bash
# Crear endpoints que usen Supabase
node scripts/update-api-endpoints.js
```

Esto creará:
- `/api/ubigeo-v2/departamentos`
- `/api/ubigeo-v2/provincias`
- `/api/ubigeo-v2/distritos`

### 5. 🧪 Probar los Nuevos Endpoints

```bash
# Probar departamentos
curl "http://localhost:3000/api/ubigeo-v2/departamentos"

# Probar provincias (ejemplo: Lima)
curl "http://localhost:3000/api/ubigeo-v2/provincias?dep=15"

# Probar distritos (ejemplo: Lima)
curl "http://localhost:3000/api/ubigeo-v2/distritos?prov=1501"
```

### 6. 🔧 Actualizar el Hook useUbigeo

Edita `src/hooks/useUbigeo.ts` para usar los nuevos endpoints:

```typescript
// Cambiar de:
const response = await fetch(`/api/ubigeo/departamentos`);

// A:
const response = await fetch(`/api/ubigeo-v2/departamentos`);
```

### 7. ✅ Verificar Funcionamiento

1. Reinicia el servidor de desarrollo
2. Prueba el selector de ubicación en la creación de clientes
3. Verifica que se cargan todos los departamentos, provincias y distritos

## 🔍 Verificación en Supabase

En el dashboard de Supabase, verifica que las tablas tienen datos:

```sql
-- Verificar departamentos
SELECT COUNT(*) FROM crm.departamentos;

-- Verificar provincias  
SELECT COUNT(*) FROM crm.provincias;

-- Verificar distritos
SELECT COUNT(*) FROM crm.distritos;

-- Ver algunos ejemplos
SELECT * FROM crm.departamentos LIMIT 5;
```

## 🚨 Solución de Problemas

### Error: "Could not find the table"
- Verifica que las tablas se crearon en el esquema `crm`
- Asegúrate de ejecutar el SQL en el esquema correcto

### Error: "Variables de entorno requeridas"
- Verifica que `.env.local` existe y tiene las variables correctas
- Usa `export $(cat .env.local | xargs)` antes de ejecutar scripts

### Error: "File not found"
- Verifica que el archivo XLSX está en la carpeta `data/`
- Verifica que los CSVs se generaron correctamente

### API no responde
- Verifica que el servidor está corriendo
- Revisa los logs del servidor para errores
- Verifica que Supabase está accesible

## 📈 Resultado Esperado

Al completar estos pasos deberías tener:
- ✅ 25 departamentos del Perú
- ✅ Todas las provincias (195 aprox.)
- ✅ Todos los distritos (1874 aprox.)
- ✅ APIs funcionando correctamente
- ✅ Selector de ubicación completo

## 🔄 Rollback (Si algo sale mal)

Si necesitas volver a la versión anterior:

1. Los endpoints originales siguen en `/api/ubigeo/`
2. Simplemente revierte los cambios en `useUbigeo.ts`
3. Los datos JSON originales siguen disponibles

## 📞 Soporte

Si encuentras problemas:
1. Revisa los logs del servidor
2. Verifica la consola del navegador
3. Confirma que las tablas de Supabase tienen datos
