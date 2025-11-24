# 🔔 Eventos de Notificaciones - AMERSUR CRM

Este documento describe qué eventos del sistema generan notificaciones automáticas y cuáles se podrían implementar en el futuro.

---

## ✅ Eventos que Actualmente Generan Notificaciones

### 👤 **Clientes**

| Evento | Tipo | Título | Cuándo se dispara |
|--------|------|--------|-------------------|
| **Cliente creado** | `cliente` | "Nuevo cliente registrado" | Al crear un nuevo cliente en el sistema |
| **Cliente actualizado** | `cliente` | "Cliente actualizado" | Al actualizar información de un cliente existente |

**Archivo:** [`src/app/dashboard/clientes/_actions.ts`](src/app/dashboard/clientes/_actions.ts)

---

### 🏠 **Lotes/Propiedades** ✨ NUEVO

| Evento | Tipo | Título | Cuándo se dispara |
|--------|------|--------|-------------------|
| **Lote reservado** ⭐ | `lote` | "🏠 Lote reservado" | Al cambiar el estado de un lote a "reservado" |
| **Lote vendido** ⭐ | `lote` | "🎉 Lote vendido" | Al cambiar el estado de un lote a "vendido" |

**Archivo:** [`src/app/dashboard/propiedades/_actions.ts`](src/app/dashboard/propiedades/_actions.ts)

---

### 🏢 **Proyectos** ✨ NUEVO

| Evento | Tipo | Título | Cuándo se dispara |
|--------|------|--------|-------------------|
| **Proyecto creado** ⭐ | `proyecto` | "🏢 Nuevo proyecto creado" | Al crear un nuevo proyecto en el sistema |

**Archivo:** [`src/app/dashboard/proyectos/_actions.ts`](src/app/dashboard/proyectos/_actions.ts)

---

### 📅 **Agenda y Eventos**

| Evento | Tipo | Título | Cuándo se dispara |
|--------|------|--------|-------------------|
| **Evento creado** | `sistema` | "Nuevo evento agendado" | Al crear un nuevo evento en la agenda |
| **Evento actualizado** | `sistema` | "Evento actualizado" | Al actualizar un evento existente |
| **Evento completado** | `sistema` | "Evento completado" | Al marcar un evento como completado |
| **Evento reprogramado** | `sistema` | "Evento reprogramado" | Al cambiar la fecha/hora de un evento |
| **Recordatorio creado** | `sistema` | "Nuevo recordatorio creado" | Al crear un recordatorio para un evento |

**Archivo:** [`src/app/dashboard/agenda/actions.ts`](src/app/dashboard/agenda/actions.ts)

---

### 👥 **Usuarios** (Solo Admin) ✨ NUEVO

| Evento | Tipo | Título | Cuándo se dispara |
|--------|------|--------|-------------------|
| **Nuevo usuario registrado** ⭐ | `sistema` | "👥 Nuevo usuario registrado" | Al crear un nuevo usuario en el sistema (notifica a TODOS los admins) |

**Archivo:** [`src/app/api/admin/usuarios/route.ts`](src/app/api/admin/usuarios/route.ts)

**Nota importante:** Esta notificación se envía a **todos los administradores** del sistema, no solo al que creó el usuario.

---

### 🔄 **Recordatorios Automáticos**

| Evento | Tipo | Título | Cuándo se dispara |
|--------|------|--------|-------------------|
| **Recordatorio próximo** | `sistema` | Variable según evento | Sistema automático que envía recordatorios antes de eventos |

**Archivo:** [`src/app/api/notifications/send-recordatorios/route.ts`](src/app/api/notifications/send-recordatorios/route.ts)

**Nota:** Este es un endpoint que se puede llamar mediante cron job o tarea programada.

---

### 🔐 **Sistema**

| Evento | Tipo | Título | Cuándo se dispara |
|--------|------|--------|-------------------|
| **Reseteo de contraseña** | `sistema` | Variable | Al solicitar reseteo de contraseña |

**Archivo:** [`src/app/api/auth/reset-request/route.ts`](src/app/api/auth/reset-request/route.ts)

---

## 🚀 Eventos Sugeridos para Implementar

Basándote en tu pregunta sobre qué eventos deberían notificar, aquí están las sugerencias:

### 🏢 **Proyectos** (Tipo: `proyecto`)

```typescript
// Eventos a implementar:
- "Nuevo proyecto creado" → Cuando se crea un proyecto
- "Proyecto actualizado" → Cuando se actualiza información del proyecto
- "Proyecto publicado" → Cuando un proyecto cambia a estado "publicado"
- "Proyecto completado" → Cuando un proyecto se marca como completado
- "Asignación a proyecto" → Cuando un usuario es asignado a un proyecto
```

**Ubicación sugerida:** `src/app/dashboard/proyectos/_actions.ts` (crear si no existe)

---

### 🏠 **Lotes/Propiedades** (Tipo: `lote`)

```typescript
// Eventos a implementar:
- "Nuevo lote agregado" → Cuando se crea un lote en un proyecto
- "Lote reservado" → Cuando un lote cambia a estado "reservado" ⭐
- "Reserva confirmada" → Cuando se confirma una reserva
- "Lote vendido" → Cuando un lote se marca como vendido ⭐
- "Lote disponible" → Cuando un lote vuelve a estar disponible
- "Precio actualizado" → Cuando se actualiza el precio de un lote
```

**Ubicación sugerida:** `src/app/dashboard/propiedades/_actions.ts`

---

### 👥 **Usuarios** (Solo para Admin) (Tipo: `sistema`)

```typescript
// Eventos a implementar (solo notificar a admins):
- "Nuevo usuario registrado" → Cuando se crea un usuario en el sistema ⭐
- "Usuario desactivado" → Cuando se desactiva un usuario
- "Cambio de rol" → Cuando se cambia el rol de un usuario
- "Nuevo vendedor asignado" → Cuando se asigna un vendedor a un cliente
```

**Ubicación sugerida:** `src/app/dashboard/admin/usuarios/_actions.ts` (crear si no existe)

**Código de ejemplo:**
```typescript
import { crearNotificacion } from "@/app/_actionsNotifications";

export async function crearUsuario(datos: FormData) {
  // ... lógica de creación ...

  // Obtener todos los admins
  const { data: admins } = await supabase
    .from("usuario")
    .select("id")
    .eq("rol", "admin");

  // Notificar a todos los admins
  if (admins) {
    for (const admin of admins) {
      await crearNotificacion(
        admin.id,
        "sistema",
        "Nuevo usuario registrado",
        `Se ha registrado un nuevo usuario: ${nuevoUsuario.nombre}`,
        { usuario_id: nuevoUsuario.id }
      );
    }
  }
}
```

---

### 💰 **Pagos y Finanzas** (Tipo: `sistema` o `lote`)

```typescript
// Eventos a implementar:
- "Pago recibido" → Cuando se registra un pago
- "Pago vencido" → Cuando un pago supera su fecha de vencimiento
- "Recordatorio de pago" → X días antes del vencimiento
- "Pago completado" → Cuando se completa el pago total de un lote
```

**Ubicación sugerida:** `src/app/dashboard/pagos/_actions.ts` (crear si no existe)

---

### 📊 **Reportes** (Solo para Admin)

```typescript
// Eventos a implementar:
- "Reporte generado" → Cuando se genera un reporte
- "Meta alcanzada" → Cuando se alcanza una meta de ventas
- "Alerta de ventas bajas" → Cuando las ventas están por debajo del objetivo
```

---

## 📝 Cómo Implementar una Nueva Notificación

### Paso 1: Importar la función
```typescript
import { crearNotificacion } from "@/app/_actionsNotifications";
```

### Paso 2: Llamar la función después del evento
```typescript
export async function reservarLote(loteId: string, clienteId: string) {
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  // 1. Realizar la acción (reservar lote)
  const { data: lote } = await supabase
    .from("lote")
    .update({ estado: "reservado", cliente_id: clienteId })
    .eq("id", loteId)
    .select("nombre, precio")
    .single();

  // 2. Crear notificación
  try {
    await crearNotificacion(
      user.id,                      // Usuario que recibe la notificación
      "lote",                       // Tipo de notificación
      "🏠 Lote reservado",          // Título
      `Has reservado el lote "${lote.nombre}" por ${lote.precio}`,  // Mensaje
      {                             // Datos adicionales (opcional)
        lote_id: loteId,
        cliente_id: clienteId,
        precio: lote.precio
      }
    );
  } catch (error) {
    // No fallar si la notificación falla
    console.error("Error creando notificación:", error);
  }

  revalidatePath("/dashboard/propiedades");
  return { success: true };
}
```

### Paso 3: Tipos disponibles

La función `crearNotificacion` acepta estos tipos:

```typescript
tipo: 'cliente' | 'proyecto' | 'lote' | 'sistema'
```

Cada tipo tiene:
- **Icono diferente:** 👤 cliente, 🏢 proyecto, 🏠 lote, ⚙️ sistema
- **Color diferente:** Azul, verde, naranja, gris

---

## 🎯 Priorización Sugerida

Basado en tu pregunta, te recomiendo implementar en este orden:

### Alta Prioridad (Implementar primero)
1. ✅ **Lote reservado** - Muy importante para el flujo de ventas
2. ✅ **Lote vendido** - Crítico para tracking de ventas
3. ✅ **Nuevo usuario** (solo admins) - Control administrativo

### Media Prioridad
4. **Proyecto creado** - Útil para tracking
5. **Pago recibido** - Control financiero
6. **Pago vencido** - Recordatorio importante

### Baja Prioridad
7. Resto de eventos de proyectos
8. Eventos de reportes
9. Eventos adicionales de pagos

---

## 🔧 Configuración

Las notificaciones se pueden configurar desde:
- **Panel Admin → Configuración → Notificaciones**
- Se pueden habilitar/deshabilitar:
  - Email
  - Push notifications
  - Recordatorios automáticos

---

## 📊 Estadísticas Actuales

**Total de eventos que notifican:** 13 ✨ (+4 nuevos)
- 2 de Clientes
- 2 de Lotes/Propiedades ⭐ NUEVO
- 1 de Proyectos ⭐ NUEVO
- 5 de Agenda
- 1 de Usuarios (Admin) ⭐ NUEVO
- 1 de Recordatorios automáticos
- 1 de Sistema

**Eventos implementados recientemente:**
- ✅ Lote reservado
- ✅ Lote vendido
- ✅ Proyecto creado
- ✅ Nuevo usuario (notifica a todos los admins)

**Eventos sugeridos pendientes:** ~11-15

---

## 🐛 Debugging

Para ver las notificaciones en desarrollo:

1. Verifica en Supabase:
```sql
SELECT * FROM crm.notificacion
WHERE usuario_id = 'TU_USER_ID'
ORDER BY created_at DESC
LIMIT 10;
```

2. En el navegador:
   - Abre la consola (F12)
   - Las notificaciones se muestran con toast
   - Badge de la campana se actualiza automáticamente

---

**Última actualización:** 2025-11-02
**Versión:** 1.1
**Cambios:** Implementadas 4 nuevas notificaciones (lote reservado, lote vendido, proyecto creado, nuevo usuario)
