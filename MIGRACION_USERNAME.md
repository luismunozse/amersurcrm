# 🔄 Migración a Sistema de Username

## Resumen

Se ha implementado un sistema de **username único** para identificar usuarios en el CRM. Los usuarios seguirán haciendo login con **DNI + contraseña**, pero internamente se usará el **username** como identificador.

### Cambios Principales:

1. ✅ Nuevo campo `username` en `usuario_perfil` (único, requerido)
2. ✅ Generación automática de username al crear usuarios
3. ✅ Nueva columna `vendedor_username` en tabla `cliente`
4. ✅ UI actualizada para mostrar @username
5. ✅ Scripts de migración de datos

---

## 📋 PLAN DE MIGRACIÓN (Paso a Paso)

### **Paso 1: Ejecutar Migraciones de Estructura**

```sql
-- En Supabase SQL Editor, ejecutar en orden:

-- 1. Agregar campo username a usuario_perfil
\i supabase/migrations/20250205000001_add_username_field.sql

-- 2. Agregar columna vendedor_username a cliente
\i supabase/migrations/20250205000002_update_vendedor_asignado_to_username.sql
```

### **Paso 2: Generar Usernames y Migrar Datos**

```sql
-- En Supabase SQL Editor, ejecutar:
\i scripts/migrate_to_username.sql

-- Este script:
-- 1. Genera username para todos los usuarios existentes
-- 2. Migra vendedor_asignado (email/UUID) -> vendedor_username
-- 3. Muestra reporte de verificación
```

### **Paso 3: Verificar Migración**

```sql
-- Verificar que todos los usuarios tienen username
SELECT COUNT(*) as sin_username
FROM crm.usuario_perfil
WHERE username IS NULL OR username = '';
-- Debe retornar: 0

-- Verificar migración de vendedores
SELECT
    COUNT(*) as total_clientes,
    COUNT(vendedor_asignado) as con_vendedor_antiguo,
    COUNT(vendedor_username) as con_vendedor_nuevo
FROM crm.cliente;
```

### **Paso 4: Cambiar Columna Definitiva (Después de Verificar)**

```sql
-- SOLO ejecutar después de verificar que todo funciona correctamente:

-- Renombrar columnas
ALTER TABLE crm.cliente
    DROP COLUMN IF EXISTS vendedor_asignado;

ALTER TABLE crm.cliente
    RENAME COLUMN vendedor_username TO vendedor_asignado;

-- Actualizar comentario
COMMENT ON COLUMN crm.cliente.vendedor_asignado
    IS 'Username del vendedor asignado (ej: jperez, mlopez)';
```

---

## 🎯 CÓMO FUNCIONA

### **Login (no cambia)**
```
Usuario ingresa:
- DNI: 12345678
- Password: ****

Sistema valida con Supabase Auth usando DNI
```

### **Username (nuevo)**
```
Usuario: Juan Pérez García
- DNI: 12345678 (para login)
- Username: jperez (identificador interno)
- Email: juan@correo.com (opcional)
```

### **Generación Automática de Username**

| Nombre Completo | Username Generado |
|-----------------|-------------------|
| Juan Pérez García | `jperez` |
| María López | `mlopez` |
| José Luis Rodríguez | `jrodriguez` |
| Ana María Torres Silva | `atorres` |

**Reglas:**
- Primera letra del nombre + último apellido
- Todo en minúsculas, sin tildes
- Solo letras y números
- Si existe, agrega número: `jperez2`, `jperez3`

### **En la UI**

**Antes:**
```
Juan Pérez García
juan@correo.com
```

**Ahora:**
```
Juan Pérez García
@jperez
```

---

## 🔗 RELACIONES ACTUALIZADAS

### **Cliente → Vendedor**

**Antes:**
```sql
cliente.vendedor_asignado = 'juan@correo.com' (email)
-- o
cliente.vendedor_asignado = 'uuid-del-usuario' (UUID)
```

**Ahora:**
```sql
cliente.vendedor_asignado = 'jperez' (username)
```

### **Ventajas:**
1. ✅ Más legible en la UI
2. ✅ Independiente del email (puede cambiar)
3. ✅ Más corto y fácil de recordar
4. ✅ Consistente en todo el sistema

---

## 📁 ARCHIVOS NUEVOS/MODIFICADOS

### **Migraciones SQL:**
- `supabase/migrations/20250205000001_add_username_field.sql`
- `supabase/migrations/20250205000002_update_vendedor_asignado_to_username.sql`

### **Scripts:**
- `scripts/migrate_to_username.sql` - Migración de datos
- `src/lib/utils/username-generator.ts` - Lógica de generación

### **Backend:**
- `src/app/api/admin/usuarios/route.ts` - Creación y listado con username

### **Frontend:**
- `src/app/dashboard/admin/usuarios/page.tsx` - UI actualizada

---

## ⚠️ IMPORTANTE

### **Antes de la Migración:**
1. ✅ Ejecutar migraciones de estructura DB
2. ✅ Ejecutar script de generación de usernames
3. ✅ Verificar que todos los usuarios tienen username
4. ✅ Verificar migración de relaciones

### **Durante la Migración:**
- Se usa columna temporal `vendedor_username`
- La columna antigua `vendedor_asignado` se mantiene como respaldo

### **Después de Verificar:**
- Eliminar columna antigua
- Renombrar `vendedor_username` → `vendedor_asignado`

---

## 🧪 TESTING

### **1. Crear Usuario Nuevo**
```
1. Ir a /dashboard/admin/usuarios
2. Crear usuario: "Carlos Ramírez"
3. Verificar que se genera @cramirez
4. Verificar que aparece en la tabla
```

### **2. Asignar Vendedor a Cliente**
```
1. Ir a /dashboard/clientes
2. Asignar vendedor a un cliente
3. Verificar que se guarda el username (no email)
```

### **3. Login con DNI**
```
1. Cerrar sesión
2. Login con DNI (12345678) y contraseña
3. Verificar que muestra @username en la UI
```

---

## 🔮 PRÓXIMOS PASOS (Flujo CRM Completo)

Con username implementado, ahora podemos conectar:

```
CLIENTE (@jperez asignado)
    ↓
VENDEDOR (@jperez)
    ↓
PROYECTO (lotes/propiedades)
    ↓
RESERVA (cliente + lote + vendedor)
    ↓
VENTA (contrato + pagos)
```

**Todas las relaciones usarán `username` para identificar vendedores:**
- `reserva.vendedor_username`
- `venta.vendedor_username`
- `interaccion.vendedor_username`
- etc.

---

## ❓ FAQ

**¿El login cambia?**
No, sigue siendo con DNI + contraseña.

**¿El email es obligatorio?**
No, el email es opcional. Se usa username como identificador.

**¿Qué pasa si dos personas tienen el mismo nombre?**
Se agrega número: `jperez`, `jperez2`, `jperez3`

**¿Se puede cambiar el username?**
Sí, pero requiere actualizar todas las relaciones. Mejor no cambiarlo.

**¿Cómo se muestra en reportes?**
Se puede hacer JOIN con `usuario_perfil` para obtener nombre completo desde username.

---

## 📊 CONSULTAS ÚTILES

```sql
-- Listar todos los usuarios con sus usernames
SELECT username, nombre_completo, dni, email
FROM crm.usuario_perfil
ORDER BY username;

-- Ver clientes con su vendedor asignado
SELECT
    c.nombre as cliente,
    c.vendedor_asignado as vendedor_username,
    up.nombre_completo as vendedor_nombre
FROM crm.cliente c
LEFT JOIN crm.usuario_perfil up ON up.username = c.vendedor_asignado;

-- Contar clientes por vendedor
SELECT
    vendedor_asignado as username,
    COUNT(*) as total_clientes
FROM crm.cliente
WHERE vendedor_asignado IS NOT NULL
GROUP BY vendedor_asignado
ORDER BY total_clientes DESC;
```

---

**¿Listo para migrar? Sigue los pasos en orden y verifica cada uno antes de continuar.** 🚀
