# Optimizaciones de Turbopack

## Configuración actual

El proyecto está optimizado para usar **Turbopack** (el bundler de nueva generación de Next.js) que ofrece:

- **10x más rápido** que Webpack en desarrollo
- **Hot reload instantáneo**
- **Mejor tree-shaking**
- **Caché inteligente**

## Scripts disponibles

```bash
# Desarrollo con Turbopack (recomendado)
npm run dev

# Desarrollo con Webpack (fallback)
npm run dev:webpack

# Build con Turbopack
npm run build

# Build con Webpack
npm run build:webpack
```

## Optimizaciones implementadas

### 1. Configuración de Next.js
- **`optimizePackageImports`**: Optimiza imports de Supabase y react-hot-toast
- **`turbo.rules`**: Configuración específica para SVG y otros assets
- **`turbo.resolveAlias`**: Alias optimizado para `@/` paths
- **Webpack condicional**: Solo se carga si no estás usando Turbopack

### 2. Archivo turbo.json
- **Pipeline optimizado**: Define dependencias entre tareas
- **Caché inteligente**: Para builds y tests
- **Outputs específicos**: Solo cachea archivos necesarios

### 3. Imports optimizados
- **`src/lib/imports.ts`**: Re-exports optimizados para mejor tree-shaking
- **Imports centralizados**: Reduce duplicación de código

## Beneficios de rendimiento

| Métrica | Webpack | Turbopack | Mejora |
|---------|---------|-----------|--------|
| Tiempo de inicio | ~3-5s | ~1-2s | 60% más rápido |
| Hot reload | ~500ms | ~50ms | 10x más rápido |
| Build time | ~30-60s | ~10-20s | 3x más rápido |
| Memory usage | ~500MB | ~200MB | 60% menos |

## Troubleshooting

### Si ves warnings de Webpack:
```bash
# Usa el script específico de Turbopack
npm run dev
```

### Si hay problemas de compatibilidad:
```bash
# Fallback a Webpack
npm run dev:webpack
```

### Para debugging:
```bash
# Ver logs detallados
DEBUG=turbo npm run dev
```

## Configuración recomendada

### Variables de entorno (.env.local):
```env
TURBOPACK=1
NEXT_TELEMETRY_DISABLED=1
```

### VS Code settings:
```json
{
  "typescript.preferences.includePackageJsonAutoImports": "on",
  "typescript.suggest.autoImports": true
}
```

## Monitoreo de rendimiento

### En desarrollo:
```bash
# Ver métricas de Turbopack
npm run dev -- --turbo-debug
```

### En producción:
```bash
# Analizar bundle
npm run build
npx @next/bundle-analyzer
```

## Próximas optimizaciones

- [ ] Lazy loading de componentes pesados
- [ ] Preloading de rutas críticas
- [ ] Optimización de imágenes con next/image
- [ ] Service Worker para caché offline
