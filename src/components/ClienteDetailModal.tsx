"use client";

import { Fragment, useEffect, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, PhoneIcon, EnvelopeIcon, MapPinIcon, UserIcon, BuildingOfficeIcon, CalendarIcon, CurrencyDollarIcon, ChatBubbleLeftRightIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

console.log('ClienteDetailModal component loaded');

interface ClienteDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  cliente: {
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
  } | null;
}

export default function ClienteDetailModal({ isOpen, onClose, cliente }: ClienteDetailModalProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    console.log('Modal isOpen changed:', isOpen);
    if (isOpen) {
      setIsVisible(true);
    } else {
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  console.log('Modal render - isOpen:', isOpen, 'cliente:', cliente?.nombre);

  if (!cliente) {
    console.log('No cliente, returning null');
    return null;
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
      default: return 'Sin Estado';
    }
  };

  const formatCapacidad = (capacidad: number | null) => {
    if (!capacidad) return 'No especificada';
    if (capacidad >= 1000000) return `S/ ${(capacidad / 1000000).toFixed(1)}M`;
    if (capacidad >= 1000) return `S/ ${(capacidad / 1000).toFixed(0)}K`;
    return `S/ ${capacidad.toLocaleString()}`;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No especificada';
    return new Date(dateString).toLocaleDateString('es-PE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDireccion = (direccion: any) => {
    if (!direccion || typeof direccion !== 'object') return 'No especificada';
    
    const parts = [];
    if (direccion.calle) parts.push(direccion.calle);
    if (direccion.numero) parts.push(direccion.numero);
    if (direccion.barrio) parts.push(direccion.barrio);
    if (direccion.ciudad) parts.push(direccion.ciudad);
    if (direccion.provincia) parts.push(direccion.provincia);
    if (direccion.pais) parts.push(direccion.pais);
    
    return parts.length > 0 ? parts.join(', ') : 'No especificada';
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95 translate-y-4"
              enterTo="opacity-100 scale-100 translate-y-0"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100 translate-y-0"
              leaveTo="opacity-0 scale-95 translate-y-4"
            >
              <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white text-left align-middle shadow-2xl transition-all">
                {/* Header */}
                <div className="bg-gradient-to-r from-crm-primary to-crm-primary/80 px-6 py-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                        <UserIcon className="w-8 h-8 text-white" />
                      </div>
                      <div>
                        <Dialog.Title as="h3" className="text-2xl font-bold text-white">
                          {cliente.nombre}
                        </Dialog.Title>
                        <p className="text-white/80 text-lg">
                          {cliente.tipo_cliente === 'persona' ? 'Persona' : 'Empresa'}
                        </p>
                        <p className="text-white/70 text-sm">
                          Código: {cliente.codigo_cliente}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={onClose}
                      className="text-white/80 hover:text-white hover:bg-white/20 rounded-full p-2 transition-all duration-200"
                    >
                      <XMarkIcon className="w-6 h-6" />
                    </button>
                  </div>
                  
                  {/* Estado */}
                  <div className="mt-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getEstadoColor(cliente.estado_cliente)}`}>
                      {getEstadoText(cliente.estado_cliente)}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="px-6 py-6 max-h-96 overflow-y-auto">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Información de Contacto */}
                    <div className="space-y-4">
                      <h4 className="text-lg font-semibold text-crm-text-primary flex items-center">
                        <PhoneIcon className="w-5 h-5 mr-2 text-crm-primary" />
                        Información de Contacto
                      </h4>
                      
                      <div className="space-y-3">
                        {cliente.email && (
                          <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                            <EnvelopeIcon className="w-5 h-5 text-crm-text-muted" />
                            <div>
                              <p className="text-sm font-medium text-crm-text-primary">Email</p>
                              <p className="text-sm text-crm-text-muted">{cliente.email}</p>
                            </div>
                          </div>
                        )}
                        
                        {cliente.telefono && (
                          <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                            <PhoneIcon className="w-5 h-5 text-crm-text-muted" />
                            <div>
                              <p className="text-sm font-medium text-crm-text-primary">Teléfono</p>
                              <p className="text-sm text-crm-text-muted">{cliente.telefono}</p>
                            </div>
                          </div>
                        )}
                        
                        {cliente.telefono_whatsapp && (
                          <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                            <ChatBubbleLeftRightIcon className="w-5 h-5 text-green-600" />
                            <div>
                              <p className="text-sm font-medium text-crm-text-primary">WhatsApp</p>
                              <p className="text-sm text-crm-text-muted">{cliente.telefono_whatsapp}</p>
                            </div>
                          </div>
                        )}
                        
                        {cliente.documento_identidad && (
                          <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                            <DocumentTextIcon className="w-5 h-5 text-crm-text-muted" />
                            <div>
                              <p className="text-sm font-medium text-crm-text-primary">Documento</p>
                              <p className="text-sm text-crm-text-muted">{cliente.documento_identidad}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Información Comercial */}
                    <div className="space-y-4">
                      <h4 className="text-lg font-semibold text-crm-text-primary flex items-center">
                        <BuildingOfficeIcon className="w-5 h-5 mr-2 text-crm-primary" />
                        Información Comercial
                      </h4>
                      
                      <div className="space-y-3">
                        {cliente.interes_principal && (
                          <div className="p-3 bg-blue-50 rounded-lg">
                            <p className="text-sm font-medium text-crm-text-primary">Interés Principal</p>
                            <p className="text-sm text-crm-text-muted">{cliente.interes_principal}</p>
                          </div>
                        )}
                        
                        {cliente.capacidad_compra_estimada && (
                          <div className="p-3 bg-green-50 rounded-lg">
                            <p className="text-sm font-medium text-crm-text-primary">Capacidad de Compra</p>
                            <p className="text-sm text-crm-text-muted font-semibold">{formatCapacidad(cliente.capacidad_compra_estimada)}</p>
                          </div>
                        )}
                        
                        {cliente.forma_pago_preferida && (
                          <div className="p-3 bg-yellow-50 rounded-lg">
                            <p className="text-sm font-medium text-crm-text-primary">Forma de Pago Preferida</p>
                            <p className="text-sm text-crm-text-muted">{cliente.forma_pago_preferida}</p>
                          </div>
                        )}
                        
                        {cliente.origen_lead && (
                          <div className="p-3 bg-purple-50 rounded-lg">
                            <p className="text-sm font-medium text-crm-text-primary">Origen del Lead</p>
                            <p className="text-sm text-crm-text-muted">{cliente.origen_lead}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Dirección */}
                    <div className="space-y-4">
                      <h4 className="text-lg font-semibold text-crm-text-primary flex items-center">
                        <MapPinIcon className="w-5 h-5 mr-2 text-crm-primary" />
                        Dirección
                      </h4>
                      
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-crm-text-muted">{formatDireccion(cliente.direccion)}</p>
                      </div>
                    </div>

                    {/* Fechas y Acciones */}
                    <div className="space-y-4">
                      <h4 className="text-lg font-semibold text-crm-text-primary flex items-center">
                        <CalendarIcon className="w-5 h-5 mr-2 text-crm-primary" />
                        Fechas y Acciones
                      </h4>
                      
                      <div className="space-y-3">
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm font-medium text-crm-text-primary">Fecha de Alta</p>
                          <p className="text-sm text-crm-text-muted">{formatDate(cliente.fecha_alta)}</p>
                        </div>
                        
                        {cliente.ultimo_contacto && (
                          <div className="p-3 bg-blue-50 rounded-lg">
                            <p className="text-sm font-medium text-crm-text-primary">Último Contacto</p>
                            <p className="text-sm text-crm-text-muted">{formatDate(cliente.ultimo_contacto)}</p>
                          </div>
                        )}
                        
                        {cliente.proxima_accion && (
                          <div className="p-3 bg-orange-50 rounded-lg">
                            <p className="text-sm font-medium text-crm-text-primary">Próxima Acción</p>
                            <p className="text-sm text-crm-text-muted">{cliente.proxima_accion}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Estadísticas de Propiedades */}
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <h4 className="text-lg font-semibold text-crm-text-primary mb-4 flex items-center">
                      <CurrencyDollarIcon className="w-5 h-5 mr-2 text-crm-primary" />
                      Estadísticas de Propiedades
                    </h4>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">{cliente.propiedades_reservadas}</div>
                        <div className="text-sm text-blue-800">Reservadas</div>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">{cliente.propiedades_compradas}</div>
                        <div className="text-sm text-green-800">Compradas</div>
                      </div>
                      <div className="text-center p-4 bg-yellow-50 rounded-lg">
                        <div className="text-2xl font-bold text-yellow-600">{cliente.propiedades_alquiladas}</div>
                        <div className="text-sm text-yellow-800">Alquiladas</div>
                      </div>
                    </div>
                    
                    {cliente.saldo_pendiente > 0 && (
                      <div className="mt-4 p-3 bg-red-50 rounded-lg">
                        <p className="text-sm font-medium text-red-800">Saldo Pendiente</p>
                        <p className="text-lg font-bold text-red-600">{formatCapacidad(cliente.saldo_pendiente)}</p>
                      </div>
                    )}
                  </div>

                  {/* Notas */}
                  {cliente.notas && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <h4 className="text-lg font-semibold text-crm-text-primary mb-3">Notas</h4>
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-crm-text-muted whitespace-pre-wrap">{cliente.notas}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
                  <button
                    onClick={onClose}
                    className="px-6 py-2 bg-crm-primary text-white rounded-lg hover:bg-crm-primary/90 transition-colors duration-200"
                  >
                    Cerrar
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
