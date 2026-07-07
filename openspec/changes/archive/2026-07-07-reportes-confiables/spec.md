# Trustworthy Management Reportes — Spec

Change: `reportes-confiables`. Defines correctness requirements for `admin/reportes` (vendedor-scoped metrics, cross-report coherence, exact counting), the vendedor scorecard view, and cobranza-report parity with the dashboard mora system.

## Requirements

### Requirement: Client-state filters use only the valid EstadoCliente model

Any report action filtering, labeling, or classifying clients by `estado_cliente` MUST reference only the 8 values in `src/lib/types/clientes.ts` (`por_contactar`, `contactado`, `intermedio`, `potencial`, `en_proceso`, `propietario`, `desestimado`, `transferido`). No comparison MAY target a value outside this set (`lead`, `prospecto`, `activo`, `cliente`, etc.).

#### Scenario: Conversion rate reflects real sales
- GIVEN sales exist in the period
- WHEN `obtenerMetricasRendimiento`/`obtenerReporteOrigenLead` compute conversion
- THEN the rate is nonzero and never filters by a value outside the valid set

#### Scenario: Filter literals are unit-tested against the valid set
- GIVEN every `estado_cliente` literal used across reportes actions
- WHEN checked against `ESTADOS_CLIENTE_OPTIONS`
- THEN each literal is a member of that set

### Requirement: Date-filtered actions bound both ends of the range

Every report action accepting `fechaInicio`/`fechaFin` MUST apply both `.gte(fechaInicio)` and `.lte(fechaFin)` to its primary date column.

#### Scenario: Custom past range excludes newer records
- GIVEN a custom range whose `fechaFin` is in the past
- WHEN `obtenerReporteGestionClientes` or `obtenerReporteInteracciones` runs
- THEN records dated after `fechaFin` are excluded

### Requirement: No hardcoded comparison values

No metric MAY hardcode a previous-period or meta value. `ventasPeriodoAnterior` MUST come from a real prior-period query (reusing `calcularPeriodoAnterior`/`calcularDeltaMensual`) or be omitted. Meta comparisons MUST read the same `meta_vendedor` source as `MetaDelMes`/`VentasVsMetaBlock`, showing "sin meta asignada" when absent; the `*5`/`*10` heuristic applies only as a fallback.

#### Scenario: Previous period is computed
- GIVEN sales exist in the current and prior window
- WHEN `obtenerReporteVentas` renders the comparison
- THEN `ventasPeriodoAnterior` is the real prior sum, not `0`

#### Scenario: Missing meta shows explicit absence
- GIVEN a vendedor with no `meta_vendedor` row
- WHEN their meta renders anywhere in reportes
- THEN it shows "sin meta asignada", not a heuristic presented as a real target

### Requirement: Large-table counts are exact, not 1000-row-truncated

Any headline count over `cliente`, `cuota`, `venta`, or `comision` MUST use `count: 'exact', head: true` instead of an unbounded `.select()` relied on for `.length`.

#### Scenario: Count exceeds 1000 rows
- GIVEN over 1000 `cliente` rows exist
- WHEN `funnel.ts`, `metricas-fetchers.ts`, `cobranza.ts`, or `comisiones.ts` reports a total
- THEN the number equals the true row count

### Requirement: Funnel labels cover every valid estado, no dead entries

`ReporteFunnel`'s label/color maps MUST have an entry for all 8 `EstadoCliente` values, MUST NOT render a raw enum, and MUST drop entries for states outside the valid set.

#### Scenario: en_proceso and propietario render human labels
- GIVEN leads in `en_proceso` and `propietario`
- WHEN the funnel's state panel renders
- THEN each shows its Spanish label, not the raw value

#### Scenario: Dead legacy labels are gone
- GIVEN the label map is inspected against the valid set
- WHEN any key falls outside it (`nuevo`, `activo`, `vendido`, etc.)
- THEN that key does not exist

### Requirement: Vendedor scorecard consolidates seven dimensions per vendedor

One view MUST show one row per active vendedor: leads asignados, tasa de conversión, tiempo de respuesta, interacciones, ventas del período, meta vs. real, comisiones — scoped to the global date/proyecto filter, computed from existing fetchers.

#### Scenario: Scorecard reconciles with single-metric tabs
- GIVEN the same filter applied to the scorecard and "Por Vendedor"
- WHEN vendedor X's conversión is compared between both
- THEN the values are equal

### Requirement: Cobranza report mora matches the dashboard tier system

`obtenerReporteCobranza` MUST compute aging/mora using `src/lib/cobranza/tiers.ts` (`computeTier`, Lima calendar date) instead of an independent rule, and MUST surface `gestion_cobranza` activity per cuota/cliente.

#### Scenario: Same cutoff, same mora total
- GIVEN the same cutoff fed to the dashboard cobranza hub and reportes cobranza
- WHEN both compute total mora
- THEN the totals are equal

#### Scenario: Gestión activity is visible
- GIVEN cuotas with `gestion_cobranza` entries
- WHEN the cobranza report renders
- THEN gestión activity is visible per cuota/cliente
