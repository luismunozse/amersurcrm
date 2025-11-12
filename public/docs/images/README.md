# 📸 Imágenes para Documentación

Esta carpeta contiene todas las capturas de pantalla y recursos visuales para los manuales del CRM.

## 📁 Estructura

```
images/
├── guia-rapida/          # Capturas para la Guía de Inicio Rápido
├── manual-vendedor/      # Capturas para el Manual del Vendedor
└── faq/                  # Capturas para FAQ
```

## 🎯 Guía de Capturas de Pantalla

### Herramientas Recomendadas

**Para Linux:**
1. **Flameshot** (Recomendada) - `sudo apt install flameshot`
2. **GNOME Screenshot** - Presiona `PrtScn`
3. **Peek** - Para GIFs animados

**Para Windows:**
1. **Snipping Tool** (Win + Shift + S)
2. **ShareX** - Gratuita y potente

**Para macOS:**
1. Cmd + Shift + 4 (área)
2. Cmd + Shift + 3 (pantalla completa)

### 📝 Convenciones de Nombres

Usa nombres descriptivos en español con guiones:

```
✅ BUENOS:
- login-pantalla-inicial.png
- dashboard-metricas.png
- cliente-crear-formulario.png
- agenda-evento-nuevo-paso1.png
- agenda-evento-nuevo-paso2.png

❌ MALOS:
- screenshot1.png
- img_20250103.png
- captura.png
```

### 🎨 Tips para Capturas de Calidad

1. **Resolución:**
   - Captura a tamaño real (no ampliado/reducido)
   - PNG para UI (mejor calidad)
   - JPG para fotos grandes (menor peso)
   - GIF para animaciones (máx 5-10 segundos)

2. **Anotaciones:**
   - ✅ Usa flechas rojas para señalar
   - ✅ Números (1, 2, 3) para pasos secuenciales
   - ✅ Rectángulos para resaltar áreas
   - ✅ Difumina datos sensibles (DNI, emails, etc.)

3. **Consistencia:**
   - Usa siempre el mismo tema (light/dark)
   - Mantén la misma resolución de pantalla
   - Usa el mismo usuario de prueba

4. **Tamaño:**
   - Comprime las imágenes si son muy pesadas
   - Herramienta online: tinypng.com o compressor.io
   - Objetivo: < 500KB por imagen

### 📋 Cómo Usar en Markdown

```markdown
# Ejemplo de uso

## Paso 1: Acceder al Dashboard

![Dashboard principal](images/guia-rapida/dashboard-principal.png)

## Paso 2: Crear un cliente

Haz clic en el botón "Nuevo Cliente":

![Botón nuevo cliente](images/manual-vendedor/cliente-boton-nuevo.png)

Completa el formulario:

![Formulario de cliente](images/manual-vendedor/cliente-formulario.png)

### GIF Animado

![Crear cliente animado](images/guia-rapida/crear-cliente.gif)
```

### 🔗 Rutas en los Manuales

En los archivos .md de la carpeta `docs/`, las imágenes se referencian desde `public`:

```markdown
![Descripción](/docs/images/guia-rapida/nombre-imagen.png)
```

Next.js servirá automáticamente los archivos de `public/` desde la raíz del sitio.

## ✅ Checklist para Nuevas Capturas

Antes de agregar una captura:

- [ ] Nombre descriptivo y en español
- [ ] Guardada en la carpeta correcta
- [ ] Tamaño optimizado (< 500KB)
- [ ] Datos sensibles difuminados
- [ ] Anotaciones claras y visibles
- [ ] Tema consistente (light/dark)

## 🎯 Capturas Prioritarias

### Para Guía Rápida:
- [ ] Pantalla de login
- [ ] Dashboard principal
- [ ] Formulario nuevo cliente
- [ ] Agenda - crear evento
- [ ] Vista de un proyecto

### Para Manual Vendedor:
- [ ] Todas las secciones principales del menú
- [ ] Formularios de creación (cliente, evento, proforma)
- [ ] Vistas de detalle (cliente, proyecto, propiedad)
- [ ] Proceso completo de venta (paso a paso)

### Para FAQ:
- [ ] Pantallas de configuración
- [ ] Mensajes de error comunes
- [ ] Filtros y búsqueda

## 🚀 Flujo de Trabajo Recomendado

1. **Planifica** qué capturas necesitas (haz una lista)
2. **Prepara** el entorno (datos de prueba, tema consistente)
3. **Captura** todas las pantallas de una vez
4. **Anota** con flechas, números y resaltados
5. **Optimiza** el tamaño si es necesario
6. **Guarda** con nombres descriptivos
7. **Referencia** en el markdown
8. **Revisa** que se vean correctamente

---

**¿Preguntas?** Contacta al equipo de documentación.
