# Auditoría de Migración a Twilio - Módulo de Marketing

## 📊 Resumen Ejecutivo

**Fecha:** 3 de Noviembre de 2025
**Estado:** 🟡 85% Completado - Requiere ajustes finales
**Prioridad:** Alta

---

## 🔍 Hallazgos

### ✅ Componentes Activos (Migrados Correctamente)

Los siguientes componentes están en uso activo y YA están migrados a Twilio:

1. **`/src/components/marketing/ModalCrearPlantilla.tsx`** ✅
   - Actualizado para Twilio
   - Estados simplificados (APPROVED, DRAFT)
   - Mensajes actualizados
   - Variables con formato `{{nombre}}`

2. **`/src/components/marketing/GestionPlantillas.tsx`** ✅
   - Títulos actualizados a "Plantillas de Mensajes"
   - Descripción menciona Twilio
   - Estados PENDING/REJECTED removidos

3. **`/src/components/marketing/ModalCrearCampana.tsx`** ✅
   - credential_id → null (usa variables de entorno)
   - Verificación con tieneCredenciales
   - Endpoint cambiado a `/api/twilio/campanas/ejecutar`

4. **`/src/app/dashboard/admin/marketing/page.tsx`** ✅
   - Título: "Marketing con Twilio"
   - Mensajes actualizados
   - Verificación de credenciales desde .env

5. **`/src/app/dashboard/admin/marketing/_actions.ts`** ✅
   - verificarCredencialesWhatsApp() usa variables de entorno
   - Logs de debug implementados
   - Retorna tieneCredenciales en lugar de credentialId

6. **`/src/app/api/twilio/campanas/ejecutar/route.ts`** ✅
   - Busca campo `body_texto` (correcto)
   - Envía con Twilio
   - Normaliza teléfonos

7. **`/src/app/api/twilio/send-whatsapp/route.ts`** ✅
   - Funcional
   - Usa servicio de Twilio

---

### ⚠️ Archivos con Problemas a Corregir

#### 1. **`/src/types/whatsapp-marketing.ts`** ⚠️

**Problemas encontrados:**

**Línea 7:** EstadoAprobacion incluye estados de Meta que no usamos
```typescript
// ❌ ACTUAL
export type EstadoAprobacion = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAUSED';

// ✅ DEBERÍA SER
export type EstadoAprobacion = 'DRAFT' | 'APPROVED';
```

**Línea 32-49:** Interface MarketingChannelCredential ya no se usa
```typescript
// Esta interface es para credenciales en base de datos (Meta)
// Con Twilio usamos variables de entorno, no necesitamos esto
export interface MarketingChannelCredential { ... }
```

**Línea 109:** credential_id debería ser nullable
```typescript
// ❌ ACTUAL
credential_id: string;

// ✅ DEBERÍA SER
credential_id: string | null;
```

**Línea 143:** credential_id en conversaciones también
```typescript
// ❌ ACTUAL
credential_id?: string;

// ✅ Ya es opcional, está bien
```

---

### 🗑️ Archivos Legacy (NO EN USO)

Estos archivos parecen ser código viejo que YA NO se usa en la app actual:

```
/src/app/dashboard/admin/marketing/components/
├── CampanasEmail.tsx              [LEGACY - No usado]
├── SeguimientoLeads.tsx           [LEGACY - No usado]
├── CampanasWhatsApp.tsx           [LEGACY - No usado]
├── CrearCampanaWhatsApp.tsx       [LEGACY - No usado]
├── PlantillasWhatsApp.tsx         [LEGACY - No usado]
├── ListaCampanasWhatsApp.tsx      [LEGACY - No usado]
├── Automatizacion.tsx             [LEGACY - No usado]
└── leads/*.tsx                    [LEGACY - No usado]
```

**Recomendación:** Estos archivos NO están siendo importados en `page.tsx`. Se pueden:
- Eliminar completamente, o
- Mover a una carpeta `/legacy` para respaldo

---

### 🔄 APIs de WhatsApp (Meta) - Deprecadas

```
/src/app/api/whatsapp/
├── send/route.ts                  [DEPRECADO - Usar /api/twilio/send-whatsapp]
├── webhook/route.ts               [DEPRECADO - Usar /api/twilio/webhook]
└── campanas/ejecutar/route.ts     [DEPRECADO - Usar /api/twilio/campanas/ejecutar]
```

**Recomendación:**
- Mantener por ahora para evitar romper algo
- Agregar comentarios de deprecación
- Eventualmente eliminar cuando estemos 100% seguros

---

## 🔧 Cambios Requeridos

### Prioridad ALTA 🔴

#### 1. Actualizar tipos en `whatsapp-marketing.ts`

```typescript
// EstadoAprobacion - Remover PENDING, REJECTED
export type EstadoAprobacion = 'DRAFT' | 'APPROVED';

// MarketingCampana - credential_id nullable
credential_id: string | null;

// Agregar tipo para tw_message_sid
export interface MarketingMensaje {
  // ... campos existentes ...
  tw_message_sid?: string;  // ← AGREGAR ESTE
}
```

#### 2. Deprecar MarketingChannelCredential

Agregar comentario de deprecación:
```typescript
/**
 * @deprecated Con Twilio ya no usamos credenciales en la base de datos.
 * Las credenciales están en variables de entorno (.env.local)
 */
export interface MarketingChannelCredential { ... }
```

---

### Prioridad MEDIA 🟡

#### 3. Actualizar GestionCampanas.tsx

Revisar que no haya referencias a Meta o credenciales de BD.

#### 4. Actualizar BandejaConversaciones.tsx

Verificar que funcione correctamente con Twilio.

#### 5. Actualizar DashboardMetricas.tsx

Asegurarse de que las métricas se obtengan correctamente.

---

### Prioridad BAJA 🟢

#### 6. Limpiar archivos legacy

Mover archivos no usados a carpeta `/legacy` o eliminarlos.

#### 7. Agregar comentarios de deprecación

En `/api/whatsapp/*` agregar:
```typescript
/**
 * @deprecated Este endpoint usa Meta WhatsApp Business API.
 * Usa /api/twilio/* en su lugar.
 */
```

---

## ✅ Checklist de Validación

### Flujo de Plantillas
- [x] Crear plantilla con Twilio
- [x] Estado APPROVED funciona
- [x] Estado DRAFT funciona
- [ ] Editar plantilla
- [ ] Eliminar plantilla
- [ ] Ver listado de plantillas

### Flujo de Campañas
- [x] Crear campaña con plantilla
- [x] Seleccionar destinatarios manuales
- [x] Enviar inmediatamente
- [ ] Programar para después
- [ ] Ver estado de campaña
- [ ] Ver métricas de campaña

### Flujo de Conversaciones
- [ ] Recibir mensaje entrante
- [ ] Responder mensaje
- [ ] Asignar a vendedor
- [ ] Ver historial de conversación
- [ ] Cerrar conversación

### Integraciones
- [x] Webhook de Twilio configurado
- [x] Envío de WhatsApp funciona
- [ ] Envío de SMS funciona
- [ ] Recepción de actualizaciones de estado
- [ ] Almacenamiento de tw_message_sid

---

## 📝 Notas Adicionales

### Diferencias Clave: Meta vs Twilio

| Aspecto | Meta WhatsApp Business | Twilio |
|---------|------------------------|--------|
| Autenticación | Token en BD (credential_id) | Variables de entorno |
| Plantillas | Pre-aprobación 7-15 días | Sin aprobación |
| Estados | DRAFT, PENDING, APPROVED, REJECTED | DRAFT, APPROVED |
| Variables | `{{1}}`, `{{2}}`, `{{3}}` | `{{nombre}}`, `{{email}}` |
| Message ID | wa_message_id | tw_message_sid |
| API | graph.facebook.com | api.twilio.com |

### Campos de Base de Datos

**Campos que YA NO se usan:**
- `credential_id` → null con Twilio
- `wa_message_id` → Reemplazado por `tw_message_sid`
- `wa_conversation_id` → No usado con Twilio

**Campos que SÍ se usan:**
- `tw_message_sid` → ⚠️ FALTA AGREGAR A LA TABLA (SQL migration pendiente)

---

## 🎯 Próximos Pasos

1. ✅ **Ejecutar migración SQL** para agregar `tw_message_sid`
2. ✅ **Actualizar políticas RLS** en Supabase
3. 🔄 **Actualizar tipos** en `whatsapp-marketing.ts`
4. 🔄 **Revisar componentes faltantes** (Conversaciones, Automatizaciones)
5. ⏳ **Limpiar código legacy** cuando estemos seguros
6. ⏳ **Actualizar documentación** del módulo

---

**Última actualización:** 3 de Noviembre de 2025, 11:45 AM
