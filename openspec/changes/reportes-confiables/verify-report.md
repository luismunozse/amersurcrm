## Verification Report

**Change**: reportes-confiables
**Version**: spec.md (7 requirements / 14 scenarios)
**Mode**: Strict TDD

### Completeness
| Metric | Value |
|--------|-------|
| Tasks total | 24 phases (tasks.md, PR1a-PR4) |
| Tasks complete | 24 |
| Tasks incomplete | 0 |

### Build and Tests Execution
Build: Not run. STRICT TDD constraint for this run explicitly forbids next build / full suite; deferred to orchestrator/CI per tasks.md's own note.

Tests: All 12 reportes-confiables targeted test files re-run fresh in this verify pass.

Command: npx vitest run src/__tests__/unit/reportes-estados.test.ts src/__tests__/unit/reportes-ventas-clientes.test.ts src/__tests__/unit/reportes-origen-metricas.test.ts src/__tests__/unit/reportes-interacciones.test.ts src/__tests__/unit/reporte-funnel-labels.test.ts src/__tests__/unit/reportes-pagination.test.ts src/__tests__/unit/reportes-funnel.test.ts src/__tests__/unit/reportes-metricas-fetchers.test.ts src/__tests__/unit/reportes-cobranza-comisiones.test.ts src/__tests__/unit/reportes-shared.test.ts src/__tests__/unit/reportes-ventas-metas.test.ts src/__tests__/unit/reportes-scorecard.test.ts

Result: Test Files 12 passed (12) / Tests 76 passed (76). Matches apply-progress's claimed combined regression (76/76).

Type check: npx tsc --noEmit (repo-wide) - clean, exit 0, zero errors.

Coverage: Not available (no coverage tool run in this pass - informational only per strict-tdd-verify rules, not blocking).

### Spec Compliance Matrix
| Requirement | Scenario | Test | Result |
|-------------|----------|------|--------|
| REQ1 Client-state filters use only valid EstadoCliente model | Conversion rate reflects real sales | reportes-ventas-clientes.test.ts (obtenerMetricasRendimiento) | COMPLIANT |
| REQ1 | Filter literals unit-tested against valid set | reportes-estados.test.ts (12 tests, incl. dead-literal negative assertions) | COMPLIANT |
| REQ2 Date-filtered actions bound both ends | Custom past range excludes newer records (obtenerReporteGestionClientes) | reportes-ventas-clientes.test.ts | COMPLIANT |
| REQ2 | Custom past range excludes newer records (obtenerReporteInteracciones) | reportes-interacciones.test.ts | COMPLIANT |
| REQ3 No hardcoded comparison values | Previous period is computed (ventasPeriodoAnterior) | reportes-ventas-metas.test.ts | COMPLIANT |
| REQ3 | Missing meta shows explicit absence | reportes-ventas-metas.test.ts (4 cases: objetivos + rendimiento) | COMPLIANT |
| REQ4 Large-table counts exact, not 1000-row-truncated | Count exceeds 1000 rows (funnel.ts) | reportes-funnel.test.ts (3 tests, 2-page mocks) | COMPLIANT |
| REQ4 | Count exceeds 1000 rows (metricas-fetchers.ts) | reportes-metricas-fetchers.test.ts | COMPLIANT |
| REQ4 | Count exceeds 1000 rows (cobranza.ts) | reportes-cobranza-comisiones.test.ts (cuotasActivas 2-page case) | COMPLIANT |
| REQ4 | Count exceeds 1000 rows (comisiones.ts) | reportes-cobranza-comisiones.test.ts | COMPLIANT |
| REQ5 Funnel labels cover every valid estado | en_proceso/propietario render human labels | reporte-funnel-labels.test.ts | COMPLIANT |
| REQ5 | Dead legacy labels are gone | reporte-funnel-labels.test.ts | COMPLIANT |
| REQ6 Scorecard consolidates 7 dimensions | Scorecard reconciles with single-metric tabs | reportes-scorecard.test.ts (direct _fetchPorVendedor reconciliation assertion) | COMPLIANT for scenario; 1 of 7 named dimensions (tiempo de respuesta) ships as an honest null placeholder - see WARNING 1 |
| REQ7 Cobranza mora matches dashboard tier system | Same cutoff, same mora total | reportes-cobranza-comisiones.test.ts (computeTier parity + 90-day-cap-excludes-en_mora test) | COMPLIANT |
| REQ7 | Gestion activity is visible | reportes-cobranza-comisiones.test.ts (3 tests) + ReporteCobranza.tsx renders panel | COMPLIANT |

Compliance summary: 14/14 scenarios compliant as literally written. REQ6's scenario only asserts reconciliation of values that ARE computed, so it passes; the scorecard's 7th dimension (tiempo de respuesta) is a documented gap flagged separately below, not a scenario failure.

### Correctness (Static Evidence) - fresh source spot-checks, not just re-reading apply-progress claims
| Requirement | Status | Notes |
|------------|--------|-------|
| estados.ts single source | Implemented | Record<EstadoCliente, EstadoMeta> compile-time exhaustiveness confirmed; grepped all of src/app/dashboard/admin/reportes/actions/*.ts for estado_cliente comparisons - zero stray literals remain, all use esEstadoActivo/esEstadoConvertido/ESTADOS_AVANZADOS |
| gte/lte pairing | Implemented | Verified in ventas.ts, clientes.ts, interacciones.ts, origen-lead.ts, funnel.ts, metricas-fetchers.ts, cobranza.ts, por-vendedor.ts, rendimiento.ts - every period query pairs both bounds |
| ventasPeriodoAnterior / meta_vendedor | Implemented | calcularVentanaAnterior/mesesEnRango in shared.ts; ventas.ts/rendimiento.ts/scorecard.ts all read meta_vendedor via obtenerMetas; the old numVendedores*5 / *10 heuristic is fully deleted (grepped, not present anywhere) |
| Counting strategy | Implemented | fetchAllRows used correctly for all row-aggregating fetchers in funnel/metricas-fetchers/cobranza/comisiones; head:true counts used for pure counts |
| Funnel labels | Implemented | ESTADO_LABELS/ESTADO_COLORS in ReporteFunnel.tsx cover exactly the 8 states plus the sin_estado sentinel, no dead keys |
| Scorecard composition | Implemented | _fetchScorecard composes _fetchPorVendedor/_fetchInteracciones/_fetchComisiones/fetchMetricasVentas plus obtenerMetas, no fresh re-derivation; sidebar wired under Equipo as first entry |
| Cobranza tier alignment | Implemented | computeTier/limaToday imported (not copied) from src/lib/cobranza/tiers.ts; fecha_vencimiento passed through unchanged (no re-stringify); gestion_cobranza paginated and surfaced in ReporteCobranza.tsx |

### Coherence (Design)
| Decision | Followed? | Notes |
|----------|-----------|-------|
| ADR1 canonical vocabulary | Yes | - |
| ADR2 counting strategy per offender | Yes | - |
| ADR3 real previous-period window | Yes | - |
| ADR4 meta source and absence rule | Yes | - |
| ADR5 scorecard joins existing outputs | Yes | tiempoRespuestaHoras gap is a documented, in-DTO-but-unwired dimension, see WARNING 1 |
| ADR6 cobranza single source of truth | Partial | mora total/count use computeTier correctly (parity scenario satisfied); topDeudores.dias_max_atraso and recaudacionMensual's vencido bucket still use ad-hoc new Date() local time, not computeTier/limaToday. ADR6 prose says the ad-hoc aging is replaced broadly; tasks.md Phase 22 literally scoped only the two new fields. Neither leftover field is named in the spec's parity scenario. See WARNING 2. |
| ADR7 caching boundary | Yes | only restructured fetchers wrapped; auth stays outside cache in every case checked |
| ADR8 slice boundaries | Yes | 5 PRs, stacked-to-main, all shipped |

### Issues Found

CRITICAL: None.

WARNING:
1. ScorecardVendedorRow.tiempoRespuestaHoras is always null (src/app/dashboard/admin/reportes/actions/scorecard.ts). Spec Requirement 6 names "tiempo de respuesta" as one of the 7 dimensions the scorecard MUST show. It is shown, but permanently as an honest "Sin datos" placeholder, never populated from tiempo-respuesta.ts (which keys its ranking by cliente.vendedor_asignado, a UUID, not vendedor_username like every other composed fetcher). This is a real, documented, deliberate scope gap, not silently dropped, but it means REQ6's "consolidates seven dimensions" is honored structurally (7 columns exist) rather than functionally (1 of 7 has no real data source yet). Recommend a small follow-up PR to bridge the UUID-to-username join before calling this dimension done, or updating the spec/design DTO to explicitly mark it deferred.
2. cobranza.ts's topDeudores.dias_max_atraso and recaudacionMensual's "vencido" bucket still use ad-hoc new Date() local-time comparisons, not computeTier/limaToday (around lines 140-141, 268-280, 304-307 of src/app/dashboard/admin/reportes/actions/cobranza.ts). design.md's ADR6 prose reads as a full replacement of the reportes-local aging rule ("The reportes-local aging ... is replaced"), while tasks.md Phase 22's literal task text only asked for the two new cuotasEnMoraTier/moraTierTotal fields (additive). The spec's own scenario ("Same cutoff, same mora total") targets the mora total, which IS correctly tier-aligned, so the literal spec scenario passes. But a reviewer reading ADR6's prose expecting zero remaining ad-hoc date math in this file would be surprised by these two leftover spots. Not CRITICAL because no spec scenario names dias_max_atraso/vencido explicitly and both are secondary/supplementary fields (not the headline parity number), but flagged since it is an incomplete sweep relative to design intent.
3. Two component files outside the reportes-confiables PR scope still contain dead/stale estado_cliente-adjacent literal comparisons that were not part of the audited fix list: ReporteClientes.tsx lines 195-196 (client.status === 'activo' | 'prospecto', where client.status is the real estado_cliente value from clientes.ts's topClients) and ReporteGestionClientes.tsx lines 181-192 (getEstadoVariant switch with dead cases 'activo'/'prospecto'/'lead'/'inactivo', called with the real estado_cliente value at line 418). Neither drops nor miscounts data; both have a safe default/else fallback that just renders a generic gray badge, so this is cosmetic (wrong or missing color-coding for intermedio/potencial/en_proceso/propietario/desestimado), not a correctness bug. But spec Requirement 1's literal wording ("Any report action filtering, labeling, or classifying clients by estado_cliente MUST reference only the 8 values... No comparison MAY target a value outside this set") technically still applies to these two comparisons, and neither file appears in tasks.md's explicit in-scope or out-of-scope lists (only nivel-interes.ts/tiempo-respuesta.ts/clientes-etapa-funnel.ts were named as out-of-scope pass-through). This looks like an incomplete sweep, not a deliberate exclusion.

SUGGESTION:
1. origen-lead.ts's todosClientes query uses .limit(50000) (no date bound, no fetchAllRows pagination) to build the 6-month trend/effectiveness view. Not currently a "headline count" per REQ4's literal scope (which names funnel.ts/metricas-fetchers.ts/cobranza.ts/comisiones.ts only), and 50k comfortably covers the roughly 22k-client scale mentioned in design.md today, but it is a hardcoded cap that would silently truncate once the table crosses 50k rows, with no test guarding it. Worth a future pagination pass for consistency with the rest of the change's philosophy.
2. src/app/dashboard/admin/reportes/actions/shared.ts's safeAction still coerces caught errors via "error instanceof Error ? error.message : Error desconocido" - PostgrestError is not instanceof Error (documented as a known repo-wide gotcha in design.md's cross-cutting constraints), so a raw Postgrest error thrown from any reportes fetcher would surface as a generic "Error desconocido" instead of the real message. Pre-existing code, not introduced or modified by this change, but worth a repo-wide fix outside this change's scope.
3. ReporteFunnel.tsx's progress-bar transitions still use "transition-all duration-700" (around lines 466 and 508). design.md's cross-cutting UI constraint says no transition-all. Pre-existing code untouched by this PR's actual diff (only ESTADO_LABELS/ESTADO_COLORS were rewritten), so not a new violation introduced by this change, but flagged since the file was touched.

### TDD Compliance
| Check | Result | Details |
|-------|--------|---------|
| TDD Evidence reported | Yes | Full TDD Cycle Evidence tables present in apply-progress.md for every phase across all 5 PRs |
| All tasks have tests | Yes | 24/24 phases with tests where applicable (UI-only phases 16/20/23 explicitly note no dedicated unit test, matching this codebase's precedent for pure conditional-render branches) |
| RED confirmed (tests exist) | Yes | 12/12 test files verified to exist and pass on fresh re-run in this verify pass |
| GREEN confirmed (tests pass) | Yes | 76/76 tests pass on fresh execution, not just trusting the apply-progress report |
| Triangulation adequate | Yes | Multiple test cases per behavior throughout (e.g. reportes-estados.test.ts has 12 cases across positive/negative/exhaustiveness; reportes-cobranza-comisiones.test.ts's ADR6 blocks have dedicated cap-boundary and legacy-field-survival cases) |
| Safety Net for modified files | Yes | Pre-existing tests (reportes-interacciones.test.ts) re-run unchanged after PR3's extraction, confirmed behavior-preserving per apply-progress |

TDD Compliance: 6/6 checks passed

### Test Layer Distribution
| Layer | Tests | Files | Tools |
|-------|-------|-------|-------|
| Unit | 76 | 12 | vitest |
| Integration | 0 | 0 | not installed for this change |
| E2E | 0 | 0 | not installed for this change |
| Total | 76 | 12 | |

### Changed File Coverage
Coverage analysis skipped - no coverage flag run in this targeted verify pass (informational only, not blocking per strict-tdd-verify rules).

### Assertion Quality
Spot-checked reportes-pagination.test.ts, reportes-funnel.test.ts, reportes-estados.test.ts, reportes-scorecard.test.ts, and reportes-cobranza-comisiones.test.ts (new ADR6 blocks) in full. All assertions call real production code, assert varying/discriminating expected values (no tautologies, no orphan-empty-without-companion, no ghost loops over possibly-empty collections). The scorecard's reconciliation test explicitly re-invokes _fetchPorVendedor directly against identical fixture data rather than asserting a fixed literal - this is the strongest form of regression protection for the reconciliation requirement.

Assertion quality: All assertions verify real behavior.

### Quality Metrics
Linter: Not run in this pass (not requested; touched-file eslint was allowed but not required per the run's constraints).
Type Checker: No errors - npx tsc --noEmit clean, exit 0, repo-wide.

### Verdict
PASS WITH WARNINGS.
All 14 spec scenarios are compliant with fresh, real test evidence (76/76 passing, tsc clean); 0 CRITICAL issues found. 3 WARNINGs are pre-existing/documented scope gaps (scorecard's tiempo de respuesta placeholder, cobranza's two non-headline ad-hoc date fields, two out-of-audit-scope component files with dead but harmless estado literals) that do not violate any literal spec scenario but are worth a follow-up slice before considering the "single source of truth" story fully closed everywhere. Recommend proceeding to archive; log the WARNINGs as follow-up backlog items rather than blocking this change.
