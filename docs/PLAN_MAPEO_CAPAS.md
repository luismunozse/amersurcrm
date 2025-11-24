# Plan de trabajo – Mapeo de Lotes con múltiples capas

## Contexto
- Se migró la base de datos para soportar `overlay_layers` (`supabase/migrations/202511181200_add_overlay_layers_column.sql`).
- Se añadieron tipos (`src/types/overlay-layers.ts`) y la acción `guardarOverlayLayers` para persistir las capas.
- `GoogleMap.tsx`, `MapeoLotesVisualizacion.tsx` y las páginas (`page.tsx` / `page.mejorado.tsx`) ya consumen la nueva estructura, pero `_MapeoLotesMejorado.tsx` sigue en la versión antigua (un solo plano) porque se revirtió para evitar errores mientras completamos el rediseño.

## Flujo objetivo
1. **Múltiples capas**: permitir subir varias imágenes del plano, nombrarlas, controlar visibilidad/opacidad y marcar una como principal.
2. **Edición por capa**: dibujar y ajustar el polígono de cada capa por separado (la capa activa controla el overlay editable).
3. **Persistencia**: guardar toda la colección usando `guardarOverlayLayers` (incluyendo URL, bounds y opacidad).
4. **Ubicación de lotes**: usar la capa principal para la zona de drop y validar que los pines se ubiquen dentro del bounding box.

## Progreso (checklist)
- [x] Migración `overlay_layers` en Supabase.
- [x] Tipos y helpers (`OverlayLayerConfig`).
- [x] Acción `guardarOverlayLayers` + endpoint de subida `upload-overlay-layer`.
- [x] Adaptación de `GoogleMap.tsx` y `MapeoLotesVisualizacion.tsx`.
- [x] Refactor de `MapeoLotesMejorado.tsx` para usar `overlayLayers[]`.
- [x] UI del panel de capas (agregar/quitar, visibilidad, marcar principal, ajustar opacidad).
- [x] Integración del nuevo flujo de guardado en pasos 1/2/3.
- [x] Validaciones de drop-zone y mensajes para el usuario (capas vs lotes).
- [x] Actualización de documentación para el equipo.

> Nota: mientras no se complete el refactor, el flujo actual seguirá funcionando con un solo plano. Mantén este archivo actualizado cada vez que avances; así la siguiente sesión tendrá contexto inmediato.

## Avances recientes
- `_MapeoLotesMejorado.tsx` ahora almacena el arreglo completo de `overlayLayers`, controla la capa activa y persiste todo mediante `guardarOverlayLayers`.
- El Paso 2 incluye un panel de capas con acciones para agregar/eliminar, marcar como principal, alternar visibilidad, ajustar opacidad y subir imágenes por capa (tanto desde la lista como con el uploader principal).
- GoogleMap recibe `overlayLayers`, `activeOverlayId` y `dropAreaBounds` para editar los bounds por capa y usar la capa principal como zona de drop para los lotes.
- Las validaciones de `upsertLotePin` y el drag & drop ahora dependen del bounding box de la capa principal, mostrando mensajes claros si la imagen o el área no están listas.

## Próximos pasos
- QA manual del nuevo flujo (especialmente cambios de capa activa mientras se ubican lotes) y ajustes de UX que surjan durante la prueba con usuarios.
- Documentar en el handbook de soporte el procedimiento para subir/ordenar múltiples capas y definir criterios para elegir la capa principal según el proyecto.
