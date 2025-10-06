# 🎯 Implementación del Sistema de Agenda - Motor de Disciplina Comercial

## 📋 Resumen Ejecutivo

La agenda es el **"motor de disciplina"** del CRM: todo lo que debe pasar para avanzar una venta vive ahí. Este documento detalla la implementación práctica del sistema de agenda para inmobiliarias, basado en el esquema proporcionado.

## 🏗️ Arquitectura del Sistema

### 1. **Principio Clave**
- Cada tarea está ligada a una **Oportunidad** (o al Cliente si aún no hay oportunidad)
- **No se puede cerrar** una tarea sin definir el "Próximo paso" con fecha/hora
- Así **no quedan leads colgados**

### 2. **Tipos de Eventos/Tareas**

| Tipo | Icono | Objetivo | Duración Sugerida | Resultado Obligatorio |
|------|-------|----------|-------------------|----------------------|
| **Contacto** | 📞 | Llamada, WhatsApp | 15-30 min | Contactado/No contactado |
| **Reunión** | 📅 | Videollamada, cita en oficina | 30-60 min | Reunión realizada/Agendada |
| **Visita** | 🏠 | Al proyecto/terreno | 60-120 min | Visita completada/No asistió |
| **Hito Comercial** | 📄 | Enviar propuesta/cotización | 30-45 min | Propuesta enviada/Rechazada |
| **Administrativo** | 📋 | Documentación, firma | 15-30 min | Documento procesado |
| **Postventa** | 👥 | Follow-up, referidos | 20-30 min | Seguimiento completado |

## 🗄️ Schema de Base de Datos

### Tabla Principal: `crm.evento`

```sql
-- Campos obligatorios para disciplina comercial
titulo VARCHAR(255) NOT NULL,                    -- Título descriptivo
objetivo TEXT NOT NULL,                          -- Qué se debe lograr
tipo VARCHAR(50) NOT NULL,                       -- Tipo de actividad
estado VARCHAR(20) NOT NULL,                     -- Estado actual
prioridad VARCHAR(10) NOT NULL,                  -- Urgencia
fecha_inicio TIMESTAMPTZ NOT NULL,              -- Cuándo inicia
proximo_paso_objetivo TEXT,                      -- Próximo paso (obligatorio para cerrar)
proximo_paso_fecha TIMESTAMPTZ,                  -- Cuándo hacer el próximo paso

-- Vinculaciones (al menos una obligatoria)
oportunidad_id UUID,                             -- Oportunidad asociada
cliente_id UUID,                                 -- Cliente asociado
propiedad_id UUID,                               -- Propiedad asociada

-- Control de calidad
resultado_id UUID,                               -- Resultado obtenido
resultado_notas TEXT,                            -- Notas del resultado
sla_tipo TEXT,                                   -- Tipo de SLA
sla_vencimiento TIMESTAMPTZ,                     -- Cuándo vence el SLA

-- Gestión de posposiciones
snooze_motivo_id UUID,                           -- Motivo de posposición
snooze_hasta TIMESTAMPTZ,                        -- Hasta cuándo posponer
```

### Tablas de Soporte

#### `crm.evento_snooze_motivo`
```sql
-- Motivos predefinidos para posponer tareas
nombre TEXT NOT NULL,                            -- "Cliente de viaje"
descripcion TEXT,                                -- Descripción detallada
activo BOOLEAN DEFAULT TRUE,                     -- Si está disponible
orden INTEGER DEFAULT 0                          -- Orden de aparición
```

#### `crm.evento_resultado_catalogo`
```sql
-- Resultados estándar por tipo de evento
nombre TEXT NOT NULL,                            -- "Contactado exitosamente"
descripcion TEXT,                                -- Descripción del resultado
tipo_evento TEXT,                                -- Para qué tipo aplica
activo BOOLEAN DEFAULT TRUE,                     -- Si está disponible
orden INTEGER DEFAULT 0                          -- Orden de aparición
```

## 🎨 Vistas de Usuario

### 1. **Vista "Hoy"** (Principal)
```
┌─────────────────────────────────────────────────────────┐
│ 📅 HOY - [Fecha]                                       │
├─────────────────────────────────────────────────────────┤
│ 🚨 VENCIDAS (3)                                        │
│ • Llamada a Juan Pérez - Vencida hace 2h               │
│ • Visita Lote A-15 - Vencida ayer                      │
│ • Seguimiento propuesta - Vencida hace 1d              │
├─────────────────────────────────────────────────────────┤
│ ⏰ PENDIENTES (5)                                       │
│ • Llamada a María García - 10:00                       │
│ • Visita Lote B-22 - 14:00                             │
│ • Envío cotización - 16:00                             │
└─────────────────────────────────────────────────────────┘
```

### 2. **Vista Semanal** (Kanban)
```
┌─────────┬─────────┬─────────┬─────────┬─────────┬─────────┬─────────┐
│ LUNES   │ MARTES  │ MIÉRCOLES│ JUEVES  │ VIERNES │ SÁBADO  │ DOMINGO │
├─────────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┤
│ 📞 Llamada│ 🏠 Visita │ 📄 Propuesta│ 📋 Docu- │ 👥 Follow-│ 🏠 Visita│         │
│ Juan P.  │ Lote A-15│ María G.  │ mentos │ up     │ Lote C-8│         │
│ 10:00    │ 14:00   │ 11:00    │ 09:00  │ 15:00  │ 10:00   │         │
└─────────┴─────────┴─────────┴─────────┴─────────┴─────────┴─────────┘
```

### 3. **Vista Pipeline** (Por Etapa)
```
┌─────────────────────────────────────────────────────────┐
│ 📊 PIPELINE - PRÓXIMOS PASOS                           │
├─────────────────────────────────────────────────────────┤
│ 🆕 NUEVOS (2)                                          │
│ • Contactar lead web - 2h SLA                          │
│ • Llamada fría - 4h SLA                                │
├─────────────────────────────────────────────────────────┤
│ 🎯 CALIFICADOS (3)                                     │
│ • Visita agendada - Mañana 14:00                       │
│ • Envío información - Hoy 16:00                        │
├─────────────────────────────────────────────────────────┤
│ 🏠 VISITAS (1)                                         │
│ • Visita Lote A-15 - Mañana 10:00                      │
└─────────────────────────────────────────────────────────┘
```

## ⚙️ Reglas de Negocio

### 1. **Reglas de Oro** (Evitan Desorden)

#### ✅ **Next Step Obligatorio**
```typescript
// Al cerrar una tarea, SIEMPRE debe tener próximo paso
if (estado === 'completado' || estado === 'cancelado') {
  if (!proximo_paso_objetivo || !proximo_paso_fecha) {
    throw new Error('Próximo paso obligatorio para cerrar tarea');
  }
}
```

#### ✅ **Plantillas Estandarizadas**
```typescript
const PLANTILLAS_WHATSAPP = {
  primer_contacto: "Hola {nombre}, soy {vendedor} de Amersur. Te contacto por el interés en {proyecto}...",
  seguimiento_propuesta: "Hola {nombre}, te envío la propuesta que solicitaste...",
  recordatorio_visita: "Hola {nombre}, te recuerdo que mañana tienes visita a las {hora}..."
};
```

#### ✅ **Snooze con Motivo**
```typescript
// Posponer requiere motivo y fecha límite
interface SnoozeData {
  motivo_id: string;        // Motivo predefinido
  hasta: Date;              // Hasta cuándo posponer
  notas?: string;           // Notas adicionales
}
```

#### ✅ **Límite de Vencidas**
```typescript
// Máximo 3 días vencidas por vendedor
const VENCIDAS_LIMITE = 3;
const vencidas = eventos.filter(e => 
  e.estado === 'pendiente' && 
  e.fecha_inicio < new Date() - 3 * 24 * 60 * 60 * 1000
);
```

### 2. **Automatizaciones Clave**

#### 🤖 **Primer Contacto**
```sql
-- Trigger: Cuando entra un lead
CREATE OR REPLACE FUNCTION crear_primer_contacto()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO crm.evento (
    titulo, tipo, objetivo, vendedor_id, cliente_id,
    fecha_inicio, sla_tipo, sla_vencimiento, prioridad
  ) VALUES (
    'Contactar ' || NEW.nombre,
    'llamada',
    'Contactar al lead en menos de 2 horas',
    NEW.vendedor_asignado_id,
    NEW.id,
    NOW() + INTERVAL '30 minutes',
    'primer_contacto',
    NOW() + INTERVAL '2 hours',
    'alta'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

#### 🤖 **Seguimiento de Propuesta**
```sql
-- Trigger: Al enviar propuesta
CREATE OR REPLACE FUNCTION crear_seguimiento_propuesta()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO crm.evento (
    titulo, tipo, objetivo, vendedor_id, cliente_id,
    fecha_inicio, sla_tipo, sla_vencimiento, prioridad
  ) VALUES (
    'Seguimiento propuesta ' || NEW.cliente_nombre,
    'seguimiento',
    'Hacer seguimiento de la propuesta enviada',
    NEW.vendedor_id,
    NEW.cliente_id,
    NOW() + INTERVAL '48 hours',
    'seguimiento_propuesta',
    NOW() + INTERVAL '72 hours',
    'media'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

#### 🤖 **Recordatorio de Visita**
```sql
-- Trigger: 24h antes de visita
CREATE OR REPLACE FUNCTION recordatorio_visita()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tipo = 'visita' AND NEW.fecha_inicio > NOW() + INTERVAL '24 hours' THEN
    INSERT INTO crm.evento (
      titulo, tipo, objetivo, vendedor_id, cliente_id,
      fecha_inicio, prioridad, recordatorio_canal
    ) VALUES (
      'Recordatorio: ' || NEW.titulo,
      'recordatorio',
      'Recordar visita programada',
      NEW.vendedor_id,
      NEW.cliente_id,
      NEW.fecha_inicio - INTERVAL '24 hours',
      'media',
      'whatsapp'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

## 📊 Métricas de Disciplina Comercial

### 1. **Métricas de Tiempo**
```typescript
interface MetricasTiempo {
  tiempoPrimerContacto: number;        // Minutos promedio
  cumplimientoSLA: number;             // Porcentaje
  diasPorEtapa: Record<string, number>; // Días promedio por etapa
  noShowRate: number;                  // Porcentaje de no asistencia
}
```

### 2. **Métricas de Productividad**
```typescript
interface MetricasProductividad {
  tareasCompletadas: number;           // Por vendedor/día
  ratioTareasAvance: number;          // Tareas completadas / Avances de etapa
  efectividadPlantillas: number;      // Respuesta a plantillas
  cargasTrabajo: Record<string, number>; // Carga por vendedor
}
```

### 3. **Alertas Automáticas**
```typescript
const ALERTAS_SLA = {
  primer_contacto: { limite: 2, unidad: 'hours' },
  seguimiento_propuesta: { limite: 48, unidad: 'hours' },
  visita_confirmacion: { limite: 24, unidad: 'hours' },
  hold_vencimiento: { limite: 7, unidad: 'days' }
};
```

## 🚀 Implementación Paso a Paso

### **Fase 1: Configuración Base (48-72h)**

1. **Aplicar migración de schema**
   ```bash
   node aplicar_migracion_agenda_schema.js
   ```

2. **Definir tipos de tarea**
   ```sql
   INSERT INTO crm.evento_tipo_config (tipo, etiqueta, objetivo, duracion_sugerida) VALUES
   ('llamada', 'Contacto', 'Contactar al cliente', 30),
   ('visita', 'Visita', 'Mostrar la propiedad', 90),
   ('email', 'Propuesta', 'Enviar propuesta comercial', 45);
   ```

3. **Configurar SLA**
   ```sql
   INSERT INTO crm.sla_config (tipo, limite_horas, descripcion) VALUES
   ('primer_contacto', 2, 'Primer contacto con lead'),
   ('seguimiento_propuesta', 48, 'Seguimiento de propuesta enviada');
   ```

4. **Crear vistas principales**
   - Hoy (pendientes + vencidas)
   - Semana (kanban)
   - Pipeline (próximos pasos)

### **Fase 2: Automatizaciones (1 semana)**

1. **Triggers de primer contacto**
2. **Seguimiento de propuestas**
3. **Recordatorios de visita**
4. **Alertas SLA**

### **Fase 3: Integraciones (1-2 semanas)**

1. **WhatsApp Business API**
2. **Google Calendar sync**
3. **Mapas integrados**
4. **Telefonía IP**

## 🔧 Configuración de Permisos

### **Vendedor**
```sql
-- Solo sus tareas y las de sus oportunidades
CREATE POLICY "vendedor_sus_tareas" ON crm.evento
  FOR ALL USING (vendedor_id = auth.uid());
```

### **Líder de Equipo**
```sql
-- Tareas del equipo + reasignar
CREATE POLICY "lider_equipo_tareas" ON crm.evento
  FOR ALL USING (
    vendedor_id IN (
      SELECT id FROM auth.users 
      WHERE metadata->>'equipo' = (
        SELECT metadata->>'equipo' FROM auth.users WHERE id = auth.uid()
      )
    )
  );
```

### **Owner del Proyecto**
```sql
-- Ve agenda ligada a su proyecto
CREATE POLICY "owner_proyecto_agenda" ON crm.evento
  FOR SELECT USING (
    propiedad_id IN (
      SELECT id FROM crm.propiedad 
      WHERE owner_id = auth.uid()
    )
  );
```

## 🎯 Checklist de Implementación

### **Configuración Inicial**
- [ ] Schema migrado correctamente
- [ ] Tipos de evento definidos
- [ ] Resultados estándar cargados
- [ ] Motivos de snooze configurados
- [ ] SLA definidos

### **Funcionalidades Core**
- [ ] Crear/editar/eliminar eventos
- [ ] Próximo paso obligatorio
- [ ] Snooze con motivo
- [ ] Recordatorios automáticos
- [ ] Alertas SLA

### **Vistas de Usuario**
- [ ] Vista "Hoy" funcional
- [ ] Vista semanal (kanban)
- [ ] Vista pipeline
- [ ] Filtros y búsquedas

### **Automatizaciones**
- [ ] Primer contacto automático
- [ ] Seguimiento de propuestas
- [ ] Recordatorios de visita
- [ ] Alertas de vencimiento

### **Integraciones**
- [ ] WhatsApp Business
- [ ] Google Calendar
- [ ] Mapas
- [ ] Telefonía

### **Métricas y Reportes**
- [ ] Dashboard de métricas
- [ ] Reportes de productividad
- [ ] Alertas automáticas
- [ ] Exportación de datos

## 🚨 Errores Frecuentes y Soluciones

### **1. Agenda "suelta" (sin oportunidad)**
**Problema**: Tareas sin vincular a oportunidad
**Solución**: Validación obligatoria de cliente_id u oportunidad_id

### **2. Demasiados tipos de tarea**
**Problema**: Usuarios no eligen tipo
**Solución**: Máximo 6 tipos, permitir nota libre

### **3. Resultados abiertos**
**Problema**: Resultados no estandarizados
**Solución**: Listas cerradas + nota libre complementaria

### **4. Reagendar infinito**
**Problema**: Tareas pospuestas indefinidamente
**Solución**: Límite de snoozes + motivo obligatorio

### **5. Conflictos de dueño**
**Problema**: Mismo cliente/proyecto asignado a múltiples vendedores
**Solución**: Alerta automática al líder + reglas de asignación

## 📈 Próximos Pasos

1. **Aplicar la migración** del schema
2. **Configurar tipos de evento** específicos para tu inmobiliaria
3. **Definir SLA** según tu proceso comercial
4. **Entrenar al equipo** en el uso del sistema
5. **Monitorear métricas** y ajustar según resultados

---

**¡La agenda es el corazón del CRM! Con esta implementación tendrás un sistema robusto que mantiene la disciplina comercial y evita que se pierdan leads.**

