# Design: secure-authz-p1 — Authorization Hardening (P1)

## Technical Approach

Three coordinated layers, each independently verifiable:
- **FIX A** — one shared Bearer+role helper (`extension-auth.ts`) consumed by the 5 extension routes.
- **FIX B** — one atomic SQL migration replacing every `USING(true)` with ownership-scoped policies on 13 tables, plus a new `crm.es_visibilidad_global()` helper.
- **FIX C** — defense-in-depth role/scope guards in 6 server actions, mirroring the proven `obtenerComisiones` pattern.

Mirror existing, proven RLS (`20260224100000`, `20250326000008`). For `cliente_id` tables reuse `crm.usuario_puede_ver_cliente()` (already encodes coordinador via the `ver_todos` permission — confirmed). Never touch `crm.es_admin_o_gerente()` (it lacks coordinador and backs live policies); add a NEW helper instead.

---

## FIX A — Extension Auth Helper

`src/lib/auth/extension-auth.ts`

```ts
const GLOBAL_ROLES = ['ROL_ADMIN', 'ROL_GERENTE', 'ROL_COORDINADOR_VENTAS'] as const;

export type ExtensionAuthError = {
  ok: false; status: 401 | 403; error: string;
};
export type ExtensionAuthOk = {
  ok: true; user: User; username: string; rol: string;
  supabase: SupabaseClient; // the service-role client (reused for DB ops)
};

export async function validateBearerAndEnsureGlobalRole(
  token: string | null,
): Promise<ExtensionAuthOk | ExtensionAuthError> {
  if (!token) return { ok: false, status: 401, error: 'No autenticado' };
  const supabase = createServiceRoleClient();
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return { ok: false, status: 401, error: 'Token inválido' };

  const { data: perfil } = await supabase
    .schema('crm').from('usuario_perfil')
    .select('username, rol:rol!rol_id(nombre)')
    .eq('id', user.id).single();

  const rol = perfil?.rol?.nombre;
  if (!rol || !GLOBAL_ROLES.includes(rol))
    return { ok: false, status: 403, error: 'Permiso insuficiente' };

  return { ok: true, user, username: perfil.username, rol, supabase };
}
```

**Error contract**: 401 = missing/invalid token; 403 = valid token, non-global role. Returns a typed discriminated union (no throws) so each route maps `status` → `NextResponse` with existing `corsHeaders`.

**Route consumption (before → after)** — `estado/route.ts` Bearer branch:

```ts
// AFTER
const authHeader = request.headers.get('authorization');
const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
const auth = await validateBearerAndEnsureGlobalRole(token);
if (!auth.ok)
  return NextResponse.json({ error: auth.error }, { status: auth.status, headers: corsHeaders });
const supabase = auth.supabase; // role-checked service client
```

The cookie/web branch is unchanged (RLS applies via user session). Replaces the copy-pasted block in all 5 routes (`notas`, `estado`, `interacciones`, `pendientes`, `proyecto-interes`).

---

## FIX B — RLS Scoping (critical work)

### New helper

```sql
CREATE OR REPLACE FUNCTION crm.es_visibilidad_global()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM crm.usuario_perfil up
    JOIN crm.rol r ON up.rol_id = r.id
    WHERE up.id = auth.uid()
      AND r.nombre IN ('ROL_ADMIN', 'ROL_GERENTE', 'ROL_COORDINADOR_VENTAS')
  );
END; $$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
```

### Scoping map (verified against CREATE TABLE columns)

| # | Table | Scoping path (FK verified) | SELECT policy `USING(...)` |
|---|-------|----------------------------|-----------------------------|
| 1 | `solicitud_postventa` | `cliente_id` direct | `crm.usuario_puede_ver_cliente(cliente_id)` |
| 2 | `entrega` | `cliente_id` direct | `crm.usuario_puede_ver_cliente(cliente_id)` |
| 3 | `entrega_observacion` | `entrega_id → entrega.cliente_id` | `EXISTS (SELECT 1 FROM crm.entrega e WHERE e.id = entrega_id AND crm.usuario_puede_ver_cliente(e.cliente_id))` |
| 4 | `entrega_checklist_item` | `entrega_id → entrega.cliente_id` | same EXISTS via `crm.entrega` |
| 5 | `proceso_adquisicion` | `cliente_id` direct (+`vendedor_username`) | `crm.usuario_puede_ver_cliente(cliente_id)` |
| 6 | `proceso_etapa` | `proceso_id → proceso.cliente_id` | `EXISTS (SELECT 1 FROM crm.proceso_adquisicion p WHERE p.id = proceso_id AND crm.usuario_puede_ver_cliente(p.cliente_id))` |
| 7 | `proceso_checklist_item` | `etapa_id → etapa.proceso_id → proceso.cliente_id` | `EXISTS (SELECT 1 FROM crm.proceso_etapa e JOIN crm.proceso_adquisicion p ON p.id = e.proceso_id WHERE e.id = etapa_id AND crm.usuario_puede_ver_cliente(p.cliente_id))` |
| 8 | `cuota` | `venta_id → venta.cliente_id` (no `cliente_id`) | `EXISTS (SELECT 1 FROM crm.venta v WHERE v.id = venta_id AND crm.usuario_puede_ver_cliente(v.cliente_id))` |
| 9 | `comision` | `beneficiario_username` (vendor, no `cliente_id`) | `crm.es_visibilidad_global() OR beneficiario_username = crm.get_current_username()` |
| 10 | `calificacion_bancaria` | `cliente_id` direct | `crm.usuario_puede_ver_cliente(cliente_id)` |
| 11 | `calificacion_documento` | `calificacion_id → calificacion_bancaria.cliente_id` | `EXISTS (SELECT 1 FROM crm.calificacion_bancaria c WHERE c.id = calificacion_id AND crm.usuario_puede_ver_cliente(c.cliente_id))` |
| 12 | `contrato` | `cliente_id` direct | `crm.usuario_puede_ver_cliente(cliente_id)` |
| 13 | `meta_vendedor` | `vendedor_username` (vendor, no `cliente_id`) | `crm.es_visibilidad_global() OR vendedor_username = crm.get_current_username()` |

Only tables 5–7 also have lazy WRITE policies to replace; tables 1–4, 8–13 only had `SELECT USING(true)` — replace SELECT only (their INSERT/UPDATE/DELETE are server-action gated / out of scope).

### proceso_adquisicion — atomic write policies (preserve vendor checklist)

```sql
-- proceso_adquisicion
DROP POLICY IF EXISTS "proceso_select" ON crm.proceso_adquisicion;
CREATE POLICY "proceso_select" ON crm.proceso_adquisicion FOR SELECT TO authenticated
  USING (crm.usuario_puede_ver_cliente(cliente_id));
DROP POLICY IF EXISTS "proceso_update" ON crm.proceso_adquisicion;
CREATE POLICY "proceso_update" ON crm.proceso_adquisicion FOR UPDATE TO authenticated
  USING (crm.es_visibilidad_global() OR vendedor_username = crm.get_current_username())
  WITH CHECK (crm.es_visibilidad_global() OR vendedor_username = crm.get_current_username());
DROP POLICY IF EXISTS "proceso_delete" ON crm.proceso_adquisicion;
CREATE POLICY "proceso_delete" ON crm.proceso_adquisicion FOR DELETE TO authenticated
  USING (crm.es_visibilidad_global());  -- delete = global only

-- proceso_etapa / proceso_checklist_item: UPDATE scoped via parent proceso ownership
CREATE POLICY "proceso_etapa_update" ON crm.proceso_etapa FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM crm.proceso_adquisicion p WHERE p.id = proceso_id
    AND (crm.es_visibilidad_global() OR p.vendedor_username = crm.get_current_username())))
  WITH CHECK (EXISTS (SELECT 1 FROM crm.proceso_adquisicion p WHERE p.id = proceso_id
    AND (crm.es_visibilidad_global() OR p.vendedor_username = crm.get_current_username())));
-- proceso_checklist_item UPDATE: same, joining proceso_etapa → proceso_adquisicion via etapa_id
```

The vendor-ownership branch in UPDATE `USING`/`WITH CHECK` keeps the checklist workflow alive; only DELETE narrows to global. **All proceso_* policies migrate in one migration** (atomic).

### Migration mechanics

- File: `supabase/migrations/20260601000000_secure_authz_p1.sql` (> `20260507010000`).
- Idempotent: `DROP POLICY IF EXISTS` + `CREATE POLICY` for every policy; `CREATE OR REPLACE FUNCTION` for the helper.
- Drop the legacy lazy names too (`*_select`, `auth_users_all`, and the UPDATE/DELETE policy names from `20260420000000` / `20260507010000`).
- **Rollback note**: emergency down-migration recreates original `USING(true)` policies via the same DROP+CREATE pattern (kept for emergency only, not committed as default path).

---

## FIX C — Server-action guards (defense-in-depth)

Mirror `obtenerComisiones`: `tienePermiso(VER_TODAS)` → else filter by own `username`.

| Action | Guard |
|--------|-------|
| `cancelarProceso` | `if (!await esAdminOGerente()) return { error }` **+ audit entry** (insert into existing audit/log table with actor, proceso_id, action). Intentional behavior change: vendors lose self-cancel. |
| `obtenerSolicitudesPostVenta` | `tienePermiso(VER_TODAS)` else `.eq` cliente-scope via vendor username (filter on `cliente_id IN own` or `vendedor_username`) |
| `obtenerEntregas` | same scope filter as postventa |
| `obtenerCuotasCliente` | verify caller can see the target `cliente` (`usuario_puede_ver_cliente` via RPC / ownership check) before returning |
| `obtenerMetas` | `tienePermiso(METAS.ASIGNAR)`/global else `.eq('vendedor_username', own)` |
| `obtenerKPIs` | same role/own-vendor filter as metas |

RLS is the primary control; these guards fail fast and shape queries (belt-and-suspenders).

---

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Unit (vitest) | `extension-auth` | mock service client: global role → `ok:true`; vendor → 403; unknown/no perfil → 403; bad token → 401; null token → 401 |
| Unit (vitest) | 6 guards | mock `tienePermiso`/`esAdminOGerente` + supabase query builder; assert global path returns all, vendor path applies `.eq` own filter, `cancelarProceso` rejects non-admin and writes audit |
| Integration (per role) | RLS | seed admin/gerente/coordinador/2 vendors; assert vendor SELECT returns only own-client rows across 13 tables; vendor can UPDATE own `proceso_checklist_item`, cannot UPDATE another vendor's, cannot DELETE proceso; global roles see all |

**Note**: RLS cannot be proven by unit tests alone — integration runs against a real Supabase (local/CI) with per-role JWTs.

---

## Open Questions

- [ ] `cancelarProceso` audit: confirm the existing audit table/log name to insert into (no dedicated audit table surfaced in exploration — may need a lightweight insert into an existing log or a console+notification fallback).
- [ ] `comision` scope: design uses `beneficiario_username` (owner). Confirm no secondary beneficiaries (e.g. coordinator commissions) need visibility beyond global roles.
- [ ] Confirm CI has a Supabase integration harness; if absent, RLS verification is manual per-role this cycle.
