"use client";

import { useState, useTransition, memo, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  eliminarCliente,
  actualizarEstadoCliente,
  eliminarClientesMasivo,
  asignarVendedorMasivo,
  cambiarEstadoMasivo,
  obtenerVendedores,
  obtenerTodosLosClientes
} from "@/app/dashboard/clientes/_actions";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/errors";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Pagination } from "@/components/Pagination";
import ClienteForm from "@/components/ClienteForm";
import ClienteDetailModalComplete from "@/components/ClienteDetailModalComplete";
import RegistrarContactoModal from "@/components/RegistrarContactoModal";
import { exportFilteredClientes, addCountToFilters, type ClienteExportFilters } from "@/lib/export/filteredExport";
import { Download, Loader2 } from "lucide-react";
import { usePermissions, PERMISOS } from "@/lib/permissions";
import {
  getEstadoClienteLabel,
  ESTADOS_CLIENTE_OPTIONS,
  EstadoCliente,
  DireccionCliente,
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
  direccion: DireccionCliente | null;
  propiedades?: Array<{
    direccion?: string;
    distrito?: string;
    provincia?: string;
    partida_sunarp?: string;
    lote_manzana?: string;
    area_terreno?: number;
    area_techada?: number;
    estado?: string;
    precio?: number;
  }>;
};

interface ClientesTableProps {
  clientes: Cliente[];
  total: number;
  currentPage: number;
  totalPages: number;
  searchQuery?: string;
  searchTelefono?: string;
  searchDni?: string;
  estado?: string;
  tipo?: string;
  vendedor?: string;
  origen?: string;  // Filtro por origen del lead
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export default function ClientesTable({
  clientes,
  total,
  currentPage,
  totalPages,
  searchQuery = '',
  searchTelefono = '',
  searchDni = '',
  estado = '',
  tipo = '',
  vendedor = '',
  origen = '',
  sortBy: initialSortBy = 'fecha_alta',
  sortOrder: initialSortOrder = 'desc'
}: ClientesTableProps) {
  const [editing, setEditing] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState<{ open: boolean; id: string | null; nombre?: string }>({
    open: false,
    id: null,
  });
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showContactoModal, setShowContactoModal] = useState(false);
  const [pendingEstadoChange, setPendingEstadoChange] = useState<{
    clienteId: string;
    nuevoEstado: EstadoCliente;
  } | null>(null);
  const router = useRouter();

  // Verificar permisos
  const { tienePermiso, esAdminOCoordinador, tieneAlgunoDeRoles } = usePermissions();
  const esSupervisor = esAdminOCoordinador();
  const puedeFiltrarPorVendedor = tieneAlgunoDeRoles(['ROL_ADMIN', 'ROL_COORDINADOR_VENTAS', 'ROL_GERENTE']);
  const puedeEliminarClientes = tienePermiso(PERMISOS.CLIENTES.ELIMINAR);
  const puedeReasignarClientes = esSupervisor || tienePermiso(PERMISOS.CLIENTES.REASIGNAR);
  const puedeCambiarEstadoClientes = esSupervisor || tienePermiso(PERMISOS.CLIENTES.EDITAR_TODOS);
  const puedeEditarClientes = esSupervisor || tienePermiso(PERMISOS.CLIENTES.EDITAR_TODOS);
  const puedeGestionarSeleccion = puedeCambiarEstadoClientes || puedeReasignarClientes || puedeEliminarClientes;
  const puedeExportarClientes = esSupervisor; // Solo admin/coordinador

  // Estado para lista de vendedores
  const [vendedores, setVendedores] = useState<Array<{ id: string; username: string; nombre_completo: string; email: string }>>([]);
  const [loadingVendedores, setLoadingVendedores] = useState(false);

  // Estado local para búsqueda
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);
  const [isSearching, setIsSearching] = useState(false);

  // Actualizar búsqueda local cuando cambie el prop
  useEffect(() => {
    setLocalSearchQuery(searchQuery);
    setIsSearching(false); // Resetear spinner cuando llegan los resultados
  }, [searchQuery]);

  // Cargar lista de vendedores disponibles (para filtros y acciones)
  useEffect(() => {
    let isMounted = true;
    setLoadingVendedores(true);
    obtenerVendedores()
      .then((data) => {
        if (isMounted) {
          setVendedores(data);
        }
      })
      .catch((error) => {
        console.error('Error cargando vendedores:', error);
      })
      .finally(() => {
        if (isMounted) {
          setLoadingVendedores(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Búsqueda automática con debounce
  useEffect(() => {
    // Solo ejecutar si el valor local es diferente al prop
    if (localSearchQuery === searchQuery) {
      setIsSearching(false);
      return;
    }

    // Requiere mínimo 2 caracteres para buscar (evita búsquedas innecesarias)
    if (localSearchQuery.length > 0 && localSearchQuery.length < 2) {
      setIsSearching(false);
      return;
    }

    // Mostrar indicador de búsqueda
    setIsSearching(true);

    const timer = setTimeout(() => {
      handleSearch(localSearchQuery);
      // El isSearching se resetea cuando cambia searchQuery (prop)
    }, 400); // Espera 400ms después de que el usuario deja de escribir

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localSearchQuery]);

  const sortBy = initialSortBy as keyof Cliente;
  const sortOrder = initialSortOrder;

  const baseFilters: ClienteExportFilters = {
    q: searchQuery || undefined,
    telefono: searchTelefono || undefined,
    dni: searchDni || undefined,
    estado: estado || undefined,
    tipo: tipo || undefined,
    vendedor: vendedor || undefined,
    origen: origen || undefined,
    sortBy: initialSortBy,
    sortOrder: initialSortOrder,
  };

  // Estado para selección múltiple
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<'delete' | 'assignVendedor' | 'changeEstado' | null>(null);
  const [bulkVendedor, setBulkVendedor] = useState('');
  const [bulkEstado, setBulkEstado] = useState<EstadoCliente>('por_contactar');
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [exportingSelected, setExportingSelected] = useState(false);
  const [exportingAll, setExportingAll] = useState(false);

  // Ya no necesitamos filtrar ni ordenar localmente, el servidor lo hace
  // Los clientes vienen ya filtrados, ordenados y paginados del servidor

  // Funciones de selección múltiple
  const toggleSelectAll = () => {
    if (selectedIds.size === clientes.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(clientes.map(c => c.id)));
    }
  };

  const toggleSelectOne = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const isAllSelected = clientes.length > 0 && selectedIds.size === clientes.length;
  const isSomeSelected = selectedIds.size > 0 && selectedIds.size < clientes.length;

  // Ejecutar acciones masivas
  useEffect(() => {
    if (!bulkAction) return;

    const executeAction = async () => {
      const idsArray = Array.from(selectedIds);

      if (idsArray.length === 0) {
        toast.error('No hay clientes seleccionados');
        setBulkAction(null);
        return;
      }

      startTransition(async () => {
        try {
          if (bulkAction === 'delete') {
            // Mostrar diálogo de confirmación personalizado
            setConfirmBulkDelete(true);
            setBulkAction(null);
            return;
          } else if (bulkAction === 'assignVendedor') {
            if (!bulkVendedor) {
              toast.error('Debes seleccionar un vendedor');
              setBulkAction(null);
              return;
            }

            await asignarVendedorMasivo(idsArray, bulkVendedor);
            toast.success(`${idsArray.length} ${idsArray.length === 1 ? 'cliente asignado' : 'clientes asignados'} exitosamente`);
            setSelectedIds(new Set());
            setBulkVendedor('');
            router.refresh();
          } else if (bulkAction === 'changeEstado') {
            await cambiarEstadoMasivo(idsArray, bulkEstado);
            toast.success(`Estado cambiado a "${getEstadoClienteLabel(bulkEstado)}" para ${idsArray.length} ${idsArray.length === 1 ? 'cliente' : 'clientes'}`);
            setSelectedIds(new Set());
            router.refresh();
          }
        } catch (error) {
          toast.error(getErrorMessage(error) || 'Error ejecutando la acción');
        } finally {
          setBulkAction(null);
        }
      });
    };

    executeAction();
  }, [bulkAction, selectedIds, bulkVendedor, bulkEstado, router]);

  // Ejecutar eliminación masiva después de confirmación
  const handleConfirmBulkDelete = async () => {
    const idsArray = Array.from(selectedIds);

    startTransition(async () => {
      try {
        await eliminarClientesMasivo(idsArray);
        toast.success(`${idsArray.length} ${idsArray.length === 1 ? 'cliente eliminado' : 'clientes eliminados'} exitosamente`);
        setSelectedIds(new Set());
        setConfirmBulkDelete(false);
        router.refresh();
      } catch (error) {
        toast.error(getErrorMessage(error) || 'Error eliminando clientes');
      }
    });
  };

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

  const handleShowDetail = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setShowDetailModal(true);
  };

  const handleCloseDetail = () => {
    setShowDetailModal(false);
    setSelectedCliente(null);
  };


  const handleSort = (column: keyof Cliente) => {
    const newSortOrder = sortBy === column ? (sortOrder === 'asc' ? 'desc' : 'asc') : 'asc';

    // Construir URL params manteniendo los filtros actuales
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    if (searchTelefono) params.set('telefono', searchTelefono);
    if (searchDni) params.set('dni', searchDni);
    if (estado) params.set('estado', estado);
    if (tipo) params.set('tipo', tipo);
    if (vendedor) params.set('vendedor', vendedor);
    params.set('sortBy', column);
    params.set('sortOrder', newSortOrder);
    params.set('page', '1'); // Resetear a página 1 al ordenar

    router.push(`/dashboard/clientes?${params.toString()}`);
  };

  const goToPage = (page: number) => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    if (searchTelefono) params.set('telefono', searchTelefono);
    if (searchDni) params.set('dni', searchDni);
    if (estado) params.set('estado', estado);
    if (tipo) params.set('tipo', tipo);
    if (vendedor) params.set('vendedor', vendedor);
    if (sortBy) params.set('sortBy', sortBy);
    if (sortOrder) params.set('sortOrder', sortOrder);
    params.set('page', page.toString());

    router.push(`/dashboard/clientes?${params.toString()}`);
  };

  const getSortIcon = (column: keyof Cliente) => {
    if (sortBy !== column) return null;
    return sortOrder === 'asc' ? '↑' : '↓';
  };

  if (editing) {
    const cliente = clientes.find(c => c.id === editing);
    if (!cliente) return null;

    type ClienteFormProps = React.ComponentProps<typeof ClienteForm>;
    type ClienteFormCliente = NonNullable<ClienteFormProps["cliente"]>;

    const clienteForForm: ClienteFormCliente = {
      id: cliente.id,
      nombre: cliente.nombre,
      tipo_cliente: cliente.tipo_cliente,
      ...(cliente.email ? { email: cliente.email } : {}),
      ...(cliente.telefono ? { telefono: cliente.telefono } : {}),
      ...(cliente.documento_identidad ? { documento_identidad: cliente.documento_identidad } : {}),
      ...(cliente.telefono_whatsapp ? { telefono_whatsapp: cliente.telefono_whatsapp } : {}),
      ...(cliente.direccion ? { direccion: cliente.direccion } : {}),
      estado_cliente: cliente.estado_cliente,
      ...(cliente.origen_lead ? { origen_lead: cliente.origen_lead } : {}),
      ...(cliente.vendedor_asignado ? { vendedor_asignado: cliente.vendedor_asignado } : {}),
      ...(cliente.interes_principal ? { interes_principal: cliente.interes_principal } : {}),
      ...(cliente.notas ? { notas: cliente.notas } : {}),
    };
    
    return (
      <ClienteForm
        cliente={clienteForForm}
        isEditing={true}
        onSuccess={handleAfterSave}
        onCancel={handleCancelEdit}
      />
    );
  }

  // Función para aplicar búsqueda
  const handleSearch = (value: string) => {
    const params = new URLSearchParams();
    if (value.trim()) params.set('q', value.trim());
    if (searchTelefono) params.set('telefono', searchTelefono);
    if (searchDni) params.set('dni', searchDni);
    if (estado) params.set('estado', estado);
    if (tipo) params.set('tipo', tipo);
    if (vendedor) params.set('vendedor', vendedor);
    if (origen) params.set('origen', origen);
    if (sortBy) params.set('sortBy', sortBy);
    if (sortOrder) params.set('sortOrder', sortOrder);
    params.set('page', '1'); // Resetear a página 1 al buscar

    router.push(`/dashboard/clientes?${params.toString()}`);
  };

  // Limpiar búsqueda
  const handleClearSearch = () => {
    setLocalSearchQuery('');
    handleSearch('');
  };

  const handleVendedorFilterChange = (value: string) => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    if (searchTelefono) params.set('telefono', searchTelefono);
    if (searchDni) params.set('dni', searchDni);
    if (estado) params.set('estado', estado);
    if (tipo) params.set('tipo', tipo);
    if (origen) params.set('origen', origen);
    if (value) params.set('vendedor', value);
    if (sortBy) params.set('sortBy', sortBy);
    if (sortOrder) params.set('sortOrder', sortOrder);
    params.set('page', '1');

    router.push(`/dashboard/clientes?${params.toString()}`);
  };

  const handleClearVendedorFilter = () => {
    handleVendedorFilterChange('');
  };

  // Manejar cambio de estado con modal de contacto
  const handleEstadoChange = async (cliente: Cliente, nuevoEstado: EstadoCliente) => {
    const estadoActual = (cliente.estado_cliente || 'por_contactar') as EstadoCliente;

    // Si está cambiando de "por_contactar" a "contactado", mostrar modal para registrar la interacción
    if (estadoActual === 'por_contactar' && nuevoEstado === 'contactado') {
      setSelectedCliente(cliente);
      setPendingEstadoChange({ clienteId: cliente.id, nuevoEstado });
      setShowContactoModal(true);
      return;
    }

    // Para otros cambios de estado, proceder normalmente
    try {
      await actualizarEstadoCliente(cliente.id, nuevoEstado);
      toast.success(`Estado cambiado a ${getEstadoClienteLabel(nuevoEstado)}`);
      router.refresh();
    } catch (error) {
      toast.error(getErrorMessage(error) || 'Error cambiando estado');
    }
  };

  // Manejar el registro de contacto exitoso
  const handleContactoRegistrado = async () => {
    // Cerrar el modal
    setShowContactoModal(false);

    // Cambiar el estado del cliente
    if (pendingEstadoChange) {
      try {
        await actualizarEstadoCliente(pendingEstadoChange.clienteId, pendingEstadoChange.nuevoEstado);
        toast.success(`Estado cambiado a ${getEstadoClienteLabel(pendingEstadoChange.nuevoEstado)}`);
        router.refresh();
      } catch (error) {
        toast.error(getErrorMessage(error) || 'Error cambiando estado');
      } finally {
        setPendingEstadoChange(null);
        setSelectedCliente(null);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Barra de búsqueda */}
      <div className="crm-card p-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar por nombre, email, teléfono o código..."
            value={localSearchQuery}
            onChange={(e) => setLocalSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setIsSearching(false);
                handleSearch(localSearchQuery);
              }
            }}
            className="w-full px-4 py-2 pl-10 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary placeholder-crm-text-muted focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-crm-primary"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-crm-text-muted"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {/* Barra de progreso de búsqueda */}
          {isSearching && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-crm-border rounded-b-lg overflow-hidden">
              <div className="h-full bg-crm-primary animate-[progress_1s_ease-in-out_infinite]" style={{ width: '30%' }} />
            </div>
          )}
          {localSearchQuery && (
            <button
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-crm-text-muted hover:text-crm-text-primary"
              title="Limpiar búsqueda"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        {searchQuery && (
          <p className="text-sm text-crm-text-muted mt-2">
            Se encontraron {total} resultado{total === 1 ? '' : 's'} para "{searchQuery}"
          </p>
        )}

        {puedeFiltrarPorVendedor && (
          <div className="mt-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-medium text-crm-text-primary">
                Filtrar por vendedor asignado
              </p>
              <div className="flex flex-col sm:flex-row gap-2 sm:items-center w-full sm:w-auto">
                <select
                  value={vendedor || ''}
                  onChange={(e) => handleVendedorFilterChange(e.target.value)}
                  disabled={loadingVendedores}
                  className="w-full sm:w-64 px-3 py-2 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-crm-primary disabled:opacity-60"
                >
                  <option value="">
                    {loadingVendedores ? 'Cargando vendedores...' : 'Todos los vendedores'}
                  </option>
                  {vendedores.map((vend) => (
                    <option key={vend.id} value={vend.username}>
                      {vend.nombre_completo ? `${vend.nombre_completo} (@${vend.username})` : `@${vend.username}`}
                    </option>
                  ))}
                  {!loadingVendedores && vendedor && !vendedores.some((vend) => vend.username === vendedor) && (
                    <option value={vendedor}>@{vendedor}</option>
                  )}
                </select>
                {vendedor && (
                  <button
                    type="button"
                    onClick={handleClearVendedorFilter}
                    className="inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-crm-text-secondary border border-crm-border rounded-lg hover:bg-crm-card-hover"
                  >
                    Limpiar filtro
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Barra de acciones masivas - Solo visible para roles con permisos */}
      {selectedIds.size > 0 && puedeGestionarSeleccion && (
        <div className="crm-card p-4 bg-crm-card-hover border border-crm-border">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="text-sm font-semibold text-crm-text-primary">
                {selectedIds.size} {selectedIds.size === 1 ? 'cliente seleccionado' : 'clientes seleccionados'}
              </span>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-sm text-crm-text-muted hover:text-crm-primary transition-colors underline"
              >
                Deseleccionar todo
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Cambiar Estado */}
              {puedeCambiarEstadoClientes && (
                <div className="flex items-center gap-2">
                  <select
                    value={bulkEstado}
                    onChange={(e) => setBulkEstado(e.target.value as EstadoCliente)}
                    className="text-sm border border-crm-border rounded-lg px-3 py-2 bg-crm-card text-crm-text-primary focus:ring-2 focus:ring-crm-primary/20 focus:border-crm-primary transition-all"
                  >
                    {ESTADOS_CLIENTE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => setBulkAction('changeEstado')}
                    disabled={isPending}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-crm-primary hover:bg-crm-primary/90 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    Cambiar Estado
                  </button>
                </div>
              )}

              {/* Asignar Vendedor - Dropdown con lista de vendedores */}
              {puedeReasignarClientes && (
                <div className="flex items-center gap-2">
                  <select
                    value={bulkVendedor}
                    onChange={(e) => setBulkVendedor(e.target.value)}
                    disabled={loadingVendedores}
                    className="text-sm border border-crm-border rounded-lg px-3 py-2 bg-crm-card text-crm-text-primary focus:ring-2 focus:ring-crm-primary/20 focus:border-crm-primary transition-all min-w-[200px]"
                  >
                    <option value="">
                      {loadingVendedores ? 'Cargando...' : 'Seleccionar vendedor'}
                    </option>
                    {vendedores.map((vendedor) => (
                      <option key={vendedor.id} value={vendedor.username}>
                        {vendedor.nombre_completo} (@{vendedor.username})
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => setBulkAction('assignVendedor')}
                    disabled={isPending || !bulkVendedor || loadingVendedores}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-crm-primary hover:bg-crm-primary/90 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                    </svg>
                    Asignar Vendedor
                  </button>
                </div>
              )}

              {/* Eliminar */}
              {puedeEliminarClientes && (
                <button
                  onClick={() => setBulkAction('delete')}
                  disabled={isPending}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-crm-danger hover:bg-crm-danger/90 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                  </svg>
                  Eliminar
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedIds.size > 0 && !puedeGestionarSeleccion && (
        <div className="crm-card p-4 bg-crm-card-hover border border-dashed border-crm-border text-sm text-crm-text-muted">
          Seleccionaste {selectedIds.size === 1 ? 'un cliente' : `${selectedIds.size} clientes`}, pero tu rol no cuenta con acciones masivas disponibles. Si necesitas ayuda, contacta a tu coordinador.
        </div>
      )}

      {/* Tabla */}
      <div className="crm-card overflow-hidden">
        <div className="flex justify-between items-start px-4 py-3 border-b border-crm-border bg-crm-card-hover">
          <div>
            <h3 className="text-sm font-semibold text-crm-text-primary">Listado de clientes</h3>
            <p className="text-xs text-crm-text-muted">
              Mostrando {clientes.length} de {total} cliente{total === 1 ? '' : 's'}
            </p>
          </div>
          {puedeExportarClientes && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={async () => {
                  if (selectedIds.size === 0) {
                    toast.error('Selecciona al menos un cliente');
                    return;
                  }
                  try {
                    setExportingSelected(true);
                    const selectedData = clientes.filter((c) => selectedIds.has(c.id));
                    await exportFilteredClientes(selectedData, addCountToFilters(baseFilters, selectedData.length), 'excel', {
                      fileName: 'clientes-seleccionados',
                      includeFiltersSheet: true,
                      includeTimestamp: true,
                    });
                    toast.success('Exportación de seleccionados completada');
                  } catch (error) {
                    console.error(error);
                    toast.error('Error exportando seleccionados');
                  } finally {
                    setExportingSelected(false);
                  }
                }}
                disabled={exportingSelected || selectedIds.size === 0}
                className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border border-crm-border text-crm-text-primary hover:bg-crm-card-hover disabled:opacity-50"
              >
                {exportingSelected ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                {exportingSelected ? 'Exportando...' : 'Exportar seleccionados'}
              </button>
              <button
                onClick={async () => {
                  try {
                    setExportingAll(true);
                    const full = await obtenerTodosLosClientes({
                      searchTerm: searchQuery,
                      searchTelefono,
                      searchDni,
                      estado,
                      tipo,
                      vendedor,
                      sortBy: initialSortBy,
                      sortOrder: initialSortOrder,
                    });
                    await exportFilteredClientes(full.data, addCountToFilters(baseFilters, full.total), 'excel', {
                      fileName: 'clientes',
                      includeFiltersSheet: true,
                      includeTimestamp: true,
                    });
                    toast.success(`Exportación completada (${full.total} registros)`);
                  } catch (error) {
                    console.error(error);
                    toast.error('Error exportando clientes');
                  } finally {
                    setExportingAll(false);
                  }
                }}
                disabled={exportingAll}
                className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg bg-crm-primary text-white hover:bg-crm-primary/90 disabled:opacity-50"
              >
                {exportingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {exportingAll ? 'Exportando todo...' : 'Exportar todos'}
              </button>
            </div>
          )}
        </div>

        {/* Vista mobile */}
        <div className="sm:hidden px-4 py-4 space-y-4">
          {clientes.map((cliente, index) => {
            const estadoLabel = getEstadoClienteLabel(cliente.estado_cliente as EstadoCliente);
            return (
              <div
                key={`mobile-${index}-${cliente.id}`}
                className="rounded-2xl border border-crm-border bg-crm-card p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-crm-text-primary leading-tight">
                      {cliente.nombre}
                    </p>
                    <p className="text-xs text-crm-text-muted mt-1">
                      Código: {cliente.codigo_cliente || '—'}
                    </p>
                  </div>
                  <span className="rounded-full bg-crm-primary/10 px-3 py-1 text-xs font-semibold text-crm-primary">
                    {estadoLabel}
                  </span>
                </div>
                <div className="mt-3 space-y-2 text-xs text-crm-text-secondary">
                  <p>
                    <strong className="text-crm-text-primary">Contacto:</strong>{' '}
                    {cliente.telefono || cliente.email || 'Sin datos'}
                  </p>
                  <p>
                    <strong className="text-crm-text-primary">Último contacto:</strong>{' '}
                    {cliente.ultimo_contacto
                      ? new Intl.DateTimeFormat('es-PE').format(new Date(cliente.ultimo_contacto))
                      : 'No registrado'}
                  </p>
                  {cliente.vendedor_asignado && (
                    <p>
                      <strong className="text-crm-text-primary">Vendedor:</strong>{' '}
                      {cliente.vendedor_asignado}
                    </p>
                  )}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => handleShowDetail(cliente)}
                    className="flex-1 min-w-[130px] inline-flex items-center justify-center gap-2 rounded-lg bg-crm-primary px-3 py-2 text-xs font-semibold text-white"
                  >
                    Ver detalle
                  </button>
                  <Link
                    href={`/dashboard/clientes/${cliente.id}`}
                    className="flex-1 min-w-[130px] inline-flex items-center justify-center gap-2 rounded-lg border border-crm-border px-3 py-2 text-xs font-semibold text-crm-text-primary"
                  >
                    Abrir ficha
                  </Link>
                  {puedeEliminarClientes && (
                    <button
                      onClick={() => askDelete(cliente)}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-crm-danger px-3 py-2 text-xs font-semibold text-crm-danger"
                    >
                      Eliminar
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {clientes.length === 0 && (
            <p className="text-center text-sm text-crm-text-muted">
              {searchQuery || estado || tipo || vendedor || origen
                ? "No se encontraron clientes con los filtros aplicados."
                : "Aún no hay clientes registrados."}
            </p>
          )}
        </div>

        {/* Vista escritorio */}
        <div className="hidden sm:block">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-crm-card-hover border-b border-crm-border">
                <tr>
                  {/* Checkbox de selección - Solo visible para usuarios autorizados */}
                  {puedeGestionarSeleccion && (
                    <th className="px-4 py-3 w-12">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        ref={(input) => {
                          if (input) {
                            input.indeterminate = isSomeSelected;
                          }
                        }}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 text-crm-primary bg-crm-card border-crm-border rounded focus:ring-crm-primary focus:ring-2 cursor-pointer"
                      />
                    </th>
                  )}
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
                    onClick={() => handleSort('origen_lead')}
                  >
                    Origen del lead {getSortIcon('origen_lead')}
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
                {clientes.map((cliente, index) => (
                  <ClienteRow
                    key={`row-${index}-${cliente.id}`}
                    cliente={cliente}
                    onEdit={handleEdit}
                    onDelete={askDelete}
                    onShowDetail={handleShowDetail}
                    onEstadoChange={handleEstadoChange}
                    isPending={isPending}
                    isSelected={selectedIds.has(cliente.id)}
                    onToggleSelect={toggleSelectOne}
                    canManageSelection={puedeGestionarSeleccion}
                    puedeEditarClientes={puedeEditarClientes}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {clientes.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-crm-card-hover rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-crm-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
              </svg>
            </div>
            <h4 className="text-lg font-medium text-crm-text-primary mb-2">No hay clientes</h4>
            <p className="text-crm-text-muted">
              {searchQuery || estado || tipo || vendedor
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

      <ClienteDetailModalComplete
        isOpen={showDetailModal}
        onClose={handleCloseDetail}
        cliente={selectedCliente}
      />

      {/* Modal para registrar contacto al cambiar estado */}
      <RegistrarContactoModal
        isOpen={showContactoModal}
        onClose={() => {
          setShowContactoModal(false);
          setPendingEstadoChange(null);
          setSelectedCliente(null);
          // Refrescar para que el select vuelva al estado original
          router.refresh();
        }}
        clienteId={selectedCliente?.id || ''}
        clienteNombre={selectedCliente?.nombre || ''}
        onSuccess={handleContactoRegistrado}
      />

      {/* Diálogo de confirmación de eliminación masiva */}
      <ConfirmDialog
        open={confirmBulkDelete}
        title="Eliminar clientes"
        description={
          <>
            ¿Estás seguro de eliminar <span className="font-bold text-crm-danger">{selectedIds.size}</span>{' '}
            {selectedIds.size === 1 ? 'cliente' : 'clientes'}?
            <br />
            <span className="text-crm-danger font-semibold">Esta acción no se puede deshacer.</span>
          </>
        }
        confirmText={isPending ? "Eliminando…" : "Eliminar"}
        onConfirm={handleConfirmBulkDelete}
        onClose={() => setConfirmBulkDelete(false)}
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
  onShowDetail,
  onEstadoChange,
  isPending,
  isSelected,
  onToggleSelect,
  canManageSelection,
  puedeEditarClientes,
}: {
  cliente: Cliente;
  onEdit: (id: string) => void;
  onDelete: (c: Cliente) => void;
  onShowDetail: (c: Cliente) => void;
  onEstadoChange: (cliente: Cliente, nuevoEstado: EstadoCliente) => void;
  isPending: boolean;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  canManageSelection: boolean;
  puedeEditarClientes: boolean;
}) {
  const getOrigenLeadLabel = (origen?: string | null) => {
    switch (origen) {
      case 'web':
        return 'Web';
      case 'recomendacion':
        return 'Recomendación';
      case 'feria':
        return 'Feria';
      case 'campaña':
        return 'Campaña';
      case 'campaña_facebook':
        return 'Campaña Facebook';
      case 'campaña_tiktok':
        return 'Campaña TikTok';
      case 'facebook_ads':
        return 'Facebook Lead Ads';
      case 'whatsapp_web':
        return 'WhatsApp Web';
      case 'redes_sociales':
        return 'Redes sociales';
      case 'publicidad':
        return 'Publicidad';
      case 'referido':
        return 'Referido';
      case 'otro':
        return 'Otro';
      case '':
      case undefined:
      case null:
      default:
        return 'Sin origen';
    }
  };

  const getEstadoSelectClasses = (estado: EstadoCliente) => {
    switch (estado) {
      case 'por_contactar':
        return 'border-blue-200 bg-blue-50 text-blue-700 focus:ring-blue-200';
      case 'contactado':
        return 'border-yellow-200 bg-yellow-50 text-yellow-700 focus:ring-yellow-200';
      case 'transferido':
        return 'border-green-200 bg-green-50 text-green-700 focus:ring-green-200';
      case 'intermedio':
        return 'border-cyan-200 bg-cyan-50 text-cyan-700 focus:ring-cyan-200';
      case 'potencial':
        return 'border-purple-200 bg-purple-50 text-purple-700 focus:ring-purple-200';
      case 'desestimado':
      default:
        return 'border-gray-200 bg-gray-50 text-gray-700 focus:ring-gray-200';
    }
  };

  const renderEstadoSelect = (cliente: Cliente) => {
    const estadoActual = (cliente.estado_cliente || 'por_contactar') as EstadoCliente;
    return (
      <select
        value={estadoActual}
        onChange={(event) => onEstadoChange(cliente, event.target.value as EstadoCliente)}
        className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${getEstadoSelectClasses(estadoActual)}`}
        disabled={isPending}
      >
        {ESTADOS_CLIENTE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const fecha = date.toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    const hora = date.toLocaleTimeString('es-PE', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    return `${fecha} ${hora}`;
  };

  return (
    <tr className={`hover:bg-crm-card-hover transition-colors ${isSelected ? 'bg-crm-primary/5' : ''}`}>
      {/* Checkbox - Solo visible para usuarios con permisos de gestión */}
      {canManageSelection && (
        <td className="px-4 py-4">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(cliente.id)}
            className="w-4 h-4 text-crm-primary bg-crm-card border-crm-border rounded focus:ring-crm-primary focus:ring-2 cursor-pointer"
          />
        </td>
      )}
      {/* Cliente */}
      <td className="px-4 py-4">
        <Link
          href={`/dashboard/clientes/${cliente.id}`}
          className="flex items-center group gap-3 text-crm-text-primary hover:text-crm-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-crm-primary/40 rounded-md"
        >
          <div className="w-10 h-10 bg-crm-primary/10 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-crm-primary group-hover:scale-105 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
            </svg>
          </div>
          <div>
            <div className="text-sm font-medium group-hover:text-crm-primary transition-colors">{cliente.nombre}</div>
            <div className="text-xs text-crm-text-muted capitalize">
              {cliente.tipo_cliente === 'persona' ? 'Persona' :
               cliente.tipo_cliente === 'empresa' ? 'Empresa' : 'No especificado'}
            </div>
          </div>
        </Link>
      </td>

      {/* Estado */}
      <td className="px-4 py-4 whitespace-nowrap">
        {renderEstadoSelect(cliente)}
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


      {/* Origen del lead */}
      <td className="px-4 py-4 whitespace-nowrap">
        <span className="inline-flex items-center gap-2 rounded-full border border-crm-border bg-crm-card-hover px-3 py-1 text-xs font-medium text-crm-text-primary">
          <span className="h-1.5 w-1.5 rounded-full bg-crm-primary" />
          {getOrigenLeadLabel(cliente.origen_lead)}
        </span>
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
            onClick={() => onShowDetail(cliente)}
            className="text-green-600 hover:text-green-700 transition-colors"
            title="Ver Detalles"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
            </svg>
          </button>
          {puedeEditarClientes && (
            <button
              onClick={() => onEdit(cliente.id)}
              className="text-crm-primary hover:text-crm-primary/80 transition-colors"
              title="Editar"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
              </svg>
            </button>
          )}
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
          {/* WhatsApp - Mostrar siempre para facilitar el acceso */}
          <a
            href={`https://wa.me/${(cliente.telefono_whatsapp || cliente.telefono || '').replace(/\D/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-600 hover:text-green-700 transition-colors"
            title="Enviar WhatsApp"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
            </svg>
          </a>
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
