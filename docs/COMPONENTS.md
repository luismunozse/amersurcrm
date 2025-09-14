# Componentes - Storybook

## ErrorBoundary

Componente para capturar errores de JavaScript en cualquier parte del árbol de componentes.

### Props
- `children`: Componentes hijos
- `fallback?`: Componente personalizado para mostrar en caso de error
- `onError?`: Callback ejecutado cuando ocurre un error

### Ejemplo
```tsx
<ErrorBoundary
  fallback={<div>Error personalizado</div>}
  onError={(error, errorInfo) => console.log(error, errorInfo)}
>
  <ComponenteQuePuedeFallar />
</ErrorBoundary>
```

## Pagination

Componente de paginación reutilizable con navegación inteligente.

### Props
- `currentPage`: Página actual
- `totalPages`: Total de páginas
- `onPageChange`: Callback cuando cambia la página
- `className?`: Clases CSS adicionales

### Ejemplo
```tsx
<Pagination
  currentPage={1}
  totalPages={10}
  onPageChange={(page) => setCurrentPage(page)}
  className="mt-4"
/>
```

## ConfirmDialog

Modal de confirmación para acciones destructivas.

### Props
- `open`: Si el modal está abierto
- `title`: Título del modal
- `description`: Descripción de la acción
- `confirmText`: Texto del botón de confirmación
- `onConfirm`: Callback de confirmación
- `onClose`: Callback de cierre
- `disabled?`: Si el botón está deshabilitado

### Ejemplo
```tsx
<ConfirmDialog
  open={showConfirm}
  title="Eliminar cliente"
  description="¿Estás seguro de que quieres eliminar este cliente?"
  confirmText="Eliminar"
  onConfirm={handleDelete}
  onClose={() => setShowConfirm(false)}
  disabled={isDeleting}
/>
```

## ClienteItem

Componente memoizado para mostrar un cliente individual.

### Props
- `cliente`: Objeto cliente
- `isEditing`: Si está en modo edición
- `isPending`: Si hay una operación pendiente
- `onEdit`: Callback para editar
- `onCancelEdit`: Callback para cancelar edición
- `onAfterSave`: Callback después de guardar
- `onDelete`: Callback para eliminar

### Ejemplo
```tsx
<ClienteItem
  cliente={cliente}
  isEditing={editingId === cliente.id}
  isPending={isPending}
  onEdit={handleEdit}
  onCancelEdit={handleCancelEdit}
  onAfterSave={handleAfterSave}
  onDelete={handleDelete}
/>
```

## SearchBox

Componente de búsqueda con formulario optimizado.

### Props
- `defaultValue`: Valor inicial del input
- `placeholder?`: Placeholder del input
- `onSubmit?`: Callback personalizado de envío

### Ejemplo
```tsx
<SearchBox
  defaultValue="término de búsqueda"
  placeholder="Buscar clientes..."
  onSubmit={(query) => handleSearch(query)}
/>
```

## Hooks

### usePagination

Hook personalizado para manejo de paginación con optimizaciones.

#### Parámetros
- `items`: Array de items a paginar
- `itemsPerPage?`: Items por página (default: 10)
- `initialPage?`: Página inicial (default: 1)

#### Retorna
- `currentPage`: Página actual
- `totalPages`: Total de páginas
- `paginatedItems`: Items de la página actual
- `goToPage`: Función para ir a una página específica
- `nextPage`: Función para ir a la siguiente página
- `prevPage`: Función para ir a la página anterior
- `hasNextPage`: Si hay página siguiente
- `hasPrevPage`: Si hay página anterior

#### Ejemplo
```tsx
const {
  currentPage,
  totalPages,
  paginatedItems,
  goToPage,
  nextPage,
  prevPage,
  hasNextPage,
  hasPrevPage,
} = usePagination({
  items: clientes,
  itemsPerPage: 10,
  initialPage: 1,
});
```

### useErrorHandler

Hook para manejo de errores en componentes funcionales.

#### Retorna
- `handleError`: Función para manejar errores

#### Ejemplo
```tsx
const { handleError } = useErrorHandler();

try {
  await riskyOperation();
} catch (error) {
  handleError(error, { operation: 'riskyOperation' });
}
```

## Utilidades

### errorLogger

Sistema de logging centralizado con diferentes niveles.

#### Métodos
- `error(message, error?, context?)`: Log de error
- `warn(message, context?)`: Log de advertencia
- `info(message, context?)`: Log de información
- `debug(message, context?)`: Log de debug

#### Ejemplo
```tsx
import { errorLogger } from '@/lib/errorLogger';

errorLogger.error('Error en operación', error, {
  userId: '123',
  operation: 'createCliente'
});
```

### Clases de Error

#### AppError
Error base personalizado con código y contexto.

```tsx
throw new AppError('Mensaje de error', 'ERROR_CODE', 400, { field: 'email' });
```

#### ValidationError
Error específico para validaciones.

```tsx
throw new ValidationError('Email inválido', 'email');
```

#### DatabaseError
Error específico para operaciones de base de datos.

```tsx
throw new DatabaseError('Error de conexión', originalError);
```

#### AuthError
Error específico para autenticación.

```tsx
throw new AuthError('Credenciales inválidas');
```

## Patrones de Uso

### Optimización de Rendimiento

1. **Memoización de componentes**:
```tsx
const MemoizedComponent = memo(function Component({ prop }) {
  // Componente optimizado
});
```

2. **Memoización de funciones**:
```tsx
const handleClick = useMemo(() => (id: string) => {
  // Función optimizada
}, [dependency]);
```

3. **Paginación para listas grandes**:
```tsx
const { paginatedItems } = usePagination({
  items: largeList,
  itemsPerPage: 10
});
```

### Manejo de Errores

1. **Error Boundaries**:
```tsx
<ErrorBoundary>
  <ComponenteQuePuedeFallar />
</ErrorBoundary>
```

2. **Try-catch con logging**:
```tsx
try {
  await operation();
} catch (error) {
  errorLogger.error('Error en operación', error);
  toast.error(getErrorMessage(error));
}
```

3. **Validación con errores específicos**:
```tsx
if (!email) {
  throw new ValidationError('Email es requerido', 'email');
}
```

### Formularios Optimizados

1. **Server Actions**:
```tsx
<form action={async (formData) => {
  try {
    await createCliente(formData);
    toast.success('Cliente creado');
  } catch (error) {
    toast.error(getErrorMessage(error));
  }
}}>
```

2. **Estados de carga**:
```tsx
const [isPending, startTransition] = useTransition();

<button disabled={isPending}>
  {isPending ? 'Guardando...' : 'Guardar'}
</button>
```
