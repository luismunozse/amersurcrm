# Technical Design — Proactive collections alerts (cobranza-alertas), Slice 1

This document resolves the OPEN DECISIONS the proposal deferred and defines the architecture for turning `crm.alerta_cobranza` from dead schema into a daily, push-based collections workflow. Every decision below was verified against the real codebase (files cited inline). Language of all artifacts (code, SQL, UI copy) is English except user-facing Spanish copy, which is formal Peruvian ("usted").

## Architecture at a glance

```
Vercel Cron (0 13 * * *  =  08:00 America/Lima)
        │  Authorization: Bearer ${CRON_SECRET}
        ▼
/api/cron/cobranza-alertas/route.ts   (createServiceRoleClient, GET+POST → handleRequest)
        │
        │ 1. RPC crm.actualizar_cuotas_vencidas()      ← closes gap #0 (stale mora/estado)
        │ 2. read cuota+venta+cliente context (90-day overdue cap)
        │ 3. computeTier(fecha_vencimiento, estado, todayLima)   ← src/lib/cobranza/tiers.ts (pure)
        │ 4. UPSERT crm.alerta_cobranza (cuota_id,tipo_alerta) ignoreDuplicates  ← dedup
        │ 5. resolve recipients: cliente owner + role broadcast (globals)
        │ 6. INSERT crm.notificacion (one row per recipient, tipo 'sistema')
        │ 7. UPDATE alerta_cobranza.enviada = true
        ▼
crm.notificacion (realtime, RLS auth.uid()=usuario_id)  →  bell + sidebar `pagos` badge (already live)
        │  deep-link data.url = /dashboard/cobranza?tab=alertas
        ▼
_ControlPagosHub.tsx  → new "Alertas" tab → _AlertasCobranzaList.tsx
        │  per alert: why it fired + prefilled wa.me button + "Registrar gestión"
        ▼
registrarGestionCobranza()  → INSERT crm.gestion_cobranza  +  alerta.gestionada = true
```

Data flow is one-directional: cron writes alerts + notifications; UI reads alerts and writes gestión records. No pg_cron, no edge functions, no new scheduling paradigm — the route mirrors two existing crons (`send-recordatorios`, `reportes-alertas`).

## Decisions (ADR-style)

### D1 — Gestión record storage: dedicated `crm.gestion_cobranza` table (NOT reuse `cliente_interaccion`)

**Decision:** Create a new table `crm.gestion_cobranza`, FK to `alerta_cobranza(id)` (nullable) and `cuota(id)` (not null).

**Why, verified against `supabase/migrations/20250205000010_flujo_crm_completo.sql` (lines 10-42):**
- `cliente_interaccion.tipo` has a `CHECK (tipo IN ('llamada','email','whatsapp','visita','reunion','mensaje'))` — **no `cobranza` value**. Reuse would require altering a CHECK on a hot, widely-consumed table.
- `cliente_interaccion.resultado` enum is sales-funnel oriented (`interesado`, `no_interesado`, `cerrado`…) — semantically wrong for collections outcomes (`promesa_pago`, `pago_parcial`, `ilocalizable`).
- `cliente_interaccion` is rendered in the **client sales timeline** (`chrome-extension/.../ClientHistory.tsx` and dashboard client detail consume it). Injecting cobranza follow-ups would **pollute the commercial timeline** with dunning entries — a UX regression.
- `cliente_interaccion` has **no way to link a follow-up to a specific cuota or alert**; a collections gestión must be traceable to the cuota it addresses.

**Rejected alternative — reuse `cliente_interaccion` + new `tipo='cobranza'`:** cheaper migration but forces a CHECK alter, pollutes the client timeline, and loses the cuota/alerta linkage. The isolation win of a dedicated table outweighs the one-table savings.

**Table shape:**
```sql
crm.gestion_cobranza (
  id UUID PK default gen_random_uuid(),
  alerta_id UUID NULL REFERENCES crm.alerta_cobranza(id) ON DELETE SET NULL,
  cuota_id  UUID NOT NULL REFERENCES crm.cuota(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES crm.cliente(id) ON DELETE CASCADE,
  vendedor_username VARCHAR(50) NOT NULL,
  medio VARCHAR(20) NOT NULL CHECK (medio IN ('llamada','whatsapp','email','visita','mensaje')),
  resultado VARCHAR(30) NOT NULL CHECK (resultado IN
    ('contactado','no_contactado','promesa_pago','pago_parcial','renegociacion','ilocalizable')),
  notas TEXT,
  fecha_gestion TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,          -- auth.uid() of the operator
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
)
```
`alerta_id` is nullable so a gestión can also be logged from the existing Mora tab (no alert row) in future slices. `ON DELETE SET NULL` keeps the gestión history if an alert is ever purged.

### D2 — Recipient resolution: cliente owner + role broadcast, one notification row each

**Decision:** Three recipient sources, unioned and de-duplicated by `usuario_id`:
1. **Cliente owner** — resolved through `crm.cliente` ownership (`vendedor_username`, fallback `vendedor_asignado`), NOT `venta.vendedor_username`. Alerts follow the client relationship, consistent with the RLS on `alerta_cobranza` which scopes via `crm.p1_puede_ver_cliente(cliente_id)` (see `20260703000000_secure_authz_p2.sql`).
2. **Global roles broadcast** — all active `usuario_perfil` whose role ∈ `{ROL_ADMIN, ROL_GERENTE, ROL_COORDINADOR_VENTAS}`.
3. **Cliente creator (`cliente.created_by`)** — a third, independent, always-on signal (checked regardless of whether an owner was resolved), NOT a fallback for signal 1. Unlike `vendedor_username`/`vendedor_asignado`, `created_by` is already an `auth.users.id` (no username lookup). Because `crm.cliente.created_by` carries **no FK constraint** (`base_schema` line 36), it MUST be validated against the same active-profiles set fetched for signal 2 before being trusted as a `notificacion.usuario_id` (which DOES have an FK to `auth.users`) — an unvalidated, orphaned `created_by` would fail the single all-or-nothing notification insert and wedge the whole daily cohort. Validating against `activo = true` profiles also means an inactive creator is skipped, which is desirable.

**Why, verified:** The global-role set is the single source of truth used everywhere: `GLOBAL_ROLES` in `src/lib/auth/extension-auth.ts` (lines 9-13) and `crm.es_visibilidad_global()` in `20260629000000_secure_authz_p1.sql` (lines 12-28) list exactly these three. The recipient query mirrors `reportes-alertas/route.ts` (lines 283-292): `usuario_perfil.select("id, username, rol:rol_id(nombre)").eq("activo", true)` then filter by role name in-app. Coordinador is broadcast (not per-vendedor) because **no `coordinador_username` mapping exists** in the schema (confirmed in exploration) — resolving "the coordinador of vendedor X" is a future refinement, not a slice-1 blocker.

**Fan-out mechanism:** `crm.notificacion` RLS is owner-only (`auth.uid() = usuario_id`, `2025-09-14_020_notifications.sql`) — there is no broad-read. So each recipient gets **its own** `notificacion` row (batch insert), exactly like `reportes-alertas` does. De-dupe the union so an admin who also owns the client does not get two rows for the same alert.

**Username → id lookup:** owner is `cliente.vendedor_username` (a username); `notificacion.usuario_id` needs the `usuario_perfil.id`. The recipient query already loads `id + username` for all active profiles, so the map is built once in-memory per cron run (no per-cuota round-trip).

### D3 — Alert generation locus: TypeScript in the route (NOT a SQL RPC)

**Decision:** Tier evaluation and alert insertion live in the cron route (TypeScript), with the pure tier logic extracted to `src/lib/cobranza/tiers.ts` for unit testing.

**Why:**
- **Approach B is already chosen** (proposal §Approach summary): two working precedents (`send-recordatorios`, `reportes-alertas`) do exactly this in TS.
- **Testability** is the deciding factor. This project has **no pgTAP** — the only test runner is **Vitest 4** (`npm test`), and Strict TDD is active. Pure TS tier functions are trivially unit-testable with injected dates; a `SECURITY DEFINER` RPC would be untestable in CI here.
- **Volume** is modest (cuotas number in the hundreds/low thousands, filtered to a 90-day overdue window) — a set-based RPC's throughput advantage is irrelevant at this scale.
- Keeps all cobranza-alert logic in one language/one file, matching repo convention. Avoids introducing a `RETURNS TABLE` RPC that would need `::TEXT` casts on `tipo_alerta`/`canal` (VARCHAR(30)/(20)) per the established convention.

**One SQL call remains:** `crm.actualizar_cuotas_vencidas()` is invoked first (existing RPC, `20260406000000_cobranza.sql` lines 160-189) to refresh `estado`/`monto_mora` before tiers are read. No new RPC is created.

### D4 — Dedup: UNIQUE `(cuota_id, tipo_alerta)` + upsert `ignoreDuplicates`; escalation ladder re-alerts by tier

**Decision:**
- Add `CREATE UNIQUE INDEX idx_alerta_cobranza_cuota_tipo ON crm.alerta_cobranza(cuota_id, tipo_alerta)` (does not exist today).
- Insert via supabase-js `.upsert(rows, { onConflict: 'cuota_id,tipo_alerta', ignoreDuplicates: true })` → equivalent to `ON CONFLICT DO NOTHING`.

**Semantics — one alert per (cuota, tier) for the cuota's lifetime:**
- The tiers form an **escalation ladder**: `por_vencer_15d → por_vencer_7d → por_vencer_3d → vencida → mora`. Each is a distinct `tipo_alerta`, so a cuota emits **up to 5 alerts total** across its life — one per threshold it crosses. `vencida → mora` **does re-alert** (different tipo = genuine escalation).
- A cuota lingering in the **same** tier does **not** re-alert daily (the unique index blocks it). This is the anti-spam guarantee the proposal calls for.
- **Does a gestionada alert suppress future same-tipo alerts?** It doesn't need to. Because same-tipo can exist only once ever, a handled alert is already terminal for that tier. Gestión sets `alerta.gestionada = true` purely for **UI filtering** (open vs. resolved), never as a dedup mechanism. Escalation to the next tier still fires independently.

**New column:** `ALTER TABLE crm.alerta_cobranza ADD COLUMN gestionada BOOLEAN NOT NULL DEFAULT FALSE` (+ optional `gestionada_at TIMESTAMPTZ`). Lets the alerts list separate pending from resolved without an `EXISTS` subquery on every render.

**Dispatch retry is a separate concern from this dedup index — it is NOT implemented by the upsert.** `ignoreDuplicates` means a conflicting `(cuota_id, tipo_alerta)` row is silently skipped and never comes back via `RETURNING`, so a previously-inserted alert whose notification dispatch failed (`enviada` stayed `false`) is invisible to this path forever. Retry is a dedicated second read in the route — `SELECT ... FROM alerta_cobranza WHERE enviada = false` (excluding that run's own freshly-inserted rows and cuotas whose venta is now cancelada/suspendida) — unioned with the day's newly-inserted alerts before dispatch. This is the only query anywhere that filters on `enviada`.

### D5 — Timezone: America/Lima in ONE place, reconciled by cron schedule

**Decision — two coordinated moves so all date math resolves to Lima calendar day with a single conceptual source:**
1. **Schedule the cron at `0 13 * * *` (13:00 UTC = 08:00 America/Lima).** At that instant the UTC calendar date always equals the Lima calendar date (Lima is UTC-5, no DST). This makes the DB-side `CURRENT_DATE` inside `actualizar_cuotas_vencidas()` / `v_cobranza` agree with Lima **without altering those functions** — sidestepping the DB-UTC off-by-one at its only exposure point.
2. **TS tier computation uses an explicit Lima calendar date.** `tiers.ts::limaToday()` = `Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(now)` → `YYYY-MM-DD`; `daysUntilDue = diffCalendarDays(fecha_vencimiento, limaToday)`. All "days until due" / "days overdue" math lives **only** in `tiers.ts`, mirroring how `reportes/shared.ts::calcularFechas` centralizes day-boundary normalization (memory `reportes_shared_fechas`).

**Why not `AT TIME ZONE` in SQL:** would require editing the shared `actualizar_cuotas_vencidas`/`v_cobranza` (risk to the existing manual button + Mora tab). Pinning the schedule + doing tier math in the testable TS layer keeps the change additive and keeps the timezone logic in one Vitest-covered place.

### D6 — Cron wiring

| Aspect | Decision |
|--------|----------|
| Route path | `src/app/api/cron/cobranza-alertas/route.ts` (sibling of `reportes-alertas`, `marketing`). |
| vercel.json | Append `{ "path": "/api/cron/cobranza-alertas", "schedule": "0 13 * * *" }` to the existing `crons` array (currently 3 entries — `send-recordatorios */5`, `marketing */1`, `reportes-alertas */30`). Daily is the lightest cadence in the file; no plan-limit concern (repo already runs a per-minute cron on `gru1`). |
| Auth | `if (req.headers.get("authorization") !== \`Bearer ${cronSecret}\`) return 401`, with an early `CRON_SECRET` presence guard — copied verbatim from `send-recordatorios`/`reportes-alertas`. |
| Client | `createServiceRoleClient()` from `src/lib/supabase.server`. |
| Verbs | `GET` and `POST` both delegate to a shared `handleRequest` (repo convention). |

### D7 — UI composition: new "Alertas" tab (NOT extend the Mora tab)

**Decision:** Add a **third tab** to `_ControlPagosHub.tsx` (`cobranza | seguimiento | alertas`) backed by a new `_AlertasCobranzaList.tsx`. A `_GestionCobranzaModal.tsx` captures the follow-up.

**Why not extend "Seguimiento de Mora":** that tab is mora-only; alerts span `por_vencer_*` + `vencida` + `mora` — a broader source (`alerta_cobranza` joined with `v_cobranza` context) with a distinct interaction (why-it-fired + gestión capture). A dedicated tab keeps the deep-link target unambiguous and concerns separated.

**Server actions (in `_actions-cobranza.ts`, following the existing `obtenerCobranza` shape lines 12-40):**
- `obtenerAlertasCobranza()` — lists open alerts joined with cuota/cliente context; scoped by `vendedor_username` unless `PERMISOS.PAGOS.VER_TODOS` (same gate the file already uses).
- `registrarGestionCobranza(input)` — inserts a `gestion_cobranza` row, sets `alerta.gestionada = true`, `revalidatePath('/dashboard/cobranza')`.

**Deep-link target:** notifications set `data.url = '/dashboard/cobranza?tab=alertas'`. `_ControlPagosHub` currently ignores query params (default `useState('cobranza')`); it must read an initial `tab` value. Minimal change: `page.tsx` reads `searchParams.tab` and passes an `initialTab` prop.

### D8 — wa.me message: reuse `buildWhatsAppUrl`, formal Peruvian template

**Decision:** Reuse `buildWhatsAppUrl(telefono, mensaje)` from `src/lib/marketing/whatsapp.ts` (line 233; default country Perú). Target `cliente_whatsapp` (fallback `cliente_telefono`), both exposed by `v_cobranza`.

**Template (formal Peruvian, "usted", never voseo):**
```
Estimado(a) {{cliente}}, le escribimos de AMERSUR en relación a su cuota N.° {{numero}}
por {{moneda}} {{monto}} con vencimiento el {{fecha}}. Le agradeceríamos comunicarse
con nosotros para regularizar su pago. Quedamos atentos a su respuesta.
```
Placeholders: `cliente` (nombre), `numero` (numero_cuota), `monto` + `moneda`, `fecha` (fecha_vencimiento formatted `es-PE`). Built in `tiers.ts::buildReminderMessage(...)` so it is unit-tested alongside tier logic. The message is passed to `buildWhatsAppUrl`, which URL-encodes it.

## Migration outline

New file `supabase/migrations/20260704000000_cobranza_alertas.sql`:

1. `CREATE UNIQUE INDEX idx_alerta_cobranza_cuota_tipo ON crm.alerta_cobranza(cuota_id, tipo_alerta);` — safe (table is empty/dead schema, zero existing rows to conflict).
2. `ALTER TABLE crm.alerta_cobranza ADD COLUMN gestionada BOOLEAN NOT NULL DEFAULT FALSE, ADD COLUMN gestionada_at TIMESTAMPTZ;`
3. `CREATE TABLE crm.gestion_cobranza (...)` per D1 + indexes on `alerta_id`, `cuota_id`, `cliente_id`.
4. RLS on `gestion_cobranza`: `SELECT`/`INSERT` for `authenticated` gated by `crm.p1_puede_ver_cliente(cliente_id)` (reuse the standard ownership helper — `SECURITY DEFINER`, already `SET search_path`); `ALL` for `service_role`.
5. No new RPC, no `GRANT EXECUTE` (generation is in TS per D3). No `::TEXT` casts needed (no `RETURNS TABLE`).

## File-touch list (feeds Review Workload Forecast — 2-PR chain)

**PR1 — backend (migration + cron + notifications):**
| File | Change | Est. lines |
|------|--------|-----------|
| `supabase/migrations/20260704000000_cobranza_alertas.sql` | new | ~75 |
| `src/lib/cobranza/tiers.ts` | new (limaToday, computeTier, buildReminderMessage) | ~90 |
| `src/app/api/cron/cobranza-alertas/route.ts` | new | ~180 |
| `vercel.json` | edit (+1 cron entry) | ~4 |
| `src/__tests__/unit/cobranza-tiers.test.ts` | new | ~120 |
| `src/__tests__/unit/cobranza-alertas-route.test.ts` | new (dedup, fan-out, backfill, 401) | ~150 |
| **PR1 total** | | **~620 (prod ~350, tests ~270)** |

**PR2 — UI (alerts view + gestión capture):**
| File | Change | Est. lines |
|------|--------|-----------|
| `src/app/dashboard/cobranza/_ControlPagosHub.tsx` | edit (3rd tab + initialTab) | ~+25 |
| `src/app/dashboard/cobranza/page.tsx` | edit (read searchParams.tab) | ~+6 |
| `src/app/dashboard/cobranza/_AlertasCobranzaList.tsx` | new | ~200 |
| `src/app/dashboard/cobranza/_GestionCobranzaModal.tsx` | new | ~130 |
| `src/app/dashboard/cobranza/_actions-cobranza.ts` | edit (2 actions) | ~+120 |
| `src/__tests__/unit/cobranza-gestion-action.test.ts` | new | ~100 |
| **PR2 total** | | **~580** |

Combined production surface clearly exceeds a ~400-line single-PR budget → **chained PRs required**, matching the proposal's review-load flag. Natural split boundary: PR1 is independently shippable (cron generates alerts + notifications; users see the bell/badge) and PR2 adds the rich actionable view.

## Test strategy per layer (Strict TDD — `npm test`, Vitest 4)

| Layer | What is tested | How |
|-------|----------------|-----|
| `tiers.ts` (pure) | `limaToday()` returns Lima calendar date across UTC-midnight boundary; `computeTier()` maps (fecha_vencimiento, estado, today) → correct `tipo_alerta \| null` for each threshold incl. boundary days (15/7/3/0/overdue); `buildReminderMessage()` renders formal copy with all placeholders. | Deterministic unit tests with injected `today` / fixed dates. No mocks needed. |
| Cron route | 401 without/with bad bearer; `actualizar_cuotas_vencidas` called before reads; upsert uses `onConflict:'cuota_id,tipo_alerta', ignoreDuplicates:true`; 90-day overdue cap filters older cuotas; notificacion fan-out = one row per unique recipient (owner + globals, de-duped); `enviada=true` set after dispatch. | Mock `createServiceRoleClient` (chainable query builder mock, as in existing route tests) + `tiers.ts`. |
| Gestión action | `registrarGestionCobranza` inserts into `gestion_cobranza`, flips `alerta.gestionada=true`, revalidates; ownership gate respected. | Mock supabase client + auth helper. |
| DB constraints | Unique `(cuota_id,tipo_alerta)` enforcement | No pgTAP in repo — enforcement is validated **indirectly** via the route's `ignoreDuplicates` test; the migration is reviewed manually. Documented as an accepted gap. |

## Risks / open items for spec + apply

- **Coordinador broadcast is coarse** (all coordinadores + admins get every alert). Acceptable for slice 1 per product decision (#387); per-vendedor coordinador mapping is a future slice. Spec should state this explicitly so reviewers don't read it as a bug.
- **DB `CURRENT_DATE` still UTC** inside `actualizar_cuotas_vencidas`/`v_cobranza`. The `0 13 * * *` schedule neutralizes the off-by-one only at cron time; the existing manual button remains UTC-based (pre-existing behavior, unchanged). If the schedule is ever moved before 05:00 UTC the alignment breaks — encode `0 13 * * *` as load-bearing in the spec.
- **90-day backfill cap** is a first-run flood guard; after the first run the dedup index makes it largely moot, but keep it as a permanent floor to avoid re-alerting very old mora.
- **`gestion_cobranza.created_by`** stores `auth.uid()`; ensure the action captures it from the session (service-role cron never writes gestión — only human actions do).
- **No pgTAP** means the unique constraint has no direct automated test — mitigated by the route-level dedup test; flagged as accepted.

## Next step

Proceed to `sdd-tasks` once the spec is also ready. Tasks should encode the 2-PR chain (PR1 backend, PR2 UI) and the `0 13 * * *` schedule as an explicit, testable requirement.
