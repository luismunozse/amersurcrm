# 🔐 Ejemplos de Uso del Sistema de Permisos

## 📋 Tabla de Contenidos
1. [Server Actions](#server-actions)
2. [Server Components](#server-components)
3. [Client Components](#client-components)
4. [Componentes de UI Protegidos](#componentes-de-ui-protegidos)
5. [Casos de Uso Comunes](#casos-de-uso-comunes)

---

## 1️⃣ Server Actions

### Verificar permiso antes de ejecutar acción

```typescript
// src/app/dashboard/clientes/_actions.ts
'use server';

import { requierePermiso, tienePermiso } from '@/lib/permissions';

export async function eliminarCliente(clienteId: string) {
  // Opción 1: Lanzar error si no tiene permiso
  await requierePermiso('clientes.eliminar');

  // Tu lógica de eliminación aquí...
  const supabase = await createServerActionClient();
  const { error } = await supabase
    .from('cliente')
    .delete()
    .eq('id', clienteId);

  if (error) throw error;

  return { success: true };
}

export async function exportarClientes() {
  // Opción 2: Verificar y retornar error personalizado
  const permitido = await tienePermiso('clientes.exportar');

  if (!permitido) {
    return {
      success: false,
      error: 'No tienes permiso para exportar clientes',
    };
  }

  // Tu lógica de exportación...
  return { success: true, url: '/export/clientes.xlsx' };
}

export async function reasignarCliente(clienteId: string, nuevoVendedor: string) {
  // Verificar con auditoría y metadata
  await requierePermiso('clientes.reasignar', {
    cliente_id: clienteId,
    nuevo_vendedor: nuevoVendedor,
  });

  // Tu lógica...
}
```

### Verificar rol

```typescript
import { esAdmin, esAdminOCoordinador, requiereRol } from '@/lib/permissions';

export async function modificarPrecios(loteId: string, nuevoPrecio: number) {
  // Solo admins pueden modificar precios
  await requiereRol('ROL_ADMIN');

  // Tu lógica...
}

export async function verReporteGlobal() {
  // Admins o coordinadores pueden ver reportes globales
  const puedeVer = await esAdminOCoordinador();

  if (!puedeVer) {
    throw new Error('No tienes permiso para ver reportes globales');
  }

  // Tu lógica...
}
```

---

## 2️⃣ Server Components

### Verificar permisos en páginas

```typescript
// src/app/dashboard/admin/usuarios/page.tsx
import { redirect } from 'next/navigation';
import { tienePermiso } from '@/lib/permissions';

export default async function UsuariosPage() {
  const puedeGestionarUsuarios = await tienePermiso('usuarios.ver');

  if (!puedeGestionarUsuarios) {
    redirect('/dashboard');
  }

  return (
    <div>
      <h1>Gestión de Usuarios</h1>
      {/* Tu contenido... */}
    </div>
  );
}
```

### Mostrar contenido condicionalmente

```typescript
// src/app/dashboard/clientes/[id]/page.tsx
import { tienePermiso, esAdmin } from '@/lib/permissions';

export default async function ClientePage({ params }: { params: { id: string } }) {
  const puedeEditar = await tienePermiso('clientes.editar_todos');
  const puedeEliminar = await tienePermiso('clientes.eliminar');
  const admin = await esAdmin();

  return (
    <div>
      <ClienteDetalles id={params.id} />

      {puedeEditar && (
        <button>Editar Cliente</button>
      )}

      {puedeEliminar && (
        <button className="text-red-600">Eliminar Cliente</button>
      )}

      {admin && (
        <div className="admin-panel">
          {/* Solo admins ven esto */}
        </div>
      )}
    </div>
  );
}
```

---

## 3️⃣ Client Components

### Hook usePermissions

```typescript
'use client';

import { usePermissions } from '@/lib/permissions';

export function ClienteActions({ clienteId }: { clienteId: string }) {
  const {
    tienePermiso,
    esAdmin,
    loading,
    usuario,
  } = usePermissions();

  if (loading) {
    return <div>Cargando permisos...</div>;
  }

  const puedeEditar = tienePermiso('clientes.editar_todos');
  const puedeEliminar = tienePermiso('clientes.eliminar');

  return (
    <div className="flex gap-2">
      {puedeEditar && (
        <button onClick={() => editarCliente(clienteId)}>
          Editar
        </button>
      )}

      {puedeEliminar && (
        <button
          onClick={() => eliminarCliente(clienteId)}
          className="text-red-600"
        >
          Eliminar
        </button>
      )}

      {esAdmin() && (
        <button>Acción Admin</button>
      )}

      <p className="text-sm text-gray-500">
        Usuario: {usuario?.nombre_completo} ({usuario?.rol})
      </p>
    </div>
  );
}
```

### Hook simplificado usePermiso

```typescript
'use client';

import { usePermiso } from '@/lib/permissions';

export function BotonEliminar({ onEliminar }: { onEliminar: () => void }) {
  const { permitido, loading } = usePermiso('clientes.eliminar');

  if (!permitido) return null;

  return (
    <button
      onClick={onEliminar}
      disabled={loading}
      className="text-red-600"
    >
      {loading ? 'Verificando...' : 'Eliminar'}
    </button>
  );
}
```

---

## 4️⃣ Componentes de UI Protegidos

### ProtectedAction

```typescript
'use client';

import { ProtectedAction } from '@/components/permissions/ProtectedAction';

export function ClienteCard({ cliente }: { cliente: Cliente }) {
  return (
    <div className="border p-4 rounded">
      <h3>{cliente.nombre}</h3>

      {/* Mostrar solo si tiene permiso */}
      <ProtectedAction permiso="clientes.editar_todos">
        <button>Editar</button>
      </ProtectedAction>

      {/* Mostrar si tiene al menos uno de estos permisos */}
      <ProtectedAction permisos={['clientes.eliminar', 'clientes.editar_todos']}>
        <button className="text-red-600">Eliminar</button>
      </ProtectedAction>

      {/* Mostrar contenido alternativo si NO tiene permiso */}
      <ProtectedAction
        permiso="clientes.ver_historial_completo"
        fallback={<p className="text-gray-400">Historial restringido</p>}
      >
        <ClienteHistorial clienteId={cliente.id} />
      </ProtectedAction>
    </div>
  );
}
```

### RoleBasedContent

```typescript
'use client';

import { RoleBasedContent } from '@/components/permissions/ProtectedAction';

export function Dashboard() {
  return (
    <RoleBasedContent
      admin={<AdminDashboard />}
      coordinador={<CoordinadorDashboard />}
      vendedor={<VendedorDashboard />}
      fallback={<p>Rol no reconocido</p>}
    />
  );
}
```

### ProtectedButton

```typescript
'use client';

import { ProtectedButton } from '@/components/permissions/ProtectedButton';

export function VentaActions({ ventaId }: { ventaId: string }) {
  return (
    <div className="flex gap-2">
      <ProtectedButton
        permiso="ventas.anular"
        onClick={() => anularVenta(ventaId)}
        tooltipSinPermiso="No tienes permiso para anular ventas"
        className="bg-red-600 text-white px-4 py-2 rounded"
      >
        Anular Venta
      </ProtectedButton>

      <ProtectedButton
        permiso="ventas.modificar"
        onClick={() => modificarVenta(ventaId)}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        Modificar
      </ProtectedButton>
    </div>
  );
}
```

---

## 5️⃣ Casos de Uso Comunes

### Descuentos con límites por rol

```typescript
'use server';

import { verificarPermiso } from '@/lib/permissions';

export async function aplicarDescuento(ventaId: string, porcentajeDescuento: number) {
  // Verificar si puede aplicar descuento con el límite del rol
  const resultado = await verificarPermiso('descuentos.aplicar', {
    registrarAuditoria: true,
    metadata: {
      venta_id: ventaId,
      porcentaje: porcentajeDescuento,
    },
  });

  if (!resultado.permitido) {
    return {
      success: false,
      error: `No puedes aplicar este descuento. ${resultado.razon}`,
    };
  }

  // Si tiene límite, verificar que no lo exceda
  if (resultado.limite && porcentajeDescuento > resultado.limite) {
    return {
      success: false,
      error: `Tu rol solo permite descuentos hasta ${resultado.limite}%. Solicitaste ${porcentajeDescuento}%.`,
    };
  }

  // Si requiere aprobación
  if (resultado.requiere_aprobacion) {
    // Crear solicitud de aprobación
    await crearSolicitudAprobacion({
      tipo: 'descuento',
      venta_id: ventaId,
      porcentaje: porcentajeDescuento,
      aprobador_rol: resultado.aprobador_rol,
    });

    return {
      success: true,
      requiere_aprobacion: true,
      mensaje: `Descuento del ${porcentajeDescuento}% enviado para aprobación.`,
    };
  }

  // Aplicar descuento normalmente
  const supabase = await createServerActionClient();
  await supabase
    .from('venta')
    .update({ descuento: porcentajeDescuento })
    .eq('id', ventaId);

  return { success: true };
}
```

### Menú de navegación dinámico

```typescript
'use client';

import { usePermissions } from '@/lib/permissions';
import Link from 'next/link';

export function NavMenu() {
  const { tienePermiso, esAdmin } = usePermissions();

  const menuItems = [
    { label: 'Dashboard', href: '/dashboard', permiso: null },
    { label: 'Clientes', href: '/dashboard/clientes', permiso: 'clientes.ver_asignados' },
    { label: 'Proyectos', href: '/dashboard/proyectos', permiso: 'proyectos.ver' },
    { label: 'Ventas', href: '/dashboard/ventas', permiso: 'ventas.ver_propias' },
    { label: 'Reportes', href: '/dashboard/reportes', permiso: 'reportes.globales' },
    { label: 'Usuarios', href: '/dashboard/admin/usuarios', permiso: 'usuarios.ver' },
  ];

  return (
    <nav>
      {menuItems.map(item => {
        // Si no requiere permiso o si tiene el permiso, mostrar
        if (!item.permiso || tienePermiso(item.permiso as any)) {
          return (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          );
        }
        return null;
      })}

      {esAdmin() && (
        <Link href="/dashboard/admin">
          Panel Admin
        </Link>
      )}
    </nav>
  );
}
```

### Formulario con validación de permisos

```typescript
'use client';

import { usePermissions } from '@/lib/permissions';
import { useState } from 'react';

export function ClienteForm({ cliente }: { cliente?: Cliente }) {
  const { tienePermiso, esAdmin } = usePermissions();
  const [datos, setDatos] = useState(cliente || {});

  const puedeEditarTodos = tienePermiso('clientes.editar_todos');
  const puedeReasignar = tienePermiso('clientes.reasignar');

  return (
    <form>
      <input
        type="text"
        value={datos.nombre}
        onChange={(e) => setDatos({ ...datos, nombre: e.target.value })}
        disabled={!puedeEditarTodos}
      />

      {/* Solo admins y coordinadores pueden reasignar */}
      {puedeReasignar && (
        <select
          value={datos.vendedor_asignado}
          onChange={(e) => setDatos({ ...datos, vendedor_asignado: e.target.value })}
        >
          <option value="">Seleccionar vendedor</option>
          {/* Opciones... */}
        </select>
      )}

      {/* Campo solo para admins */}
      {esAdmin() && (
        <input
          type="number"
          placeholder="Comisión especial"
          value={datos.comision_especial}
          onChange={(e) => setDatos({ ...datos, comision_especial: e.target.value })}
        />
      )}

      <button type="submit" disabled={!puedeEditarTodos}>
        Guardar
      </button>
    </form>
  );
}
```

---

## 🎯 Mejores Prácticas

1. **Siempre verificar en el servidor**: Los permisos del cliente son solo para UI, SIEMPRE verifica en Server Actions
2. **Usar auditoría en acciones críticas**: Activa `registrarAuditoria: true` en operaciones importantes
3. **Combinar permisos y roles**: Usa permisos para acciones específicas y roles para vistas completas
4. **Mensajes de error claros**: Indica al usuario por qué no puede realizar la acción
5. **Loading states**: Muestra estados de carga mientras se verifican permisos

---

## 📚 Referencia de Permisos Disponibles

Ver la matriz completa de permisos en la propuesta inicial del sistema.

Algunos ejemplos:
- `clientes.ver_todos`
- `clientes.crear`
- `clientes.eliminar`
- `ventas.aprobar`
- `reportes.globales`
- `usuarios.gestionar`
- etc.
