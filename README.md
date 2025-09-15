# AMERSUR CRM

Sistema de gestión de clientes y proyectos inmobiliarios para el mercado peruano, construido con Next.js 15, TypeScript y Supabase.

**Ubicación**: Huaral,Lima, Perú  
**Moneda**: Soles Peruanos (PEN)

## 🚀 Características

- **Gestión de Clientes**: CRUD completo con búsqueda y paginación
- **Gestión de Proyectos**: Organización de proyectos inmobiliarios
- **Gestión de Lotes**: Control de lotes con estados (disponible, reservado, vendido)
- **Autenticación**: Sistema de login seguro con Supabase Auth
- **UI Moderna**: Interfaz responsive con Tailwind CSS
- **Tema Oscuro/Claro**: Soporte para ambos modos
- **Optimización**: React.memo, useMemo, paginación y lazy loading
- **Testing**: Jest, React Testing Library y Playwright E2E
- **Manejo de Errores**: Error Boundaries y logging centralizado

## 🛠️ Tecnologías

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + RLS)
- **Testing**: Jest, React Testing Library, Playwright
- **Deployment**: Vercel (recomendado)

## 📋 Prerrequisitos

- Node.js 18+ 
- npm o yarn
- Cuenta de Supabase

## ⚙️ Instalación

1. **Clonar el repositorio**
```bash
git clone <repository-url>
cd amersurcrm
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**
```bash
cp .env.example .env.local
```

Editar `.env.local` con tus credenciales de Supabase:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. **Configurar base de datos**
```bash
# Ejecutar migraciones en Supabase Studio
# 1. Ir a SQL Editor en Supabase
# 2. Ejecutar: supabase/migrations/2025-09-14_000_base_schema.sql
# 3. Ejecutar: supabase/migrations/2025-09-14_010_lote_estado_guard_rpc.sql
# 4. Ejecutar: supabase/seeds/dev_seed.sql (editar email primero)
```

5. **Ejecutar en desarrollo**
```bash
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000)

## 🧪 Testing

### Unit Tests
```bash
# Ejecutar todos los tests
npm test

# Modo watch
npm run test:watch

# Con coverage
npm run test:coverage
```

### E2E Tests
```bash
# Instalar dependencias del sistema (Linux)
sudo npx playwright install-deps

# Ejecutar E2E tests
npm run test:e2e
```

## 📁 Estructura del Proyecto

```
src/
├── app/                    # App Router de Next.js
│   ├── auth/              # Páginas de autenticación
│   ├── dashboard/         # Panel principal
│   │   ├── clientes/      # Gestión de clientes
│   │   └── proyectos/     # Gestión de proyectos y lotes
│   └── layout.tsx         # Layout principal
├── components/            # Componentes reutilizables
│   ├── ui/               # Componentes base
│   └── __tests__/        # Tests de componentes
├── hooks/                # Custom hooks
├── lib/                  # Utilidades y configuración
│   ├── supabase*.ts     # Configuración de Supabase
│   ├── errors.ts        # Manejo de errores
│   └── errorLogger.ts   # Sistema de logging
└── tests/               # Tests E2E
    └── e2e/
```

## 🗄️ Base de Datos

### Esquema Principal
- **crm.cliente**: Información de clientes
- **crm.proyecto**: Proyectos inmobiliarios
- **crm.lote**: Lotes con estados y precios

### Estados de Lote
- `disponible`: Lote disponible para venta
- `reservado`: Lote reservado por cliente
- `vendido`: Lote vendido

### Seguridad
- **RLS (Row Level Security)**: Cada usuario solo ve sus datos
- **Triggers**: Actualización automática de `updated_at`
- **Validaciones**: Constraints y tipos en base de datos

## 🎨 Componentes Principales

### ErrorBoundary
Manejo de errores a nivel de aplicación con logging automático.

### Pagination
Componente de paginación reutilizable con navegación inteligente.

### ConfirmDialog
Modal de confirmación para acciones destructivas.

### usePagination
Hook personalizado para manejo de paginación con optimizaciones.

## 🔧 Scripts Disponibles

```bash
npm run dev          # Desarrollo con Turbopack
npm run build        # Build de producción
npm run start        # Servidor de producción
npm run lint         # Linting con ESLint
npm test             # Tests unitarios
npm run test:watch   # Tests en modo watch
npm run test:coverage # Tests con coverage
npm run test:e2e     # Tests E2E con Playwright
```

## 🚀 Deployment

### Vercel (Recomendado)
1. Conectar repositorio a Vercel
2. Configurar variables de entorno
3. Deploy automático en cada push

### Otras plataformas
El proyecto es compatible con cualquier plataforma que soporte Next.js:
- Netlify
- Railway
- DigitalOcean App Platform

## 🤝 Contribución

1. Fork el proyecto
2. Crear branch para feature (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

## 📝 Changelog

### v1.0.0
- ✅ Sistema de autenticación
- ✅ CRUD de clientes con búsqueda y paginación
- ✅ CRUD de proyectos y lotes
- ✅ UI responsive con tema oscuro/claro
- ✅ Optimizaciones de rendimiento
- ✅ Testing completo (unit + E2E)
- ✅ Manejo robusto de errores
- ✅ Documentación completa

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver `LICENSE` para más detalles.

## 📞 Soporte

Para soporte técnico o consultas:
- Email: soporte@amersur.com
- Issues: [GitHub Issues](link-to-issues)

---

Desarrollado con ❤️ por el equipo de AMERSUR
