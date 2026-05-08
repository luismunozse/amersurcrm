# Flujo de Venta — Guía para Vendedor y Admin

Manual operativo para llevar una venta desde el primer contacto con el cliente hasta el cierre, el cobro y la comisión. No requiere conocimientos técnicos: solo describe qué pantallas usar y qué botones presionar.

---

## Resumen en un minuto

1. Captura al cliente y márquelo como **potencial**.
2. Registre los lotes que le interesan.
3. Genere una **cotización** con el precio y la forma de pago.
4. Cuando el cliente acepte, **registre la separación** (toma del lote + seña).
5. Avance las **4 etapas del proceso de adquisición** cargando los documentos que correspondan.
6. Al llegar a la última etapa, **cierre la venta**: el sistema arma el cronograma de cuotas y genera su comisión.

---

## ¿Quién hace qué?

| Rol | Qué puede hacer |
|---|---|
| **Vendedor** | Crear y atender clientes asignados. Cargar interés, cotizaciones, separaciones y documentos. Avanzar etapas y cerrar la venta. |
| **Coordinador de Ventas / Gerente** | Todo lo del vendedor sobre cualquier cliente. Aprobar u observar etapas. Aprobar comisiones (gerente). |
| **Administrador** | Todo lo anterior. Anular separaciones, extender vencimientos, eliminar separaciones o procesos completos. |

> Si el sistema no le deja ejecutar una acción, lo más probable es que el cliente no esté asignado a usted. Pida al coordinador que se lo reasigne.

---

## Paso 1 — Crear el cliente

1. Menú lateral → **Clientes** → botón **Nuevo cliente**.
2. Complete:
   - **Nombre completo** (obligatorio).
   - **Teléfono** (recomendado: habilita WhatsApp y llamadas con un click).
   - **DNI / RUC** (importante: se imprime en la constancia de separación).
   - **Dirección** (también aparece en la constancia).
3. Guardar.

El cliente queda con estado **Potencial**. Si usted es vendedor, queda asignado automáticamente. Si es coordinador o admin, puede dejarlo sin asignar y el sistema lo distribuye después por turno.

---

## Paso 2 — Registrar lotes de interés

Sirve para que después aparezcan preseleccionados al cotizar y al separar.

1. Detalle del cliente → tab **Interés** → botón **Agregar propiedad de interés**.
2. Elija proyecto y lote. Guardar.
3. Repita por cada lote que el cliente esté evaluando.

> Si no marca interés no pasa nada: igual podrá elegir lotes en los pasos siguientes.

---

## Paso 3 — Generar cotización

1. Detalle del cliente → tab **Adquisición** → sub-tab **Cotizaciones** → **Nueva cotización**.
2. Llene el formulario:
   - **Tipo de operación**: contado o crédito.
   - **Lote** (auto-completa los marcados como interés).
   - **Datos del comprador** (heredados del cliente, edite si hace falta).
   - **Forma de pago**: monto de separación, cuota inicial, número de cuotas, frecuencia.
   - **Comentarios** adicionales para el cliente.
3. Guardar → la cotización queda como **borrador**.
4. Use el botón **Descargar** para enviar el PDF al cliente por correo o WhatsApp.

---

## Paso 4 — Aprobar la cotización (cuando el cliente acepta)

1. En la fila de la cotización, botón **Editar**.
2. Cambiar estado a **Aprobada**. Guardar.
3. Aparece el botón **Generar Separación**.

> Sin esta aprobación no se habilita el botón "Generar Separación" desde la cotización. Igual puede separar de forma directa (paso 5 alternativa B).

---

## Paso 5 — Registrar la separación

Hay dos caminos. Use el que corresponda:

### Opción A — Desde una cotización aprobada (recomendado)

1. Tab **Adquisición** → sub-tab **Cotizaciones** → fila aprobada → botón **Generar Separación** (morado).
2. El modal abre con todos los datos prellenados desde la cotización: lote, monto, moneda y forma de pago sugerida.
3. Ajuste lo que haga falta y submit.

### Opción B — Directa (sin cotización previa)

1. Detalle del cliente (estado Potencial) → header → botón **Registrar Separación**.
2. Equivale al botón **Registrar Separación** del sub-tab Separaciones.

### Campos del modal

| Campo | Notas |
|---|---|
| **Unidad** | Solo aparecen lotes disponibles. Los marcados como interés del cliente salen primero. |
| **Monto de separación** | Lo que el cliente paga ahora. |
| **Moneda** | PEN o USD. Se ajusta a la del lote si corresponde. |
| **Forma de pago de la operación** | Contado, transferencia, depósito, crédito hipotecario o crédito directo. |
| **Método de pago de la seña** | Cómo paga la separación: efectivo, transferencia, depósito, tarjeta o cheque. |
| **Vence** | Si lo deja vacío usa los días configurados del proyecto. |
| **Notas** | Para comentarios internos. |

> **Importante:** si la forma de pago es **contado**, **transferencia** o **depósito**, el sistema **omite automáticamente** la etapa de Calificación Bancaria. Si elige crédito, esa etapa se vuelve obligatoria.

### Qué pasa al guardar

- El lote pasa a **Reservado**.
- El cliente pasa a **En Proceso**.
- Se crea el **proceso de adquisición** con sus 4 etapas.
- Si la separación vino de una cotización, esa cotización queda marcada como **Convertida**.

### Constancia de separación

Tab **Adquisición** → sub-tab **Separaciones** → ícono verde de descarga junto a la fila → genera el PDF firmado por la Gerencia General. Se lo entrega o envía al cliente.

---

## Paso 6 — Etapa 1: Separación

Tab **Adquisición** → sub-tab **Procesos** → expandir el proceso recién creado (`ADQ-AAAA-NNNN`).

Cargue los 3 documentos obligatorios:

- DNI del comprador.
- Comprobante de pago de la separación.
- Formulario de separación firmado.

**Cómo cargar:** ícono de subida a la derecha de cada item → elija archivo PDF o imagen → el check se marca solo. Para revisar lo subido use el ícono del ojo. Para reemplazar, primero elimine con el ícono del tacho (solo lo puede borrar quien lo subió o un admin).

Cuando los 3 estén cargados, presione **Completar**. La etapa queda en verde y avanza a la siguiente.

> Si falta algún documento obligatorio el sistema lo avisa al intentar Completar.

---

## Paso 7 — Etapa 2: Calificación Bancaria

**Solo aplica si la forma de pago fue crédito hipotecario o crédito directo.** En pagos al contado o por transferencia/depósito esta etapa aparece en gris con el badge **Omitida** y se salta sola.

Cuando aplica, los documentos a cargar son:

- Boletas de pago de los últimos 3 meses (obligatorio).
- Estado de cuenta bancario (obligatorio).
- Declaración Jurada de Renta (obligatorio).
- Certificado de trabajo (opcional).
- Carta de aprobación del banco (obligatorio).

Plazo sugerido por el sistema: 30 días desde el inicio de la etapa.

Cargue los 4 obligatorios → **Completar**.

---

## Paso 8 — Etapa 3: Firma de Contrato

Documentos a cargar (todos obligatorios):

- Minuta de compraventa.
- Comprobante de cuota inicial.
- Contrato firmado y escaneado.

Plazo sugerido: 15 días.

Cuando los 3 estén cargados → **Completar**.

---

## Paso 9 — Etapa 4: Desembolso

Documentos a cargar:

- Carta de desembolso del banco.
- Comprobante de transferencia.

Cuando los 2 estén cargados, en lugar del botón Completar aparece el botón verde **Cerrar venta**.

---

## Paso 10 — Cerrar la venta

Click en **Cerrar venta** abre el modal final.

El sistema sugiere:

- **Precio total** = precio del lote.
- **Monto inicial** = un porcentaje del precio (configurado por proyecto, típicamente 20%).
- **Número de cuotas** y **tasa mensual** = los del proyecto.
- **Fecha de la primera cuota** = +30 días desde hoy.

Ajuste lo que haga falta y confirme. En un solo paso, el sistema:

- Crea la venta con código `VTA-AAAA-NNNN`.
- Genera el cronograma completo de cuotas.
- Marca el lote como **Vendido**.
- Cierra el proceso de adquisición.
- Genera la **comisión** del vendedor (estado **Pendiente**) con código `COM-AAAA-NNNN`.

> Una vez cerrada, la venta y su cronograma quedan en el tab **Ventas** del cliente.

---

## Paso 11 — Después del cierre

### Cobranza

Tab **Ventas** → sub-tab **Cronograma**: lista de cuotas con monto, fecha de vencimiento y saldo. Aquí registra los pagos a medida que el cliente cumple.

Vista global de todos los clientes: menú lateral → **Cobranza**.

### Pagos

- **Registrar pago**: cuota a cuota, en la fila correspondiente.
- **Anular pago** (admin): pide motivo, restaura el saldo, queda auditado.
- **Cuotas vencidas**: se ven destacadas en rojo en Cobranza.

### Comisión

Menú admin → **Comisiones** (o equivalente):

- Estado inicial: **Pendiente**.
- Coordinador / Gerente puede pasar a **Aprobada**.
- Cuando se paga, queda como **Pagada**.

---

## Acciones reservadas a Admin

### Anular separación

Tab **Separaciones** → fila de la separación activa → ícono de escudo. Pide motivo obligatorio. Hace todo lo siguiente en un paso:

- Cancela la separación.
- Libera el lote (vuelve a Disponible).
- Cancela el proceso de adquisición.
- Devuelve al cliente al estado **Potencial**.

Use esta acción cuando el negocio no se concretó pero quiere conservar el historial.

### Extender vencimiento

Misma fila → ícono de calendario. Pide nueva fecha. Sirve para darle más tiempo al cliente sin tener que crear una separación nueva.

### Eliminar separación

Misma fila → ícono de tacho. **Borra el registro completo.** Use solo para corregir cargas erróneas: pierde el historial.

### Eliminar proceso de adquisición

Tab **Procesos** → ícono de tacho rojo en el header del proceso. Confirme la advertencia. Borra el proceso, sus etapas, su checklist y todos los documentos adjuntos.

> **Cuidado:** esta acción **no** modifica la separación, el lote ni el cliente. Si quiere revertir todo el flujo (que el lote vuelva a Disponible y el cliente a Potencial), use **Anular separación**, no Eliminar proceso.

---

## Tips operativos

- **Suba primero los documentos**, después marque los checks. Subir un archivo marca el check solo y deja constancia de quién lo cargó y cuándo.
- **Use Observaciones** en cada etapa para dejar notas de coordinación con el coordinador o admin.
- **Marque "En revisión"** cuando termine una etapa para que el coordinador la apruebe formalmente. La aprobación queda registrada con fecha y usuario.
- **Si un documento está observado**, el coordinador deja el motivo en Observaciones. Reemplace el archivo y vuelva a marcar "En revisión".
- **Estados visuales del checklist**: una fila se pone con fondo verde claro cuando tiene documento; el ícono rojo de alerta avisa que un obligatorio aún no está cargado.
- **Generar Separación desde la cotización** ahorra retipear: hereda lote, monto, moneda y forma de pago.
- **Para pagos al contado** asegúrese de elegir la forma de pago correcta en el modal: si elige crédito por error, el sistema le va a pedir documentación bancaria innecesaria.

---

## Errores que pueden aparecer

| Mensaje | Qué significa | Qué hacer |
|---|---|---|
| Permiso denegado | Su rol no tiene habilitada esta acción | Pida al admin que revise sus permisos |
| Lote no disponible | Otro vendedor lo tomó primero | Refresque la pantalla y elija otro lote |
| No tiene permisos para registrar la separación de este cliente | El cliente no está asignado a usted | Pida la reasignación al coordinador |
| Faltan N documento(s) obligatorio(s) | Hay obligatorios sin marcar | Cárguelos antes de presionar Completar |
| Solo se pueden convertir cotizaciones aprobadas | La cotización aún está en Borrador | Apruébela primero (paso 4) |
| La nueva fecha debe ser futura | En extender vencimiento puso una fecha pasada | Elija una fecha posterior a hoy |

---

## Glosario rápido

- **Cliente potencial**: aún no separó. Solo puede cotizar.
- **Cliente en proceso**: ya separó un lote. Está corriendo el proceso de adquisición.
- **Cotización (proforma)**: documento con precio y condiciones, todavía sin compromiso. Se imprime y se envía al cliente.
- **Separación**: el cliente paga una seña y el lote queda tomado por un plazo limitado.
- **Constancia de separación**: PDF firmado por la Gerencia General que se entrega al cliente al separar.
- **Proceso de adquisición**: el camino de 4 etapas que va desde la separación hasta el desembolso final.
- **Etapa omitida**: una etapa que el sistema saltea automáticamente porque no aplica al caso (típico: Calificación Bancaria cuando el pago es al contado).
- **Cierre de venta**: el paso final que convierte la separación en una venta firme con cronograma de cuotas.
- **Cuota**: cada pago programado del cronograma de la venta.
- **Comisión**: monto que le corresponde al vendedor por la venta cerrada. Se calcula como un porcentaje del precio total, según configuración del proyecto.
