# Configuración de Google Maps API

## ⚠️ Actualización Importante

**Se ha actualizado la implementación para usar carga directa del script de Google Maps** en lugar de `@googlemaps/js-api-loader` debido a cambios en la API.

## Pasos para configurar Google Maps API

### 1. Crear proyecto en Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Habilita la API de Google Maps JavaScript API

### 2. Obtener API Key

1. Ve a **APIs y servicios** > **Credenciales**
2. Haz clic en **+ CREAR CREDENCIALES** > **Clave de API**
3. Copia la clave generada

### 3. Configurar restricciones (Recomendado)

1. Haz clic en la clave creada para editarla
2. En **Restricciones de la aplicación**, selecciona **Sitios web HTTP**
3. Agrega tu dominio:
   - Para desarrollo local: `http://localhost:3000/*` y `http://localhost:3001/*`
   - Para producción: `https://tu-dominio.com/*`
4. En **Restricciones de la API**, selecciona **Restringir clave**
5. Selecciona:
   - **Maps JavaScript API**
   - **Geocoding API** (opcional, para geocodificación)
   - **Places API** (opcional, para búsqueda de lugares)

### 4. Agregar a variables de entorno

Agrega la siguiente línea a tu archivo `.env.local`:

```bash
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=tu_api_key_aqui
```

### 5. APIs recomendadas para el proyecto

- **Maps JavaScript API** - Para mostrar mapas interactivos
- **Geocoding API** - Para convertir direcciones en coordenadas
- **Places API** - Para búsqueda de lugares y autocompletado

### 6. Consideraciones de facturación

- Google Maps API tiene una capa gratuita de $200 USD/mes
- Monitorea el uso en Google Cloud Console
- Configura alertas de facturación para evitar sorpresas

### 7. Funcionalidades migradas de Leaflet

✅ **Componentes migrados:**
- `LeafletMap.tsx` → `GoogleMap.tsx`
- `_SelectorCoordenadasMapa.tsx` → `_SelectorCoordenadasGoogleMaps.tsx`
- `_MapeoLotes.tsx` actualizado para usar Google Maps

✅ **Funcionalidades implementadas:**
- Mapas interactivos con múltiples tipos (Satelital, Carretera, Híbrido, Terreno)
- Marcadores personalizados para lotes con colores por estado
- Overlays de planos con controles de opacidad, rotación y escala
- Calibración de planos con rectángulos editables
- Clics en mapa para ubicar lotes
- Info windows con información detallada
- Controles de pantalla completa

✅ **Ventajas sobre Leaflet:**
- Mejor rendimiento
- Imágenes satelitales de mayor calidad
- Integración nativa con servicios de Google
- Mejor soporte para dispositivos móviles
- API más robusta y mejor documentada

### 8. Troubleshooting

**Error: "Google Maps JavaScript API error: InvalidKeyMapError"**
- Verifica que la API key esté correctamente configurada
- Asegúrate de que la API esté habilitada en Google Cloud Console

**Error: "This page can't load Google Maps correctly"**
- Verifica las restricciones de dominio en la API key
- Asegúrate de que la clave tenga permisos para Maps JavaScript API

**Mapas no se cargan en producción**
- Agrega el dominio de producción a las restricciones
- Verifica que la variable de entorno esté configurada en el servidor

**Error: "The Loader class is no longer available"**
- ✅ **Solucionado**: Se actualizó la implementación para usar carga directa del script
- Ya no se requiere `@googlemaps/js-api-loader`
- Los mapas se cargan dinámicamente via `<script>` tag
