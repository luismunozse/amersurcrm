# Resetear Contraseña del Administrador

Usuario administrador: **admin@amersur.admin**

## Método 1: Usando Supabase Dashboard (RECOMENDADO - MÁS FÁCIL)

1. Ve a tu [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto
3. Ve a **Authentication** > **Users**
4. Busca el usuario `admin@amersur.admin`
5. Haz clic en los 3 puntos (...) al lado del usuario
6. Selecciona **"Reset Password"**
7. Ingresa tu nueva contraseña (mínimo 6 caracteres)
8. Haz clic en **"Update user"**

✅ **Listo!** Ya puedes iniciar sesión con la nueva contraseña.

---

## Método 2: Usando Script Node.js (CON SERVICE ROLE KEY)

### Requisitos previos

1. Tener Node.js instalado
2. Tener tu **Service Role Key** de Supabase

### Pasos

#### 1. Obtener tu Service Role Key

1. Ve a tu [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto
3. Ve a **Settings** > **API**
4. Copia el **service_role** key (⚠️ NO la compartas públicamente)

#### 2. Configurar variables de entorno

Asegúrate de que tu archivo `.env` tenga estas variables:

```bash
# URL de tu proyecto Supabase
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co

# Service Role Key (NUNCA la subas a git)
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui
```

#### 3. Modificar la contraseña (opcional)

Abre el archivo `scripts/reset-admin-password.js` y cambia esta línea si quieres una contraseña diferente:

```javascript
const NEW_PASSWORD = 'Admin123!'; // Cambia aquí
```

#### 4. Ejecutar el script

```bash
node scripts/reset-admin-password.js
```

Deberías ver algo como:

```
🔄 Iniciando reseteo de contraseña del administrador...

📧 Buscando usuario: admin@amersur.admin
✅ Usuario encontrado: xxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   Creado: 15/1/2025
   Último login: 17/10/2025

🔐 Actualizando contraseña...
✅ Contraseña actualizada exitosamente

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ RESETEO COMPLETADO EXITOSAMENTE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 Email:     admin@amersur.admin
🔐 Password:  Admin123!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 Ahora puedes iniciar sesión con estas credenciales
```

---

## Método 3: Usando SQL en Supabase (SOLO PARA VERIFICACIÓN)

Puedes ejecutar el script SQL para verificar el usuario:

1. Ve a **SQL Editor** en Supabase Dashboard
2. Abre el archivo `scripts/reset-admin-password.sql`
3. Copia y pega el contenido
4. Ejecuta las queries de verificación

**Nota:** El reseteo de contraseña por SQL directo **NO funciona** en Supabase Cloud por razones de seguridad. Usa el Método 1 o 2.

---

## Credenciales por defecto después del reset

```
📧 Email:    admin@amersur.admin
🔐 Password: Admin123!
```

## Importante

⚠️ **CAMBIA LA CONTRASEÑA** después de iniciar sesión

⚠️ **NUNCA** compartas tu Service Role Key públicamente

⚠️ **NUNCA** subas el archivo `.env` a git

---

## Solución de problemas

### Error: "Usuario no encontrado"

El usuario `admin@amersur.admin` no existe. Verifica:

1. Ve a Authentication > Users en Supabase Dashboard
2. Verifica qué email tiene el usuario administrador
3. Actualiza la constante `ADMIN_EMAIL` en el script

### Error: "Faltan variables de entorno"

Verifica que tu archivo `.env` tenga:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### Error: "Invalid JWT" o "Unauthorized"

Tu Service Role Key es incorrecta o ha expirado. Obtén una nueva desde Settings > API en Supabase Dashboard.

---

## Archivos relacionados

- `/scripts/reset-admin-password.js` - Script Node.js para resetear contraseña
- `/scripts/reset-admin-password.sql` - Script SQL con instrucciones
- `/.env` - Archivo con variables de entorno (NO subir a git)
