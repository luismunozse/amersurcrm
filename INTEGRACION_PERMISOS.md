# 🔧 Guía de Integración del Sistema de Permisos

Esta guía muestra cómo integrar el sistema de permisos en tu código existente.

---

## 📝 Paso 1: Actualizar Server Actions Existentes

### Antes (sin permisos)
```typescript
// src/app/dashboard/clientes/_actions.ts
export async function eliminarCliente(clienteId: string) {
  const supabase = await createServerActionClient();

  const { error } = await supabase
    .from('cliente')
    .delete()
    .eq('id', clienteId);

  if (error) throw error;
  return { success: true };
}
```

### Después (con permisos)
```typescript
// src/app/dashboard/clientes/_actions.ts
import { requierePermiso, PERMISOS } from '@/lib/permissions';

export async function eliminarCliente(clienteId: string) {
  // ✅ Verificar permiso antes de ejecutar
  await requierePermiso(PERMISOS.CLIENTES.ELIMINAR);

  const supabase = await createServerActionClient();

  const { error } = await supabase
    .from('cliente')
    .delete()
    .eq('id', clienteId);

  if (error) throw error;
  return { success: true };
}
```

---

## 📝 Paso 2: Proteger Páginas (Server Components)

### Antes
```typescript
// src/app/dashboard/admin/usuarios/page.tsx
export default async function UsuariosPage() {
  // Sin verificación de permisos
  return <div>Gestión de Usuarios</div>;
}
```

### Después
```typescript
// src/app/dashboard/admin/usuarios/page.tsx
import { protegerRuta, PERMISOS } from '@/lib/permissions';

export default async function UsuariosPage() {
  // ✅ Proteger ruta al inicio
  await protegerRuta({ permiso: PERMISOS.USUARIOS.VER });

  return <div>Gestión de Usuarios</div>;
}
```

### Alternativa para solo admins
```typescript
import { soloAdmins } from '@/lib/permissions';

export default async function ConfiguracionPage() {
  // ✅ Más simple para roles específicos
  await soloAdmins();

  return <div>Configuración del Sistema</div>;
}
```

---

## 📝 Paso 3: Actualizar Componentes Cliente

### Antes
```typescript
// src/components/ClienteCard.tsx
'use client';

export function ClienteCard({ cliente }: { cliente: Cliente }) {
  return (
    <div>
      <h3>{cliente.nombre}</h3>
      <button onClick={handleEditar}>Editar</button>
      <button onClick={handleEliminar}>Eliminar</button>
    </div>
  );
}
```

### Después (Opción 1: Con hook)
```typescript
'use client';
import { usePermissions, PERMISOS } from '@/lib/permissions';

export function ClienteCard({ cliente }: { cliente: Cliente }) {
  const { tienePermiso } = usePermissions();

  const puedeEditar = tienePermiso(PERMISOS.CLIENTES.EDITAR_TODOS);
  const puedeEliminar = tienePermiso(PERMISOS.CLIENTES.ELIMINAR);

  return (
    <div>
      <h3>{cliente.nombre}</h3>

      {puedeEditar && (
        <button onClick={handleEditar}>Editar</button>
      )}

      {puedeEliminar && (
        <button onClick={handleEliminar}>Eliminar</button>
      )}
    </div>
  );
}
```

### Después (Opción 2: Con componente ProtectedAction)
```typescript
'use client';
import { ProtectedAction } from '@/components/permissions/ProtectedAction';
import { PERMISOS } from '@/lib/permissions';

export function ClienteCard({ cliente }: { cliente: Cliente }) {
  return (
    <div>
      <h3>{cliente.nombre}</h3>

      <ProtectedAction permiso={PERMISOS.CLIENTES.EDITAR_TODOS}>
        <button onClick={handleEditar}>Editar</button>
      </ProtectedAction>

      <ProtectedAction permiso={PERMISOS.CLIENTES.ELIMINAR}>
        <button onClick={handleEliminar}>Eliminar</button>
      </ProtectedAction>
    </div>
  );
}
```

---

## 📝 Paso 4: Actualizar el Sidebar/Navegación

### Antes
```typescript
// src/components/Sidebar.tsx
const navigation = [
  { name: "Clientes", href: "/dashboard/clientes" },
  { name: "Usuarios", href: "/dashboard/admin/usuarios" },
  { name: "Reportes", href: "/dashboard/reportes" },
];
```

### Después
```typescript
'use client';
import { usePermissions, PERMISOS } from '@/lib/permissions';

export function Sidebar() {
  const { tienePermiso, esAdmin } = usePermissions();

  const menuItems = [
    {
      name: "Clientes",
      href: "/dashboard/clientes",
      permiso: PERMISOS.CLIENTES.VER_ASIGNADOS,
    },
    {
      name: "Usuarios",
      href: "/dashboard/admin/usuarios",
      permiso: PERMISOS.USUARIOS.VER,
    },
    {
      name: "Reportes",
      href: "/dashboard/reportes",
      permiso: PERMISOS.REPORTES.GLOBALES,
    },
  ];

  return (
    <nav>
      {menuItems.map(item => {
        // Solo mostrar si tiene permiso
        if (tienePermiso(item.permiso)) {
          return (
            <Link key={item.href} href={item.href}>
              {item.name}
            </Link>
          );
        }
        return null;
      })}

      {/* Sección solo para admins */}
      {esAdmin() && (
        <div className="admin-section">
          <Link href="/dashboard/admin">Panel Admin</Link>
        </div>
      )}
    </nav>
  );
}
```

---

## 📝 Paso 5: Proteger Acciones Críticas con Auditoría

### Para acciones como eliminar, anular, modificar precios

```typescript
'use server';
import { requierePermiso, PERMISOS } from '@/lib/permissions';

export async function anularVenta(ventaId: string, motivo: string) {
  // ✅ Verificar permiso CON auditoría
  await requierePermiso(PERMISOS.VENTAS.ANULAR, {
    venta_id: ventaId,
    motivo,
    accion: 'anular_venta',
  });

  // Tu lógica de anulación...
  const supabase = await createServerActionClient();
  const { error } = await supabase
    .from('venta')
    .update({ estado: 'anulada', motivo_anulacion: motivo })
    .eq('id', ventaId);

  if (error) throw error;

  return { success: true };
}
```

---

## 📝 Paso 6: Proteger Rutas de Recursos Específicos

### Verificar que un vendedor solo puede ver SUS clientes

```typescript
// src/app/dashboard/clientes/[id]/page.tsx
import { puedeAccederARecurso, PERMISOS } from '@/lib/permissions';
import { notFound } from 'next/navigation';

export default async function ClientePage({ params }: { params: { id: string } }) {
  const supabase = await createServerOnlyClient();

  // Obtener cliente
  const { data: cliente } = await supabase
    .from('cliente')
    .select('*, vendedor_asignado')
    .eq('id', params.id)
    .single();

  if (!cliente) notFound();

  // ✅ Verificar acceso: admin puede ver todos, vendedor solo los suyos
  const puedeVer = await puedeAccederARecurso(
    PERMISOS.CLIENTES.VER_TODOS, // Permiso general (admins/coordinadores)
    PERMISOS.CLIENTES.VER_ASIGNADOS, // Permiso específico (vendedores)
    async () => {
      // Validación: ¿es su cliente asignado?
      const usuario = await obtenerPermisosUsuario();
      return cliente.vendedor_asignado === usuario?.username;
    }
  );

  if (!puedeVer) {
    redirect('/dashboard/clientes');
  }

  return <ClienteDetalles cliente={cliente} />;
}
```

---

## 📝 Paso 7: Formularios con Campos Condicionales

```typescript
'use client';
import { usePermissions, PERMISOS } from '@/lib/permissions';

export function ClienteForm({ cliente }: { cliente?: Cliente }) {
  const { tienePermiso, esAdmin } = usePermissions();

  const puedeReasignar = tienePermiso(PERMISOS.CLIENTES.REASIGNAR);
  const puedeVerCosto = tienePermiso(PERMISOS.PRECIOS.VER_COSTO);

  return (
    <form>
      <input name="nombre" defaultValue={cliente?.nombre} />
      <input name="telefono" defaultValue={cliente?.telefono} />

      {/* ✅ Campo solo visible con permiso */}
      {puedeReasignar && (
        <select name="vendedor_asignado" defaultValue={cliente?.vendedor_asignado}>
          <option value="">Seleccionar vendedor</option>
          {/* Opciones... */}
        </select>
      )}

      {/* ✅ Campo solo para admins */}
      {esAdmin() && (
        <div className="admin-only">
          <input
            type="number"
            name="descuento_especial"
            placeholder="Descuento especial (%)"
          />
        </div>
      )}

      {/* ✅ Mostrar/ocultar información sensible */}
      {puedeVerCosto ? (
        <div>
          <label>Costo real:</label>
          <span>${cliente?.costo_real}</span>
        </div>
      ) : (
        <div>
          <label>Precio:</label>
          <span>${cliente?.precio_venta}</span>
        </div>
      )}

      <button type="submit">Guardar</button>
    </form>
  );
}
```

---

## 📝 Paso 8: Tablas con Acciones Condicionales

```typescript
'use client';
import { usePermissions, PERMISOS } from '@/lib/permissions';
import { ProtectedAction } from '@/components/permissions/ProtectedAction';

export function ClientesTable({ clientes }: { clientes: Cliente[] }) {
  const { tienePermiso } = usePermissions();

  const puedeEditar = tienePermiso(PERMISOS.CLIENTES.EDITAR_TODOS);
  const puedeEliminar = tienePermiso(PERMISOS.CLIENTES.ELIMINAR);

  return (
    <table>
      <thead>
        <tr>
          <th>Nombre</th>
          <th>Email</th>
          <th>Estado</th>
          {/* ✅ Columna de acciones solo si tiene algún permiso */}
          {(puedeEditar || puedeEliminar) && <th>Acciones</th>}
        </tr>
      </thead>
      <tbody>
        {clientes.map(cliente => (
          <tr key={cliente.id}>
            <td>{cliente.nombre}</td>
            <td>{cliente.email}</td>
            <td>{cliente.estado_cliente}</td>

            {(puedeEditar || puedeEliminar) && (
              <td className="flex gap-2">
                <ProtectedAction permiso={PERMISOS.CLIENTES.EDITAR_TODOS}>
                  <button onClick={() => handleEditar(cliente.id)}>
                    Editar
                  </button>
                </ProtectedAction>

                <ProtectedAction permiso={PERMISOS.CLIENTES.ELIMINAR}>
                  <button
                    onClick={() => handleEliminar(cliente.id)}
                    className="text-red-600"
                  >
                    Eliminar
                  </button>
                </ProtectedAction>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

---

## 🎯 Checklist de Integración

- [ ] ✅ Ejecutar tablas de permisos en Supabase
- [ ] ✅ Actualizar permisos en la tabla `crm.rol` con los códigos correctos
- [ ] ✅ Proteger todas las Server Actions críticas con `requierePermiso()`
- [ ] ✅ Proteger todas las páginas administrativas con `protegerRuta()` o `soloAdmins()`
- [ ] ✅ Actualizar componentes de UI para mostrar/ocultar según permisos
- [ ] ✅ Actualizar menú de navegación con verificación de permisos
- [ ] ✅ Implementar verificación de acceso a recursos específicos
- [ ] ✅ Agregar auditoría en acciones críticas
- [ ] ✅ Probar con diferentes roles (admin, coordinador, vendedor)

---

## 📝 Paso 9: Auditoría y Refinamiento

Con el sistema ya integrado, establece un ciclo de control permanente:

### 1. Revisar logs de auditoría
- Ejecuta el bloque 9 del script `scripts/verificar-permisos.sql` o usa:
  ```sql
  SELECT created_at, permiso_codigo, resultado, metadata
  FROM crm.auditoria_permiso
  WHERE created_at >= now() - interval '30 days'
  ORDER BY created_at DESC;
  ```
- Filtra por `resultado = 'denegado'` para detectar intentos sospechosos.

### 2. Ajustar permisos según feedback
- Modifica la lista `permisos` dentro de `crm.rol` usando `jsonb`.
- Registra cada cambio en un changelog interno y vuelve a ejecutar el script de verificación.

### 3. Agregar condiciones especiales
- Usa la tabla `crm.permiso_condicion` para definir límites.
- Desde el código pasa el valor actual con el nuevo tercer argumento opcional de `requierePermiso`:
  ```ts
  await requierePermiso(
    PERMISOS.PRECIOS.MODIFICAR,
    { accion: 'cambiar_precio', recurso_id: loteId },
    { valorActual: nuevoPrecio }
  );
  ```
- La función `verificar_condicion_permiso` se encarga de evaluar topes y solicitudes de aprobación.

### 4. Documentar procedimientos internos
- Define responsables (ej. coordinador de TI y gerente comercial).
- Agenda revisiones semanales/mensuales y registra hallazgos en tu wiki.
- Incluye plantillas para solicitudes de cambios de permisos y para reportes de auditoría.

Con este paso tendrás trazabilidad completa y un marco claro para operar el sistema de permisos en producción.
- [ ] ✅ Verificar que RLS de Supabase esté alineado con permisos de código

---

## ⚠️ Consideraciones Importantes

1. **Doble verificación**: Siempre verifica permisos tanto en el cliente (UI) como en el servidor (acciones)
2. **RLS complementario**: Los permisos de código trabajan junto con RLS de Supabase, no lo reemplazan
3. **Auditoría**: Usa `requierePermiso()` con metadata en acciones críticas para tener trazabilidad
4. **Constantes**: Siempre usa `PERMISOS.MODULO.ACCION` en lugar de strings para evitar typos
5. **Testing**: Prueba cada rol para asegurar que solo ve/hace lo que debe

---

## 🚀 Próximos Pasos

1. Integrar el sistema de permisos en tus páginas principales
2. Actualizar tus Server Actions existentes
3. Modificar componentes de UI para usar `ProtectedAction`
4. Probar con usuarios de diferentes roles
5. Revisar logs de auditoría para detectar intentos de acceso no autorizado
