# Sistema de Cambio de Contraseña Obligatorio

## 📋 Descripción

Sistema implementado para forzar el cambio de contraseña en el primer inicio de sesión de usuarios nuevos o cuando se resetea su contraseña.

## 🎯 Funcionamiento

### Flujo Completo

1. **Creación de Usuario**
   - Cuando un administrador crea un nuevo usuario desde `/dashboard/admin/usuarios`
   - Se genera una contraseña temporal aleatoria
   - Se marca automáticamente `requiere_cambio_password = true` en la tabla `usuario_perfil`
   - Se muestra un badge "Reseteo pendiente" en la lista de usuarios

2. **Reset de Contraseña**
   - Cuando un administrador hace click en "Reset" para un usuario
   - Se genera una nueva contraseña temporal
   - Se marca `requiere_cambio_password = true`
   - Se muestra la contraseña temporal al administrador para que la comunique al usuario

3. **Primer Inicio de Sesión**
   - El usuario inicia sesión con su DNI/username y contraseña temporal
   - El sistema detecta que `requiere_cambio_password = true`
   - Es redirigido automáticamente a `/auth/cambiar-password`
   - NO puede acceder al dashboard hasta cambiar su contraseña

4. **Cambio de Contraseña**
   - El usuario debe ingresar:
     - Contraseña temporal (actual)
     - Nueva contraseña
     - Confirmar nueva contraseña
   - La nueva contraseña debe cumplir requisitos de seguridad
   - Una vez cambiada exitosamente:
     - Se actualiza `requiere_cambio_password = false`
     - Es redirigido al dashboard correspondiente

## 🔐 Requisitos de Seguridad de Contraseña

La nueva contraseña debe cumplir:
- ✅ Mínimo 8 caracteres
- ✅ Al menos una letra mayúscula
- ✅ Al menos una letra minúscula
- ✅ Al menos un número
- ✅ Debe ser diferente a la contraseña temporal

## 📁 Archivos Implementados

### 1. Página de Cambio de Contraseña
**Archivo:** `src/app/auth/cambiar-password/page.tsx`

**Características:**
- Formulario con 3 campos (contraseña actual, nueva, confirmar)
- Validación en tiempo real de requisitos de seguridad
- Checkbox para mostrar/ocultar contraseñas
- Info box con requisitos de seguridad
- Mensajes de error claros
- Loading state durante el proceso
- Diseño consistente con el login

### 2. API Route para Cambio de Contraseña
**Archivo:** `src/app/api/auth/cambiar-password/route.ts`

**Funcionalidades:**
- Verifica autenticación del usuario
- Valida la contraseña actual mediante sign-in
- Actualiza la contraseña usando `supabase.auth.updateUser()`
- Actualiza el flag `requiere_cambio_password = false`
- Manejo robusto de errores

### 3. Middleware en Dashboard Layout
**Archivo:** `src/app/dashboard/layout.tsx` (líneas 18-28)

**Lógica:**
```typescript
// Obtener perfil incluyendo requiere_cambio_password
const { data: perfil } = await s
  .from('usuario_perfil')
  .select('nombre_completo, username, requiere_cambio_password')
  .eq('id', user.id)
  .single();

// Si requiere cambio de password, redirigir
if (perfil?.requiere_cambio_password) {
  redirect("/auth/cambiar-password");
}
```

### 4. Indicador Visual en Lista de Usuarios
**Archivo:** `src/app/dashboard/admin/usuarios/page.tsx` (líneas 377-387)

**Badge visual:**
- Icono de candado SVG (profesional)
- Color amarillo para advertencia
- Texto "Reseteo pendiente" (visible en pantallas grandes)
- Tooltip descriptivo

## 🔄 Flujo Técnico Detallado

### Al Crear Usuario

```typescript
// En /api/admin/usuarios (POST)
1. Generar contraseña temporal aleatoria
2. Crear usuario en Supabase Auth
3. Crear perfil con requiere_cambio_password = true
4. Mostrar contraseña temporal al admin
```

### Al Iniciar Sesión

```typescript
// En dashboard/layout.tsx
1. Usuario hace login exitoso
2. Se carga el layout del dashboard
3. Se consulta usuario_perfil.requiere_cambio_password
4. Si es true → redirect("/auth/cambiar-password")
5. Si es false → continuar al dashboard normal
```

### Al Cambiar Contraseña

```typescript
// En /api/auth/cambiar-password (POST)
1. Verificar autenticación del usuario
2. Validar que la contraseña actual sea correcta
3. Validar requisitos de la nueva contraseña
4. Actualizar contraseña con auth.updateUser()
5. Actualizar requiere_cambio_password = false
6. Retornar success
7. Usuario es redirigido al dashboard
```

## 🎨 Experiencia de Usuario

### Para el Usuario Nuevo/Reseteado

1. **Recibe credenciales**
   - DNI: 12345678
   - Contraseña temporal: Ab123456

2. **Intenta acceder al dashboard**
   - Es redirigido automáticamente a `/auth/cambiar-password`
   - Ve mensaje: "Por seguridad, debes cambiar tu contraseña temporal"

3. **Completa el formulario**
   - Ingresa contraseña temporal
   - Crea nueva contraseña segura
   - Confirma nueva contraseña

4. **Accede al sistema**
   - Contraseña cambiada exitosamente
   - Redirigido al dashboard correspondiente
   - Ya no se le pedirá cambiar contraseña en futuros logins

### Para el Administrador

1. **Crea usuario nuevo**
   - Modal muestra contraseña temporal generada
   - Puede copiarla para comunicarla al usuario
   - Ve badge "Reseteo pendiente" en la lista

2. **Resetea contraseña de usuario existente**
   - Click en botón "Reset"
   - Modal muestra nueva contraseña temporal
   - Badge aparece nuevamente hasta que usuario cambie

## 🛡️ Seguridad

### Medidas Implementadas

✅ **Contraseña temporal aleatoria**
- 8 caracteres con mayúsculas, minúsculas y números
- No se puede reutilizar la contraseña temporal

✅ **Validación robusta**
- Requisitos de complejidad forzados
- Verificación de contraseña actual antes de cambiar
- No se permite la misma contraseña

✅ **Flag en base de datos**
- `requiere_cambio_password` controlado en backend
- No se puede bypassear desde el cliente

✅ **Redirección automática**
- Middleware en layout verifica en cada carga
- Usuario no puede acceder al dashboard sin cambiar

✅ **Actualización en Supabase Auth**
- Contraseña se actualiza en el sistema de autenticación
- Hash seguro manejado por Supabase

## 📊 Estados del Usuario

| Estado | requiere_cambio_password | Comportamiento |
|--------|-------------------------|----------------|
| Usuario nuevo | `true` | Forzado a cambiar en primer login |
| Password reseteado | `true` | Forzado a cambiar en siguiente login |
| Password cambiado | `false` | Acceso normal al dashboard |
| Usuario activo | `false` | Acceso normal al dashboard |

## 🔧 Configuración

### Base de Datos

La columna `requiere_cambio_password` debe existir en la tabla `usuario_perfil`:

```sql
-- Ya existe en tu schema
ALTER TABLE crm.usuario_perfil
ADD COLUMN IF NOT EXISTS requiere_cambio_password BOOLEAN DEFAULT FALSE;

-- Índice para mejor performance (opcional)
CREATE INDEX IF NOT EXISTS idx_usuario_perfil_requiere_cambio
ON crm.usuario_perfil(requiere_cambio_password)
WHERE requiere_cambio_password = true;
```

### Variables de Entorno

No requiere variables adicionales. Usa las existentes de Supabase.

## 🧪 Testing

### Casos de Prueba

1. **Usuario nuevo con password temporal**
   ```
   1. Admin crea usuario
   2. Usuario hace login con password temporal
   3. Debe ser redirigido a /auth/cambiar-password
   4. Intenta acceder a /dashboard → bloqueado
   5. Cambia password exitosamente
   6. Es redirigido a /dashboard
   7. En siguientes logins, acceso directo al dashboard
   ```

2. **Reset de password de usuario existente**
   ```
   1. Admin resetea password de usuario activo
   2. Usuario intenta login con password vieja → falla
   3. Usuario hace login con password temporal nueva
   4. Es redirigido a /auth/cambiar-password
   5. Cambia password exitosamente
   6. requiere_cambio_password = false
   ```

3. **Validaciones de contraseña**
   ```
   ❌ Menos de 8 caracteres → Error
   ❌ Sin mayúscula → Error
   ❌ Sin minúscula → Error
   ❌ Sin número → Error
   ❌ Contraseñas no coinciden → Error
   ❌ Nueva = Actual → Error
   ✅ Cumple todos los requisitos → Success
   ```

## 🚀 Mejoras Futuras (Opcionales)

1. **Expiración de contraseña temporal**
   - Agregar campo `password_expira_en` en usuario_perfil
   - Forzar cambio después de X días

2. **Historial de contraseñas**
   - Evitar reutilizar últimas N contraseñas
   - Tabla `password_history`

3. **Email de notificación**
   - Enviar email cuando se crea/resetea contraseña
   - Incluir link directo a cambio de contraseña

4. **Políticas de contraseña configurables**
   - Admin puede definir requisitos mínimos
   - Longitud, complejidad, expiración

5. **Autenticación de dos factores (2FA)**
   - Opcional para usuarios sensibles
   - SMS o app autenticadora

## ✅ Checklist de Verificación

- [x] Página de cambio de contraseña creada
- [x] API route funcional
- [x] Middleware de redirección implementado
- [x] Validaciones de seguridad en frontend
- [x] Validaciones de seguridad en backend
- [x] Badge visual en lista de usuarios
- [x] Actualización de flag en base de datos
- [x] Testing de flujo completo
- [x] Documentación completa

## 🎉 Resumen

El sistema de cambio obligatorio de contraseña está completamente funcional y proporciona:

✅ **Seguridad mejorada** - Fuerza contraseñas fuertes desde el inicio
✅ **Experiencia clara** - Usuario sabe exactamente qué debe hacer
✅ **Control administrativo** - Admin puede resetear contraseñas cuando sea necesario
✅ **Sin bypass** - Middleware impide acceso sin cambiar contraseña
✅ **Feedback visual** - Badge indica usuarios con reset pendiente

El sistema está listo para producción! 🚀
