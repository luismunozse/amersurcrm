# OPCIONES PARA MANEJO DE "PROYECTO DE INTERÉS" EN IMPORTACIÓN

## 🔍 PROBLEMA ACTUAL

Al importar clientes con campo `proyecto_interes`, actualmente:
- ❌ Se guarda como texto libre en campo `notas`
- ❌ No se valida si el proyecto existe
- ❌ No se crea relación formal con tabla `proyecto`
- ❌ Permite errores de tipeo
- ❌ No permite reportes por proyecto

## ✅ OPCIONES DE SOLUCIÓN

### Opción 1: Validación + Autovinculación (RECOMENDADO) 🌟

#### ¿Qué hace?
1. Busca el proyecto por nombre (case-insensitive, fuzzy match)
2. Si existe: crea relación en `cliente_propiedad_interes`
3. Si no existe: guarda en notas + marca error en preview

#### Ventajas
- ✅ Crea relaciones reales con proyectos
- ✅ Permite reportes por proyecto
- ✅ Avisa en preview si hay nombres incorrectos
- ✅ Autocompletado inteligente (ej: "las palmeras" → "Residencial Las Palmeras")

#### Desventajas
- ⚠️ Requiere endpoint adicional
- ⚠️ Más complejo

#### Código Ejemplo
```typescript
// Validación
if (row.proyecto_interes) {
  const proyecto = await buscarProyectoPorNombre(row.proyecto_interes);
  if (!proyecto) {
    rowErrors.push(`Proyecto "${row.proyecto_interes}" no encontrado`);
    rowWarnings.push('Se guardará como texto en notas');
  } else {
    row._proyecto_id = proyecto.id; // Para vincular después
  }
}

// Después de importar cliente
if (row._proyecto_id) {
  await vincularProyecto(clienteId, row._proyecto_id);
}
```

---

### Opción 2: Solo Validación (Intermedia)

#### ¿Qué hace?
1. Valida que el proyecto existe
2. Si existe: guarda en notas (sin crear relación)
3. Si no existe: marca error y rechaza importación

#### Ventajas
- ✅ Evita nombres incorrectos
- ✅ Más simple que Opción 1
- ✅ Datos más limpios

#### Desventajas
- ❌ No crea relación formal
- ❌ Sigue siendo solo texto en notas
- ❌ No permite reportes por proyecto

---

### Opción 3: Texto Libre (Actual - NO RECOMENDADO)

#### ¿Qué hace?
- Acepta cualquier texto en proyecto_interes
- Guarda en notas sin validar

#### Ventajas
- ✅ Muy simple
- ✅ Flexible

#### Desventajas
- ❌ Permite errores de tipeo
- ❌ Datos inconsistentes
- ❌ No estructurado
- ❌ Sin reportes

---

### Opción 4: Campo Opcional (Sin Proyecto)

#### ¿Qué hace?
- Elimina campo `proyecto_interes` de importación
- Usuario puede agregar proyecto después manualmente

#### Ventajas
- ✅ Muy simple
- ✅ Sin complejidad

#### Desventajas
- ❌ Usuario pierde información en importación
- ❌ Trabajo manual adicional

---

## 📊 COMPARACIÓN

| Característica | Opción 1 | Opción 2 | Opción 3 | Opción 4 |
|----------------|----------|----------|----------|----------|
| Valida proyecto | ✅ | ✅ | ❌ | N/A |
| Crea relación FK | ✅ | ❌ | ❌ | N/A |
| Permite reportes | ✅ | ❌ | ❌ | N/A |
| Fuzzy matching | ✅ | ❌ | ❌ | N/A |
| Complejidad | Alta | Media | Baja | Baja |
| Datos limpios | ✅ | ✅ | ❌ | ✅ |

---

## 🎯 RECOMENDACIÓN

**Implementar Opción 1: Validación + Autovinculación**

### Flujo Recomendado

```
Usuario importa: proyecto_interes = "las palmeras"
         ↓
Sistema busca: "las palmeras" en tabla proyecto
         ↓
    ┌────────┴────────┐
    ↓                 ↓
Encontrado        No encontrado
    ↓                 ↓
Crea relación    Marca warning en preview
en tabla          "Proyecto no encontrado"
cliente_          Se guardará en notas
propiedad_        Usuario puede:
interes           - Corregir nombre
                  - Continuar (queda en notas)
                  - Crear proyecto después
```

### Implementación

**1. Nuevo endpoint:**
```typescript
POST /api/proyectos/search-by-name
{ "nombre": "las palmeras" }

Response:
{
  "found": true,
  "proyecto": {
    "id": "uuid",
    "nombre": "Residencial Las Palmeras"
  }
}
```

**2. Modificar validación en frontend:**
```typescript
// Valida y busca proyecto
const proyecto = await buscarProyecto(row.proyecto_interes);

if (proyecto) {
  row._proyecto_id = proyecto.id;
  row._proyecto_nombre = proyecto.nombre;
} else {
  rowWarnings.push(`Proyecto "${row.proyecto_interes}" no encontrado`);
}
```

**3. Modificar API de importación:**
```typescript
// Después de crear cliente
if (cliente._proyecto_id) {
  await supabase
    .from("cliente_propiedad_interes")
    .insert({
      cliente_id: nuevoCliente.id,
      proyecto_id: cliente._proyecto_id,
      prioridad: 2,
      notas: "Agregado automáticamente desde importación"
    });
}
```

---

## 🚀 DECISIÓN REQUERIDA

¿Qué opción prefieres implementar?

1. **Opción 1**: Validación + Autovinculación (recomendado)
2. **Opción 2**: Solo validación
3. **Opción 3**: Mantener texto libre (actual)
4. **Opción 4**: Eliminar campo de importación

O una **opción híbrida**:
- Validar si existe proyecto
- Si existe: crear relación
- Si no existe: permitir de todas formas pero guardar en notas

---

## 📝 NOTAS ADICIONALES

### Fuzzy Matching
Si implementamos Opción 1, podemos usar fuzzy matching para encontrar proyectos:

```typescript
"las palmeras" → "Residencial Las Palmeras" ✅
"palmeras" → "Residencial Las Palmeras" ✅
"res las palmeras" → "Residencial Las Palmeras" ✅
"vista mar" → "Condominio Vista al Mar" ✅
```

### Warnings vs Errors
- **Error**: Bloquea importación (nombre requerido)
- **Warning**: No bloquea pero avisa (proyecto no encontrado)

En preview mostraríamos:
- ⚠️ 10 registros con warnings (proyecto no encontrado)
- ❌ 5 registros con errores (datos requeridos faltantes)
