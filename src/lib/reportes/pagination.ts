/**
 * Bounded pagination helper for reportes fetchers (design.md ADR2, Strategy B).
 *
 * PostgREST silently caps unbounded `.select()` results at ~1000 rows. When a
 * fetcher needs the actual row values — not just a count — to sum/aggregate/
 * dedupe (e.g. summing `precio_total`, cross-referencing `cliente_id` sets),
 * a `count: 'exact', head: true` query cannot help: you need the rows.
 *
 * `fetchAllRows` loops `.range(offset, offset + pageSize - 1)` (delegated to
 * the caller-provided `queryFactory`) until a page returns fewer rows than
 * `pageSize`, concatenating every page. This generalizes the count-then-fetch
 * precedent in `detalle-ventas-periodo.ts` into a single tested loop so every
 * 1000-row-cap offender (funnel, metricas-fetchers, cobranza, comisiones)
 * shares the same behavior.
 *
 * No `server-only`/`next/cache` import — pure over an injected query factory,
 * same constraint as `estados.ts` (client-bundle-safe).
 */
export async function fetchAllRows<T>(
  queryFactory: (offset: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
  pageSize = 1000,
): Promise<T[]> {
  const rows: T[] = [];
  let offset = 0;

  for (;;) {
    const { data, error } = await queryFactory(offset);
    if (error) throw error;

    const page = data ?? [];
    rows.push(...page);

    if (page.length < pageSize) break;
    offset += pageSize;
  }

  return rows;
}
