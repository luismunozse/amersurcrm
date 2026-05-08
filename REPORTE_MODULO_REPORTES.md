# Módulo de Reportes — Amersur CRM
### Resumen para cliente · Mayo 2026

---

## ¿Qué cubre hoy?

El módulo está construido y funcional. Al ingresar, el gerente o administrador ve **5 indicadores clave en tiempo real** en la parte superior de la pantalla:

| Indicador | Qué mide |
|---|---|
| **Leads captados** | Nuevos prospectos ingresados en el período seleccionado |
| **Tasa de conversión** | % de leads que avanzaron en el proceso |
| **Tiempo de respuesta promedio** | Cuánto demora el equipo en atender a un lead |
| **Ventas del período** | Monto total en soles de ventas registradas |
| **Ventas cerradas** | Cantidad de operaciones completadas |

Debajo de esas cards, hay **12 secciones de análisis** accesibles desde un menú lateral:

1. **Análisis** — Gráficos de tendencias y evolución de métricas en el tiempo
2. **Comparación** — Lado a lado entre dos períodos distintos (ej. este mes vs el anterior)
3. **Funnel de ventas** — Cuántos leads pasan de cada etapa a la siguiente; con drill-down: al hacer clic en una etapa, se abre la lista de clientes que están ahí
4. **Nivel de interés** — Distribución de leads por temperatura (frío, tibio, caliente)
5. **Origen del lead** — De dónde viene cada cliente (redes, referido, web, etc.)
6. **Tiempo de respuesta** — Análisis detallado de velocidad de atención, centrado en la experiencia del cliente (no solo en el ranking del vendedor)
7. **Gestión de clientes** — Vista operativa: tareas vencidas, seguimientos pendientes, estado de la cartera
8. **Interacciones** — Registro y análisis de llamadas, visitas, correos y mensajes
9. **Propiedades** — Estado del inventario: disponible, separado, vendido, por proyecto
10. **Ventas** — Detalle de las ventas registradas en el período
11. **Clientes** — Evolución de la base de clientes, nuevos ingresos
12. **Rendimiento de vendedores** — Productividad individual del equipo comercial

**Filtros disponibles:** últimos 7, 30, 90 días, último año, o rango personalizado con fechas exactas.

**Exportación:** se puede descargar el reporte completo en PDF, o exportar solo la sección que se está viendo (capturando incluso los gráficos tal como aparecen en pantalla).

---

## ¿Qué falta o está limitado?

Hay tres limitaciones importantes que se deben tener en cuenta:

### 1. Los datos de ventas son parciales
El módulo de reportes muestra lo que está *registrado* en el CRM. Hoy el flujo de venta (separación → calificación bancaria → firma → desembolso) aún no está completamente implementado en el sistema. Esto significa que **las métricas de conversión y ventas reflejan una fracción de la realidad** — hay propiedades marcadas como vendidas que nunca pasaron por el flujo del CRM. Hasta que se implemente ese flujo (actualmente en desarrollo), los reportes de ventas deben leerse con ese contexto.

### 2. Sin reportes de cobranza ni comisiones
El módulo no tiene aún secciones de seguimiento de cobros (cuotas pagadas, mora, saldo pendiente) ni de comisiones al equipo. Estas dependen directamente del flujo de venta mencionado arriba.

### 3. Sin comparación histórica profunda
La sección de comparación entre períodos existe, pero sin el histórico de ventas real, los gráficos de tendencia tienen un alcance limitado.

---

## Comparación con Sperant

Sperant es el CRM inmobiliario más usado en Perú. Esta es una comparación honesta:

### Donde Amersur CRM está a la par o por encima

| Aspecto | Amersur CRM | Sperant |
|---|---|---|
| **Gestión operativa** | ✅ Más completo — tareas, vencimientos, cartera activa | Solo ranking de vendedor |
| **Tiempo de respuesta** | ✅ Centrado en el cliente, con etiquetas legibles | Solo tabla de tiempos sin contexto |
| **Exportación PDF** | ✅ Por sección, capturando gráficos reales | Export general, menos granular |
| **Funnel con drill-down** | ✅ Clic en etapa → lista de clientes | Vista estática, sin navegación |
| **Nivel de interés** | ✅ Sección dedicada | No tiene equivalente |
| **Hecho a medida** | ✅ Adaptado al proceso de Amersur | Genérico para cualquier inmobiliaria |

### Donde Sperant aún supera a Amersur CRM

| Aspecto | Sperant | Amersur CRM (estado actual) |
|---|---|---|
| **Reportes de cobranza** | Tiene módulo completo | No implementado aún |
| **Reportes de comisiones** | Tiene cálculo automático | No implementado aún |
| **Datos de ventas reales** | Flujo completo integrado | En desarrollo |
| **Historial largo** | Años de datos acumulados | Base de datos joven |

---

## Conclusión

El módulo de reportes de Amersur CRM **ya supera a Sperant en la parte de seguimiento comercial y operativo**. El diferencial real está en que es un sistema hecho específicamente para el proceso de Amersur, no un molde genérico.

La brecha pendiente no es de diseño ni de funcionalidad de reportes en sí — es de **datos**: una vez que el flujo de ventas (separación → desembolso) esté implementado y las operaciones pasen por el CRM, los reportes de ventas, cobranza y comisiones se alimentarán solos y cerrarán completamente la comparación con Sperant.
