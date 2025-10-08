# 📅 Aplicar Migración de Agenda y Recordatorios

## 🚀 Instrucciones para Aplicar la Migración

### 1. **Conectar a Supabase Dashboard**
1. Ve a [supabase.com](https://supabase.com)
2. Inicia sesión con tu cuenta
3. Selecciona tu proyecto AMERSUR CRM

### 2. **Aplicar la Migración**
1. Ve a **SQL Editor** en el panel lateral
2. Copia y pega el contenido del archivo `supabase/migrations/20250115000001_agenda_recordatorios.sql`
3. Haz clic en **Run** para ejecutar la migración

### 3. **Verificar la Migración**
Después de ejecutar la migración, deberías ver estas nuevas tablas:
- `crm.evento` - Para eventos y citas
- `crm.recordatorio` - Para recordatorios
- `crm.plantilla_recordatorio` - Para plantillas de recordatorios

## 🎯 **Funcionalidades Implementadas**

### **📅 Sistema de Agenda Completo**
- **Calendario Visual**: Vista mensual con eventos coloridos
- **Tipos de Eventos**: Cita, Llamada, Email, Visita, Seguimiento, Recordatorio, Tarea
- **Prioridades**: Baja, Media, Alta, Urgente
- **Colores Personalizables**: 10 colores diferentes para categorizar eventos

### **⏰ Sistema de Recordatorios**
- **Recordatorios Automáticos**: Se crean automáticamente al crear eventos
- **Tipos Específicos**: Seguimiento cliente, Llamada prospecto, Envío documentos, etc.
- **Notificaciones**: Email y push notifications
- **Estado de Seguimiento**: Pendiente, Completado, Leído

### **📊 Estadísticas y Reportes**
- **Métricas en Tiempo Real**: Eventos hoy, esta semana, pendientes
- **Distribución por Tipo**: Gráficos de eventos por categoría
- **Distribución por Prioridad**: Análisis de urgencia
- **Rendimiento Mensual**: Tasa de completado, eventos realizados

### **🔗 Integración con CRM**
- **Clientes Asignados**: Solo vendedores ven sus clientes
- **Propiedades Disponibles**: Enlace con catálogo de propiedades
- **Eventos Relacionados**: Conectar recordatorios con eventos específicos

### **👥 Control de Acceso por Roles**
- **Vendedores**: Solo ven sus propios eventos y recordatorios
- **Administradores**: Acceso completo a todo el sistema
- **RLS (Row Level Security)**: Seguridad a nivel de fila implementada

## 🎨 **Interfaz de Usuario**

### **Vista de Calendario**
- Navegación mensual con flechas
- Eventos mostrados por día con colores
- Botón flotante para crear eventos rápidamente
- Leyenda de tipos de eventos

### **Lista de Recordatorios**
- Filtros: Todos, Pendientes, Completados
- Acciones rápidas: Marcar completado, Editar, Eliminar
- Indicadores visuales de prioridad y estado
- Información de cliente y propiedad relacionada

### **Estadísticas Visuales**
- Tarjetas de métricas principales
- Gráficos de barras para distribución
- Indicadores de rendimiento
- Resumen de actividad mensual

## 🛠️ **Tecnologías Utilizadas**

- **Base de Datos**: PostgreSQL con Supabase
- **Frontend**: Next.js 15, React, TypeScript
- **Styling**: Tailwind CSS con tema CRM personalizado
- **Icons**: Heroicons
- **Notificaciones**: react-hot-toast
- **Validación**: Zod schemas

## 📱 **Responsive Design**

- **Mobile First**: Optimizado para dispositivos móviles
- **Desktop**: Vista completa con sidebar y calendario expandido
- **Tablet**: Adaptación automática del layout

## 🔧 **Configuración Adicional**

### **Variables de Entorno Requeridas**
```env
NEXT_PUBLIC_SUPABASE_URL=tu_url_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
```

### **Permisos de RLS**
La migración incluye todas las políticas de seguridad necesarias:
- Vendedores solo ven sus propios datos
- Administradores tienen acceso completo
- Plantillas son públicas para todos los usuarios

## ✅ **Próximos Pasos**

1. **Aplicar la migración** siguiendo las instrucciones arriba
2. **Probar la funcionalidad** creando eventos y recordatorios
3. **Configurar notificaciones** si es necesario
4. **Personalizar plantillas** según las necesidades del negocio

## 🎉 **¡Listo para Usar!**

Una vez aplicada la migración, la agenda estará disponible en:
- **URL**: `/dashboard/agenda`
- **Acceso**: Vendedores y Administradores
- **Funcionalidades**: Calendario, Recordatorios, Estadísticas

¡El sistema de agenda y recordatorios está completamente integrado con el CRM!
