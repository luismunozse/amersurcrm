# Integración con INEI - Sistema de Ubicaciones de Perú

## 🎯 Descripción

Sistema de auto-hosting para datos de ubicaciones de Perú que descarga automáticamente el XLSX oficial del INEI y lo convierte a JSON para uso en el CRM AMERSUR.

## 🚀 Características Principales

### ✅ **Auto-Hosting (Recomendado para Producción)**
- **Descarga automática** del XLSX oficial del INEI
- **Conversión automática** a JSON estructurado
- **Cache inteligente** con actualización semanal
- **Fallback robusto** a datos locales si falla la descarga
- **Sin dependencias externas** en producción

### 📊 **Fuentes de Datos**
1. **INEI Oficial** (Prioridad 1)
   - URL: `https://www.inei.gob.pe/media/MenuRecursivo/publicaciones_digitales/Est/Lib1469/cap01/01.01.01.01.xlsx`
   - Datos oficiales y actualizados
   - Formato XLSX estándar

2. **Datos Abiertos** (Fallback 1)
   - URL: `https://datosabiertos.gob.pe/dataset/ubigeo-peru`
   - Plataforma gubernamental
   - Formato JSON/CSV

3. **Repositorio GitHub** (Fallback 2)
   - URL: `https://raw.githubusercontent.com/RitchieRD/ubigeos-peru-data/main/data/ubigeos-peru.json`
   - Datos estructurados
   - Formato JSON

4. **Datos Locales** (Fallback Final)
   - Archivo: `src/lib/data/ubigeo-peru-completo.json`
   - Garantiza funcionamiento continuo
   - Datos básicos de respaldo

## 🏗️ Arquitectura del Sistema

### **Servicios Principales**

#### **1. INEIUbigeoService** (`src/lib/services/inei-ubigeo.ts`)
```typescript
class INEIUbigeoService {
  // Descarga y procesa datos del INEI
  async updateUbigeoData(): Promise<ProcessedUbigeo>
  
  // Carga datos desde cache
  async loadCachedData(): Promise<ProcessedUbigeo | null>
  
  // Verifica si necesita actualización
  shouldUpdate(): boolean
  
  // Obtiene datos (cache o actualización)
  async getUbigeoData(): Promise<ProcessedUbigeo>
}
```

#### **2. API Endpoints**
- **`GET /api/ubicaciones`** - Departamentos
- **`GET /api/ubicaciones?departamento={codigo}`** - Provincias
- **`GET /api/ubicaciones?departamento={codigo}&provincia={codigo}`** - Distritos
- **`GET /api/ubicaciones/update`** - Estadísticas del sistema
- **`POST /api/ubicaciones/update`** - Forzar actualización

#### **3. Scripts de Administración**
- **`npm run update-ubigeo`** - Actualización manual
- **`npm run ubigeo:stats`** - Ver estadísticas
- **`npm run ubigeo:force-update`** - Forzar actualización vía API

## 📁 Estructura de Archivos

```
src/
├── lib/
│   ├── services/
│   │   └── inei-ubigeo.ts          # Servicio principal del INEI
│   ├── api/
│   │   └── ubigeo-peru.ts          # API con integración INEI
│   └── data/
│       └── ubigeo-peru-completo.json # Datos locales de fallback
├── app/
│   ├── api/
│   │   └── ubicaciones/
│   │       ├── route.ts            # API principal
│   │       └── update/
│   │           └── route.ts        # API de actualización
│   └── dashboard/
│       └── admin/
│           └── ubicaciones/
│               └── page.tsx        # Panel de administración
├── scripts/
│   └── update-ubigeo.ts            # Script de actualización
└── data/
    └── ubigeo/
        └── ubigeo-inei.json        # Cache de datos del INEI
```

## 🔄 Flujo de Actualización

### **1. Verificación Automática**
```typescript
// Verifica si necesita actualización (cada 7 días)
if (shouldUpdate()) {
  await updateUbigeoData();
}
```

### **2. Descarga del INEI**
```typescript
// Descarga XLSX oficial
const xlsxBuffer = await downloadXLSX(INEI_URLS.xlsx);

// Procesa y estructura datos
const processedData = processXLSX(xlsxBuffer);

// Guarda en cache
await writeFile(cachePath, JSON.stringify(processedData));
```

### **3. Fallback Inteligente**
```typescript
try {
  // Intenta INEI
  return await downloadFromINEI();
} catch (error) {
  try {
    // Intenta fuentes alternativas
    return await downloadAlternativeData();
  } catch (altError) {
    // Usa datos locales
    return getLocalData();
  }
}
```

## 📊 Estructura de Datos

### **Formato de Entrada (XLSX del INEI)**
```csv
CODIGO,DEPARTAMENTO,PROVINCIA,DISTRITO,REGION,MACROREGION,SUPERFICIE,LATITUD,LONGITUD
150101,Lima,Lima,Lima,Lima,Centro,2672.31,-12.0464,-77.0428
150102,Lima,Lima,Ancón,Lima,Centro,299.22,-11.7667,-77.1833
```

### **Formato de Salida (JSON Estructurado)**
```json
{
  "departamentos": [
    {
      "codigo": "15",
      "nombre": "Lima",
      "provincias": [
        {
          "codigo": "1501",
          "nombre": "Lima",
          "distritos": [
            {
              "codigo": "150101",
              "nombre": "Lima"
            },
            {
              "codigo": "150102",
              "nombre": "Ancón"
            }
          ]
        }
      ]
    }
  ]
}
```

## ⚡ Rendimiento y Cache

### **Cache en Memoria**
- **Duración**: 24 horas
- **Almacenamiento**: Map en memoria del servidor
- **Beneficio**: Respuestas instantáneas

### **Cache en Disco**
- **Archivo**: `data/ubigeo/ubigeo-inei.json`
- **Duración**: 7 días (actualización automática)
- **Beneficio**: Persistencia entre reinicios

### **Optimizaciones**
- **Lazy loading** de provincias y distritos
- **Compresión** de datos JSON
- **Validación** de estructura de datos
- **Manejo de errores** robusto

## 🛠️ Configuración

### **Variables de Entorno**
```bash
# No se requieren variables adicionales
# El sistema funciona con configuración por defecto
```

### **Dependencias**
```json
{
  "xlsx": "^0.18.5",           # Procesamiento de XLSX
  "node-cron": "^4.2.1",      # Tareas programadas (futuro)
  "tsx": "^4.7.0"             # Ejecución de scripts TypeScript
}
```

## 📈 Estadísticas del Sistema

### **Datos Incluidos**
- **25 Departamentos** de Perú
- **196 Provincias** en total
- **1,874 Distritos** oficiales
- **Códigos UBIGEO** completos
- **Coordenadas geográficas** (cuando disponibles)

### **Ejemplos de Cobertura**
- **Lima**: 10 provincias, 43 distritos
- **Cusco**: 13 provincias, 108 distritos
- **Puno**: 13 provincias, 109 distritos
- **Total**: Más de 1,800 ubicaciones

## 🔧 Uso y Administración

### **Actualización Manual**
```bash
# Via script
npm run update-ubigeo

# Via API
curl -X POST http://localhost:3000/api/ubicaciones/update

# Via panel de administración
# Ir a /dashboard/admin/ubicaciones
```

### **Verificación de Estado**
```bash
# Ver estadísticas
npm run ubigeo:stats

# Verificar cache
curl http://localhost:3000/api/ubicaciones/update
```

### **Panel de Administración**
- **URL**: `/dashboard/admin/ubicaciones`
- **Funciones**:
  - Ver estadísticas en tiempo real
  - Forzar actualización de datos
  - Monitorear estado del sistema
  - Verificar última actualización

## 🚨 Manejo de Errores

### **Errores Comunes**
1. **INEI no disponible** → Fallback a fuentes alternativas
2. **Formato XLSX inválido** → Usar datos locales
3. **Error de red** → Cache existente
4. **Datos corruptos** → Validación y limpieza

### **Estrategias de Recuperación**
- **Reintentos automáticos** con backoff exponencial
- **Múltiples fuentes** de datos
- **Validación de integridad** de datos
- **Logging detallado** para debugging

## 🔄 Actualizaciones Futuras

### **Tareas Programadas** (Próxima versión)
```typescript
// Cron job semanal
cron.schedule('0 2 * * 0', async () => {
  await ineiUbigeoService.updateUbigeoData();
});
```

### **Mejoras Planificadas**
- **Notificaciones** de actualizaciones
- **Métricas** de uso y rendimiento
- **Backup automático** de datos
- **API de webhooks** para notificaciones

## 📝 Notas Técnicas

### **Códigos UBIGEO**
- **Formato**: 6 dígitos (DD-PP-DD)
- **Ejemplo**: 150101 = Lima-Lima-Lima
- **Estándar**: INEI oficial

### **Compatibilidad**
- **Node.js**: 18+
- **Next.js**: 15.5.3
- **TypeScript**: 5+
- **Navegadores**: Todos los modernos

## 🎯 Beneficios de la Implementación

### **Para Producción**
- **Datos oficiales** del INEI
- **Actualización automática** sin intervención manual
- **Alta disponibilidad** con múltiples fallbacks
- **Rendimiento optimizado** con cache inteligente

### **Para Desarrollo**
- **Fácil mantenimiento** con código modular
- **Testing simplificado** con datos locales
- **Debugging eficiente** con logging detallado
- **Escalabilidad** para futuras mejoras

---

**Desarrollado para AMERSUR CRM**  
*Sistema de gestión inmobiliaria profesional con datos oficiales del INEI*
