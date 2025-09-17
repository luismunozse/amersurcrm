# API de Ubicaciones de Perú - AMERSUR CRM

## 📍 Descripción

Sistema de ubicaciones geográficas de Perú integrado en el CRM AMERSUR. Proporciona datos completos de departamentos, provincias y distritos del Perú para facilitar el registro de clientes y propiedades.

## 🚀 Características

- **Datos Completos**: Incluye todos los departamentos, provincias y distritos de Perú
- **Rendimiento Optimizado**: Cache en memoria para respuestas rápidas
- **Datos Locales**: No depende de APIs externas, garantizando disponibilidad
- **Integración Simple**: API REST fácil de usar

## 📊 Estructura de Datos

### Departamentos
```json
{
  "codigo": "15",
  "nombre": "Lima"
}
```

### Provincias
```json
{
  "codigo": "1501",
  "nombre": "Lima",
  "distritos": []
}
```

### Distritos
```json
{
  "codigo": "150101",
  "nombre": "Lima"
}
```

## 🔗 Endpoints de la API

### GET `/api/ubicaciones`
Obtiene todos los departamentos de Perú.

**Respuesta:**
```json
{
  "departamentos": [
    {
      "codigo": "01",
      "nombre": "Amazonas"
    },
    {
      "codigo": "15",
      "nombre": "Lima"
    }
  ]
}
```

### GET `/api/ubicaciones?departamento={codigo}`
Obtiene las provincias de un departamento específico.

**Parámetros:**
- `departamento`: Código del departamento (ej: "15")

**Respuesta:**
```json
{
  "provincias": [
    {
      "codigo": "1501",
      "nombre": "Lima",
      "distritos": []
    },
    {
      "codigo": "1502",
      "nombre": "Barranca",
      "distritos": []
    }
  ]
}
```

### GET `/api/ubicaciones?departamento={codigo}&provincia={codigo}`
Obtiene los distritos de una provincia específica.

**Parámetros:**
- `departamento`: Código del departamento (ej: "15")
- `provincia`: Código de la provincia (ej: "1501")

**Respuesta:**
```json
{
  "distritos": [
    {
      "codigo": "150101",
      "nombre": "Lima"
    },
    {
      "codigo": "150102",
      "nombre": "Ancón"
    },
    {
      "codigo": "150103",
      "nombre": "Ate"
    }
  ]
}
```

## 💻 Uso en el Frontend

### Hook useUbicaciones
```typescript
import { useUbicaciones } from '@/hooks/useUbicaciones';

function MiComponente() {
  const { 
    departamentos, 
    provincias, 
    distritos, 
    loading, 
    cargarProvincias, 
    cargarDistritos 
  } = useUbicaciones();

  return (
    <div>
      <select onChange={(e) => cargarProvincias(e.target.value)}>
        {departamentos.map(dept => (
          <option key={dept.codigo} value={dept.codigo}>
            {dept.nombre}
          </option>
        ))}
      </select>
    </div>
  );
}
```

### Componente UbicacionSelector
```typescript
import UbicacionSelector from '@/components/UbicacionSelector';

function FormularioCliente() {
  const [ubicacion, setUbicacion] = useState({
    departamento: '',
    provincia: '',
    distrito: '',
    codigoDepartamento: '',
    codigoProvincia: '',
    codigoDistrito: ''
  });

  return (
    <UbicacionSelector
      onUbicacionChange={setUbicacion}
      disabled={false}
    />
  );
}
```

## 🏗️ Arquitectura

### Archivos Principales
- `src/app/api/ubicaciones/route.ts` - Endpoint principal de la API
- `src/lib/api/ubigeo-peru.ts` - Lógica de negocio y cache
- `src/lib/data/ubigeo-peru-completo.json` - Datos completos de ubicaciones
- `src/hooks/useUbicaciones.ts` - Hook de React para el frontend
- `src/components/UbicacionSelector.tsx` - Componente de selección

### Flujo de Datos
1. **Frontend** → Hook `useUbicaciones`
2. **Hook** → API `/api/ubicaciones`
3. **API** → `ubigeo-peru.ts`
4. **Cache** → Datos locales JSON
5. **Respuesta** → Frontend

## ⚡ Rendimiento

### Cache
- **Duración**: 24 horas
- **Almacenamiento**: Memoria del servidor
- **Beneficio**: Respuestas instantáneas después de la primera carga

### Optimizaciones
- Datos locales (sin dependencia de APIs externas)
- Cache en memoria
- Respuestas JSON optimizadas
- Lazy loading de provincias y distritos

## 🔧 Configuración

### Variables de Entorno
No se requieren variables de entorno adicionales.

### Dependencias
- Next.js 15.5.3
- TypeScript
- React Hooks

## 📈 Estadísticas

### Datos Incluidos
- **25 Departamentos** de Perú
- **Provincias completas** para cada departamento
- **Distritos completos** para cada provincia
- **Códigos UBIGEO** oficiales

### Ejemplos de Cobertura
- **Lima**: 10 provincias, 43 distritos
- **Amazonas**: 7 provincias, 83 distritos
- **Total**: Más de 1,800 distritos en todo el país

## 🚨 Manejo de Errores

### Errores Comunes
- **404**: Departamento/Provincia no encontrado
- **500**: Error interno del servidor
- **Timeout**: Tiempo de espera agotado

### Fallbacks
- Datos locales como respaldo
- Cache para evitar fallos repetidos
- Mensajes de error descriptivos

## 🔄 Actualizaciones

### Cómo Actualizar Datos
1. Modificar `ubigeo-peru-completo.json`
2. Limpiar cache: `clearCache()`
3. Reiniciar servidor

### Fuentes de Datos
- INEI (Instituto Nacional de Estadística e Informática)
- Datos oficiales del gobierno peruano
- Códigos UBIGEO actualizados

## 📝 Notas Técnicas

### Códigos UBIGEO
- **Formato**: 6 dígitos
- **Estructura**: DD-PP-DD (Departamento-Provincia-Distrito)
- **Ejemplo**: 150101 = Lima-Lima-Lima

### Compatibilidad
- **Navegadores**: Todos los modernos
- **Dispositivos**: Desktop y móvil
- **Frameworks**: React, Next.js

## 🎯 Casos de Uso

### Registro de Clientes
- Selección de ubicación completa
- Validación de direcciones
- Datos estructurados para reportes

### Gestión de Propiedades
- Ubicación precisa de inmuebles
- Filtros por región
- Análisis geográfico

### Reportes y Estadísticas
- Agrupación por departamento/provincia
- Análisis de distribución geográfica
- Métricas de cobertura regional

---

**Desarrollado para AMERSUR CRM**  
*Sistema de gestión inmobiliaria profesional*
