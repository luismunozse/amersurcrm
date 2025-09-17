# Instalación de jsPDF para Exportación de PDF

## Descripción
Se necesita instalar la librería jsPDF para generar proformas en PDF desde el CRM.

## Instalación

### Opción 1: NPM (Recomendado)
```bash
npm install jspdf
```

### Opción 2: Yarn
```bash
yarn add jspdf
```

### Opción 3: CDN (Alternativa)
Si no se puede instalar via npm, se puede usar CDN:
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
```

## Verificación
Después de la instalación, verificar que el import funcione:
```typescript
import { jsPDF } from 'jspdf';
```

## Uso en el Proyecto
La función `generarProformaPDF` ya está implementada en `src/components/ClientesTable.tsx` y utiliza jsPDF para generar proformas profesionales con:

- Header con logo de AMERSUR
- Información completa del cliente
- Datos comerciales
- Estadísticas de propiedades
- Notas adicionales
- Footer informativo

## Características del PDF Generado

### 📄 **Formato Profesional**
- Header con colores corporativos
- Información organizada en secciones
- Tipografía clara y legible
- Espaciado adecuado

### 📊 **Contenido Completo**
- Datos personales del cliente
- Información de contacto
- Estado comercial
- Capacidad de compra
- Estadísticas de propiedades
- Notas y observaciones

### 🎨 **Diseño Simple y Claro**
- Colores corporativos (azul AMERSUR)
- Secciones bien definidas
- Información fácil de leer
- Formato estándar A4

## Archivos Afectados
- `src/components/ClientesTable.tsx` - Función de generación de PDF
- `package.json` - Nueva dependencia jsPDF

## Estado Actual
✅ **Función de generación implementada**
⏳ **Instalación de jsPDF pendiente**
✅ **Formato de proforma diseñado**
✅ **Integración con acciones de cliente**
