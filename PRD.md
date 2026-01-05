# Product Requirements Document (PRD)
# Amersur CRM - Sistema de Gestión Inmobiliaria

**Versión:** 1.0
**Fecha:** 19 de Diciembre, 2025
**Autor:** Equipo de Desarrollo Amersur
**Estado:** En Producción

---

## 1. Resumen Ejecutivo

### 1.1 Visión del Producto
Amersur CRM es una plataforma integral de gestión de relaciones con clientes (CRM) diseñada específicamente para el sector inmobiliario peruano. El sistema permite gestionar el ciclo completo de ventas, desde la captación de leads hasta el cierre de ventas y seguimiento de pagos.

### 1.2 Objetivos del Producto
- Centralizar la gestión de clientes y leads en una única plataforma
- Automatizar el proceso de ventas inmobiliarias
- Integrar canales de comunicación (WhatsApp, SMS, Email)
- Proporcionar visibilidad en tiempo real del inventario de propiedades
- Generar reportes y métricas para la toma de decisiones

### 1.3 Público Objetivo
| Rol | Descripción |
|-----|-------------|
| Administradores | Gestión completa del sistema, usuarios y configuración |
| Coordinadores de Ventas | Supervisión de equipos y validación de operaciones |
| Vendedores | Gestión de clientes asignados y cierre de ventas |
| Gerentes | Visualización de reportes y métricas de rendimiento |

---

## 2. Stack Tecnológico

### 2.1 Frontend
| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| Next.js | 15.5.9 | Framework de React con SSR |
| React | 19.1.0 | Biblioteca de UI |
| TypeScript | 5.x | Tipado estático |
| Tailwind CSS | 3.4.17 | Framework de estilos |
| Radix UI / Headless UI | - | Componentes accesibles |
| Recharts | 3.2.1 | Visualización de datos |
| React Hook Form + Zod | - | Formularios y validación |

### 2.2 Backend
| Tecnología | Propósito |
|------------|-----------|
| Supabase | BaaS (PostgreSQL + Auth + Realtime + Storage) |
| Next.js API Routes | 77 endpoints REST |
| Row Level Security (RLS) | Seguridad a nivel de fila |

### 2.3 Integraciones Externas
| Servicio | Propósito |
|----------|-----------|
| WhatsApp Cloud API (Meta) | Campañas masivas de mensajería |
| Twilio | WhatsApp + SMS alternativo |
| whatsapp-web.js | Bot autónomo de WhatsApp |
| Facebook Lead Ads | Captura automática de leads |
| Google Maps API | Geolocalización de propiedades |
| Google Drive API | Almacenamiento de documentos |
| Web Push API | Notificaciones push |

---

## 3. Módulos Funcionales

### 3.1 Gestión de Clientes (CRM Core)

#### 3.1.1 Descripción
Sistema central para la gestión del ciclo de vida completo del cliente, desde lead hasta comprador.

#### 3.1.2 Funcionalidades
- **CRUD de Clientes**: Crear, leer, actualizar y eliminar registros
- **Estados de Cliente**: `por_contactar`, `contactado`, `intermedio`, `potencial`, `transferido`, `desestimado`
- **Información del Cliente**:
  - Datos personales (nombre, email, teléfono, DNI)
  - Tipo: Persona natural o empresa
  - Capacidad de compra estimada
  - Preferencias de pago
  - Origen del lead (web, referido, Facebook, etc.)
- **Búsqueda Avanzada**: Filtros múltiples con búsqueda en tiempo real
- **Importación Masiva**: Carga de clientes vía CSV con validación
- **Timeline de Cliente**: Historial visual de todas las interacciones
- **Campos Personalizados**: Configurables por organización

#### 3.1.3 Criterios de Aceptación
- [ ] Usuario puede crear cliente con datos mínimos (nombre, teléfono)
- [ ] Sistema valida DNI/RUC único
- [ ] Búsqueda devuelve resultados en menos de 500ms
- [ ] Importación CSV soporta hasta 10,000 registros
- [ ] Timeline muestra cronología ordenada de eventos

---

### 3.2 Gestión de Proyectos y Lotes

#### 3.2.1 Descripción
Administración de proyectos inmobiliarios y su inventario de lotes/propiedades.

#### 3.2.2 Funcionalidades
- **Proyectos Inmobiliarios**:
  - Estados: `activo`, `pausado`, `cerrado`
  - Galería de imágenes y planos
  - Ubicación con coordenadas GPS
  - Integración con Google Maps
- **Gestión de Lotes**:
  - Estados: `disponible`, `reservado`, `vendido`
  - Código único por proyecto
  - Superficie (m²) y precio
  - Datos personalizables en JSON
- **Mapeo Geoespacial**:
  - Visualización en mapa interactivo
  - Ubigeo (Departamento/Provincia/Distrito)
  - Capas overlay personalizadas

#### 3.2.3 Criterios de Aceptación
- [ ] Mapa carga en menos de 2 segundos
- [ ] Estados de lote se actualizan en tiempo real
- [ ] Importación masiva de lotes funcional
- [ ] Galería soporta hasta 20 imágenes por proyecto

---

### 3.3 Sistema de Agenda y Recordatorios

#### 3.3.1 Descripción
Calendario integrado para gestión de eventos, citas y recordatorios automáticos.

#### 3.3.2 Funcionalidades
- **Tipos de Eventos**: Citas, llamadas, emails, visitas, reuniones
- **Estados**: Pendiente, en progreso, vencida, completado, cancelado
- **Prioridades**: Baja, media, alta, urgente
- **Recordatorios Automáticos**:
  - Push notifications
  - Notificaciones in-app
  - Configuración de anticipación
- **Plantillas de Recordatorios**: Reutilizables para eventos comunes

#### 3.3.3 Criterios de Aceptación
- [ ] Notificación push se envía según configuración
- [ ] Eventos vencidos se marcan automáticamente
- [ ] Calendario sincroniza en tiempo real

---

### 3.4 Flujo de Ventas

#### 3.4.1 Descripción
Gestión completa del embudo de ventas: interacciones → reservas → ventas → pagos.

#### 3.4.2 Funcionalidades
- **Interacciones de Cliente**:
  - Tipos: Llamada, WhatsApp, Email, Visita, Reunión
  - Registro de resultado y notas
  - Próxima acción programada
  - Duración de interacción
- **Propiedades de Interés**:
  - Wishlist de lotes por cliente
  - Priorización (1-3)
- **Visitas a Propiedades**:
  - Registro con feedback
  - Nivel de interés (1-5)
- **Reservas**:
  - Código único generado
  - Monto y moneda configurable
  - Fecha de vencimiento
  - Estados: `activa`, `vencida`, `cancelada`, `convertida_venta`
- **Ventas**:
  - Vinculación con reserva
  - Precio total y forma de pago
  - Número de cuotas
  - Comisión del vendedor
  - Estado del contrato
- **Pagos**:
  - Registro individual por cuota
  - Métodos: Efectivo, Transferencia, Tarjeta, Cheque
  - Comprobante adjunto
  - Estado de pago

#### 3.4.3 Criterios de Aceptación
- [ ] Reserva bloquea lote automáticamente
- [ ] Venta convierte reserva y actualiza estado de lote
- [ ] Comisión se calcula automáticamente
- [ ] Pagos actualizan saldo pendiente en tiempo real

---

### 3.5 Sistema de Marketing

#### 3.5.1 Descripción
Plataforma de marketing multicanal para comunicación masiva con clientes y leads.

#### 3.5.2 Funcionalidades
- **Canales Soportados**:
  - WhatsApp Cloud API (Meta)
  - Twilio (WhatsApp + SMS)
  - WhatsApp Web Bot
  - Facebook Lead Ads (captura)
- **Plantillas de Mensajes**:
  - Variables dinámicas
  - Botones interactivos
  - Estado de aprobación (Meta)
  - Versionamiento
- **Campañas**:
  - Audiencias dinámicas con filtros
  - A/B Testing integrado
  - Scheduling automático
  - Rate limiting configurable
  - Métricas de rendimiento
- **Conversaciones**:
  - Bandeja de entrada unificada
  - Historial de chat
  - Asignación a vendedor
- **Automatizaciones**:
  - Triggers por eventos
  - Acciones encadenadas
  - Respuestas automáticas

#### 3.5.3 Criterios de Aceptación
- [ ] Plantillas se sincronizan con Meta
- [ ] Campaña respeta rate limits configurados
- [ ] Métricas de entrega se actualizan via webhook
- [ ] Bot responde en menos de 5 segundos

---

### 3.6 Sistema de Permisos y Roles

#### 3.6.1 Descripción
Control de acceso granular basado en roles con Row Level Security.

#### 3.6.2 Roles Base
| Rol | Descripción | Permisos Clave |
|-----|-------------|----------------|
| ROL_ADMIN | Acceso total | ~150 permisos completos |
| ROL_COORDINADOR_VENTAS | Coordinación de equipo | Ver todos, validar operaciones |
| ROL_VENDEDOR | Gestión de asignados | CRUD clientes asignados, crear reservas |
| ROL_GERENTE | Supervisión | Reportes, metas, validaciones |

#### 3.6.3 Módulos de Permisos (~30)
- Clientes, Proyectos, Lotes, Precios, Inventario
- Reservas, Ventas, Pagos, Descuentos, Cuotas, Mora
- Comisiones, Campañas, Plantillas, WhatsApp, Automatizaciones
- Dashboard, KPIs, Usuarios, Roles, Metas, Reportes
- Documentos, Carpetas, Eventos, Configuración

#### 3.6.4 Criterios de Aceptación
- [ ] RLS bloquea acceso a datos no autorizados
- [ ] UI oculta opciones sin permiso
- [ ] Cambios de rol se aplican inmediatamente

---

### 3.7 Reportes y Analytics

#### 3.7.1 Descripción
Dashboard y reportes para análisis de rendimiento y toma de decisiones.

#### 3.7.2 Funcionalidades
- **Dashboard Principal**:
  - KPIs en tiempo real
  - Métricas por vendedor
  - Estado de clientes (funnel)
  - Actividad reciente
- **Reportes por Módulo**:
  - Clientes: Por estado, origen, vendedor, fecha
  - Ventas: Ingresos, comisiones, rentabilidad
  - Marketing: Tasa de entrega, respuesta, conversión
  - Rendimiento: Metas vs. logros
- **Exportación**:
  - PDF con formato profesional
  - Excel con datos completos
- **Gráficos Interactivos**:
  - Barras, líneas, áreas, pie charts
  - Filtros dinámicos

#### 3.7.3 Criterios de Aceptación
- [ ] Dashboard carga en menos de 3 segundos
- [ ] Reportes soportan rangos de fecha personalizados
- [ ] Exportación PDF genera documento profesional

---

### 3.8 Gestión de Usuarios

#### 3.8.1 Descripción
Administración de usuarios del sistema y sus perfiles.

#### 3.8.2 Funcionalidades
- **Gestión de Usuarios**:
  - Crear, editar, desactivar usuarios
  - Asignación de roles y permisos
  - Avatar y perfil personalizado
  - Estados: activo/inactivo
- **Configuración del Sistema**:
  - Parámetros globales (empresa, moneda, zona horaria)
  - Comisiones por tipo de propiedad
  - Preferencias de notificación
  - Campos personalizados
- **Auditoría**:
  - Login audit
  - Cambios de datos críticos
  - Historial de acciones

#### 3.8.3 Criterios de Aceptación
- [ ] Usuario desactivado no puede iniciar sesión
- [ ] Auditoría registra cambios de permisos
- [ ] Configuración se aplica globalmente

---

### 3.9 Notificaciones

#### 3.9.1 Descripción
Sistema multicanal de notificaciones para mantener a usuarios informados.

#### 3.9.2 Canales
- Push notifications (Web Push API)
- Notificaciones in-app
- Email (cuando está configurado)

#### 3.9.3 Tipos de Notificaciones
- Lead asignado
- Eventos próximos / vencidos
- Recordatorios
- Ventas registradas
- Reservas (nuevas, vencidas)
- Cambios de estado
- Mensajes de WhatsApp

#### 3.9.4 Criterios de Aceptación
- [ ] Push notification llega en menos de 10 segundos
- [ ] Usuario puede configurar preferencias
- [ ] Notificaciones se marcan como leídas

---

### 3.10 Chrome Extension (AmersurChat)

#### 3.10.1 Descripción
Extensión de Chrome para integración con WhatsApp Web.

#### 3.10.2 Funcionalidades
- Ver información de clientes mientras chatea
- Crear leads rápidamente desde conversación
- Registrar interacciones automáticamente
- Enviar templates de mensajes
- Sincronización en tiempo real con CRM

#### 3.10.3 Criterios de Aceptación
- [ ] Extensión detecta número de teléfono en WhatsApp Web
- [ ] Búsqueda de cliente por teléfono funcional
- [ ] Creación de lead desde sidebar

---

### 3.11 WhatsApp Bot (Standalone)

#### 3.11.1 Descripción
Bot autónomo basado en whatsapp-web.js para captura automática de leads.

#### 3.11.2 Funcionalidades
- Autenticación vía QR code
- Captura automática de leads entrantes
- Respuestas automáticas configurables
- Sincronización con CRM vía webhook
- Estado de conexión en tiempo real

#### 3.11.3 Criterios de Aceptación
- [ ] QR se genera correctamente
- [ ] Mensajes entrantes se capturan
- [ ] Lead se crea en CRM automáticamente

---

## 4. Requisitos No Funcionales

### 4.1 Rendimiento
| Métrica | Objetivo |
|---------|----------|
| Tiempo de carga inicial | < 3 segundos |
| Tiempo de respuesta API | < 500ms (p95) |
| Tiempo de búsqueda | < 500ms |
| Concurrent users | 100+ simultáneos |

### 4.2 Disponibilidad
- Uptime objetivo: 99.5%
- Deployment: Vercel con CI/CD automático
- Database: Supabase con backups diarios

### 4.3 Seguridad
| Aspecto | Implementación |
|---------|----------------|
| Autenticación | Supabase Auth (email/password) |
| Autorización | RLS + permisos granulares |
| Datos en tránsito | HTTPS obligatorio |
| Datos en reposo | Encriptación Supabase |
| Validación | Zod en cliente y servidor |
| Auditoría | Login audit + cambios críticos |

### 4.4 Escalabilidad
- Arquitectura stateless
- Database connection pooling
- Server-side caching
- Image optimization
- Code splitting automático

### 4.5 Usabilidad
- Diseño responsive (mobile-first)
- Accesibilidad WCAG 2.1 AA
- Skeleton loaders para UX
- Mensajes de error claros
- Documentación de usuario

---

## 5. Estructura de Base de Datos

### 5.1 Schema Principal: `crm`

#### Tablas Core
| Tabla | Descripción |
|-------|-------------|
| `usuario_perfil` | Perfiles de usuario con rol y configuración |
| `rol` | Definición de roles con permisos JSON |
| `cliente` | Clientes/leads con datos completos |
| `cliente_interaccion` | Historial de interacciones |
| `cliente_propiedad_interes` | Wishlist de propiedades |
| `visita_propiedad` | Registro de visitas físicas |

#### Tablas de Ventas
| Tabla | Descripción |
|-------|-------------|
| `proyecto` | Proyectos inmobiliarios |
| `lote` | Lotes/terrenos de proyectos |
| `propiedad` | Propiedades completas |
| `reserva` | Reservas de lotes |
| `venta` | Ventas cerradas |
| `pago` | Pagos registrados |

#### Tablas de Marketing
| Tabla | Descripción |
|-------|-------------|
| `marketing_channel_credential` | Credenciales de canales |
| `marketing_template` | Plantillas de mensajes |
| `marketing_campana` | Campañas de marketing |
| `marketing_audiencia` | Audiencias segmentadas |
| `marketing_conversacion` | Conversaciones de chat |
| `marketing_mensaje` | Mensajes individuales |
| `marketing_automatizacion` | Reglas de automatización |

#### Tablas Auxiliares
| Tabla | Descripción |
|-------|-------------|
| `agenda_evento` | Eventos de calendario |
| `recordatorio` | Recordatorios con metadata |
| `notificacion` | Notificaciones in-app |
| `push_subscription` | Suscripciones Web Push |
| `configuracion_sistema` | Parámetros globales |
| `ubigeo` | Ubicaciones geográficas Perú |
| `login_audit` | Auditoría de logins |

### 5.2 Enums
- `estado_proyecto`: activo, pausado, cerrado
- `estado_lote`: disponible, reservado, vendido
- `estado_cliente`: por_contactar, contactado, intermedio, potencial, desestimado, transferido

---

## 6. API Endpoints

### 6.1 Resumen
- **Total de Endpoints**: 77
- **Arquitectura**: REST con Next.js API Routes
- **Autenticación**: Bearer token (Supabase Auth)

### 6.2 Endpoints por Módulo
| Módulo | Endpoints | Ejemplos |
|--------|-----------|----------|
| Clientes | 10 | CRUD, búsqueda, importación |
| Proyectos | 6 | CRUD, galería, estadísticas |
| Lotes | 8 | CRUD, estado, importación |
| Reservas | 6 | CRUD, validación, conversión |
| Ventas | 5 | CRUD, comisiones |
| Pagos | 5 | CRUD, comprobantes |
| Marketing | 12 | Campañas, plantillas, audiencias |
| WhatsApp | 8 | Envío, webhooks, bot |
| Agenda | 5 | Eventos, recordatorios |
| Admin | 8 | Usuarios, roles, config |
| Notificaciones | 4 | CRUD, push |

---

## 7. Testing Strategy

### 7.1 Tipos de Tests
| Tipo | Framework | Cobertura |
|------|-----------|-----------|
| Unit Tests | Jest | Lógica de negocio |
| Component Tests | React Testing Library | Componentes UI |
| E2E Tests | Playwright | Flujos completos |
| Smoke Tests | Jest | Sanity checks |

### 7.2 Criterios de Calidad
- Cobertura de código objetivo: 70%
- Tests E2E para flujos críticos
- CI/CD ejecuta tests en cada PR

---

## 8. Documentación

### 8.1 Documentos Disponibles
| Documento | Descripción |
|-----------|-------------|
| GUIA_INICIO_RAPIDO.md | Onboarding de desarrolladores |
| API.md | Documentación de endpoints |
| COMPONENTS.md | Catálogo de componentes |
| MANUAL_VENDEDOR.md | Guía para vendedores |
| INTEGRACION_TWILIO.md | Configuración Twilio |
| INTEGRACION_FACEBOOK_MARKETING.md | Setup Facebook Ads |

---

## 9. Roadmap Futuro

### 9.1 Funcionalidades Planeadas
- [ ] App móvil nativa (React Native)
- [ ] Integración con pasarelas de pago
- [ ] BI avanzado con dashboards personalizables
- [ ] Firma electrónica de contratos
- [ ] Integración con sistemas contables
- [ ] Machine Learning para scoring de leads

### 9.2 Mejoras Técnicas
- [ ] Migración a microservicios (si escala)
- [ ] Cache distribuido (Redis)
- [ ] CDN para assets estáticos
- [ ] Optimización de queries pesadas
- [ ] Monitoring avanzado (Sentry, DataDog)

---

## 10. Glosario

| Término | Definición |
|---------|------------|
| Lead | Cliente potencial aún no calificado |
| Cliente | Lead calificado en proceso de venta |
| Lote | Terreno individual dentro de un proyecto |
| Propiedad | Inmueble completo (casa, departamento) |
| Reserva | Apartado temporal de un lote con seña |
| RLS | Row Level Security - Seguridad a nivel de fila en PostgreSQL |
| Ubigeo | Código de ubicación geográfica del Perú |

---

## 11. Apéndices

### A. Variables de Entorno Requeridas
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Google
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
GOOGLE_DRIVE_CLIENT_ID=
GOOGLE_DRIVE_CLIENT_SECRET=

# WhatsApp/Meta
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=

# Twilio
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_NUMBER=

# Push Notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
```

### B. Estructura de Carpetas Principal
```
amersurcrm/
├── src/
│   ├── app/           # Next.js App Router (pages + API)
│   ├── components/    # 122 componentes React
│   ├── hooks/         # 12 custom hooks
│   ├── lib/           # 30+ utilidades y servicios
│   └── types/         # 13 archivos de tipos
├── supabase/
│   └── migrations/    # 150+ migraciones SQL
├── chrome-extension/  # Extensión Chrome
├── whatsapp-bot/      # Bot autónomo
├── docs/              # 25+ documentos
└── tests/             # Tests E2E
```

---

**Documento generado para Amersur CRM v1.0**
