# Instructivo: Proceso de Venta End-to-End

Guía completa para hacer una venta de punta a punta en AmersurCRM, desde la creación del cliente hasta la generación de la comisión. Pensada para QA y pruebas funcionales.

---

## Mapa del flujo

```
[1] Crear cliente (potencial)
       │
       ▼
[2] Marcar lotes de interés
       │
       ▼
[3] Crear cotización (proforma)
       │
       ▼
[4] Aprobar proforma           ← (opcional pero recomendado)
       │
       ▼
[5] Registrar separación       → cliente pasa a "en_proceso", lote a "reservado",
                                  se crea proceso_adquisicion con 4 etapas
       │
       ▼
[6] Etapa 1: Separación        → cargar 3 documentos obligatorios + Completar
       │
       ▼
[7] Etapa 2: Calif. Bancaria   → omitida si forma_pago = contado/transferencia/depósito.
                                  Si crédito: cargar 4 obligatorios + Completar
       │
       ▼
[8] Etapa 3: Firma Contrato    → cargar 3 documentos + Completar
       │
       ▼
[9] Etapa 4: Desembolso        → cargar 2 documentos + Cerrar Venta
       │
       ▼
[10] Cerrar venta              → modal de monto/cuotas, RPC atómica:
                                  crea venta + cronograma + comisión + lote vendido
       │
       ▼
[11] Verificar cobranza, comisión y cierre del proceso
```

---

## 0. Pre-requisitos

| Ítem | Cómo verificar |
|---|---|
| Usuario logueado con rol `ROL_VENDEDOR`, `ROL_COORDINADOR_VENTAS`, `ROL_GERENTE` o `ROL_ADMIN` | Login → header muestra nombre |
| Existe al menos un proyecto con lotes en estado `disponible` | `/dashboard/proyectos` |
| Configuración financiera del proyecto cargada | tabla `crm.configuracion_proyecto_financiera` con `tasa_efectiva_mensual`, `max_cuotas_saldo`, `porcentaje_cuota_inicial`, `porcentaje_comision_vendedor`, `dias_vigencia_reserva` |
| Plantilla de proceso activa | Default `Proceso Estándar` se inserta en migración `20260412000000_proceso_adquisicion.sql` |
| Migraciones aplicadas hasta `20260507010000_proceso_rls_delete.sql` | `select max(version) from supabase_migrations.schema_migrations;` |

Verificación rápida en SQL:

```sql
select count(*) filter (where estado = 'disponible') as disponibles,
       count(*) as total
from crm.lote;

select id, nombre, tasa_efectiva_mensual, max_cuotas_saldo,
       porcentaje_cuota_inicial, porcentaje_comision_vendedor, dias_vigencia_reserva
from crm.configuracion_proyecto_financiera
join crm.proyecto on crm.proyecto.id = crm.configuracion_proyecto_financiera.proyecto_id;
```

---

## 1. Crear cliente

1. `/dashboard/clientes` → botón **Nuevo cliente**
2. Completar:
   - Nombre completo (obligatorio)
   - Teléfono (recomendado para WhatsApp)
   - DNI / RUC (queda en la constancia de separación)
   - Dirección (queda en la constancia)
3. Estado inicial: `potencial`
4. Vendedor asignado:
   - Auto-asignado al creador si tiene `ROL_VENDEDOR`
   - Coordinador/admin puede dejar vacío y asignar luego (round-robin)

**Verificación:**

```sql
select id, codigo_cliente, nombre, estado_cliente, vendedor_username
from crm.cliente
order by created_at desc limit 5;
```

---

## 2. Marcar lotes de interés

Habilita lotes preseleccionados en el modal de proforma y separación.

1. Detalle del cliente → tab **Interés**
2. Botón **Agregar propiedad de interés**
3. Seleccionar proyecto → seleccionar lote
4. Guardar

**Atajo:** sin lotes de interés también se puede operar; el modal muestra "Otros lotes disponibles".

---

## 3. Crear cotización (proforma)

1. Detalle del cliente → tab **Adquisición** → sub-tab **Cotizaciones**
2. Botón **Nueva cotización**
3. Llenar:
   - Tipo de operación: `contado` o `credito`
   - Lote (autocompleta desde interés, pero se puede cambiar)
   - Datos del comprador (heredados del cliente)
   - Forma de pago: separación, cuota inicial, número de cuotas, frecuencia
   - Comentarios adicionales
4. Submit → estado inicial: `borrador`
5. Botón **Descargar** genera el PDF para enviar al cliente

**Estados de proforma:** `borrador` → `enviada` → `aprobada` → `convertida` (al generar separación)

**Verificación:**

```sql
select id, numero, estado, total, moneda, lote_id, reserva_id
from crm.proforma
where cliente_id = '<UUID_CLIENTE>'
order by created_at desc;
```

---

## 4. Aprobar proforma

Para que aparezca el botón **Generar Separación** la proforma debe estar `aprobada`.

1. En la fila de la proforma → **Editar**
2. Cambiar estado a `aprobada` (o ejecutar update directo)
3. Guardar

**Atajo SQL:**

```sql
update crm.proforma set estado = 'aprobada' where numero = 'PRO-2026-0001';
```

> Sin proforma se puede ir directo al paso 5 vía botón **Registrar Separación** del header.

---

## 5. Registrar separación

### 5.A — Desde proforma (recomendado)

1. Tab **Adquisición** → sub-tab **Cotizaciones** → fila de la proforma `aprobada`
2. Botón **Generar Separación** (morado, ícono firma)
3. Modal abre con prefill:
   - Lote
   - Monto separación
   - Moneda
   - Forma de pago sugerida (`contado` si la proforma no tiene cuotas, `credito_directo` si sí)
   - Notas
4. Ajustar lo que haga falta y submit

### 5.B — Directa

1. Detalle del cliente (estado `potencial`) → header → botón **Registrar Separación**
2. Alternativa equivalente: tab **Adquisición** → sub-tab **Separaciones** → botón **Registrar Separación**

### Campos del modal

| Campo | Obligatorio | Notas |
|---|---|---|
| **Unidad** | Sí | Lotes en `disponible`. Los marcados como interés del cliente aparecen primero |
| **Monto separación** | Sí | Decimal positivo |
| **Moneda** | Sí | `PEN` o `USD` (se alinea con la del lote) |
| **Forma de pago** | Sí | `contado`, `transferencia`, `deposito`, `credito_hipotecario`, `credito_directo` — las tres primeras saltean Calif. Bancaria |
| **Método de pago de la seña** | No | `efectivo`, `transferencia`, `deposito`, `tarjeta`, `cheque` |
| **Vence** | No | Default = hoy + `dias_vigencia_reserva` del proyecto (7 si no hay config) |
| **Notas** | No | Texto libre |

### Qué pasa al guardar (operación atómica)

1. RPC `reservar_lote` → `lote.estado = 'reservado'`
2. INSERT en `crm.reserva` con código `RES-YYYY-NNNN`, `forma_pago` y `tipo_separacion`
3. Si vino de proforma: `proforma.estado = 'convertida'` + `proforma.reserva_id`
4. RPC `crear_proceso_desde_plantilla` → crea `proceso_adquisicion` con código `ADQ-YYYY-NNNN` + 4 etapas + checklists
   - Si forma_pago saltea calif: `proceso_etapa.estado = 'omitida'` para `calificacion_bancaria`
5. RPC `mover_cliente_pipeline` → `cliente.estado_cliente = 'en_proceso'`

### Verificación

```sql
-- Reserva creada
select codigo_reserva, estado, monto_reserva, forma_pago, fecha_vencimiento
from crm.reserva where cliente_id = '<UUID>' order by created_at desc limit 1;

-- Proceso + etapas
select pa.codigo, pa.etapa_actual, pa.estado,
       json_agg(json_build_object('etapa', pe.etapa, 'estado', pe.estado, 'orden', pe.orden) order by pe.orden) as etapas
from crm.proceso_adquisicion pa
join crm.proceso_etapa pe on pe.proceso_id = pa.id
where pa.cliente_id = '<UUID>'
group by pa.id, pa.codigo, pa.etapa_actual, pa.estado;
```

### Descargar constancia

Tab **Adquisición** → sub-tab **Separaciones** → ícono verde de descarga → genera PDF "Constancia de Separación" con firma del Gerente General.

---

## 6. Etapa 1: Separación

Detalle del cliente → tab **Adquisición** → sub-tab **Procesos** → expandir el proceso `ADQ-...`

### Checklist obligatorio (3 items)

| Ítem | Tipo de archivo | Obligatorio |
|---|---|---|
| DNI del comprador | PDF / JPG / PNG | Sí |
| Comprobante de pago de separación | PDF / JPG / PNG | Sí |
| Formulario de separación firmado | PDF / JPG / PNG | Sí |

### Acciones por ítem

- **Subir** (ícono Upload): elige archivo → se sube al bucket `proceso-documentos` → tilda automática del checkbox
- **Ver** (ícono ojo): abre signed URL temporal (5 min)
- **Eliminar** (ícono basura): solo quien subió o admin

### Avance

1. Marcar los 3 checks (auto al subir documento)
2. Opcional: agregar **Observaciones**
3. Privilegiado puede **Aprobar** la etapa (badge verde) o **Observar** (requiere motivo)
4. Botón **Completar** → la etapa queda `completada` y avanza a la siguiente no omitida

> Si la etapa está marcada `omitida`, se salta sin tocarla. El botón Completar pasa directo a la siguiente.

---

## 7. Etapa 2: Calificación Bancaria

**Se omite automáticamente** si la separación se registró con forma_pago = `contado`, `transferencia` o `deposito`. En ese caso el badge muestra **Omitida**, no requiere acción y `avanzarEtapa` salta directo a Firma Contrato.

### Checklist (cuando aplica, crédito hipotecario o directo)

| Ítem | Obligatorio |
|---|---|
| Boletas de pago (3 últimos meses) | Sí |
| Estado de cuenta bancario | Sí |
| DDJJ Renta | Sí |
| Certificado de trabajo | No |
| Carta de aprobación del banco | Sí |

Plazo default: **30 días** (`fecha_limite` se calcula al pasar a `en_progreso`).

Avance: subir 4 obligatorios → Completar.

---

## 8. Etapa 3: Firma Contrato

### Checklist (3 items, todos obligatorios)

| Ítem |
|---|
| Minuta de compraventa |
| Comprobante de cuota inicial |
| Contrato firmado y escaneado |

Plazo default: **15 días**. Avance: subir 3 → Completar.

---

## 9. Etapa 4: Desembolso

### Checklist (1 ítem obligatorio)

| Ítem |
|---|
| Comprobante de pago |

### Acción final

Cuando el check está completo, en lugar del botón **Completar** aparece el botón verde **Cerrar venta** (`DollarSign`).

---

## 10. Cerrar venta

Click **Cerrar venta** en la etapa Desembolso → abre `CerrarVentaModal`.

### Datos prefill

- Precio sugerido = precio del lote
- Moneda = de la reserva (o del lote si no hay)
- Monto inicial sugerido = `precio_total * porcentaje_cuota_inicial / 100` (default 20%)
- Tasa efectiva mensual y máximo de cuotas vienen de `configuracion_proyecto_financiera`

### Inputs editables

| Campo | Validación |
|---|---|
| **Precio total** | > 0 |
| **Monto inicial** | ≥ 0, ≤ precio total |
| **Número de cuotas** | Entero ≥ 0, ≤ `max_cuotas_saldo` |
| **Fecha primera cuota** | Opcional, por defecto +30 días |
| **Notas** | Texto libre |

### Qué pasa al confirmar (RPC `cerrar_proceso_y_crear_venta`, atómica)

1. INSERT en `crm.venta` con código `VTA-YYYY-NNNN`
2. Genera cronograma: `numero_cuotas` filas en `crm.cuota` con amortización francesa, tasa del proyecto
3. `lote.estado = 'vendido'`
4. `reserva.estado = 'convertida_venta'`
5. `proceso_adquisicion.estado = 'completado'`, `etapa_actual = 'desembolso'` queda en historico
6. INSERT en `crm.comision` con código `COM-YYYY-NNNN`, `monto = precio_total * porcentaje_comision_vendedor / 100`, `estado = 'pendiente'`

### Verificación

```sql
-- Venta + cronograma
select v.codigo, v.precio_total, v.monto_inicial, v.numero_cuotas, v.estado,
       count(c.id) filter (where c.estado = 'pendiente') as cuotas_pendientes
from crm.venta v
left join crm.cuota c on c.venta_id = v.id
where v.cliente_id = '<UUID>'
group by v.id;

-- Comisión
select codigo, monto, estado, beneficiario_username, fecha_generacion
from crm.comision where venta_id in (select id from crm.venta where cliente_id = '<UUID>');

-- Lote vendido
select codigo, estado from crm.lote where id = '<UUID_LOTE>';
```

---

## 11. Post-venta

### Tab Ventas → sub-tab Cronograma

Lista de cuotas con estado, fecha de vencimiento, monto, capital, interés y saldo.

### Cobranza

`/dashboard/cobranza` → cuotas vencidas globales del CRM.

### Comisión

`/dashboard/admin/comisiones` (o tab admin equivalente):
- Estado: `pendiente` → `aprobada` → `pagada`
- Solo admin/gerente cambia estado

---

## Permisos por rol

| Acción | Vendedor | Coordinador | Gerente | Admin |
|---|---|---|---|---|
| Crear cliente | Sí (auto-asignado) | Sí | Sí | Sí |
| Marcar interés | Solo propios | Todos | Todos | Todos |
| Crear proforma | Solo propios | Todos | Todos | Todos |
| Aprobar proforma | No | Sí | Sí | Sí |
| Registrar separación | Solo propios | Todos | Todos | Todos |
| Cargar documentos checklist | Solo propios | Todos | Todos | Todos |
| Aprobar / Observar etapa | No | Sí | Sí | Sí |
| Completar etapa | Solo propios | Todos | Todos | Todos |
| Cerrar venta | Vendedor asignado | Sí | Sí | Sí |
| Anular separación | No | No | No | Sí |
| Extender vencimiento | No | No | No | Sí |
| Eliminar separación | No | No | No | Sí |
| Eliminar proceso | No | No | No | Sí |
| Aprobar / Pagar comisión | No | No | Sí | Sí |

---

## Estados clave

### `cliente.estado_cliente`

`potencial` → `en_proceso` → `cerrado` (al cerrar venta) | `descartado`

### `lote.estado`

`disponible` → `reservado` → `vendido` | rollback a `disponible` si se anula

### `reserva.estado`

`activa` → `convertida_venta` | `cancelada` | `vencida`

### `proceso_adquisicion.estado` + `etapa_actual`

- `activo` + etapa actual avanza por las 4 etapas
- `completado` cuando se cierra venta
- `cancelado` cuando se anula la separación
- `pausado` (manual)

### `proceso_etapa.estado`

`pendiente` → `en_progreso` → `completada` | `omitida` (calif. bancaria con pago al contado)

### `proceso_etapa.estado_revision` (informativo)

`pendiente` → `en_revision` → `aprobado` | `observado`

---

## Casos de prueba sugeridos

### TC-1 — Venta al contado, sin proforma

1. Crear cliente → 2. interés → **omitir paso 3-4** → 5.B (forma_pago = `contado`) → 6 → 7 omitida → 8 → 9 → 10
2. Esperado: proceso completado en 3 etapas reales, comisión generada, cuotas = 0

### TC-2 — Venta con crédito, desde proforma

1. Crear cliente → 2 → 3 (tipo `credito`, 60 cuotas) → 4 (aprobar) → 5.A → 6 → 7 (con docs bancarios) → 8 → 9 → 10
2. Esperado: cronograma de 60 cuotas, primera cuota a 30 días, comisión `pendiente`

### TC-3 — Anular separación post etapa 1

1. Hasta paso 6 completo → tab Separaciones → admin → **Anular separación** con motivo
2. Esperado: reserva `cancelada`, lote `disponible`, proceso `cancelado`, cliente vuelve a `potencial`

### TC-4 — Eliminar proceso (admin)

1. Después de TC-3 → tab Procesos → ícono basura rojo → confirmar
2. Esperado: proceso desaparece físicamente; reserva, lote y cliente **no** se modifican

### TC-5 — Race lote ya separado

1. Dos sesiones intentan separar el mismo lote → segundo recibe error `Lote no disponible`

---

## Errores comunes

| Síntoma | Causa | Solución |
|---|---|---|
| `Permiso denegado: separaciones.crear` | Rol sin permiso | Reaplicar matriz `20250326000008_permissions_matrix.sql` |
| `Lote no disponible` | Lote ya separado | Refrescar página, elegir otro |
| `No tienes permisos para registrar la separacion` | Vendedor no es dueño del cliente | Reasignar cliente o usar coordinador |
| `Faltan N documentos obligatorios` al Completar | Items obligatorios sin tilde | Subir/marcar los faltantes |
| Checkbox no responde, sin error | RLS UPDATE faltante | Aplicar `20260420000000_proceso_rls_update.sql` |
| Botón **Eliminar proceso** no borra | RLS DELETE faltante | Aplicar `20260507010000_proceso_rls_delete.sql` |
| Cierre de venta da error de cuotas | `numero_cuotas` > `max_cuotas_saldo` | Bajar cuotas o subir tope en config |
| Comisión no aparece tras cierre | Falta `porcentaje_comision_vendedor` en config | Setear valor (default 3%) y volver a calcular manual |
| Calif. Bancaria no se omite con contado | Separación creada con forma_pago errónea | Revisar `crm.reserva.forma_pago` |

---

## Queries de soporte rápido

### Ver estado completo de un cliente

```sql
select c.codigo_cliente, c.nombre, c.estado_cliente,
       r.codigo_reserva, r.estado as reserva_estado, r.forma_pago,
       pa.codigo as proceso_codigo, pa.etapa_actual, pa.estado as proceso_estado,
       v.codigo as venta_codigo, v.estado as venta_estado,
       co.codigo as comision_codigo, co.estado as comision_estado
from crm.cliente c
left join crm.reserva r on r.cliente_id = c.id
left join crm.proceso_adquisicion pa on pa.cliente_id = c.id
left join crm.venta v on v.cliente_id = c.id
left join crm.comision co on co.venta_id = v.id
where c.codigo_cliente = 'CLI-2026-0001';
```

### Ver checklist de una etapa

```sql
select pe.etapa, pci.descripcion, pci.obligatorio, pci.completado, pci.documento_nombre
from crm.proceso_etapa pe
join crm.proceso_checklist_item pci on pci.etapa_id = pe.id
where pe.proceso_id = '<UUID_PROCESO>'
order by pe.orden, pci.orden;
```

### Resetear todo para volver a probar (peligroso, solo en dev)

```sql
-- Borra venta, comisión, cuotas, proceso, reserva del cliente; vuelve lote a disponible.
begin;
delete from crm.comision where venta_id in (select id from crm.venta where cliente_id = '<UUID>');
delete from crm.cuota where venta_id in (select id from crm.venta where cliente_id = '<UUID>');
delete from crm.venta where cliente_id = '<UUID>';
delete from crm.proceso_adquisicion where cliente_id = '<UUID>';
update crm.lote set estado = 'disponible'
  where id in (select lote_id from crm.reserva where cliente_id = '<UUID>');
delete from crm.reserva where cliente_id = '<UUID>';
update crm.cliente set estado_cliente = 'potencial' where id = '<UUID>';
commit;
```

---

## Referencias técnicas

| Archivo | Rol |
|---|---|
| `src/app/dashboard/clientes/[id]/_actions-separacion.ts` | `registrarSeparacion`, `anularSeparacion`, `extenderVencimientoSeparacion`, `obtenerDatosProformaParaSeparacion` |
| `src/app/dashboard/clientes/[id]/_SeparacionModal.tsx` | Modal único de creación (paso 5.A y 5.B) |
| `src/app/dashboard/clientes/[id]/_TabReservas.tsx` | Listado sub-tab Separaciones |
| `src/app/dashboard/clientes/[id]/_TabProcesosCliente.tsx` | UI de etapas + checklist + cerrar venta + eliminar proceso |
| `src/app/dashboard/clientes/[id]/_CerrarVentaModal.tsx` | Modal del paso 10 |
| `src/app/dashboard/adquisicion/_actions-proceso.ts` | `toggleChecklistItem`, `avanzarEtapa`, `cerrarProcesoYCrearVenta`, `eliminarProceso`, `cancelarProceso` |
| `src/components/separacion/generarConstanciaSeparacionPdf.ts` | Constancia PDF |
| `supabase/migrations/20260412000000_proceso_adquisicion.sql` | Tablas + plantilla default |
| `supabase/migrations/20260419020000_flujo_separacion_etapa1.sql` | `forma_pago`, salto condicional, `dias_vigencia_reserva` |
| `supabase/migrations/20260420000000_proceso_rls_update.sql` | RLS UPDATE checklist/etapa/proceso |
| `supabase/migrations/20260505000001_flujo_proceso_etapa3_cierre_venta.sql` | RPC `cerrar_proceso_y_crear_venta` |
| `supabase/migrations/20260507000000_etapa5_comisiones.sql` | Tabla `comision` + auto-generación |
| `supabase/migrations/20260507010000_proceso_rls_delete.sql` | RLS DELETE para eliminar proceso |
