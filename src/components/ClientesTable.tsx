"use client";

import { useState, useTransition, memo, useMemo } from "react";
import { actualizarCliente, eliminarCliente } from "@/app/dashboard/clientes/_actions";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/errors";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Pagination } from "@/components/Pagination";
import { usePagination } from "@/hooks/usePagination";
import ClienteForm from "@/components/ClienteForm";
import { 
  getEstadoClienteColor, 
  getEstadoClienteLabel, 
  formatCapacidadCompra, 
  formatSaldoPendiente 
} from "@/lib/types/clientes";

type Cliente = { 
  id: string; 
  codigo_cliente: string;
  nombre: string; 
  tipo_cliente: string;
  email: string | null;
  telefono: string | null;
  telefono_whatsapp: string | null;
  documento_identidad: string | null;
  estado_cliente: string;
  origen_lead: string | null;
  vendedor_asignado: string | null;
  fecha_alta: string;
  ultimo_contacto: string | null;
  proxima_accion: string | null;
  interes_principal: string | null;
  capacidad_compra_estimada: number | null;
  forma_pago_preferida: string | null;
  propiedades_reservadas: number;
  propiedades_compradas: number;
  propiedades_alquiladas: number;
  saldo_pendiente: number;
  notas: string | null;
  direccion: any;
};

interface ClientesTableProps {
  clientes: Cliente[];
}

export default function ClientesTable({ clientes }: ClientesTableProps) {
  const [editing, setEditing] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState<{ open: boolean; id: string | null; nombre?: string }>({
    open: false,
    id: null,
  });
  const [filters, setFilters] = useState({
    estado: '',
    tipo: '',
    vendedor: '',
    search: ''
  });
  const [sortBy, setSortBy] = useState<keyof Cliente>('fecha_alta');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const router = useRouter();

  // Filtrar y ordenar clientes
  const filteredAndSortedClientes = useMemo(() => {
    let filtered = clientes.filter(cliente => {
      const matchesSearch = !filters.search || 
        cliente.nombre.toLowerCase().includes(filters.search.toLowerCase()) ||
        cliente.email?.toLowerCase().includes(filters.search.toLowerCase()) ||
        cliente.codigo_cliente.toLowerCase().includes(filters.search.toLowerCase());
      
      const matchesEstado = !filters.estado || cliente.estado_cliente === filters.estado;
      const matchesTipo = !filters.tipo || cliente.tipo_cliente === filters.tipo;
      const matchesVendedor = !filters.vendedor || cliente.vendedor_asignado === filters.vendedor;
      
      return matchesSearch && matchesEstado && matchesTipo && matchesVendedor;
    });

    // Ordenar
    filtered.sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOrder === 'asc' 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      return 0;
    });

    return filtered;
  }, [clientes, filters, sortBy, sortOrder]);

  // Paginación
  const {
    currentPage,
    totalPages,
    paginatedItems,
    goToPage,
  } = usePagination({
    items: filteredAndSortedClientes,
    itemsPerPage: 20,
  });

  // Memoizar funciones para evitar re-renders innecesarios
  const handleEdit = useMemo(() => (id: string) => setEditing(id), []);
  const handleCancelEdit = useMemo(() => () => setEditing(null), []);
  const handleAfterSave = useMemo(() => () => {
    setEditing(null);
    router.refresh();
  }, [router]);

  const askDelete = (c: Cliente) => setConfirm({ open: true, id: c.id, nombre: c.nombre });

  const doDelete = () => {
    if (!confirm.id) return;
    startTransition(async () => {
      try {
        await eliminarCliente(confirm.id!);
        toast.success("Cliente eliminado");
        setConfirm({ open: false, id: null });
        router.refresh();
      } catch (err: unknown) {
        toast.error(getErrorMessage(err) || "No se pudo eliminar");
      }
    });
  };

  const handleSort = (column: keyof Cliente) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (column: keyof Cliente) => {
    if (sortBy !== column) return null;
    return sortOrder === 'asc' ? '↑' : '↓';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getVendedores = () => {
    const vendedores = [...new Set(clientes.map(c => c.vendedor_asignado).filter(Boolean))];
    return vendedores;
  };

  if (editing) {
    const cliente = clientes.find(c => c.id === editing);
    if (!cliente) return null;
    
    return (
      <ClienteForm
        cliente={cliente}
        isEditing={true}
        onSuccess={handleAfterSave}
        onCancel={handleCancelEdit}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="crm-card p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-crm-text-primary mb-2">Buscar</label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              placeholder="Nombre, email o código..."
              className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-crm-text-primary mb-2">Estado</label>
            <select
              value={filters.estado}
              onChange={(e) => setFilters(prev => ({ ...prev, estado: e.target.value }))}
              className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary"
            >
              <option value="">Todos los estados</option>
              <option value="prospecto">Prospecto</option>
              <option value="lead">Lead</option>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-crm-text-primary mb-2">Tipo</label>
            <select
              value={filters.tipo}
              onChange={(e) => setFilters(prev => ({ ...prev, tipo: e.target.value }))}
              className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary"
            >
              <option value="">Todos los tipos</option>
              <option value="persona">Persona Natural</option>
              <option value="empresa">Empresa</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-crm-text-primary mb-2">Vendedor</label>
            <select
              value={filters.vendedor}
              onChange={(e) => setFilters(prev => ({ ...prev, vendedor: e.target.value }))}
              className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary"
            >
              <option value="">Todos los vendedores</option>
              {getVendedores().map(vendedor => (
                <option key={vendedor} value={vendedor}>{vendedor}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="crm-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-crm-card-hover border-b border-crm-border">
              <tr>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-crm-text-muted uppercase tracking-wider cursor-pointer hover:bg-crm-border"
                  onClick={() => handleSort('codigo_cliente')}
                >
                  Código {getSortIcon('codigo_cliente')}
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-crm-text-muted uppercase tracking-wider cursor-pointer hover:bg-crm-border"
                  onClick={() => handleSort('nombre')}
                >
                  Cliente {getSortIcon('nombre')}
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-crm-text-muted uppercase tracking-wider cursor-pointer hover:bg-crm-border"
                  onClick={() => handleSort('estado_cliente')}
                >
                  Estado {getSortIcon('estado_cliente')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-crm-text-muted uppercase tracking-wider">
                  Contacto
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-crm-text-muted uppercase tracking-wider cursor-pointer hover:bg-crm-border"
                  onClick={() => handleSort('capacidad_compra_estimada')}
                >
                  Capacidad {getSortIcon('capacidad_compra_estimada')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-crm-text-muted uppercase tracking-wider">
                  Propiedades
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-crm-text-muted uppercase tracking-wider cursor-pointer hover:bg-crm-border"
                  onClick={() => handleSort('fecha_alta')}
                >
                  Fecha Alta {getSortIcon('fecha_alta')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-crm-text-muted uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-crm-border">
              {paginatedItems.map((cliente) => (
                <ClienteRow
                  key={cliente.id}
                  cliente={cliente}
                  onEdit={handleEdit}
                  onDelete={askDelete}
                  isPending={isPending}
                />
              ))}
            </tbody>
          </table>
        </div>

        {paginatedItems.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-crm-card-hover rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-crm-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
              </svg>
            </div>
            <h4 className="text-lg font-medium text-crm-text-primary mb-2">No hay clientes</h4>
            <p className="text-crm-text-muted">
              {filters.search || filters.estado || filters.tipo || filters.vendedor
                ? "No se encontraron clientes con los filtros aplicados"
                : "Comienza agregando tu primer cliente"
              }
            </p>
          </div>
        )}

        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-crm-border">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={goToPage}
              className="justify-center"
            />
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirm.open}
        title="Eliminar cliente"
        description={`Vas a eliminar a "${confirm.nombre ?? ""}". Esta acción no se puede deshacer.`}
        confirmText={isPending ? "Eliminando…" : "Eliminar"}
        onConfirm={doDelete}
        onClose={() => setConfirm({ open: false, id: null })}
        disabled={isPending}
      />
    </div>
  );
}

// Componente memoizado para cada fila de cliente
const ClienteRow = memo(function ClienteRow({
  cliente,
  onEdit,
  onDelete,
  isPending,
}: {
  cliente: Cliente;
  onEdit: (id: string) => void;
  onDelete: (c: Cliente) => void;
  isPending: boolean;
}) {
  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'activo': return 'bg-green-100 text-green-800 border-green-200';
      case 'lead': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'prospecto': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'inactivo': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <tr className="hover:bg-crm-card-hover transition-colors">
      {/* Código */}
      <td className="px-4 py-4 whitespace-nowrap">
        <div className="text-sm font-mono text-crm-text-primary">
          {cliente.codigo_cliente || 'N/A'}
        </div>
      </td>

      {/* Cliente */}
      <td className="px-4 py-4">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-crm-primary/10 rounded-full flex items-center justify-center mr-3">
            <svg className="w-5 h-5 text-crm-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
            </svg>
          </div>
          <div>
            <div className="text-sm font-medium text-crm-text-primary">{cliente.nombre}</div>
            <div className="text-xs text-crm-text-muted capitalize">
              {cliente.tipo_cliente === 'persona' ? 'Persona Natural' : 
               cliente.tipo_cliente === 'empresa' ? 'Empresa' : 'No especificado'}
            </div>
          </div>
        </div>
      </td>

      {/* Estado */}
      <td className="px-4 py-4 whitespace-nowrap">
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getEstadoColor(cliente.estado_cliente || 'prospecto')}`}>
          {getEstadoClienteLabel(cliente.estado_cliente as any)}
        </span>
      </td>

      {/* Contacto */}
      <td className="px-4 py-4">
        <div className="space-y-1">
          {cliente.email && (
            <div className="text-sm text-crm-text-primary flex items-center">
              <svg className="w-3 h-3 mr-1 text-crm-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
              </svg>
              {cliente.email}
            </div>
          )}
          {cliente.telefono && (
            <div className="text-sm text-crm-text-muted flex items-center">
              <svg className="w-3 h-3 mr-1 text-crm-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
              </svg>
              {cliente.telefono}
            </div>
          )}
          {!cliente.email && !cliente.telefono && (
            <div className="text-sm text-crm-text-muted">Sin contacto</div>
          )}
        </div>
      </td>

      {/* Capacidad */}
      <td className="px-4 py-4 whitespace-nowrap">
        <div className="text-sm text-crm-text-primary">
          {formatCapacidadCompra(cliente.capacidad_compra_estimada)}
        </div>
      </td>

      {/* Propiedades */}
      <td className="px-4 py-4 whitespace-nowrap">
        <div className="flex space-x-4 text-sm">
          <div className="text-center">
            <div className="font-medium text-crm-text-primary">{cliente.propiedades_reservadas}</div>
            <div className="text-xs text-crm-text-muted">Res.</div>
          </div>
          <div className="text-center">
            <div className="font-medium text-crm-text-primary">{cliente.propiedades_compradas}</div>
            <div className="text-xs text-crm-text-muted">Comp.</div>
          </div>
          <div className="text-center">
            <div className="font-medium text-crm-text-primary">{cliente.propiedades_alquiladas}</div>
            <div className="text-xs text-crm-text-muted">Alq.</div>
          </div>
        </div>
      </td>

      {/* Fecha Alta */}
      <td className="px-4 py-4 whitespace-nowrap">
        <div className="text-sm text-crm-text-primary">
          {formatDate(cliente.fecha_alta)}
        </div>
      </td>

      {/* Acciones */}
      <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onEdit(cliente.id)}
            className="text-crm-primary hover:text-crm-primary/80 transition-colors"
            title="Editar"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
          </button>
          {cliente.telefono && (
            <a
              href={`tel:${cliente.telefono}`}
              className="text-crm-success hover:text-crm-success/80 transition-colors"
              title="Llamar"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
              </svg>
            </a>
          )}
          {cliente.email && (
            <a
              href={`mailto:${cliente.email}`}
              className="text-crm-warning hover:text-crm-warning/80 transition-colors"
              title="Enviar email"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
              </svg>
            </a>
          )}
          <button
            onClick={() => onDelete(cliente)}
            className="text-crm-danger hover:text-crm-danger/80 transition-colors"
            disabled={isPending}
            title="Eliminar"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
          </button>
        </div>
      </td>
    </tr>
  );
});
