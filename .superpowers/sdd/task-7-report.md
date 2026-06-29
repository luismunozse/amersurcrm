# Task 7 Report — Masterplan admin editor integration

## Supabase browser client
```ts
import { createClient } from "@/lib/supabase.client";
// ...
const supabase = createClient();
```
Copied exactly from `_EditProjectModal.tsx` (line 8 + line 309).

## Gate `puedeEditar`
No new prop needed. `_LotesList.tsx` already calls `usePermissions()` and exposes `esAdminOCoordinador()`. Added:
```ts
const puedeEditarMasterplan = esAdminOCoordinador();
```
Admins and coordinators can upload and draw; vendedores only see the viewer.

## Files touched
- `src/components/masterplan/MasterplanEditorPanel.tsx` — created (upload + editor wrapper)
- `src/app/dashboard/proyectos/[id]/_LotesList.tsx` — added import, `editandoMp` state, toggle button, and panel inside Masterplan `CardContent`

## Deviations
- `guardarMasterplanProyecto` second arg is typed as `Masterplan` (not destructured params) — the object literal `{ url, path, width, height }` satisfies it directly.
- `MasterplanEditor` has `proyectoId` in its interface but doesn't destructure it; still passing it to satisfy TypeScript.
- No `page.tsx` changes needed (permissions resolved client-side via `usePermissions`).
