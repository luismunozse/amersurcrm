# Design — Trustworthy Management Reportes (`reportes-confiables`)

This design fixes the `admin/reportes` metrics that silently lie, adds one consolidated vendedor scorecard, and unifies cobranza reporting with the real collections system. The architecture is deliberately **conservative**: no new tables, no framework changes, no redesign of shipped UI. The whole change reduces to four moves — (1) single-source the client-state business vocabulary, (2) replace unbounded `.select().length` with the counting strategy that fits each fetcher, (3) replace hardcoded/heuristic comparisons with real queries against sources the dashboard already trusts, and (4) reuse `tiers.ts` for cobranza aging instead of a parallel rule.

## Architecture at a glance

| Concern | Decision | Pattern reused |
|---------|----------|----------------|
| Client-state vocabulary | One canonical module `estados.ts` with **named business groups** derived from `EstadoCliente`, plus an exhaustiveness type-test | `getEstadoClienteLabel` union in `types/clientes.ts` |
| Counting at 22k rows | **Two strategies**: exact `head:true` count when only a number is needed; bounded paginated fetch when rows must be aggregated | `getCachedFunnelClientes` (per-estado head counts) + `detalle-ventas-periodo.ts` (count-then-fetch) |
| Previous-period comparison | Shared `calcularVentanaAnterior()` in `shared.ts`, reusing `calcularFechas` normalization | dashboard `meta.ts` MoM helpers |
| Meta source | Read `meta_vendedor` via the existing metas action; **"sin meta asignada"** when absent, never a heuristic presented as a real target | dashboard `MetaDelMes`/`VentasVsMetaBlock` |
| Scorecard | New `obtenerScorecardVendedores` that **joins existing per-vendedor fetcher outputs** by `username` — parity by construction | `por-vendedor.ts`, `rendimiento.ts`, `interacciones.ts`, `comisiones.ts` |
| Cobranza aging | Import `computeTier` + `limaToday` from `tiers.ts`; surface `gestion_cobranza` | dashboard cobranza-alertas system |
| Caching | Wrap only fetchers already being restructured, auth outside cache | `buildCachedReportFetcher` (funnel/por-vendedor precedent) |

## Layering and boundaries

```
src/lib/reportes/estados.ts        ← NEW: canonical estado business groups (pure, no I/O, no server-only)
src/lib/reportes/pagination.ts     ← NEW (optional): fetchAllRows() bounded paginator (pure over a query builder)
        │
        ▼
admin/reportes/actions/*.ts        ← fetchers import estados.ts + pagination + shared metas/tiers
        │  (ventas, clientes, origen-lead, funnel, metricas-fetchers,
        │   cobranza, comisiones, interacciones, rendimiento, scorecard NEW)
        ▼
admin/reportes/components/*.tsx    ← ReporteFunnel labels, ScorecardVendedores NEW component
```

`estados.ts` lives under `src/lib/reportes/` (not inside `actions/`) so it is import-safe from client components — same reasoning that keeps `shared.ts` free of `server-only` imports. It must NOT import `next/cache` or `supabase.server`.

---

## Cross-cutting constraints

- **Strict TDD (vitest).** Every fetcher fix is test-first. Reuse the `createChainMock` supabase mock pattern from `reportes-cobranza-comisiones.test.ts` (chainable methods incl. `head`, `range`, `not`, `gte`, `lte`; `.then` resolves the final result). Pagination tests must exercise the `> 1000` path (mock two pages).
- **`PostgrestError` is not `instanceof Error`.** `safeAction` already coerces to `error.message`; keep throwing raw PostgrestErrors inside fetchers and let `safeAction` stringify — do not rely on `instanceof Error` for control flow.
- **RPC `RETURNS TABLE` varchar → `::TEXT`.** Not expected in this change (all TS-side aggregation), but if any helper touches an RPC, cast `varchar(N)` columns to `::TEXT` to avoid the `42804` gotcha.
- **UI:** Peruvian formal Spanish ("usted"), dark-mode-aware, no `transition-all`, empty states with copy.

## Checklist for the tasks/apply phases

- [ ] `lib/reportes/estados.ts` exists with `Record<EstadoCliente, …>` exhaustiveness and named groups.
- [ ] No `actions/*.ts` compares `estado_cliente` to a value outside the 8-state set (unit-tested).
- [ ] Every unbounded `.select().length`/`.reduce()` replaced by Strategy A (count) or B (paginate).
- [ ] `ventasPeriodoAnterior` comes from a real prior-window query.
- [ ] `*5`/`*10` heuristic deleted; meta reads `meta_vendedor`; absence renders "Sin meta asignada".
- [ ] `obtenerScorecardVendedores` reconciles with per-tab numbers (test).
- [ ] `cobranza.ts` mora uses `computeTier`+`limaToday`; parity test vs dashboard cutoff; `gestion_cobranza` surfaced.
- [ ] Cache wraps only restructured fetchers; auth stays outside the cache.

## ADRs 1-8 (detailed decision rationale)

See full design document for architectural decision records covering canonical vocabulary, counting strategy, prior-period computation, meta source alignment, scorecard composition, cobranza tier unification, caching boundaries, and suggested slice boundaries.
