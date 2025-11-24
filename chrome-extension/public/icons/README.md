# Iconos de AmersurChat

Para generar los iconos de la extensión, necesitas crear imágenes PNG en los siguientes tamaños:

- icon16.png (16x16px)
- icon48.png (48x48px)
- icon128.png (128x128px)

## Opción 1: Usar un generador online

1. Ve a https://www.favicon-generator.org/
2. Sube el logo de Amersur
3. Genera los iconos en los tamaños requeridos
4. Descarga y coloca en esta carpeta

## Opción 2: Usar ImageMagick

```bash
# Convertir desde logo original
convert logo.png -resize 16x16 icon16.png
convert logo.png -resize 48x48 icon48.png
convert logo.png -resize 128x128 icon128.png
```

## Placeholder actual

Por ahora, la extensión funciona sin iconos. Chrome mostrará un icono por defecto.
