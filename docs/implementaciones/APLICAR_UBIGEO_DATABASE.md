# 🗺️ Aplicar Sistema UBIGEO con Base de Datos

## ✅ **Instrucciones de Aplicación**

### **1. Aplicar Migraciones en Supabase**

Ejecuta estas migraciones en el **SQL Editor** de Supabase en este orden:

```sql
-- 1. Primero el esquema
-- Copia y pega el contenido de: supabase/migrations/20250115000003_ubigeo_schema.sql

-- 2. Luego los datos iniciales  
-- Copia y pega el contenido de: supabase/migrations/20250115000004_ubigeo_seed.sql
```

### **2. Verificar Instalación**

Ejecuta estas consultas para verificar que todo esté funcionando:

```sql
-- Verificar departamentos
SELECT * FROM api_get_departamentos() LIMIT 5;

-- Verificar provincias de Lima
SELECT * FROM api_get_provincias('15') LIMIT 5;

-- Verificar distritos de Lima
SELECT * FROM api_get_distritos('1501') LIMIT 5;

-- Búsqueda de prueba
SELECT * FROM api_search_ubigeo('miraflores', 5);
```

### **3. Probar APIs**

```bash
# Departamentos
curl "http://localhost:3000/api/ubigeo/departamentos"

# Provincias de Lima
curl "http://localhost:3000/api/ubigeo/provincias?dep=15"

# Distritos de Lima
curl "http://localhost:3000/api/ubigeo/distritos?prov=1501"

# Búsqueda
curl "http://localhost:3000/api/ubigeo/search?q=miraflores"
```

## 🚀 **Ventajas del Nuevo Sistema**

### **✅ Rendimiento Superior**
- **Índices trigram** para búsquedas rápidas
- **Cache-Control** en APIs (24h para datos estáticos)
- **Consultas optimizadas** con RPC functions

### **✅ Funcionalidades Avanzadas**
- **Búsqueda por texto** con ranking de relevancia
- **Búsquedas "typeahead"** con trigram
- **APIs RESTful** bien estructuradas

### **✅ Arquitectura Sólida**
- **Normalización** correcta (departamento → provincia → distrito)
- **Integridad referencial** con foreign keys
- **Constraints** para validar consistencia de códigos

### **✅ Robustez**
- **RLS policies** para seguridad
- **Upsert idempotente** para actualizaciones
- **Validación de entrada** estricta

## 📊 **Datos Incluidos**

- **25 departamentos** de Perú
- **Lima Metropolitana** completa (42 distritos)
- **Callao** completo (7 distritos)
- **Arequipa** como ejemplo (29 distritos)

## 🔄 **Actualizaciones Futuras**

Para agregar más datos, simplemente:

1. **Prepara un CSV** con la estructura:
```csv
dist_code,dist_nombre,prov_code,prov_nombre,dep_code,dep_nombre
150101,Lima,1501,Lima,15,Lima
...
```

2. **Ejecuta el upsert**:
```sql
-- Cargar en staging
\copy ubigeo_staging from 'datos_completos.csv' with (format csv, header true);

-- Upsert a tablas finales
INSERT INTO ubigeo_departamento(code, nombre)
SELECT DISTINCT dep_code, dep_nombre FROM ubigeo_staging
ON CONFLICT (code) DO UPDATE SET nombre = excluded.nombre;

INSERT INTO ubigeo_provincia(code, dep_code, nombre)
SELECT DISTINCT prov_code, dep_code, prov_nombre FROM ubigeo_staging
ON CONFLICT (code) DO UPDATE SET nombre = excluded.nombre, dep_code = excluded.dep_code;

INSERT INTO ubigeo_distrito(code, prov_code, dep_code, nombre)
SELECT DISTINCT dist_code, prov_code, dep_code, dist_nombre FROM ubigeo_staging
ON CONFLICT (code) DO UPDATE SET nombre = excluded.nombre, prov_code = excluded.prov_code, dep_code = excluded.dep_code;
```

## 🎯 **Resultado Final**

- ✅ **Sistema de ubicaciones** completamente funcional
- ✅ **Base de datos normalizada** y optimizada
- ✅ **APIs RESTful** con cache y validación
- ✅ **Búsquedas avanzadas** con ranking
- ✅ **Fácil mantenimiento** y actualización
- ✅ **Escalable** para todo el territorio peruano

¡El sistema está listo para producción! 🚀
