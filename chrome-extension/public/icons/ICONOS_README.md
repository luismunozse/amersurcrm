# Iconos de AmersurChat

Los iconos se han generado con el siguiente diseño:
- Fondo: Verde WhatsApp (#25D366)
- Letra: "A" de Amersur en blanco
- Formato: Círculo

## Archivos disponibles

- `icon.svg` - Icono vectorial (fuente)
- `icon16.png` - 16x16px (barra de herramientas)
- `icon48.png` - 48x48px (página de extensiones)
- `icon128.png` - 128x128px (Chrome Web Store)

## Personalización

Para personalizarizar con el logo real de Amersur:

1. Exporta el logo en PNG con fondo transparente
2. Usa una herramienta online como https://icon.kitchen/
3. Sube el logo y genera iconos en tamaños 16, 48, 128
4. Reemplaza los archivos en esta carpeta
5. Recompila la extensión: `npm run build`

## Generar manualmente con ImageMagick

```bash
convert icon.svg -resize 16x16 icon16.png
convert icon.svg -resize 48x48 icon48.png
convert icon.svg -resize 128x128 icon128.png
```
