# Instrucciones para Importación Masiva de Clientes

## Archivo de Plantilla

Se ha creado el archivo `PLANTILLA_IMPORTACION_CLIENTES_MEJORADA.csv` con ejemplos completos para facilitar la importación.

## Formato del Archivo

### Columnas Disponibles

| Columna | Tipo | Requerido | Descripción | Valores Permitidos |
|---------|------|-----------|-------------|-------------------|
| **nombre** | Texto | ✅ **SÍ** | Nombre completo o razón social | Cualquier texto |
| tipo_cliente | Texto | No | Tipo de cliente | `persona` o `empresa` (default: `persona`) |
| documento_identidad | Texto | No | Número de documento | Según el tipo de documento |
| tipo_documento | Texto | No | Tipo de documento | `dni`, `ruc`, `cuit`, `pasaporte`, `carnet_extranjeria`, `otro` |
| estado_civil | Texto | No | Estado civil | `soltero`, `casado`, `divorciado`, `viudo`, `conviviente`, `otro` |
| email | Texto | No | Correo electrónico | Email válido (debe ser único) |
| telefono | Texto | No | Teléfono principal | Cualquier formato |
| telefono_whatsapp | Texto | No | WhatsApp | Cualquier formato |
| direccion_calle | Texto | No | Calle | Cualquier texto |
| direccion_numero | Texto | No | Número | Cualquier texto |
| direccion_barrio | Texto | No | Barrio | Cualquier texto |
| direccion_ciudad | Texto | No | Ciudad | Cualquier texto |
| direccion_provincia | Texto | No | Provincia | Cualquier texto |
| direccion_pais | Texto | No | País | Cualquier texto (default: `Perú`) |
| estado_cliente | Texto | No | Estado del cliente | `por_contactar`, `contactado`, `transferido` (default: `por_contactar`) |
| origen_lead | Texto | No | Origen del lead | Cualquier texto |
| vendedor_asignado | Texto | No | Vendedor asignado | Cualquier texto |
| proxima_accion | Texto | No | Próxima acción | Cualquier texto |
| interes_principal | Texto | No | Interés principal | Cualquier texto |
| capacidad_compra_estimada | Número | No | Capacidad de compra | Número decimal (ej: 150000.50) |
| forma_pago_preferida | Texto | No | Forma de pago | Cualquier texto |
| propiedades_reservadas | Número | No | Propiedades reservadas | Número entero (default: 0) |
| propiedades_compradas | Número | No | Propiedades compradas | Número entero (default: 0) |
| propiedades_alquiladas | Número | No | Propiedades alquiladas | Número entero (default: 0) |
| saldo_pendiente | Número | No | Saldo pendiente | Número decimal (default: 0) |
| notas | Texto | No | Notas adicionales | Cualquier texto |
| año | Texto | No | Campo adicional | Cualquier texto |

## Ejemplos de Valores Válidos

### Estados Civiles Permitidos:
- `soltero`
- `casado`
- `divorciado`
- `viudo`
- `conviviente`
- `otro`

### Tipos de Documento Permitidos:
- `dni`
- `ruc`
- `cuit`
- `pasaporte`
- `carnet_extranjeria`
- `otro`

### Estados de Cliente Permitidos:
- `por_contactar`
- `contactado`
- `transferido`

### Tipos de Cliente:
- `persona`
- `empresa`

## Instrucciones de Uso

1. **Descarga la plantilla:** Usa el archivo `PLANTILLA_IMPORTACION_CLIENTES_MEJORADA.csv` como base
2. **Modifica los datos:** Reemplaza los datos de ejemplo con tus clientes reales
3. **Mantén las columnas:** No elimines columnas, incluso si están vacías
4. **Respeta los valores:** Usa solo los valores permitidos para los campos con restricciones
5. **Campo obligatorio:** Solo `nombre` es requerido, todos los demás son opcionales
6. **Email único:** Si usas email, debe ser único en el sistema
7. **Formato CSV:** Usa comillas para textos que contengan comas o espacios
8. **Codificación:** Guarda el archivo en UTF-8

## Validaciones del Sistema

- ✅ **Email único:** No se pueden importar emails duplicados
- ✅ **Valores válidos:** Los campos con restricciones deben tener valores permitidos
- ✅ **Formato correcto:** Los números deben ser válidos para campos numéricos
- ✅ **Código de cliente:** Se genera automáticamente si no se especifica

## Proceso de Importación

1. Ve a la sección de Clientes en el dashboard
2. Haz clic en "Importar Masivamente"
3. Selecciona tu archivo CSV o XLSX
4. Revisa la previsualización
5. Confirma la importación
6. Verifica los resultados

## Notas Importantes

- El sistema procesa los archivos en lotes para mejor rendimiento
- Se muestran errores específicos si hay problemas con algunos registros
- Los registros válidos se importan aunque otros tengan errores
- Se genera un código de cliente automáticamente para cada registro exitoso

## Solución de Problemas

### Error: "Email duplicado"
- Verifica que no haya emails repetidos en tu archivo
- Asegúrate de que el email no exista ya en la base de datos

### Error: "Valor inválido para estado_civil"
- Usa solo los valores permitidos: `soltero`, `casado`, `divorciado`, `viudo`, `conviviente`, `otro`

### Error: "Valor inválido para tipo_documento"
- Usa solo los valores permitidos: `dni`, `ruc`, `cuit`, `pasaporte`, `carnet_extranjeria`, `otro`

### Error: "Formato de número inválido"
- Los campos numéricos deben contener solo números (ej: 150000.50)
- No incluyas símbolos de moneda o texto en campos numéricos
