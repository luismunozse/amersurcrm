# Instrucciones para Aplicar Sistema de Asignación Automática de Vendedores

## 📋 Resumen
Este sistema permite configurar una lista de vendedores que recibirán leads automáticamente desde WhatsApp Web usando rotación round-robin.

## 🚀 Pasos para Aplicar

### 1. Aplicar Migraciones SQL

**Opción A: Desde el Panel de Supabase (Recomendado)**

1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto
3. Ve a **SQL Editor** en el menú lateral
4. Crea una nueva consulta
5. Copia y pega el contenido de este archivo:
   ```
   supabase/migrations/20250325000000_sistema_asignacion_vendedores.sql
   ```
6. Ejecuta la consulta (botón "Run" o `Ctrl+Enter`)
7. Verifica que aparezca el mensaje: "✅ Migración completada: Sistema de Asignación de Vendedores"

8. Repite el proceso con este archivo:
   ```
   supabase/migrations/create_whatsapp_lead_function.sql
   ```

**Opción B: Usando psql (Si tienes acceso directo a la BD)**

1. Obtén la cadena de conexión desde Supabase Dashboard > Settings > Database
2. Ejecuta:
   ```bash
   psql "postgres://[TU_CADENA_DE_CONEXION]" -f supabase/migrations/20250325000000_sistema_asignacion_vendedores.sql

   psql "postgres://[TU_CADENA_DE_CONEXION]" -f supabase/migrations/create_whatsapp_lead_function.sql
   ```

### 2. Verificar que las Tablas se Crearon

Ejecuta esta consulta en SQL Editor para verificar:

```sql
-- Verificar tabla vendedor_activo
SELECT * FROM crm.vendedor_activo LIMIT 1;

-- Verificar tabla asignacion_config
SELECT * FROM crm.asignacion_config;

-- Verificar función
SELECT proname FROM pg_proc WHERE proname = 'obtener_siguiente_vendedor';
```

### 3. Configurar Vendedores Activos

1. Inicia sesión como administrador
2. Ve a: `/dashboard/admin/vendedores-activos`
3. Haz clic en "Agregar Vendedor"
4. Selecciona los vendedores que recibirán leads automáticamente
5. Ajusta el orden usando los botones ⬆️ ⬇️
6. Activa/Desactiva vendedores según necesidad

### 4. Probar el Sistema

1. Usa la extensión de Chrome para capturar un lead desde WhatsApp Web
2. Verifica que el lead se asignó automáticamente al siguiente vendedor en la lista
3. Captura varios leads y observa la rotación round-robin

## ✅ Qué se Creó

### Tablas Nuevas:
- **`crm.vendedor_activo`**: Lista de vendedores configurados para recibir leads
- **`crm.asignacion_config`**: Configuración del contador round-robin

### Funciones Nuevas:
- **`crm.obtener_siguiente_vendedor()`**: Obtiene el siguiente vendedor usando round-robin

### Funciones Modificadas:
- **`crm.create_whatsapp_lead()`**: Ahora asigna vendedor automáticamente si no se especifica uno

### API Endpoints Nuevos:
- `GET /api/admin/vendedores-activos` - Lista vendedores configurados
- `POST /api/admin/vendedores-activos` - Agregar vendedor
- `DELETE /api/admin/vendedores-activos?id=xxx` - Eliminar vendedor
- `PATCH /api/admin/vendedores-activos` - Activar/Desactivar
- `PUT /api/admin/vendedores-activos` - Reordenar lista

### Páginas Nuevas:
- `/dashboard/admin/vendedores-activos` - Interfaz de administración

## 🎯 Cómo Funciona

1. **Captura de Lead**: Cuando se captura un lead desde WhatsApp Web con la extensión
2. **Llamada a API**: La extensión llama a `/api/whatsapp/lead/create`
3. **Asignación Automática**: La función SQL `create_whatsapp_lead` llama a `obtener_siguiente_vendedor()`
4. **Round-Robin**: Se obtiene el siguiente vendedor activo según el orden configurado
5. **Rotación**: El índice se incrementa para el próximo lead
6. **Lead Asignado**: El lead se crea con el vendedor asignado automáticamente

## 📊 Ejemplo de Flujo

```
Lista configurada:
1. Juan Pérez (Activo)
2. María García (Activo)
3. Carlos López (Inactivo)
4. Ana Martínez (Activo)

Lead 1 → Juan Pérez
Lead 2 → María García
Lead 3 → Ana Martínez (Carlos está inactivo, se salta)
Lead 4 → Juan Pérez (vuelta al inicio)
Lead 5 → María García
...
```

## 🔧 Solución de Problemas

### Los leads no se asignan automáticamente
- Verifica que hay vendedores en la lista (`/dashboard/admin/vendedores-activos`)
- Verifica que al menos uno está marcado como "Activo"
- Revisa los logs del servidor para ver errores

### Error al aplicar migración
- Verifica que tienes permisos de administrador en la BD
- Asegúrate de que el schema `crm` existe
- Verifica que las tablas `auth.users` y `crm.usuario_perfil` existen

### La interfaz de admin no carga
- Verifica que estás logueado como administrador
- Revisa la consola del navegador para errores
- Verifica que las políticas RLS están configuradas correctamente

## 📞 Soporte

Si encuentras problemas, revisa:
1. Logs del servidor: `npm run dev` y observa la terminal
2. Consola del navegador (F12)
3. Logs de Supabase en el Dashboard

---

**Creado el**: 2025-12-01
**Versión**: 1.0.0
