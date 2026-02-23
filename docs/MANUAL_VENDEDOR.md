# 📘 Manual de Usuario – AMERSUR CRM
## Referencia Completa para Vendedores

**Versión:** 1.2
**Actualizado:** Febrero 2026
**Dirigido a:** Vendedores y coordinadores comerciales

---

## 🎯 Visión general

| Puedes… | ¿Para qué? |
| --- | --- |
| Registrar clientes y sus interacciones | Mantener tu cartera ordenada y compartida |
| Programar tareas y recordatorios | No olvidar seguimientos ni visitas |
| Consultar proyectos y lotes | Responder rápidamente a cada consulta |
| Generar proformas y reservas | Formalizar ofertas y bloquear unidades |
| Capturar leads desde WhatsApp | Registrar contactos sin salir de WhatsApp Web |
| Recibir notificaciones en tiempo real | Actuar apenas algo importante ocurra |
| Importar clientes y lotes en masa | Cargar datos desde Excel o CSV |

> Consejo general: registra toda interacción. Si no está en el CRM, no existe.

---

## 🔐 Inicio de sesión y seguridad

1. Navega a `https://crm.amersursac.com` (Chrome/Firefox recomendados).
2. Ingresa tu usuario (DNI o correo) y contraseña.
3. En el primer acceso deberás cambiar la contraseña. Usa una combinación fácil de recordar pero segura.

### Recuperar contraseña
1. Haz clic en **¿Olvidaste tu contraseña?**.
2. Ingresa tu correo corporativo.
3. Revisa tu bandeja y sigue el enlace para restablecerla.

### Buenas prácticas
- No compartas tus credenciales.
- Cierra sesión si trabajas en equipos compartidos.
- Actualiza la contraseña desde `Avatar → Cambiar contraseña`.

---

## 🧭 Mapa de navegación

**Menú lateral**
```
🏠 Dashboard      → indicadores, metas y pendientes del día
👥 Clientes       → cartera y detalle de cada contacto
🏢 Proyectos      → proyectos y lotes disponibles
🏠 Propiedades    → buscador transversal de lotes
📅 Agenda         → eventos, recordatorios y calendario
📄 Documentos     → archivos sincronizados con Google Drive
💬 AmersurChat    → extensión de WhatsApp para capturar leads
📊 Mis Reportes   → tus métricas personales de ventas
```

**Barra superior**
- 🔔 Notificaciones: eventos recientes (reservas, clientes nuevos, recordatorios).
- 👤 Avatar: perfil, cambiar contraseña, reportar problema, ayuda y cerrar sesión.

---

## 👥 Clientes

### Crear un cliente
1. `Clientes → + Nuevo Cliente`.
2. Completa datos básicos (nombre, DNI, teléfono, email) y datos CRM (origen, estado, presupuesto).
3. Guarda. El cliente aparece en tu lista y queda asignado a ti.

### Importar clientes en masa
Si tienes muchos contactos en una hoja de cálculo:
1. Descarga la plantilla CSV desde `Clientes → Importar`.
2. Rellena los datos en Excel respetando las columnas.
3. Sube el archivo y confirma la importación.
4. El sistema crea los clientes sin duplicar los que ya existen por DNI.

### Detalle del cliente
El perfil tiene pestañas:
- **Resumen:** datos personales, presupuesto y notas clave.
- **Timeline:** historial de llamadas, correos, WhatsApp, visitas.
- **Propiedades de interés:** lotes guardados para ese cliente.
- **Proformas / Reservas / Ventas:** documentos emitidos y su estado.

### Registrar interacciones
1. Abre la pestaña **Timeline**.
2. `+ Nueva interacción`. Indica tipo (llamada, email, visita), resultado y próxima acción.
3. Guarda. La interacción queda disponible para ti y tu coordinador.

### Actualizar estado
Selecciona un cliente, haz clic en **Editar** y ajusta:
- Estado (Prospecto, En negociación, Cliente, Inactivo).
- Presupuesto, interés principal, canal de origen.
- Datos de contacto.

---

## 📅 Agenda y recordatorios

### Vista general
`Agenda` muestra tus actividades en modo calendario o lista. Filtros rápidos: pendientes hoy, próximos 7 días, vencidos.

### Crear un evento
1. `Agenda → + Nuevo Evento`.
2. Completa título, tipo, fecha/hora, cliente y descripción.
3. Guarda. Puedes adjuntar un lote o proyecto si la reunión trata de uno específico.

### Recordatorios rápidos
Si solo necesitas recordar una llamada, usa `+ Recordatorio`. Recibirás una notificación en la hora fijada.

### Seguimiento
- Marca eventos como **Completados** cuando finalicen.
- Usa **Reprogramar** para mover una actividad sin perder el historial.
- Convierte eventos relevantes en interacciones desde el timeline del cliente.

---

## 🏢 Proyectos, lotes y reservas

### Consultar proyectos
1. `Proyectos` lista todos los desarrollos.
2. Al ingresar verás ubicación, tipo, descripción, galería y tabs: Lotes, Mapeo, Documentos.

### Buscar lotes disponibles
Dentro del proyecto o en `Propiedades` filtra por:
- Estado: disponible, reservado, vendido.
- Superficie, precio, manzana o código.
- Etiquetas específicas (ej. etapa, tipo de unidad).

### Detalle del lote
Incluye superficie, precio, estado, fotos, planos y ubicación en el mapa. Desde aquí puedes:
- Guardarlo como favorito para un cliente.
- Generar proforma.
- Iniciar una reserva (si tienes permisos).

### Proformas
1. Desde el cliente (`Proformas → + Nueva`).
2. Selecciona lote, condiciones de pago y observaciones.
3. Genera el PDF y descárgalo para compartirlo. Se almacena en el historial del cliente.

### Reservas y ventas
1. Desde el lote disponible presiona **Reservar**.
2. Completa cliente, monto, fecha límite y notas.
3. El estado del lote cambia a reservado y el sistema envía notificaciones.
4. Para cancelar o convertir en venta, ingresa a la reserva y selecciona la acción correspondiente.

> Mantén actualizadas las reservas para liberar lotes vencidos y evitar conflictos.

---

## 💬 AmersurChat – Extensión de WhatsApp

AmersurChat es una extensión para Chrome que añade un panel de CRM directamente en WhatsApp Web. Permite registrar leads y actualizar clientes sin salir de la conversación.

### Instalación
1. Menú lateral → `AmersurChat`.
2. Descarga el archivo `AmersurChat.zip` y descomprímelo.
3. Abre Chrome → `chrome://extensions` → activa **Modo desarrollador**.
4. Haz clic en **Cargar descomprimida** y selecciona la carpeta extraída.
5. La extensión aparecerá en tu barra de herramientas.

### Cómo usarla
1. Abre **WhatsApp Web** en Chrome (`web.whatsapp.com`).
2. Al abrir cualquier chat, el panel de AmersurChat aparece a la derecha.
3. Selecciona el **origen del lead** (Facebook, TikTok, Referido, etc.).
4. Elige el **proyecto de interés** del contacto.
5. Haz clic en **Registrar Lead** para guardarlo en el CRM al instante.

### Funciones disponibles
- Captura automática del nombre y número del contacto.
- Selector de origen: Facebook, TikTok, Redes Sociales, Referido, Orgánico, otros.
- Asignación de propiedad de interés al crear el lead.
- Visualización de información del cliente si ya existe en el CRM.
- Actualización de estado del cliente sin cambiar de pestaña.
- Plantillas de mensajes predefinidos para respuestas rápidas.

> **Versión actual:** v1.1.6 (actualizado enero 2026)

---

## 📄 Documentos

La sección Documentos conecta el CRM con tu Google Drive corporativo.

- Visualiza y descarga archivos sincronizados desde Drive.
- Los documentos se organizan por tipo: contratos, planos, fichas técnicas, etc.
- El administrador configura la carpeta de Drive desde `Configuración → Integraciones`.
- Revisa el estado de sincronización: si aparece "Desconectado", contacta al administrador.

---

## 🔁 Proceso comercial sugerido

| Paso | Acción | Resultado |
| --- | --- | --- |
| 1 | Registrar cliente y canal de origen (o capturar con AmersurChat) | Cartera actualizada |
| 2 | Registrar la primera interacción | Timeline activo |
| 3 | Programar seguimiento en Agenda | Recordatorio automático |
| 4 | Consultar proyectos y lotes | Oferta personalizada |
| 5 | Generar proforma | Cotización formal |
| 6 | Reservar y dar seguimiento | Bloqueo temporal del lote |
| 7 | Registrar venta / liberar lote | Control de inventario |

Complementa cada paso con notas claras en el CRM para que tu coordinador pueda ayudarte si lo requieres.

---

## 🔔 Notificaciones

- **Tipos:** nuevos clientes asignados, recordatorios, reservas/ventas, actualizaciones de tareas, respuestas desde WhatsApp.
- **Dónde verlas:** campana del header; clic para desplegar y marcar como leídas.
- **Notificaciones push:** al ingresar, permite las notificaciones del navegador para recibir alertas aunque el CRM esté en segundo plano.
- **Frecuencia de actualización:** el sistema revisa novedades cada 15 segundos.

> El panel también muestra notificaciones críticas (reservas por vencer, eventos atrasados). Revísalo al iniciar y cerrar tu jornada.

---

## 👤 Mi perfil y métricas

### Perfil
- `Avatar → Mi Perfil`: edita foto, teléfono y datos básicos.
- Cambia contraseña desde `Avatar → Cambiar contraseña`.

### Métricas personales
En `Mis Reportes` (menú lateral) verás:
- Ventas del mes y metas.
- Conversión de clientes (prospectos vs ventas).
- Reservas activas y por vencer.

Revisa estos indicadores semanalmente para detectar oportunidades.

---

## ❓ Preguntas frecuentes

**¿Cómo sé si un lote puede reservarse?**
El estado aparece en color: 🟢 disponible, 🟡 reservado, 🔴 vendido. Solo los lotes en verde aceptan nuevas reservas.

**¿Puedo ver clientes de otros vendedores?**
No. Cada vendedor ve únicamente su cartera asignada. Si necesitas colaborar, pide a tu coordinador que comparta el cliente.

**¿Se puede editar una proforma?**
Si aún no fue enviada o aprobada, puedes editarla; de lo contrario crea una nueva versión para mantener historial.

**¿No me llegan notificaciones?**
Revisa que el navegador tenga permisos habilitados. En Chrome: candado junto a la URL → Notificaciones → Permitir.

**¿Puedo trabajar desde el celular?**
Sí. El CRM es responsive: ingresa desde el navegador móvil y tendrás las mismas funciones principales. AmersurChat solo funciona en Chrome de escritorio.

**¿Qué hago si un cliente pide cancelar?**
Cancela la reserva desde el módulo correspondiente y registra el motivo. Esto libera el lote y deja trazabilidad.

**¿Cómo importo clientes masivamente?**
Ve a `Clientes → Importar`, descarga la plantilla CSV, rellénala y súbela. El sistema detecta duplicados por DNI automáticamente.

---

## 📞 Soporte y recursos

| Tipo de ayuda | Contacto |
| --- | --- |
| Soporte técnico | soporteamersur@gmail.com |
| Dudas comerciales | Tu coordinador / equipo de ventas |
| Reportar bug | `Avatar → Reportar problema` (adjunta captura) |

---

## 📝 Notas de versión

**v1.2 – Febrero 2026**
- Añadida sección AmersurChat con instrucciones de instalación y uso.
- Documentada importación masiva de clientes (CSV/Excel).
- Añadida sección Documentos con integración Google Drive.
- Actualizado mapa de navegación con todas las secciones actuales.
- Actualizada sección de notificaciones (frecuencia de 15 segundos).
- FAQs ampliadas con nuevas preguntas sobre importación y AmersurChat.
- Eliminadas etiquetas de anclaje HTML del documento.
- Quitados horarios de soporte.

**v1.1 – Noviembre 2025**
- Añadido checklist de proceso comercial.
- Documentadas reservas y proformas con mayor detalle.
- Sección de soporte y FAQs alineada con la guía rápida.

**v1.0 – Noviembre 2025**
- Lanzamiento inicial del CRM con clientes, agenda, proformas y reservas.

---

**¡Éxitos en tus ventas!** Mantén el CRM actualizado y tendrás siempre la información que necesitas para cerrar más oportunidades.
