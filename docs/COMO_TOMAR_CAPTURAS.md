# 📸 Cómo Tomar Capturas para el Manual

## 🚀 Instalación Rápida de Flameshot (Recomendado)

```bash
sudo apt update
sudo apt install flameshot
```

## 🎯 Uso Básico

### Opción 1: Desde Terminal
```bash
flameshot gui
```

### Opción 2: Atajo de Teclado (Recomendado)

1. Ve a **Configuración del Sistema** → **Teclado** → **Atajos personalizados**
2. Crea un nuevo atajo:
   - **Nombre:** Captura Flameshot
   - **Comando:** `flameshot gui`
   - **Atajo:** `Ctrl + Shift + Print` (o el que prefieras)

## 🎨 Guía de Anotaciones en Flameshot

Una vez que tomes la captura, verás estas herramientas:

```
Barra de Herramientas:
┌─────────────────────────────────────────┐
│ ✏️  📐  ⭕  ➡️  🔢  ❌  💾  📋  ↩️    │
│ Lápiz Box Círculo Flecha Texto Blur Save Copy Undo │
└─────────────────────────────────────────┘
```

### Herramientas Principales:

1. **➡️ Flecha** (Más importante)
   - Click en el botón flecha
   - Elige color ROJO
   - Aumenta grosor (slider)
   - Dibuja flecha señalando lo importante

2. **🔢 Texto**
   - Para agregar números (1, 2, 3)
   - Para agregar explicaciones
   - Tamaño grande y legible

3. **📐 Rectángulo**
   - Para resaltar áreas completas
   - Sin relleno (solo borde)
   - Color verde AMERSUR (#86901F)

4. **❌ Difuminar (Blur)**
   - Para ocultar datos sensibles
   - DNI, emails, teléfonos reales
   - Información confidencial

5. **💾 Guardar**
   - Guarda con nombre descriptivo
   - En la carpeta correcta de `public/docs/images/`

## 📋 Flujo de Trabajo Recomendado

### 1. Preparación (5 minutos)
```bash
# 1. Navega al CRM
# 2. Prepara la pantalla que vas a capturar
# 3. Cierra pestañas innecesarias
# 4. Limpia notificaciones de escritorio
```

### 2. Captura (1 minuto por imagen)
```bash
# 1. Ejecuta: flameshot gui
# 2. Selecciona el área
# 3. Anota con flechas y números
# 4. Guarda
```

### 3. Organización (2 minutos)
```bash
# Mueve las imágenes a la carpeta correcta
mv ~/Downloads/captura-*.png public/docs/images/guia-rapida/
```

## 🎯 Ejemplos de Capturas Necesarias

### Para Guía Rápida:

**Prioridad Alta:**
- [ ] `login-pantalla-inicial.png` - Pantalla completa de login
- [ ] `login-con-credenciales.png` - Con flechas señalando campos
- [ ] `dashboard-completo.png` - Vista general del dashboard
- [ ] `dashboard-metricas.png` - Solo sección de métricas
- [ ] `menu-lateral-clientes.png` - Menú con "Clientes" resaltado
- [ ] `cliente-boton-nuevo.png` - Botón + Nuevo Cliente
- [ ] `cliente-formulario-vacio.png` - Formulario vacío
- [ ] `cliente-formulario-completo.png` - Con datos de ejemplo y números (1,2,3,4)
- [ ] `cliente-boton-guardar.png` - Botón guardar con flecha
- [ ] `cliente-mensaje-exito.png` - Toast de confirmación
- [ ] `agenda-calendario-vacio.png` - Vista de agenda
- [ ] `agenda-boton-nuevo.png` - Botón nuevo evento
- [ ] `agenda-formulario-evento.png` - Formulario completo
- [ ] `proyectos-lista.png` - Lista de proyectos
- [ ] `proyecto-detalle.png` - Detalle con mapa

### Para Manual Vendedor:

**Prioridad Media:**
- [ ] Todas las páginas principales del menú
- [ ] Formularios de edición
- [ ] Vistas de detalle
- [ ] Proceso de venta paso a paso (10-15 imágenes)

### Para FAQ:

**Prioridad Baja:**
- [ ] Configuraciones
- [ ] Mensajes de error
- [ ] Filtros

## 🔧 Configuración Avanzada de Flameshot

```bash
# Configurar Flameshot para que se inicie con el sistema
flameshot config

# Ver todas las opciones
flameshot --help
```

### Configuración Recomendada:

1. **General:**
   - ✅ Mostrar asistente de inicio
   - ✅ Mostrar icono en bandeja del sistema

2. **Apariencia:**
   - Tema: Oscuro
   - Color principal: #86901F (verde AMERSUR)

3. **Carpeta de guardado:**
   - Personalizar a: `~/Escritorio/amersurcrm/public/docs/images/temp/`

## 💡 Tips Profesionales

### Para Capturas de UI:

1. **Limpia la pantalla:**
   - Cierra tabs innecesarias
   - Oculta extensiones del navegador
   - Desactiva notificaciones temporalmente

2. **Usa zoom del navegador:**
   - `Ctrl + 0` → Zoom 100% (estándar)
   - `Ctrl + Plus` → Zoom 110% (si los textos se ven muy pequeños)

3. **Modo pantalla completa:**
   - `F11` en el navegador para capturas limpias sin barras

4. **Datos de ejemplo consistentes:**
   - Siempre usa el mismo usuario de prueba
   - Ejemplo: "Juan Pérez", DNI: 12345678, Tel: 987654321

### Para Anotar:

1. **Flechas:**
   - Color: ROJO (#DC2626)
   - Grosor: 4-5 px
   - Dirección: Siempre desde afuera señalando hacia adentro

2. **Números:**
   - Círculos rojos con números blancos
   - En orden de lectura (izquierda a derecha, arriba a abajo)

3. **Texto:**
   - Font size: 16-18
   - Color: Negro o Rojo
   - Fondo blanco si hay imagen detrás

## ⚠️ Errores Comunes a Evitar

❌ **NO hacer:**
- Capturas con datos reales de clientes
- Imágenes borrosas o pixeladas
- Capturas con elementos cortados
- Anotar con muchos colores diferentes
- Guardar con nombres genéricos (screenshot1.png)

✅ **SÍ hacer:**
- Usar datos de prueba/ejemplo
- Capturas nítidas a resolución real
- Capturas completas con contexto
- Anotar con colores corporativos (rojo/verde)
- Nombres descriptivos en español

## 🎬 GIFs Animados (Opcional)

Para procesos complejos, graba GIFs con **Peek**:

```bash
sudo apt install peek
```

**Cuándo usar GIF:**
- Proceso de 3+ pasos
- Interacciones con dropdowns
- Arrastrar y soltar
- Animaciones del sistema

**Duración recomendada:** 5-10 segundos máximo

---

## ✅ Checklist Final

Antes de agregar imágenes a los manuales:

- [ ] Instalé Flameshot
- [ ] Configuré atajo de teclado
- [ ] Practiqué tomar capturas
- [ ] Sé cómo anotar con flechas
- [ ] Tengo datos de prueba listos
- [ ] Conozco dónde guardar las imágenes

---

## 🚀 ¡Empecemos!

```bash
# 1. Instala Flameshot
sudo apt install flameshot -y

# 2. Pruébala
flameshot gui

# 3. Toma tu primera captura
# 4. Anótala con flechas
# 5. Guárdala con nombre descriptivo

# ¡Ya estás listo! 🎉
```

---

**Siguiente paso:** Abre el archivo `GUIA_INICIO_RAPIDO_CON_IMAGENES_EJEMPLO.md` para ver dónde van las capturas.

