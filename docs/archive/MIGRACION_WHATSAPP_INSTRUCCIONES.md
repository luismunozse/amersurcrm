# Instrucciones para Aplicar Migración de WhatsApp Marketing

## Archivos de Migración

Se han creado 2 versiones de la migración:

1. **Original (con error)**: `supabase/migrations/20250210000000_whatsapp_marketing_system.sql`
2. **Corregida**: `supabase/migrations/20251013004139_whatsapp_marketing_system_fixed.sql` ✅

## Cambios Realizados en la Versión Corregida

### 1. Eliminación de Foreign Key Constraint
- Se removió el constraint de Foreign Key en `vendedor_asignado` para evitar problemas de tipo entre VARCHAR y UUID
- La columna sigue siendo VARCHAR(50) y hace referencia lógica a `usuario_perfil.username`
- La integridad se mantiene a nivel de aplicación

### 2. Optimización de Índices
```sql
-- Antes:
CREATE INDEX idx_marketing_conversacion_vendedor ON crm.marketing_conversacion(vendedor_asignado);
CREATE INDEX idx_marketing_conversacion_session ON crm.marketing_conversacion(is_session_open);

-- Después (índices parciales para mejor rendimiento):
CREATE INDEX idx_marketing_conversacion_vendedor ON crm.marketing_conversacion(vendedor_asignado) WHERE vendedor_asignado IS NOT NULL;
CREATE INDEX idx_marketing_conversacion_session ON crm.marketing_conversacion(is_session_open) WHERE is_session_open = true;
```

### 3. Mejora de Políticas RLS
Se agregaron casts explícitos (`::text`) en las políticas RLS para evitar ambigüedades de tipo:

```sql
-- Antes:
WHERE up.username = marketing_conversacion.vendedor_asignado

-- Después:
WHERE up.username::text = vendedor_asignado::text
```

También se agregaron validaciones de `IS NOT NULL` para evitar comparaciones innecesarias.

## Pasos para Aplicar la Migración en Supabase

### Opción 1: Desde Supabase Dashboard (Recomendado)

1. **Accede a tu proyecto en Supabase**
   - Ve a https://supabase.com/dashboard
   - Selecciona tu proyecto

2. **Abre el SQL Editor**
   - En el menú lateral, haz clic en "SQL Editor"
   - Crea una nueva query

3. **Copia el contenido de la migración**
   ```bash
   cat supabase/migrations/20251013004139_whatsapp_marketing_system_fixed.sql
   ```
   - Copia TODO el contenido del archivo
   - Pégalo en el SQL Editor

4. **Ejecuta la migración**
   - Haz clic en "Run" o presiona Cmd/Ctrl + Enter
   - Espera a que termine (puede tardar unos segundos)

5. **Verifica que no haya errores**
   - Si hay errores, revisa el mensaje y corrige
   - Si todo está OK, deberías ver "Success"

### Opción 2: Usando Supabase CLI (Avanzado)

1. **Asegúrate de tener Supabase CLI instalado**
   ```bash
   npm install -g supabase
   ```

2. **Vincula tu proyecto**
   ```bash
   supabase link --project-ref <TU_PROJECT_REF>
   ```

3. **Aplica las migraciones pendientes**
   ```bash
   supabase db push
   ```

4. **Verifica el estado**
   ```bash
   supabase migration list
   ```

## Verificación Post-Migración

### 1. Verificar que las tablas se crearon correctamente

```sql
-- Ejecuta en SQL Editor
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'crm'
  AND table_name LIKE 'marketing_%'
ORDER BY table_name;
```

Deberías ver:
- ✅ marketing_audiencia
- ✅ marketing_automatizacion
- ✅ marketing_automatizacion_ejecucion
- ✅ marketing_campana
- ✅ marketing_channel_credential
- ✅ marketing_conversacion
- ✅ marketing_event_log
- ✅ marketing_mensaje
- ✅ marketing_template

### 2. Verificar que las columnas se agregaron a la tabla cliente

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'crm'
  AND table_name = 'cliente'
  AND column_name LIKE 'whatsapp_%'
ORDER BY column_name;
```

Deberías ver:
- ✅ whatsapp_consentimiento (boolean)
- ✅ whatsapp_consentimiento_fecha (timestamp with time zone)
- ✅ whatsapp_opt_out (boolean)
- ✅ whatsapp_opt_out_fecha (timestamp with time zone)
- ✅ whatsapp_opt_out_motivo (text)

### 3. Verificar funciones

```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'crm'
  AND routine_name LIKE '%whatsapp%'
  OR routine_name LIKE 'normalizar_telefono%'
ORDER BY routine_name;
```

Deberías ver:
- ✅ actualizar_sesion_whatsapp
- ✅ cerrar_sesiones_expiradas
- ✅ normalizar_telefono_e164

### 4. Verificar políticas RLS

```sql
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'crm'
  AND tablename LIKE 'marketing_%'
ORDER BY tablename, policyname;
```

Deberías ver políticas para cada tabla de marketing.

## Troubleshooting

### Error: "relation crm.cliente does not exist"
**Solución**: La tabla `crm.cliente` debe existir antes de ejecutar esta migración. Verifica que las migraciones anteriores se hayan ejecutado correctamente.

### Error: "permission denied for schema crm"
**Solución**: Asegúrate de tener permisos de administrador en la base de datos. En Supabase Dashboard deberías tener acceso completo.

### Error: "syntax error at or near..."
**Solución**: Verifica que copiaste TODO el contenido del archivo correctamente, incluyendo las líneas iniciales y finales.

### Error relacionado con auth.users
**Solución**: Asegúrate de que tu proyecto Supabase tenga el esquema `auth` configurado correctamente (viene por defecto).

## Rollback (en caso de error crítico)

Si necesitas revertir los cambios:

```sql
-- CUIDADO: Esto eliminará todas las tablas y datos de WhatsApp Marketing
DROP TABLE IF EXISTS crm.marketing_event_log CASCADE;
DROP TABLE IF EXISTS crm.marketing_automatizacion_ejecucion CASCADE;
DROP TABLE IF EXISTS crm.marketing_automatizacion CASCADE;
DROP TABLE IF EXISTS crm.marketing_mensaje CASCADE;
DROP TABLE IF EXISTS crm.marketing_conversacion CASCADE;
DROP TABLE IF EXISTS crm.marketing_campana CASCADE;
DROP TABLE IF EXISTS crm.marketing_audiencia CASCADE;
DROP TABLE IF EXISTS crm.marketing_template CASCADE;
DROP TABLE IF EXISTS crm.marketing_channel_credential CASCADE;

-- Remover columnas agregadas a cliente
ALTER TABLE crm.cliente
  DROP COLUMN IF EXISTS whatsapp_consentimiento,
  DROP COLUMN IF EXISTS whatsapp_consentimiento_fecha,
  DROP COLUMN IF EXISTS whatsapp_opt_out,
  DROP COLUMN IF EXISTS whatsapp_opt_out_fecha,
  DROP COLUMN IF EXISTS whatsapp_opt_out_motivo,
  DROP COLUMN IF EXISTS telefono_e164;

-- Remover funciones
DROP FUNCTION IF EXISTS crm.actualizar_sesion_whatsapp() CASCADE;
DROP FUNCTION IF EXISTS crm.cerrar_sesiones_expiradas() CASCADE;
DROP FUNCTION IF EXISTS crm.normalizar_telefono_e164(TEXT, TEXT) CASCADE;
```

## Próximos Pasos

Una vez aplicada la migración exitosamente:

1. ✅ Verificar que la aplicación pueda conectarse a las nuevas tablas
2. ✅ Configurar las credenciales de WhatsApp Cloud API en la UI
3. ✅ Crear tus primeras plantillas de mensajes
4. ✅ Configurar audiencias
5. ✅ Lanzar tu primera campaña de prueba

## Soporte

Si encuentras problemas durante la migración:
1. Revisa los logs de error en Supabase Dashboard
2. Verifica que todas las dependencias (tablas previas) existan
3. Consulta la documentación de Supabase sobre migraciones
4. Revisa el código fuente en `src/app/dashboard/admin/marketing/`

---

**Fecha de creación**: 2025-10-13
**Versión de migración**: 20251013004139
**Estado**: ✅ Lista para producción
