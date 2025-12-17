# Instrucciones para crear assets de Chrome Web Store

## Archivos creados

| Archivo | Tamaño | Uso |
|---------|--------|-----|
| `promo-440x280.html` | 440x280 | Imagen promocional pequeña |
| `marquee-1400x560.html` | 1400x560 | Banner marquee (opcional) |

## Cómo generar las imágenes PNG

### Opción 1: Usando Chrome (Recomendado)

1. Abre el archivo HTML en Chrome
2. Presiona `F12` para abrir DevTools
3. Presiona `Ctrl+Shift+P` (Command Palette)
4. Escribe "screenshot" y selecciona **"Capture full size screenshot"**
5. Se descargará el PNG automáticamente

### Opción 2: Usando una herramienta online

1. Abre https://htmlcsstoimage.com/
2. Pega el contenido HTML
3. Ajusta el tamaño (440x280 o 1400x560)
4. Descarga el PNG

## Screenshots requeridos (1280x800)

Para los screenshots, necesitas capturas REALES de la extensión funcionando:

### Screenshot 1: Sidebar abierto
1. Ve a https://web.whatsapp.com
2. Selecciona un chat
3. Abre el sidebar de AmersurChat
4. Toma captura con `Win+Shift+S` o herramienta de recorte
5. Tamaño: **1280x800 px**

### Screenshot 2: Capturando un lead
1. Muestra el formulario de "Crear Lead"
2. Toma captura

### Screenshot 3: Información del cliente
1. Muestra un cliente ya registrado con sus datos
2. Toma captura

### Screenshot 4: Plantillas de mensaje
1. Muestra la sección de plantillas
2. Toma captura

## Tips para buenos screenshots

- Usa datos de prueba realistas (no "test" o "asdf")
- Asegúrate que el tema sea claro (light mode)
- Recorta exactamente a 1280x800
- No incluyas información sensible

## Checklist final

- [ ] Imagen promocional 440x280 (PNG)
- [ ] Marquee 1400x560 (PNG) - opcional
- [ ] 1-5 Screenshots 1280x800 (PNG)
- [ ] Icono 128x128 (ya existe en icons/)
