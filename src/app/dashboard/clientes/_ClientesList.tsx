"use client";

import { useState, useTransition, memo, useMemo, useEffect } from "react";
import { eliminarCliente, actualizarEstadoCliente } from "./_actions";
import { registrarInteraccion } from "./_actions_crm";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/errors";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Pagination } from "@/components/Pagination";
import { usePagination } from "@/hooks/usePagination";
import ClienteForm from "@/components/ClienteForm";
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
  direccion: Record<string, unknown>;
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
  const [clientesState, setClientesState] = useState<Cliente[]>(clientes);
  const [contactoModal, setContactoModal] = useState<{ open: boolean; cliente: Cliente | null }>({ open: false, cliente: null });
  const [contactoLoading, setContactoLoading] = useState(false);
  const router = useRouter();

  // Sincronizar estado cuando cambien los props
  useEffect(() => {
    setClientesState(clientes);
  }, [clientes]);

  // Paginación
  const {
    currentPage,
    totalPages,
    paginatedItems,
    goToPage,
  } = usePagination({
    items: clientesState,
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
    setSelectedCliente(cliente);
    setShowDetailModal(true);
  };

  const handleCloseDetail = () => {
    setShowDetailModal(false);
    setSelectedCliente(null);
  };

  const handleSolicitarContacto = (cliente: Cliente) => {
    setContactoModal({ open: true, cliente });
  };

  const handleCerrarContacto = () => {
    if (contactoLoading) return;
    setContactoModal({ open: false, cliente: null });
  };

  const handleGuardarContacto = async (payload: ContactoFormData) => {
    if (!contactoModal.cliente) return;
    setContactoLoading(true);
    try {
      const result = await registrarInteraccion({
        clienteId: contactoModal.cliente.id,
        tipo: payload.tipo,
        resultado: payload.resultado,
        notas: payload.notas,
        duracionMinutos: payload.duracionMinutos,
        proximaAccion: payload.proximaAccion,
        fechaProximaAccion: payload.fechaProximaAccion,
      });

      if (!result.success) {
        toast.error(result.error || 'No se pudo registrar la interacción');
        setContactoLoading(false);
        return;
      }

      await handleEstadoChange(contactoModal.cliente.id, 'contactado');
      toast.success('Contacto registrado');
      setContactoModal({ open: false, cliente: null });
    } catch (error) {
      toast.error(getErrorMessage(error) || 'Error registrando el contacto');
    } finally {
      setContactoLoading(false);
    }
  };

  const getEstadoText = (estado: string) => {
    switch (estado) {
      case 'por_contactar': return 'Por Contactar';
      case 'contactado': return 'Contactado';
      case 'transferido': return 'Transferido';
      default: return 'Prospecto';
    }
  };

  const handleEstadoChange = async (clienteId: string, nuevoEstado: string) => {
    console.log('Cambiando estado del cliente:', clienteId, 'a:', nuevoEstado);
    try {
      // Actualización optimista
      setClientesState(prevClientes =>
        prevClientes.map(cliente =>
          cliente.id === clienteId
            ? { ...cliente, estado_cliente: nuevoEstado }
            : cliente
        )
      );

      await actualizarEstadoCliente(clienteId, nuevoEstado);
      toast.success(`Estado cambiado a ${getEstadoText(nuevoEstado)}`);
    } catch (error) {
      // Revertir cambios en caso de error
      setClientesState(clientes);
      toast.error(getErrorMessage(error) || 'Error cambiando estado');
    }
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
                onEstadoChange={handleEstadoChange}
                onSolicitarContacto={handleSolicitarContacto}
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

      <RegistrarContactoModal
        open={contactoModal.open}
        cliente={contactoModal.cliente}
        loading={contactoLoading}
        onClose={handleCerrarContacto}
        onSubmit={handleGuardarContacto}
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
  onEstadoChange,
  onSolicitarContacto,
}: {
  cliente: Cliente;
  isEditing: boolean;
  isPending: boolean;
  onEdit: (id: string) => void;
  onCancelEdit: () => void;
  onAfterSave: () => void;
  onDelete: (c: Cliente) => void;
  onShowDetail: (c: Cliente) => void;
  onEstadoChange: (clienteId: string, nuevoEstado: string) => void;
  onSolicitarContacto: (cliente: Cliente) => void;
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
      case 'por_contactar': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'contactado': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'transferido': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getEstadoText = (estado: string) => {
    switch (estado) {
      case 'por_contactar': return 'Por Contactar';
      case 'contactado': return 'Contactado';
      case 'transferido': return 'Transferido';
      default: return 'Prospecto';
    }
  };

  const getEstadoButtons = (cliente: Cliente) => {
    const buttons = [];
    let currentEstado = cliente.estado_cliente || 'prospecto';
    
    // Normalizar el estado (convertir a minúsculas y manejar variaciones)
    if (typeof currentEstado === 'string') {
      currentEstado = currentEstado.toLowerCase().trim();
      // Mapear variaciones comunes
      if (currentEstado === 'transferido') currentEstado = 'transferido';
      if (currentEstado === 'contactado') currentEstado = 'contactado';
      if (currentEstado === 'por contactar' || currentEstado === 'por_contactar') currentEstado = 'por_contactar';
    }
    
    if (currentEstado === 'prospecto' || currentEstado === '') {
      buttons.push(
        <button
          key="contactar"
          onClick={() => onEstadoChange(cliente.id, 'por_contactar')}
          className="px-2 py-1 text-xs font-medium text-blue-600 bg-blue-100 border border-blue-200 hover:bg-blue-200 hover:border-blue-300 transition-colors rounded-full"
        >
          Por Contactar
        </button>
      );
    }

    if (currentEstado === 'por_contactar') {
      buttons.push(
        <button
          key="contactado"
          onClick={() => onSolicitarContacto(cliente)}
          className="px-2 py-1 text-xs font-medium text-yellow-600 bg-yellow-100 border border-yellow-200 hover:bg-yellow-200 hover:border-yellow-300 transition-colors rounded-full"
        >
          Contactado
        </button>
      );
    }

    if (currentEstado === 'contactado') {
      buttons.push(
        <button
          key="transferir"
          onClick={() => onEstadoChange(cliente.id, 'transferido')}
          className="px-2 py-1 text-xs font-medium text-green-600 bg-green-100 border border-green-200 hover:bg-green-200 hover:border-green-300 transition-colors rounded-full"
        >
          Transferir
        </button>
      );
    }

    if (currentEstado === 'transferido') {
      buttons.push(
        <button
          key="revertir"
          onClick={() => onEstadoChange(cliente.id, 'contactado')}
          className="px-2 py-1 text-xs font-medium text-orange-600 bg-orange-100 border border-orange-200 hover:bg-orange-200 hover:border-orange-300 transition-colors rounded-full"
        >
          Revertir
        </button>
      );
    }

    return buttons;
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
            onClick={() => onShowDetail(cliente)}
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
            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getEstadoColor(cliente.estado_cliente || 'prospecto')}`}>
              {getEstadoText(cliente.estado_cliente || 'prospecto')}
            </span>
            <div className="flex items-center gap-1">
              {getEstadoButtons(cliente)}
            </div>
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
  // Convert Cliente type to match ClienteForm expectations
  const clienteForForm = {
    id: initial.id,
    nombre: initial.nombre,
    email: initial.email || undefined,
    telefono: initial.telefono || undefined,
    tipo_cliente: initial.tipo_cliente,
    documento_identidad: initial.documento_identidad || undefined,
    telefono_whatsapp: initial.telefono_whatsapp || undefined,
    direccion: initial.direccion,
    estado_cliente: initial.estado_cliente,
    origen_lead: initial.origen_lead || undefined,
    vendedor_asignado: initial.vendedor_asignado || undefined,
    interes_principal: initial.interes_principal || undefined,
    notas: initial.notas || undefined,
  };

  return (
    <ClienteForm
      cliente={clienteForForm}
      isEditing={true}
      onSuccess={afterSave}
      onCancel={onCancel}
    />
  );
}

type ContactoFormData = {
  tipo: 'llamada' | 'email' | 'whatsapp' | 'visita' | 'reunion' | 'mensaje';
  resultado?: 'contesto' | 'no_contesto' | 'reagendo' | 'interesado' | 'no_interesado' | 'cerrado' | 'pendiente';
  notas: string;
  duracionMinutos?: number;
  proximaAccion?: 'llamar' | 'enviar_propuesta' | 'reunion' | 'visita' | 'seguimiento' | 'cierre' | 'ninguna';
  fechaProximaAccion?: string;
};

function RegistrarContactoModal({
  open,
  cliente,
  loading,
  onClose,
  onSubmit,
}: {
  open: boolean;
  cliente: Cliente | null;
  loading: boolean;
  onClose: () => void;
  onSubmit: (data: ContactoFormData) => void;
}) {
  const [tipo, setTipo] = useState<ContactoFormData['tipo']>('llamada');
  const [resultado, setResultado] = useState<ContactoFormData['resultado']>('contesto');
  const [notas, setNotas] = useState('');
  const [duracion, setDuracion] = useState('');
  const [proximaAccion, setProximaAccion] = useState<ContactoFormData['proximaAccion']>('ninguna');
  const [fechaProxima, setFechaProxima] = useState('');

  useEffect(() => {
    if (open) {
      setTipo('llamada');
      setResultado('contesto');
      setNotas('');
      setDuracion('');
      setProximaAccion('ninguna');
      setFechaProxima('');
    }
  }, [open, cliente?.id]);

  if (!open || !cliente) return null;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!notas.trim()) {
      toast.error('Describe brevemente lo conversado con el cliente.');
      return;
    }

    onSubmit({
      tipo,
      resultado,
      notas: notas.trim(),
      duracionMinutos: duracion ? Number(duracion) : undefined,
      proximaAccion: proximaAccion && proximaAccion !== 'ninguna' ? proximaAccion : undefined,
      fechaProximaAccion:
        proximaAccion && proximaAccion !== 'ninguna' && fechaProxima ? fechaProxima : undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl border border-crm-border overflow-hidden">
        <div className="px-6 py-4 border-b border-crm-border flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-crm-text-primary">Registrar contacto</h3>
            <p className="text-xs text-crm-text-muted mt-1">Cliente: {cliente.nombre}</p>
          </div>
          <button
            onClick={onClose}
            className="text-crm-text-muted hover:text-crm-text"
            type="button"
            disabled={loading}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-crm-text-muted uppercase mb-1">Canal</label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as ContactoFormData['tipo'])}
                className="w-full border border-crm-border rounded-lg px-3 py-2 text-sm focus:ring-crm-primary focus:border-crm-primary"
                disabled={loading}
              >
                <option value="llamada">Llamada</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="email">Email</option>
                <option value="visita">Visita</option>
                <option value="reunion">Reunión</option>
                <option value="mensaje">Otro mensaje</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-crm-text-muted uppercase mb-1">Resultado</label>
              <select
                value={resultado}
                onChange={(e) => setResultado(e.target.value as ContactoFormData['resultado'])}
                className="w-full border border-crm-border rounded-lg px-3 py-2 text-sm focus:ring-crm-primary focus:border-crm-primary"
                disabled={loading}
              >
                <option value="contesto">Contestó</option>
                <option value="no_contesto">No contestó</option>
                <option value="reagendo">Reagendó</option>
                <option value="interesado">Mostró interés</option>
                <option value="no_interesado">No interesado</option>
                <option value="cerrado">Cerrado</option>
                <option value="pendiente">Pendiente</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-crm-text-muted uppercase mb-1">Notas</label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              className="w-full min-h-[120px] border border-crm-border rounded-lg px-3 py-2 text-sm focus:ring-crm-primary focus:border-crm-primary"
              placeholder="Describe brevemente lo conversado, acuerdos o próximos pasos"
              disabled={loading}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-crm-text-muted uppercase mb-1">Duración (min)</label>
              <input
                type="number"
                min="0"
                value={duracion}
                onChange={(e) => setDuracion(e.target.value)}
                className="w-full border border-crm-border rounded-lg px-3 py-2 text-sm focus:ring-crm-primary focus:border-crm-primary"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-crm-text-muted uppercase mb-1">Próxima acción</label>
              <select
                value={proximaAccion}
                onChange={(e) => setProximaAccion(e.target.value as ContactoFormData['proximaAccion'])}
                className="w-full border border-crm-border rounded-lg px-3 py-2 text-sm focus:ring-crm-primary focus:border-crm-primary"
                disabled={loading}
              >
                <option value="ninguna">Ninguna</option>
                <option value="llamar">Llamar</option>
                <option value="enviar_propuesta">Enviar propuesta</option>
                <option value="reunion">Reunión</option>
                <option value="visita">Visita</option>
                <option value="seguimiento">Seguimiento</option>
                <option value="cierre">Cierre</option>
              </select>
            </div>
          </div>

          {proximaAccion && proximaAccion !== 'ninguna' && (
            <div>
              <label className="block text-xs font-semibold text-crm-text-muted uppercase mb-1">Fecha próxima acción</label>
              <input
                type="datetime-local"
                value={fechaProxima}
                onChange={(e) => setFechaProxima(e.target.value)}
                className="w-full border border-crm-border rounded-lg px-3 py-2 text-sm focus:ring-crm-primary focus:border-crm-primary"
                disabled={loading}
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-crm-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-crm-text-muted hover:text-crm-text"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-semibold text-white bg-crm-primary rounded-lg hover:bg-crm-primary-hover disabled:opacity-60"
              disabled={loading}
            >
              {loading ? 'Guardando…' : 'Registrar contacto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
