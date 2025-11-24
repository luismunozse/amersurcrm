# Handbook – Mapeo de Lotes con múltiples capas

## Objetivo
Describe cómo validar manualmente el nuevo flujo de mapeo multicapa y qué pasos debe seguir el equipo de soporte para ayudar a los admins a subir, ordenar y elegir la capa principal de cada proyecto.

---

## QA manual recomendado

### Preparación
1. Iniciar sesión con un usuario administrador.
2. Abrir un proyecto con lotes existentes.
3. Borrar temporalmente capas previas si se requiere (desde el Paso 2 → “Eliminar capa”).

### 1. Paso 1 – Área del proyecto
- Dibujar un polígono y guardar.
- Saltar al Paso 2 usando “Continuar al Paso 2 (Configurar capas)” y volver al Paso 1 para confirmar que el polígono se mantiene.

### 2. Paso 2 – Gestión de capas
| Caso | Pasos | Resultado esperado |
| --- | --- | --- |
|Agregar capa|Click “Agregar capa”.|Nueva tarjeta “Capa n” queda activa.|
|Subir imagen|Usar “Subir imagen” (uploader global o por tarjeta).|La tarjeta muestra “Imagen cargada”.|
|Rotación|Ajustar slider ±5° y rotar manual.|Giro visible en mapa; slider muestra ángulo.|
|Visibilidad|Alternar icono ojo.|La capa aparece/desaparece.|
|principal|Marcar estrella.|Se actualiza badge “Principal”; drop-zone usa esta capa.|
|Eliminar|Borrar una capa secundaria.|Se elimina y mantiene la activa previa.|
|Reordenar visual|Cambiar nombre y toggles entre múltiples capas.|Lista mantiene orden y acciones siguen respondiendo.|
|Guardar|Click “💾 Guardar capas y continuar”.|Toast de éxito, Paso 3 disponible. Recargar página mantiene el estado.|

### 3. Paso 3 – Ubicación de lotes con capas activas
1. Cambiar a la pestaña “Pendientes”.
2. Arrastrar un lote sobre la capa principal → debe respetar el bounding box.
3. Cambiar la capa activa (no primaria) en Paso 2 y volver a Paso 3 sin recargar:
   - El polígono editable del mapa responde a la capa activa.
   - Los lotes aún se validan contra la capa principal.
4. Reubicar un lote existente (pestaña “Ubicados”) y confirmar que mantiene la referencia a la nueva imagen.

### 4. Regressions rápidas
- Refrescar la página con capas guardadas → verificar que:
  - El Paso inicial se calcula correctamente.
  - Se conserva la capa primaria, opacidad y rotación.
  - Los lotes mantienen su posición.

### Notas para el QA
- Documentar el ID del proyecto y adjuntar capturas de cada paso.
- Si falla la subida de una capa, revisar la respuesta de `/api/proyectos/upload-overlay-layer`.
- Verificar en la tabla `proyecto.overlay_layers` que los cambios se persistieron.

---

## Procedimiento de soporte para admins

### 1. Checklist previo
- Confirmar que el proyecto tiene área del Paso 1 guardada.
- Avisar que los formatos permitidos son JPG/PNG/WEBP (máx. 10 MB por capa).
- Recordar que solo usuarios con rol admin pueden guardar capas.

### 2. Flujo recomendado para subir/ordenar capas
1. Ir al Paso 2 y presionar “Agregar capa”.
2. Renombrar la capa con el nombre del plano (ej. “Fase 1 – Infraestructura”).
3. Subir la imagen desde la tarjeta o el uploader principal.
4. Ajustar opacidad y rotación hasta que coincida con el terreno.
5. Repetir para capas adicionales (ej. servicios, urbanización, topografía).
6. Guardar después de cada tanda de cambios para evitar pérdidas.

### 3. Criterios para la capa principal
| Situación | Qué elegir como capa principal | Motivo |
| --- | --- | --- |
|Plano comercial único|La imagen oficial para ventas.|Define la zona de drop para los asesores.|
|Varias fases con escalas distintas|La fase más avanzada o la que contenga la mayoría de lotes activos.|Minimiza errores al ubicar pines.|
|Capas de referencia (infraestructura, zonificación)|Mantenerlas como secundarias y visibles solo cuando sea necesario.|Evita confusión y mantiene el drop-zone estable.|

**Tip:** si un proyecto requiere otra capa como referencia temporal, se puede desmarcar visibilidad sin perder los datos.

### 4. Buenas prácticas adicionales
- Rotar la capa solo luego de fijar los cuatro vértices; el slider aplica transformaciones exactas, por lo que conviene usar incrementos de 5° y luego ajustar fino.
- Mantener una sola capa primaria; si se elimina la principal, elegir otra antes de guardar para no perder la referencia del drop-zone.
- Nombrar las capas con el formato `Fase - Descripción` para facilitar la búsqueda.

### 5. SOP para incidencias comunes
| Problema | Acción inmediata | Escalación |
| --- | --- | --- |
|Lotes no se pueden ubicar|Verificar que exista una capa primaria con imagen y bounds guardados.|Escalar a equipo técnico si el bounding box no se actualiza tras guardar.|
|La imagen desaparece tras refrescar|Repetir guardado y revisar consola de errores; confirmar que `overlay_layers` tiene la URL correcta.|Contactar a infraestructura si Supabase storage no responde.|
|Cambios no se ven en paso 3|Forzar refresh; si persiste, revisar que se haya marcado al menos una capa como visible.|Reportar bug con ID de proyecto y timestamp.|

---

## Seguimiento
- Guardar evidencia de QA (capturas + URLs) en la carpeta compartida de QA.
- Registrar cualquier bug en Linear/Trello con etiqueta `mapeo-multicapa`.
- Revisar trimestralmente este handbook para incorporar feedback de soporte y usuarios finales.
