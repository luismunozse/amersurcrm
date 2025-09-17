"use client";

import { useState, useTransition, memo, useMemo } from "react";
import { actualizarCliente, eliminarCliente } from "./_actions";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/errors";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Pagination } from "@/components/Pagination";
import { usePagination } from "@/hooks/usePagination";
import ClienteForm from "@/components/ClienteForm";
import ClienteDetailModal from "@/components/ClienteDetailModal";
import SimpleModal from "@/components/SimpleModal";

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

export default function ClientesList({ clientes }: { clientes: Cliente[] }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState<{ open: boolean; id: string | null; nombre?: string }>({
    open: false,
    id: null,
  });
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const router = useRouter();
  const params = useSearchParams();

  // Paginación
  const {
    currentPage,
    totalPages,
    paginatedItems,
    goToPage,
  } = usePagination({
    items: clientes,
    itemsPerPage: 10,
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

  const handleShowDetail = (cliente: Cliente) => {
    console.log('Opening detail modal for client:', cliente.nombre);
    alert(`Abriendo detalles de: ${cliente.nombre}`);
    setSelectedCliente(cliente);
    setShowDetailModal(true);
  };

  const handleCloseDetail = () => {
    setShowDetailModal(false);
    setSelectedCliente(null);
  };

  return (
    <div className="space-y-6">
      <div className="crm-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-crm-text-primary">Lista de Clientes</h3>
          <div className="text-sm text-crm-text-muted">
            {clientes.length} {clientes.length === 1 ? 'cliente' : 'clientes'}
          </div>
        </div>

        {clientes.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-crm-card-hover rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-crm-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
              </svg>
            </div>
            <h4 className="text-lg font-medium text-crm-text-primary mb-2">No hay clientes registrados</h4>
            <p className="text-crm-text-muted">Comienza agregando tu primer cliente usando el formulario de arriba.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {paginatedItems.map((c) => (
              <ClienteItem
                key={c.id}
                cliente={c}
                isEditing={editing === c.id}
                isPending={isPending}
                onEdit={handleEdit}
                onCancelEdit={handleCancelEdit}
                onAfterSave={handleAfterSave}
                onDelete={askDelete}
                onShowDetail={handleShowDetail}
              />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-6 pt-4 border-t border-crm-border">
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

      <SimpleModal
        isOpen={showDetailModal}
        onClose={handleCloseDetail}
        cliente={selectedCliente ? { nombre: selectedCliente.nombre, email: selectedCliente.email } : null}
      />
      
      {/* Debug info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 bg-black text-white p-2 rounded text-xs">
          Modal: {showDetailModal ? 'Open' : 'Closed'} | 
          Cliente: {selectedCliente?.nombre || 'None'}
        </div>
      )}
    </div>
  );
}

// Componente memoizado para cada item de cliente
const ClienteItem = memo(function ClienteItem({
  cliente,
  isEditing,
  isPending,
  onEdit,
  onCancelEdit,
  onAfterSave,
  onDelete,
  onShowDetail,
}: {
  cliente: Cliente;
  isEditing: boolean;
  isPending: boolean;
  onEdit: (id: string) => void;
  onCancelEdit: () => void;
  onAfterSave: () => void;
  onDelete: (c: Cliente) => void;
  onShowDetail: (c: Cliente) => void;
}) {
  if (isEditing) {
    return (
      <li className="p-3">
        <EditRow
          initial={cliente}
          onCancel={onCancelEdit}
          afterSave={onAfterSave}
        />
      </li>
    );
  }

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'por_contactar': return 'bg-blue-100 text-blue-800';
      case 'contactado': return 'bg-yellow-100 text-yellow-800';
      case 'transferido': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCapacidad = (capacidad: number | null) => {
    if (!capacidad) return 'No especificada';
    if (capacidad >= 1000000) return `S/ ${(capacidad / 1000000).toFixed(1)}M`;
    if (capacidad >= 1000) return `S/ ${(capacidad / 1000).toFixed(0)}K`;
    return `S/ ${capacidad.toLocaleString()}`;
  };

  return (
    <div className="crm-card-hover p-6 rounded-lg border border-crm-border transition-all duration-200">
      <div className="space-y-4">
        {/* Header con código y estado */}
        <div className="flex items-start justify-between">
          <div 
            className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors group"
            onClick={() => {
              console.log('Header clicked for client:', cliente.nombre);
              onShowDetail(cliente);
            }}
          >
            <div className="w-12 h-12 bg-crm-primary/10 rounded-full flex items-center justify-center group-hover:bg-crm-primary/20 transition-colors">
              <svg className="w-6 h-6 text-crm-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
              </svg>
            </div>
            <div>
              <div className="font-semibold text-crm-text-primary text-lg group-hover:text-crm-primary transition-colors">{cliente.nombre}</div>
              <div className="text-sm text-crm-text-muted">Código: {cliente.codigo_cliente || 'N/A'}</div>
              <div className="text-xs text-crm-text-muted capitalize">
                {cliente.tipo_cliente === 'persona' ? 'Persona' : 
                 cliente.tipo_cliente === 'empresa' ? 'Empresa' : 'No especificado'}
              </div>
              <div className="text-xs text-crm-primary opacity-0 group-hover:opacity-100 transition-opacity">
                Clic para ver detalles →
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getEstadoColor(cliente.estado_cliente || 'prospecto')}`}>
              {cliente.estado_cliente ? 
                cliente.estado_cliente.charAt(0).toUpperCase() + cliente.estado_cliente.slice(1) : 
                'Prospecto'
              }
            </span>
            <button 
              className="px-3 py-1.5 text-sm font-medium text-crm-primary bg-crm-primary/10 hover:bg-crm-primary/20 rounded-lg transition-colors" 
              onClick={() => onEdit(cliente.id)}
            >
              Editar
            </button>
            <button
              className="px-3 py-1.5 text-sm font-medium text-green-600 bg-green-100 hover:bg-green-200 rounded-lg transition-colors"
              onClick={() => onShowDetail(cliente)}
            >
              Ver Detalles
            </button>
            <button
              className="px-3 py-1.5 text-sm font-medium text-crm-danger bg-crm-danger/10 hover:bg-crm-danger/20 rounded-lg transition-colors"
              onClick={() => onDelete(cliente)}
              disabled={isPending}
            >
              Eliminar
            </button>
          </div>
        </div>

        {/* Información de contacto */}
        <div 
          className="grid grid-cols-1 md:grid-cols-2 gap-4 cursor-pointer hover:bg-gray-50 p-3 rounded-lg transition-colors group"
          onClick={() => onShowDetail(cliente)}
        >
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-crm-text-primary group-hover:text-crm-primary transition-colors">Contacto</h4>
            <div className="space-y-1">
              {cliente.email && (
                <div className="flex items-center gap-2 text-sm text-crm-text-muted group-hover:text-crm-text-primary transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                  </svg>
                  {cliente.email}
                </div>
              )}
              {cliente.telefono && (
                <div className="flex items-center gap-2 text-sm text-crm-text-muted group-hover:text-crm-text-primary transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                  </svg>
                  {cliente.telefono}
                </div>
              )}
              {cliente.telefono_whatsapp && (
                <div className="flex items-center gap-2 text-sm text-crm-text-muted group-hover:text-crm-text-primary transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                  </svg>
                  WhatsApp: {cliente.telefono_whatsapp}
                </div>
              )}
              {cliente.documento_identidad && (
                <div className="flex items-center gap-2 text-sm text-crm-text-muted group-hover:text-crm-text-primary transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"/>
                  </svg>
                  DNI: {cliente.documento_identidad}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-medium text-crm-text-primary group-hover:text-crm-primary transition-colors">Información Comercial</h4>
            <div className="space-y-1">
              {cliente.interes_principal && (
                <div className="text-sm text-crm-text-muted group-hover:text-crm-text-primary transition-colors">
                  <span className="font-medium">Interés:</span> {cliente.interes_principal}
                </div>
              )}
              {cliente.capacidad_compra_estimada && (
                <div className="text-sm text-crm-text-muted group-hover:text-crm-text-primary transition-colors">
                  <span className="font-medium">Capacidad:</span> {formatCapacidad(cliente.capacidad_compra_estimada)}
                </div>
              )}
              {cliente.forma_pago_preferida && (
                <div className="text-sm text-crm-text-muted group-hover:text-crm-text-primary transition-colors">
                  <span className="font-medium">Pago:</span> {cliente.forma_pago_preferida}
                </div>
              )}
              {cliente.origen_lead && (
                <div className="text-sm text-crm-text-muted group-hover:text-crm-text-primary transition-colors">
                  <span className="font-medium">Origen:</span> {cliente.origen_lead}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Estadísticas de propiedades */}
        <div 
          className="grid grid-cols-3 gap-4 pt-4 border-t border-crm-border cursor-pointer hover:bg-gray-50 p-3 rounded-lg transition-colors group"
          onClick={() => onShowDetail(cliente)}
        >
          <div className="text-center group-hover:scale-105 transition-transform">
            <div className="text-lg font-semibold text-crm-text-primary group-hover:text-crm-primary transition-colors">{cliente.propiedades_reservadas}</div>
            <div className="text-xs text-crm-text-muted group-hover:text-crm-text-primary transition-colors">Reservadas</div>
          </div>
          <div className="text-center group-hover:scale-105 transition-transform">
            <div className="text-lg font-semibold text-crm-text-primary group-hover:text-crm-primary transition-colors">{cliente.propiedades_compradas}</div>
            <div className="text-xs text-crm-text-muted group-hover:text-crm-text-primary transition-colors">Compradas</div>
          </div>
          <div className="text-center group-hover:scale-105 transition-transform">
            <div className="text-lg font-semibold text-crm-text-primary group-hover:text-crm-primary transition-colors">{cliente.propiedades_alquiladas}</div>
            <div className="text-xs text-crm-text-muted group-hover:text-crm-text-primary transition-colors">Alquiladas</div>
          </div>
        </div>

        {/* Próxima acción */}
        {cliente.proxima_accion && (
          <div 
            className="flex items-center gap-2 p-3 bg-crm-primary/5 rounded-lg cursor-pointer hover:bg-crm-primary/10 transition-colors group"
            onClick={() => onShowDetail(cliente)}
          >
            <svg className="w-4 h-4 text-crm-primary group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span className="text-sm text-crm-text-primary group-hover:text-crm-primary transition-colors">
              <span className="font-medium">Próxima acción:</span> {cliente.proxima_accion}
            </span>
          </div>
        )}
      </div>
    </div>
  );
});

function EditRow({
  initial,
  onCancel,
  afterSave,
}: {
  initial: Cliente;
  onCancel: () => void;
  afterSave: () => void;
}) {
  return (
    <ClienteForm
      cliente={initial}
      isEditing={true}
      onSuccess={afterSave}
      onCancel={onCancel}
    />
  );
}

const SearchBox = memo(function SearchBox({ defaultValue }: { defaultValue: string }) {
  const router = useRouter();

  const handleSubmit = useMemo(() => (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const q = new FormData(e.currentTarget).get("q") as string;
    const url = q ? `/dashboard/clientes?q=${encodeURIComponent(q)}` : `/dashboard/clientes`;
    router.push(url);
  }, [router]);

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 items-center">
      <input
        name="q"
        defaultValue={defaultValue}
        placeholder="Buscar por nombre o email..."
        className="border px-2 py-1 rounded"
      />
      <button className="border px-3 py-1 rounded">Buscar</button>
    </form>
  );
});
