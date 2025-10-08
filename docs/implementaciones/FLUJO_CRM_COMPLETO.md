## 🎯 FLUJO CRM COMPLETO - IMPLEMENTADO

### Sistema de Gestión Completo: Cliente → Vendedor → Proyecto → Lote → Reserva → Venta → Pagos

---

## 📊 ARQUITECTURA DEL FLUJO

```
┌─────────────────┐
│  1. LEAD        │ ← Cliente ingresa al CRM
└────────┬────────┘
         │ Admin asigna vendedor
         ↓
┌─────────────────────────┐
│  2. CLIENTE ASIGNADO    │ vendedor_username = 'jperez'
└────────┬────────────────┘
         │ Vendedor contacta
         ↓
┌─────────────────────────┐
│  3. INTERACCIONES       │ Llamadas, emails, WhatsApp
│     (cliente_interaccion)│ Registra: tipo, resultado, próxima acción
└────────┬────────────────┘
         │ Identifica interés
         ↓
┌─────────────────────────────────┐
│  4. PROPIEDADES DE INTERÉS      │
│     (cliente_propiedad_interes)  │ Wishlist del cliente
└────────┬────────────────────────┘
         │ Muestra propiedades
         ↓
┌─────────────────────────┐
│  5. VISITAS             │ Visitas físicas a lotes
│     (visita_propiedad)   │ Registra: feedback, nivel interés
└────────┬────────────────┘
         │ Cliente decide
         ↓
┌─────────────────────────┐
│  6. RESERVA             │ Cliente aparta lote
│     (reserva)            │ Código: RES-2025-0001
│                          │ Estado lote: "reservado"
└────────┬────────────────┘
         │ Firma contrato
         ↓
┌─────────────────────────┐
│  7. VENTA               │ Contrato de compra
│     (venta)              │ Código: VTA-2025-0001
│                          │ Estado lote: "vendido"
└────────┬────────────────┘
         │ Cuotas/Pagos
         ↓
┌─────────────────────────┐
│  8. PAGOS               │ Seguimiento de cuotas
│     (pago)               │ Actualiza saldo_pendiente auto
└─────────────────────────┘
```

---

## 🗄️ ESTRUCTURA DE BASE DE DATOS

### **Tablas Creadas:**

#### 1. **cliente_interaccion**
Registra todas las interacciones del vendedor con el cliente.

```sql
CREATE TABLE crm.cliente_interaccion (
    id UUID PRIMARY KEY,
    cliente_id UUID → crm.cliente,
    vendedor_username VARCHAR(50),
    tipo: 'llamada' | 'email' | 'whatsapp' | 'visita' | 'reunion' | 'mensaje',
    resultado: 'contesto' | 'no_contesto' | 'interesado' | etc.,
    notas TEXT,
    duracion_minutos INTEGER,
    fecha_interaccion TIMESTAMPTZ,
    proxima_accion: 'llamar' | 'enviar_propuesta' | 'reunion' | etc.,
    fecha_proxima_accion TIMESTAMPTZ
);
```

**Casos de uso:**
- Vendedor registra llamada: "Llamé al cliente, no contestó, reagendar para mañana"
- Historial completo de comunicaciones
- Dashboard de acciones pendientes

#### 2. **cliente_propiedad_interes**
Lista de deseos del cliente (wishlist).

```sql
CREATE TABLE crm.cliente_propiedad_interes (
    id UUID PRIMARY KEY,
    cliente_id UUID → crm.cliente,
    lote_id UUID → crm.lote,
    propiedad_id UUID → crm.propiedad,
    prioridad: 1 | 2 | 3,  -- 1=alta, 2=media, 3=baja
    notas TEXT,
    agregado_por VARCHAR(50)  -- username vendedor
);
```

**Casos de uso:**
- Cliente muestra interés en 3 lotes diferentes
- Vendedor marca prioridad alta en el que más le interesa
- Comparar propiedades favoritas

#### 3. **visita_propiedad**
Registro de visitas físicas a propiedades.

```sql
CREATE TABLE crm.visita_propiedad (
    id UUID PRIMARY KEY,
    cliente_id UUID → crm.cliente,
    lote_id UUID → crm.lote,
    vendedor_username VARCHAR(50),
    fecha_visita TIMESTAMPTZ,
    duracion_minutos INTEGER,
    feedback TEXT,
    nivel_interes: 1 | 2 | 3 | 4 | 5  -- 1=muy bajo, 5=muy alto
);
```

**Casos de uso:**
- Registrar visita al lote: "Cliente visitó lote A5, duró 45min, nivel interés: 5/5"
- Propiedades más visitadas (reportes)
- Seguimiento de conversiones visita → venta

#### 4. **reserva**
Reservas de lotes/propiedades.

```sql
CREATE TABLE crm.reserva (
    id UUID PRIMARY KEY,
    codigo_reserva VARCHAR(20) UNIQUE,  -- Auto: RES-2025-0001
    cliente_id UUID → crm.cliente,
    lote_id UUID → crm.lote,
    vendedor_username VARCHAR(50),
    monto_reserva NUMERIC(12,2),
    moneda: 'PEN' | 'USD' | 'EUR',
    fecha_reserva TIMESTAMPTZ,
    fecha_vencimiento TIMESTAMPTZ,
    estado: 'activa' | 'vencida' | 'cancelada' | 'convertida_venta',
    metodo_pago VARCHAR(50),
    comprobante_url TEXT
);
```

**Casos de uso:**
- Cliente aparta lote con S/ 5,000 por 30 días
- Código auto-generado: RES-2025-0001
- Lote cambia a estado "reservado"
- Si vence, lote vuelve a "disponible"

**Triggers automáticos:**
- ✅ Genera código automático (RES-YYYY-####)
- ✅ Actualiza estado de lote

#### 5. **venta**
Contratos de compra/venta.

```sql
CREATE TABLE crm.venta (
    id UUID PRIMARY KEY,
    codigo_venta VARCHAR(20) UNIQUE,  -- Auto: VTA-2025-0001
    reserva_id UUID → crm.reserva,
    cliente_id UUID → crm.cliente,
    lote_id UUID → crm.lote,
    vendedor_username VARCHAR(50),
    precio_total NUMERIC(14,2),
    moneda: 'PEN' | 'USD' | 'EUR',
    forma_pago: 'contado' | 'financiado' | 'credito_bancario' | 'mixto',
    monto_inicial NUMERIC(14,2),
    saldo_pendiente NUMERIC(14,2),  -- Se actualiza auto con pagos
    numero_cuotas INTEGER,
    fecha_venta TIMESTAMPTZ,
    fecha_entrega DATE,
    estado: 'en_proceso' | 'finalizada' | 'cancelada',
    contrato_url TEXT,
    comision_vendedor NUMERIC(10,2)
);
```

**Casos de uso:**
- Reserva se convierte en venta
- Código auto-generado: VTA-2025-0001
- Lote cambia a estado "vendido"
- Calcula comisión del vendedor

**Triggers automáticos:**
- ✅ Genera código automático (VTA-YYYY-####)
- ✅ Actualiza estado de lote a "vendido"
- ✅ Cambia reserva a "convertida_venta"

#### 6. **pago**
Registro de pagos de ventas.

```sql
CREATE TABLE crm.pago (
    id UUID PRIMARY KEY,
    venta_id UUID → crm.venta,
    numero_cuota INTEGER,
    monto NUMERIC(12,2),
    moneda: 'PEN' | 'USD' | 'EUR',
    fecha_pago TIMESTAMPTZ,
    fecha_vencimiento DATE,
    metodo_pago: 'efectivo' | 'transferencia' | 'tarjeta' | 'cheque',
    numero_operacion VARCHAR(100),
    banco VARCHAR(100),
    comprobante_url TEXT,
    registrado_por VARCHAR(50)  -- username
);
```

**Casos de uso:**
- Registrar cuota mensual
- Venta de S/ 100,000 → Cliente paga cuota 1 de S/ 10,000
- `saldo_pendiente` se actualiza automáticamente a S/ 90,000

**Triggers automáticos:**
- ✅ Al insertar pago, actualiza `venta.saldo_pendiente`

---

## 🔧 SERVER ACTIONS

### **Archivo:** `src/app/dashboard/clientes/_actions_crm.ts`

#### Interacciones:
```typescript
registrarInteraccion({
  clienteId,
  tipo: 'llamada' | 'email' | 'whatsapp' | ...,
  resultado: 'contesto' | 'no_contesto' | ...,
  notas,
  proximaAccion: 'llamar' | 'reunion' | ...,
  fechaProximaAccion
})

obtenerInteracciones(clienteId)
```

#### Propiedades de Interés:
```typescript
agregarPropiedadInteres({
  clienteId,
  loteId,
  prioridad: 1 | 2 | 3,
  notas
})
```

#### Visitas:
```typescript
registrarVisita({
  clienteId,
  loteId,
  fechaVisita,
  duracionMinutos,
  feedback,
  nivelInteres: 1-5
})
```

#### Reservas:
```typescript
crearReserva({
  clienteId,
  loteId,
  montoReserva,
  moneda: 'PEN' | 'USD',
  fechaVencimiento,
  metodoPago,
  notas
})

cancelarReserva(reservaId, motivo)
// → Lote vuelve a "disponible"
```

#### Ventas:
```typescript
convertirReservaEnVenta({
  reservaId,
  precioTotal,
  formaPago: 'contado' | 'financiado' | ...,
  montoInicial,
  numeroCuotas,
  fechaEntrega,
  comisionVendedor,
  notas
})
// → Crea venta, actualiza lote a "vendido"
// → Si hay montoInicial, registra primer pago

registrarPago({
  ventaId,
  numeroCuota,
  monto,
  metodoPago: 'transferencia' | 'efectivo' | ...,
  numeroOperacion,
  banco,
  comprobanteUrl
})
// → Actualiza saldo_pendiente automáticamente
```

---

## 📐 TYPES (TypeScript)

### **Archivo:** `src/lib/types/crm-flujo.ts`

```typescript
// Interacciones
type TipoInteraccion = 'llamada' | 'email' | 'whatsapp' | ...
type ResultadoInteraccion = 'contesto' | 'no_contesto' | ...
type ProximaAccion = 'llamar' | 'reunion' | ...

// Visitas
type NivelInteres = 1 | 2 | 3 | 4 | 5

// Reservas
type EstadoReserva = 'activa' | 'vencida' | 'cancelada' | 'convertida_venta'

// Ventas
type EstadoVenta = 'en_proceso' | 'finalizada' | 'cancelada'
type FormaPago = 'contado' | 'financiado' | 'credito_bancario' | 'mixto'

// Pagos
type MetodoPago = 'efectivo' | 'transferencia' | 'tarjeta' | 'cheque'

// Utilidades
formatearMoneda(monto, moneda) → "S/ 100,000.00"
calcularPorcentajePagado(venta) → 65%
diasParaVencer(fecha) → 15 días
```

---

## 🎨 INTERFAZ DE USUARIO (Next Steps)

### **Páginas a Crear:**

#### 1. **Dashboard del Vendedor**
- Mis clientes asignados
- Interacciones pendientes (próximas acciones)
- Reservas activas
- Ventas en proceso

#### 2. **Vista Detallada del Cliente**
- **Tab: Información** - Datos básicos
- **Tab: Interacciones** - Historial de contactos
- **Tab: Propiedades de Interés** - Wishlist
- **Tab: Visitas** - Visitas realizadas
- **Tab: Reservas** - Reservas activas/históricas
- **Tab: Ventas** - Contratos y pagos

#### 3. **Gestión de Reservas**
- Lista de reservas activas
- Filtros: por vendedor, por proyecto, por estado
- Alertas de vencimiento próximo
- Acción: Convertir a venta

#### 4. **Gestión de Ventas**
- Lista de ventas en proceso
- Filtros: por vendedor, por proyecto, por estado pago
- Dashboard de saldos pendientes
- Registro de pagos

#### 5. **Vista del Proyecto**
- Mapa de lotes con estados:
  - 🟢 Disponible
  - 🟡 Reservado (+ días restantes)
  - 🔴 Vendido
- Click en lote → Ver detalles, cliente, vendedor

---

## 🔄 FLUJO COMPLETO - EJEMPLO REAL

### **Caso: Juan Pérez (cliente) compra Lote A-05**

```
1. LEAD INGRESA
   - Admin crea cliente "Juan Pérez"
   - Asigna vendedor: @mlopez

2. PRIMER CONTACTO
   - @mlopez llama a Juan
   - Registra interacción:
     * Tipo: llamada
     * Resultado: interesado
     * Próxima acción: reunion
     * Fecha: 2025-02-10

3. REUNIÓN Y VISITA
   - @mlopez se reúne con Juan
   - Registra interacción: reunion exitosa
   - Muestra 3 lotes de interés
   - Agrega a propiedades_interes:
     * Lote A-05 (prioridad alta)
     * Lote B-12 (prioridad media)
     * Lote C-03 (prioridad baja)

4. VISITA AL TERRENO
   - Visitan Lote A-05
   - Registra visita:
     * Duración: 60 min
     * Nivel interés: 5/5
     * Feedback: "Le encantó la ubicación"

5. RESERVA
   - Juan aparta Lote A-05
   - Crea reserva:
     * Código: RES-2025-0001
     * Monto: S/ 5,000
     * Vencimiento: 30 días
   - Lote A-05 → estado: "reservado"

6. FIRMA DE CONTRATO
   - Convierte reserva en venta:
     * Código: VTA-2025-0001
     * Precio total: S/ 120,000
     * Forma pago: financiado
     * Monto inicial: S/ 30,000
     * 12 cuotas de S/ 7,500
   - Lote A-05 → estado: "vendido"
   - Reserva → estado: "convertida_venta"

7. PAGOS
   - Pago inicial S/ 30,000 (auto-registrado)
     * Saldo pendiente: S/ 90,000

   - Cuota 1: S/ 7,500
     * Saldo pendiente: S/ 82,500

   - Cuota 2: S/ 7,500
     * Saldo pendiente: S/ 75,000

   ... (continúa hasta saldar)

8. COMISIÓN
   - @mlopez gana comisión: S/ 3,600 (3% de S/ 120,000)
```

---

## ✅ BENEFICIOS DEL SISTEMA

### **Para Vendedores:**
- ✅ Registro completo de interacciones
- ✅ Recordatorios de próximas acciones
- ✅ Wishlist de cada cliente
- ✅ Seguimiento de visitas
- ✅ Comisiones claras

### **Para Administradores:**
- ✅ Trazabilidad total del proceso
- ✅ Reportes de conversión (lead → venta)
- ✅ Control de inventario (lotes)
- ✅ Dashboard de pagos pendientes
- ✅ Performance por vendedor

### **Para el Negocio:**
- ✅ Proceso estandarizado
- ✅ Sin pérdida de información
- ✅ Auditoría completa
- ✅ Escalable

---

## 🚀 PRÓXIMOS PASOS

1. **Ejecutar Migración:**
   ```sql
   \i supabase/migrations/20250205000010_flujo_crm_completo.sql
   ```

2. **Crear Componentes UI:**
   - Modal de registro de interacciones
   - Modal de crear reserva
   - Modal de convertir a venta
   - Modal de registrar pago
   - Timeline de historial del cliente

3. **Crear Dashboards:**
   - Dashboard vendedor (mis clientes, acciones pendientes)
   - Dashboard admin (pipeline de ventas)
   - Reportes de comisiones

4. **Notificaciones (opcional):**
   - Reservas próximas a vencer
   - Pagos vencidos
   - Nuevas asignaciones

---

## 📚 DOCUMENTACIÓN DE REFERENCIA

- **Migraciones:** `/supabase/migrations/20250205000010_flujo_crm_completo.sql`
- **Server Actions:** `/src/app/dashboard/clientes/_actions_crm.ts`
- **Types:** `/src/lib/types/crm-flujo.ts`
- **Este documento:** `/FLUJO_CRM_COMPLETO.md`

---

**Sistema listo para gestionar todo el ciclo de vida del cliente en el negocio inmobiliario.** 🎉
