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
import DateTimePicker from "@/components/ui/DateTimePicker";
import { getEstadoClienteLabel, type EstadoCliente } from "@/lib/types/clientes";
import { Users, User, Mail, Phone, MessageCircle, IdCard, Clock } from "lucide-react";
import BotonEnviarWhatsApp from "@/components/marketing/BotonEnviarWhatsApp";

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

  const handleEstadoChange = async (clienteId: string, nuevoEstado: string) => {
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
      toast.success(`Estado cambiado a ${getEstadoClienteLabel(nuevoEstado as EstadoCliente)}`);
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
              <Users className="w-8 h-8 text-crm-text-muted" />
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
      case 'por_contactar': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'contactado': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800';
      case 'transferido': return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800';
      default: return 'bg-crm-card-hover text-crm-text-secondary border-crm-border';
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
          className="px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 hover:bg-blue-200 dark:hover:bg-blue-800/50 transition-colors rounded-full"
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
          className="px-2 py-1 text-xs font-medium text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 hover:bg-yellow-200 dark:hover:bg-yellow-800/50 transition-colors rounded-full"
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
          className="px-2 py-1 text-xs font-medium text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 hover:bg-green-200 dark:hover:bg-green-800/50 transition-colors rounded-full"
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
          className="px-2 py-1 text-xs font-medium text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 hover:bg-orange-200 dark:hover:bg-orange-800/50 transition-colors rounded-full"
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
            className="flex items-center gap-3 cursor-pointer hover:bg-crm-card-hover p-2 rounded-lg transition-colors group"
            onClick={() => onShowDetail(cliente)}
          >
            <div className="w-12 h-12 bg-crm-primary/10 rounded-full flex items-center justify-center group-hover:bg-crm-primary/20 transition-colors">
              <User className="w-6 h-6 text-crm-primary" />
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
              {getEstadoClienteLabel((cliente.estado_cliente || 'por_contactar') as EstadoCliente)}
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
              className="px-3 py-1.5 text-sm font-medium text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50 rounded-lg transition-colors"
              onClick={() => onShowDetail(cliente)}
            >
              Ver Detalles
            </button>
            {(cliente.telefono_whatsapp || cliente.telefono) && (
              <div onClick={(e) => e.stopPropagation()}>
                <BotonEnviarWhatsApp
                  telefono={cliente.telefono_whatsapp ?? cliente.telefono ?? ""}
                  clienteId={cliente.id}
                  clienteNombre={cliente.nombre}
                  estadoCliente={cliente.estado_cliente ?? undefined}
                  variablesAuto={{
                    vendedor: cliente.vendedor_asignado ?? "",
                  }}
                  label=""
                  variant="ghost"
                  className="w-9 h-9 !px-0 !py-0 justify-center text-green-600 hover:bg-green-100"
                />
              </div>
            )}
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
          className="grid grid-cols-1 md:grid-cols-2 gap-4 cursor-pointer hover:bg-crm-card-hover p-3 rounded-lg transition-colors group"
          onClick={() => onShowDetail(cliente)}
        >
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-crm-text-primary group-hover:text-crm-primary transition-colors">Contacto</h4>
            <div className="space-y-1">
              {cliente.email && (
                <div className="flex items-center gap-2 text-sm text-crm-text-muted group-hover:text-crm-text-primary transition-colors">
                  <Mail className="w-4 h-4" />
                  {cliente.email}
                </div>
              )}
              {cliente.telefono && (
                <div className="flex items-center gap-2 text-sm text-crm-text-muted group-hover:text-crm-text-primary transition-colors">
                  <Phone className="w-4 h-4" />
                  {cliente.telefono}
                </div>
              )}
              {cliente.telefono_whatsapp && (
                <div className="flex items-center gap-2 text-sm text-crm-text-muted group-hover:text-crm-text-primary transition-colors">
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp: {cliente.telefono_whatsapp}
                </div>
              )}
              {cliente.documento_identidad && (
                <div className="flex items-center gap-2 text-sm text-crm-text-muted group-hover:text-crm-text-primary transition-colors">
                  <IdCard className="w-4 h-4" />
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
          className="grid grid-cols-3 gap-4 pt-4 border-t border-crm-border cursor-pointer hover:bg-crm-card-hover p-3 rounded-lg transition-colors group"
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
            <Clock className="w-4 h-4 text-crm-primary group-hover:scale-110 transition-transform" />
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:px-4 sm:py-6 animate-in fade-in duration-150">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg bg-crm-card rounded-t-2xl sm:rounded-2xl shadow-xl border-t sm:border border-crm-border overflow-hidden pb-[env(safe-area-inset-bottom)] sm:pb-0 max-h-[95vh] animate-in slide-in-from-bottom-4 sm:zoom-in-95 sm:slide-in-from-bottom-0 duration-200">
        <div className="sm:hidden flex justify-center pt-2.5 pb-1 shrink-0">
          <span className="h-1 w-10 rounded-full bg-crm-border" aria-hidden />
        </div>
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
                className="w-full border border-crm-border rounded-lg px-3 py-2 text-sm bg-crm-bg-primary text-crm-text-primary focus:ring-crm-primary focus:border-crm-primary"
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
                className="w-full border border-crm-border rounded-lg px-3 py-2 text-sm bg-crm-bg-primary text-crm-text-primary focus:ring-crm-primary focus:border-crm-primary"
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
                className="w-full border border-crm-border rounded-lg px-3 py-2 text-sm bg-crm-bg-primary text-crm-text-primary focus:ring-crm-primary focus:border-crm-primary"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-crm-text-muted uppercase mb-1">Próxima acción</label>
              <select
                value={proximaAccion}
                onChange={(e) => setProximaAccion(e.target.value as ContactoFormData['proximaAccion'])}
                className="w-full border border-crm-border rounded-lg px-3 py-2 text-sm bg-crm-bg-primary text-crm-text-primary focus:ring-crm-primary focus:border-crm-primary"
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
              <DateTimePicker
                value={fechaProxima}
                onChange={setFechaProxima}
                placeholder="Seleccionar fecha y hora"
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
