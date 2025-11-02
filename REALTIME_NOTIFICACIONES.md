# 🔔 Notificaciones en Tiempo Real - Guía de Implementación

Esta guía explica cómo configurar y utilizar las notificaciones en tiempo real implementadas con Supabase Realtime.

## 📋 Índice

1. [Archivos Creados/Modificados](#archivos-creadosmodificados)
2. [Configuración de Supabase](#configuración-de-supabase)
3. [Agregar Sonido de Notificación](#agregar-sonido-de-notificación)
4. [Usar el Componente de Permisos](#usar-el-componente-de-permisos)
5. [Cómo Funciona](#cómo-funciona)
6. [Testing](#testing)

---

## 📁 Archivos Creados/Modificados

### Nuevos Archivos

1. **`src/lib/supabase.client.ts`**
   - Cliente de Supabase para uso en el navegador (componentes cliente)
   - Permite suscripciones en tiempo real

2. **`src/hooks/useNotificationPermission.ts`**
   - Custom hook para manejar permisos de notificaciones del navegador
   - Detecta cambios en el estado del permiso

3. **`src/components/NotificationPermissionPrompt.tsx`**
   - Componente UI para solicitar permisos de forma amigable
   - Se puede agregar al dashboard

### Archivos Modificados

1. **`src/components/NotificationsDropdown.tsx`**
   - Ahora escucha cambios en tiempo real
   - Muestra notificaciones instantáneas
   - Reproduce sonido y muestra notificación del navegador

2. **`src/app/globals.css`**
   - Agregada animación `slide-up` para el prompt de permisos

---

## ⚙️ Configuración de Supabase

### Paso 1: Habilitar Realtime para la tabla `notificacion`

**Opción A: Desde el Dashboard de Supabase**

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Navega a **Database → Replication**
3. Busca la tabla `crm.notificacion`
4. Activa el switch de **Enable Realtime**

**Opción B: Por SQL**

Ejecuta el siguiente SQL en el editor de Supabase:

```sql
-- Habilitar replicación FULL para la tabla
ALTER TABLE crm.notificacion REPLICA IDENTITY FULL;

-- Agregar la tabla a la publicación de Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE crm.notificacion;
```

### Paso 2: Verificar que está habilitado

```sql
-- Ver tablas con Realtime habilitado
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime';
```

Deberías ver `crm.notificacion` en los resultados.

### Paso 3: Verificar RLS (Row Level Security)

Las políticas RLS se aplican automáticamente a Realtime. Verifica que existan:

```sql
-- Ver políticas RLS de la tabla notificacion
SELECT * FROM pg_policies
WHERE tablename = 'notificacion';
```

Debe existir al menos una política que permita `SELECT` basada en `usuario_id`:

```sql
-- Ejemplo de política necesaria
CREATE POLICY "usuarios_ven_sus_notificaciones"
ON crm.notificacion
FOR SELECT
USING (auth.uid() = usuario_id);
```

---

## 🔊 Agregar Sonido de Notificación

El componente intenta reproducir `/notification.mp3` cuando llega una notificación.

### Opción 1: Usar un sonido libre de derechos

**Fuentes recomendadas:**

1. **Freesound.org**
   - https://freesound.org/search/?q=notification
   - Buscar: "notification bell", "alert"
   - Filtrar por licencia Creative Commons

2. **Zapsplat**
   - https://www.zapsplat.com/sound-effect-category/notifications/
   - Sonidos gratuitos con atribución

3. **Notification Sounds**
   - https://notificationsounds.com/
   - Colección especializada

### Opción 2: Generar tu propio sonido

Puedes usar herramientas como:
- **jsfxr** (https://sfxr.me/) - Generador de sonidos 8-bit
- **Audacity** - Editor de audio gratuito

### Cómo agregarlo al proyecto

1. Descarga o crea un archivo de sonido (formato: `.mp3`, `.wav`, `.ogg`)
2. Renómbralo a `notification.mp3`
3. Colócalo en la carpeta `public/` de tu proyecto:

```
amersurcrm/
├── public/
│   ├── logo-amersur.png
│   └── notification.mp3  ← Aquí
├── src/
└── ...
```

4. El sonido estará disponible en `/notification.mp3`

### Características del sonido recomendadas:

- **Duración:** 0.5 - 1.5 segundos
- **Volumen:** Moderado (el código lo ajusta a 50%)
- **Formato:** MP3 (mejor compatibilidad)
- **Tamaño:** < 50 KB

### Desactivar el sonido (opcional)

Si no quieres sonido, simplemente comenta estas líneas en `NotificationsDropdown.tsx`:

```typescript
// Reproducir sonido
// if (audioRef.current) {
//   audioRef.current.play().catch((e) => {
//     console.log('No se pudo reproducir el sonido:', e);
//   });
// }
```

---

## 🔔 Usar el Componente de Permisos

Para mostrar el prompt de permisos de notificaciones al usuario:

### Paso 1: Agregar al DashboardClient

Edita `src/app/dashboard/DashboardClient.tsx`:

```tsx
import NotificationPermissionPrompt from '@/components/NotificationPermissionPrompt';

export default function DashboardClient({ children, ... }) {
  return (
    <div>
      {/* ... resto del código ... */}

      {/* Prompt de permisos de notificaciones */}
      <NotificationPermissionPrompt />

      {/* ... resto del código ... */}
    </div>
  );
}
```

### Paso 2: El componente se mostrará automáticamente

- Solo aparece si el permiso está en estado `default` (no concedido ni denegado)
- Se puede descartar con el botón "Ahora no"
- Una vez descartado, no vuelve a aparecer (se guarda en `localStorage`)
- Si el usuario acepta, se cierra automáticamente

---

## 🎯 Cómo Funciona

### Flujo Completo

```
1. Usuario abre el dashboard
   ↓
2. NotificationsDropdown se monta
   ↓
3. Obtiene el userId de la sesión actual
   ↓
4. Se suscribe al canal: `notificaciones:{userId}`
   ↓
5. Escucha eventos INSERT y UPDATE en crm.notificacion
   ↓
6. Cuando llega una notificación nueva (INSERT):
   ├─→ Se agrega a la lista local
   ├─→ Se incrementa el contador
   ├─→ Se muestra un toast
   ├─→ Se muestra notificación del navegador (si hay permiso)
   └─→ Se reproduce el sonido
   ↓
7. Cuando se marca como leída (UPDATE):
   ├─→ Se remueve de la lista local
   └─→ Se decrementa el contador
```

### Eventos Escuchados

#### INSERT - Nueva notificación
```typescript
{
  event: 'INSERT',
  schema: 'crm',
  table: 'notificacion',
  filter: `usuario_id=eq.{userId}`
}
```

**Acciones:**
- Agregar a lista
- Incrementar contador
- Toast
- Notificación del navegador
- Sonido

#### UPDATE - Notificación actualizada
```typescript
{
  event: 'UPDATE',
  schema: 'crm',
  table: 'notificacion',
  filter: `usuario_id=eq.{userId}`
}
```

**Acciones:**
- Si `leida = true`: remover de lista y decrementar contador

### Logs en Consola

El sistema genera logs útiles para debugging:

```
🔌 Conectando a notificaciones en tiempo real...
✅ Conectado a notificaciones en tiempo real
🔔 Nueva notificación recibida: {...}
🔌 Desconectando de notificaciones...
```

---

## 🧪 Testing

### Probar las Notificaciones en Tiempo Real

#### Método 1: Crear un cliente nuevo (ejemplo)

1. Abre el dashboard en tu navegador
2. Abre la consola del navegador (F12)
3. En otra pestaña o navegador, crea un nuevo cliente
4. Deberías ver:
   - Log en consola: `🔔 Nueva notificación recibida`
   - Toast en la pantalla
   - Notificación del navegador (si hay permiso)
   - Sonido (si existe el archivo)
   - Badge actualizado en la campana

#### Método 2: SQL directo

Ejecuta este SQL en Supabase para simular una notificación:

```sql
-- Obtén tu user_id primero
SELECT auth.uid();

-- Insertar notificación de prueba
INSERT INTO crm.notificacion (usuario_id, tipo, titulo, mensaje, data)
VALUES (
  'TU_USER_ID_AQUI',  -- Reemplazar con tu user_id
  'sistema',
  'Prueba de Realtime',
  'Esta es una notificación de prueba en tiempo real',
  '{"test": true}'::jsonb
);
```

Deberías ver la notificación aparecer instantáneamente.

#### Método 3: Dos navegadores

1. Abre el dashboard en Chrome
2. Abre el dashboard en Firefox (o ventana privada)
3. Inicia sesión con el mismo usuario en ambos
4. En uno de ellos, crea un cliente o genera cualquier acción que cree notificaciones
5. Observa cómo aparece en el otro navegador en tiempo real

### Verificar Estados de Conexión

Abre la consola y ejecuta:

```javascript
// Ver canales activos
window.supabaseChannels = [];
```

Los logs te dirán el estado:
- `✅ Conectado` - Todo bien
- `❌ Error` - Problema de conexión
- `⏱️ Timeout` - Timeout de conexión
- `🔌 Cerrado` - Canal cerrado

---

## 🐛 Troubleshooting

### Las notificaciones no llegan en tiempo real

**Verificar:**

1. ✅ Realtime está habilitado en Supabase
   ```sql
   SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
   ```

2. ✅ La tabla tiene REPLICA IDENTITY FULL
   ```sql
   SELECT relname, relreplident
   FROM pg_class
   WHERE relname = 'notificacion';
   -- Debería mostrar 'f' (full)
   ```

3. ✅ RLS permite SELECT
   - El usuario debe poder hacer SELECT en sus propias notificaciones

4. ✅ Console del navegador
   - Buscar errores de WebSocket
   - Verificar que aparezca "✅ Conectado"

5. ✅ **Tier de Supabase y límites de conexión**
   - **IMPORTANTE:** El tier gratuito de Supabase tiene limitaciones en Realtime
   - Verifica en el dashboard de Supabase: Project Settings → Usage → Realtime connections
   - El tier gratuito puede tener restricciones en el número de conexiones simultáneas y mensajes

### Limitaciones del Tier Gratuito de Supabase

Si estás en el **tier gratuito**, es posible que experimentes los siguientes problemas:

**Síntomas:**
- ✅ La configuración de PostgreSQL es correcta (REPLICA IDENTITY, publication)
- ✅ La conexión WebSocket se establece (SUBSCRIBED)
- ✅ Los listeners están registrados correctamente
- ❌ Pero los eventos NO se reciben en el frontend
- ❌ El replication slot muestra `"inactive_since"` con timestamp reciente

**Verificar el estado del replication slot:**
```sql
SELECT
  slot_name,
  plugin,
  active,
  inactive_since
FROM pg_replication_slots
WHERE slot_name LIKE '%realtime%';
```

Si ves `"inactive_since"` con un timestamp, significa que el servicio Realtime estuvo recientemente inactivo.

**Soluciones:**

1. **Verifica el Dashboard de Supabase:**
   - Ve a: **Project Settings → API → Realtime**
   - Asegúrate que "Enable Realtime" está activado
   - Verifica que no haya advertencias de límites excedidos

2. **Revisa el uso de recursos:**
   - Ve a: **Project Settings → Usage**
   - Mira la sección "Realtime" para ver conexiones activas y mensajes
   - El tier gratuito puede tener límites que bloqueen eventos

3. **Solución temporal: Polling**
   - Mientras actualizas a Pro, puedes usar polling (ver sección más abajo)
   - El polling consultará nuevas notificaciones cada 15-30 segundos

4. **Actualizar a Pro:**
   - El tier Pro de Supabase elimina estas limitaciones
   - Garantiza entrega de eventos en tiempo real
   - Costo aproximado: $25/mes con recursos dedicados

### El sonido no se reproduce

**Verificar:**

1. ✅ El archivo existe en `/public/notification.mp3`
2. ✅ El navegador permite autoplay
   - Chrome/Safari bloquean audio hasta que el usuario interactúe
   - La primera vez puede no sonar, luego sí
3. ✅ El volumen del sistema no está en mute

### Las notificaciones del navegador no aparecen

**Verificar:**

1. ✅ El permiso fue concedido
   ```javascript
   console.log(Notification.permission); // Debería ser 'granted'
   ```

2. ✅ El navegador soporta notificaciones
   - Safari en iOS no soporta Web Notifications
   - Funciona en: Chrome, Firefox, Edge, Safari (macOS)

3. ✅ El navegador no está en modo "No molestar"

---

## 📊 Monitoreo

### Logs Útiles

El componente genera logs que puedes monitorear:

```javascript
// Filtrar solo logs de notificaciones
console.log = (function(oldLog) {
  return function(...args) {
    if (args[0] && typeof args[0] === 'string' &&
        (args[0].includes('🔔') || args[0].includes('🔌'))) {
      // Guardar en algún servicio de analytics
    }
    oldLog.apply(console, args);
  };
})(console.log);
```

### Métricas Sugeridas

- Tiempo de latencia (desde INSERT en DB hasta visualización)
- Tasa de delivery (notificaciones enviadas vs recibidas)
- Permisos concedidos/denegados
- Reconexiones por timeout

---

## 🔄 Solución Temporal: Polling (Tier Gratuito)

Si estás experimentando problemas con Realtime en el tier gratuito, puedes usar polling como solución temporal.

### ¿Qué es Polling?

En lugar de esperar eventos en tiempo real vía WebSocket, el frontend consulta la base de datos cada X segundos para verificar si hay nuevas notificaciones.

### Implementación

Crea el archivo `src/components/NotificationsDropdownPolling.tsx`:

```tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase";
import toast from "react-hot-toast";
// ... resto de imports igual que NotificationsDropdown.tsx

const POLLING_INTERVAL = 15000; // 15 segundos

export default function NotificationsDropdownPolling({ userId }: { userId: string }) {
  const [items, setItems] = useState<NotificacionNoLeida[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const lastCheckRef = useRef<Date>(new Date());
  const intervalRef = useRef<NodeJS.Timeout>();

  // Función para verificar nuevas notificaciones
  const checkNewNotifications = async () => {
    const supabase = createClient();

    const { data, error } = await supabase
      .schema("crm")
      .from("notificacion")
      .select("*")
      .eq("usuario_id", userId)
      .eq("leida", false)
      .gt("fecha_creacion", lastCheckRef.current.toISOString())
      .order("fecha_creacion", { ascending: false });

    if (error) {
      console.error("Error al verificar notificaciones:", error);
      return;
    }

    if (data && data.length > 0) {
      console.log(`📬 [POLLING] ${data.length} nuevas notificaciones`);

      // Agregar nuevas notificaciones
      setItems((prev) => [...data, ...prev].slice(0, 20));
      setUnreadCount((prev) => prev + data.length);

      // Mostrar toast solo para la más reciente
      const newest = data[0] as NotificacionNoLeida;
      toast.success(newest.titulo, {
        icon: tipoIcons[newest.tipo as keyof typeof tipoIcons] || "🔔",
        duration: 4000,
      });

      // Notificación del navegador
      if (Notification.permission === "granted") {
        new Notification(newest.titulo, {
          body: newest.mensaje,
          icon: "/logo-amersur.png",
        });
      }
    }

    lastCheckRef.current = new Date();
  };

  // Cargar notificaciones iniciales
  useEffect(() => {
    if (!userId) return;

    const loadInitial = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .schema("crm")
        .from("notificacion")
        .select("*")
        .eq("usuario_id", userId)
        .eq("leida", false)
        .order("fecha_creacion", { ascending: false })
        .limit(20);

      if (data) {
        setItems(data as NotificacionNoLeida[]);
        setUnreadCount(data.length);
      }
    };

    loadInitial();
  }, [userId]);

  // Configurar polling
  useEffect(() => {
    if (!userId) return;

    console.log(`🔄 Polling activado cada ${POLLING_INTERVAL / 1000}s`);

    intervalRef.current = setInterval(checkNewNotifications, POLLING_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        console.log("🔄 Polling detenido");
      }
    };
  }, [userId]);

  // ... resto del componente igual que NotificationsDropdown.tsx
  // (handleMarkAsRead, return JSX, etc.)
}
```

### Cómo activar Polling

1. Abre `src/app/dashboard/Header.tsx`
2. Reemplaza el import:

```tsx
// Comentar esta línea:
// import NotificationsDropdown from "@/components/NotificationsDropdown";

// Usar polling temporal:
import NotificationsDropdown from "@/components/NotificationsDropdownPolling";
```

### Ventajas del Polling

- ✅ Funciona en cualquier tier de Supabase
- ✅ No requiere configuración adicional
- ✅ Más predecible y confiable

### Desventajas del Polling

- ❌ Latencia de hasta 15 segundos (configurable)
- ❌ Más consumo de recursos del servidor
- ❌ Consultas innecesarias si no hay notificaciones nuevas

### Cambiar de Polling a Realtime después de Pro

Una vez actualices a Supabase Pro:

1. Verifica que Realtime funciona (ve a la sección Testing)
2. En `src/app/dashboard/Header.tsx`, vuelve a usar el componente original:

```tsx
// Volver a Realtime:
import NotificationsDropdown from "@/components/NotificationsDropdown";

// Comentar polling:
// import NotificationsDropdown from "@/components/NotificationsDropdownPolling";
```

3. (Opcional) Elimina `NotificationsDropdownPolling.tsx` si ya no lo necesitas

---

## 🚀 Próximos Pasos

### Mejoras Sugeridas

1. **Persistencia de preferencias**
   - Permitir silenciar notificaciones por tipo
   - Horario de "No molestar"

2. **Agrupación**
   - Si llegan muchas notificaciones, agruparlas

3. **Acciones rápidas**
   - Botones en la notificación del navegador para acciones directas

4. **Sonidos personalizados**
   - Diferentes sonidos por tipo de notificación

5. **Vibración en móvil**
   - Usar Vibration API en dispositivos móviles

---

## 📚 Referencias

- [Supabase Realtime Docs](https://supabase.com/docs/guides/realtime)
- [Web Notifications API](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)

---

## ✅ Checklist de Implementación

- [x] Cliente de Supabase para browser creado
- [x] NotificationsDropdown actualizado con Realtime
- [x] Hook de permisos de notificaciones
- [x] Componente de prompt de permisos
- [x] Animación CSS agregada
- [ ] Sonido de notificación agregado a `/public/`
- [ ] Realtime habilitado en Supabase
- [ ] Políticas RLS verificadas
- [ ] Testing completo realizado
- [ ] NotificationPermissionPrompt agregado al dashboard

---

**Última actualización:** 2025-01-02
