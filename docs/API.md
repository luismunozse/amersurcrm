# API Documentation

## Autenticación

### POST /auth/login
Inicia sesión de usuario.

**Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  },
  "session": {
    "access_token": "jwt_token"
  }
}
```

### POST /logout
Cierra sesión del usuario actual.

## Clientes

### GET /dashboard/clientes
Obtiene lista de clientes con paginación y búsqueda.

**Query Parameters:**
- `q` (string, optional): Término de búsqueda
- `page` (number, optional): Número de página (default: 1)
- `limit` (number, optional): Items por página (default: 10)

**Response:**
```json
{
  "clientes": [
    {
      "id": "uuid",
      "nombre": "Juan Pérez",
      "email": "juan@example.com",
      "telefono": "+54911234567",
      "created_at": "2025-01-14T10:00:00Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalItems": 50,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### POST /dashboard/clientes
Crea un nuevo cliente.

**Body:**
```json
{
  "nombre": "Juan Pérez",
  "email": "juan@example.com",
  "telefono": "+54911234567"
}
```

**Response:**
```json
{
  "id": "uuid",
  "nombre": "Juan Pérez",
  "email": "juan@example.com",
  "telefono": "+54911234567",
  "created_at": "2025-01-14T10:00:00Z"
}
```

### PUT /dashboard/clientes/[id]
Actualiza un cliente existente.

**Body:**
```json
{
  "nombre": "Juan Carlos Pérez",
  "email": "juancarlos@example.com",
  "telefono": "+54911234568"
}
```

### DELETE /dashboard/clientes/[id]
Elimina un cliente.

**Response:**
```json
{
  "success": true,
  "message": "Cliente eliminado correctamente"
}
```

## Proyectos

### GET /dashboard/proyectos
Obtiene lista de proyectos.

**Response:**
```json
{
  "proyectos": [
    {
      "id": "uuid",
      "nombre": "Torre Residencial",
      "estado": "activo",
      "ubicacion": "Buenos Aires",
      "created_at": "2025-01-14T10:00:00Z"
    }
  ]
}
```

### POST /dashboard/proyectos
Crea un nuevo proyecto.

**Body:**
```json
{
  "nombre": "Torre Residencial",
  "ubicacion": "Buenos Aires",
  "estado": "activo"
}
```

## Lotes

### GET /dashboard/proyectos/[id]
Obtiene lotes de un proyecto específico.

**Response:**
```json
{
  "proyecto": {
    "id": "uuid",
    "nombre": "Torre Residencial",
    "estado": "activo",
    "ubicacion": "Buenos Aires"
  },
  "lotes": [
    {
      "id": "uuid",
      "codigo": "A-101",
      "sup_m2": 85.5,
      "precio": 150000,
      "moneda": "ARS",
      "estado": "disponible"
    }
  ]
}
```

### POST /dashboard/proyectos/[id]/lotes
Crea un nuevo lote.

**Body:**
```json
{
  "codigo": "A-102",
  "sup_m2": 90.0,
  "precio": 160000,
  "moneda": "ARS",
  "estado": "disponible"
}
```

### PUT /dashboard/proyectos/[id]/lotes/[loteId]
Actualiza un lote existente.

**Body:**
```json
{
  "codigo": "A-102",
  "sup_m2": 92.0,
  "precio": 165000,
  "moneda": "ARS",
  "estado": "reservado"
}
```

### DELETE /dashboard/proyectos/[id]/lotes/[loteId]
Elimina un lote.

## Estados de Lote

### POST /api/lotes/[id]/reservar
Reserva un lote (disponible → reservado).

### POST /api/lotes/[id]/vender
Vende un lote (reservado → vendido).

### POST /api/lotes/[id]/liberar
Libera un lote (reservado → disponible).

## Códigos de Error

| Código | Descripción |
|--------|-------------|
| 400 | Bad Request - Datos inválidos |
| 401 | Unauthorized - No autenticado |
| 403 | Forbidden - Sin permisos |
| 404 | Not Found - Recurso no encontrado |
| 409 | Conflict - Violación de constraints |
| 422 | Unprocessable Entity - Error de validación |
| 500 | Internal Server Error - Error del servidor |

## Ejemplos de Respuestas de Error

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "El email es requerido",
    "field": "email",
    "statusCode": 422
  }
}
```

```json
{
  "error": {
    "code": "AUTH_ERROR",
    "message": "Credenciales inválidas",
    "statusCode": 401
  }
}
```

## Rate Limiting

- **Límite general**: 100 requests por minuto por IP
- **Límite de autenticación**: 5 intentos por minuto por IP
- **Límite de creación**: 10 requests por minuto por usuario

## Autenticación

Todas las rutas protegidas requieren un token JWT válido en el header:

```
Authorization: Bearer <jwt_token>
```

## Paginación

Todas las listas soportan paginación con estos parámetros:

- `page`: Número de página (default: 1)
- `limit`: Items por página (default: 10, max: 100)
- `sort`: Campo de ordenamiento
- `order`: Dirección (asc/desc)

## Filtros

### Clientes
- `q`: Búsqueda en nombre y email
- `created_after`: Fecha de creación desde
- `created_before`: Fecha de creación hasta

### Proyectos
- `estado`: Filtrar por estado del proyecto
- `ubicacion`: Filtrar por ubicación

### Lotes
- `estado`: Filtrar por estado del lote
- `precio_min`: Precio mínimo
- `precio_max`: Precio máximo
- `sup_min`: Superficie mínima
- `sup_max`: Superficie máxima
