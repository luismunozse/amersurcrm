"use client";

import { Fragment, useEffect, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, PhoneIcon, EnvelopeIcon, MapPinIcon, UserIcon, BuildingOfficeIcon, CalendarIcon, CurrencyDollarIcon, ChatBubbleLeftRightIcon, DocumentTextIcon, ClockIcon, TagIcon } from '@heroicons/react/24/outline';

interface ClienteDetailModalCompleteProps {
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

export default function ClienteDetailModalComplete({ isOpen, onClose, cliente }: ClienteDetailModalCompleteProps) {
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

  if (!isOpen || !cliente) {
    return null;
  }

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'por_contactar': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'contactado': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800';
      case 'transferido': return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800';
      case 'intermedio': return 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800';
      case 'potencial': return 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'desestimado': return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border-crm-border dark:border-gray-700';
      default: return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border-crm-border dark:border-gray-700';
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

  const getNivelCliente = (capacidad: number | null) => {
    if (!capacidad) return { nivel: 'No especificado', color: 'text-crm-text-secondary bg-crm-card-hover' };
    if (capacidad >= 500000) return { nivel: 'Alto', color: 'text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30' };
    if (capacidad >= 100000) return { nivel: 'Medio', color: 'text-yellow-700 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30' };
    return { nivel: 'Bajo', color: 'text-orange-700 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30' };
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
              <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-crm-card border-2 border-crm-border text-left align-middle shadow-2xl transition-all">
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
                  
                  {/* Estado y Nivel */}
                  <div className="mt-4 flex items-center space-x-3">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getEstadoColor(cliente.estado_cliente)}`}>
                      {getEstadoText(cliente.estado_cliente)}
                    </span>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getNivelCliente(cliente.capacidad_compra_estimada).color}`}>
                      Nivel: {getNivelCliente(cliente.capacidad_compra_estimada).nivel}
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
                          <div className="flex items-center space-x-3 p-3 bg-crm-card-hover border border-crm-border rounded-lg hover:border-crm-primary/30 transition-colors">
                            <EnvelopeIcon className="w-5 h-5 text-crm-primary" />
                            <div>
                              <p className="text-sm font-medium text-crm-text-primary">Email</p>
                              <p className="text-sm text-crm-text-secondary">{cliente.email}</p>
                            </div>
                          </div>
                        )}

                        {cliente.telefono && (
                          <div className="flex items-center space-x-3 p-3 bg-crm-card-hover border border-crm-border rounded-lg hover:border-crm-primary/30 transition-colors">
                            <PhoneIcon className="w-5 h-5 text-crm-primary" />
                            <div>
                              <p className="text-sm font-medium text-crm-text-primary">Teléfono</p>
                              <p className="text-sm text-crm-text-secondary">{cliente.telefono}</p>
                            </div>
                          </div>
                        )}

                        {cliente.telefono_whatsapp && (
                          <div className="flex items-center space-x-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg hover:border-green-400 dark:hover:border-green-600 transition-colors">
                            <ChatBubbleLeftRightIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
                            <div>
                              <p className="text-sm font-medium text-crm-text-primary">WhatsApp</p>
                              <p className="text-sm text-crm-text-secondary">{cliente.telefono_whatsapp}</p>
                            </div>
                          </div>
                        )}

                        {cliente.documento_identidad && (
                          <div className="flex items-center space-x-3 p-3 bg-crm-card-hover border border-crm-border rounded-lg hover:border-crm-primary/30 transition-colors">
                            <DocumentTextIcon className="w-5 h-5 text-crm-primary" />
                            <div>
                              <p className="text-sm font-medium text-crm-text-primary">Documento</p>
                              <p className="text-sm text-crm-text-secondary">{cliente.documento_identidad}</p>
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
                          <div className="p-3 bg-crm-card-hover border border-crm-border rounded-lg">
                            <p className="text-sm font-medium text-crm-text-primary">Interés Principal</p>
                            <p className="text-sm text-crm-text-secondary">{cliente.interes_principal}</p>
                          </div>
                        )}

                        {cliente.origen_lead && (
                          <div className="p-3 bg-crm-card-hover border border-crm-border rounded-lg">
                            <p className="text-sm font-medium text-crm-text-primary">Origen del Lead</p>
                            <p className="text-sm text-crm-text-secondary">{cliente.origen_lead}</p>
                          </div>
                        )}

                        {cliente.capacidad_compra_estimada && (
                          <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                            <p className="text-sm font-medium text-crm-text-primary">Capacidad de Compra</p>
                            <p className="text-lg font-bold text-green-700 dark:text-green-400">{formatCapacidad(cliente.capacidad_compra_estimada)}</p>
                          </div>
                        )}
                        
                        {cliente.forma_pago_preferida && (
                          <div className="p-3 bg-crm-card-hover border border-crm-border rounded-lg">
                            <p className="text-sm font-medium text-crm-text-primary">Forma de Pago Preferida</p>
                            <p className="text-sm text-crm-text-secondary">{cliente.forma_pago_preferida}</p>
                          </div>
                        )}

                        {cliente.vendedor_asignado && (
                          <div className="p-3 bg-crm-card-hover border border-crm-border rounded-lg">
                            <p className="text-sm font-medium text-crm-text-primary">Vendedor Asignado</p>
                            <p className="text-sm text-crm-text-secondary">{cliente.vendedor_asignado}</p>
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
                      
                      <div className="p-3 bg-crm-card-hover rounded-lg">
                        <p className="text-sm text-crm-text-secondary">{formatDireccion(cliente.direccion)}</p>
                      </div>
                    </div>

                    {/* Fechas y Acciones */}
                    <div className="space-y-4">
                      <h4 className="text-lg font-semibold text-crm-text-primary flex items-center">
                        <CalendarIcon className="w-5 h-5 mr-2 text-crm-primary" />
                        Fechas y Acciones
                      </h4>
                      
                      <div className="space-y-3">
                        <div className="p-3 bg-crm-card-hover rounded-lg">
                          <p className="text-sm font-medium text-crm-text-primary">Fecha de Alta</p>
                          <p className="text-sm text-crm-text-secondary">{formatDate(cliente.fecha_alta)}</p>
                        </div>
                        
                        {cliente.ultimo_contacto && (
                          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                            <p className="text-sm font-medium text-crm-text-primary">Último Contacto</p>
                            <p className="text-sm text-crm-text-secondary">{formatDate(cliente.ultimo_contacto)}</p>
                          </div>
                        )}

                        {cliente.proxima_accion && (
                          <div className="p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                            <p className="text-sm font-medium text-crm-text-primary">Próxima Acción</p>
                            <p className="text-sm text-crm-text-secondary">{cliente.proxima_accion}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Estadísticas de Propiedades */}
                  <div className="mt-6 pt-6 border-t border-crm-border">
                    <h4 className="text-lg font-semibold text-crm-text-primary mb-4 flex items-center">
                      <CurrencyDollarIcon className="w-5 h-5 mr-2 text-crm-primary" />
                      Estadísticas de Propiedades
                    </h4>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{cliente.propiedades_reservadas}</div>
                        <div className="text-sm text-blue-800 dark:text-blue-300">Reservadas</div>
                      </div>
                      <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">{cliente.propiedades_compradas}</div>
                        <div className="text-sm text-green-800 dark:text-green-300">Compradas</div>
                      </div>
                      <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                        <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{cliente.propiedades_alquiladas}</div>
                        <div className="text-sm text-yellow-800 dark:text-yellow-300">Alquiladas</div>
                      </div>
                    </div>
                    
                    {cliente.saldo_pendiente > 0 && (
                      <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                        <p className="text-sm font-medium text-red-800 dark:text-red-300">Saldo Pendiente</p>
                        <p className="text-lg font-bold text-red-600 dark:text-red-400">{formatCapacidad(cliente.saldo_pendiente)}</p>
                      </div>
                    )}
                  </div>

                  {/* Notas */}
                  {cliente.notas && (
                    <div className="mt-6 pt-6 border-t border-crm-border">
                      <h4 className="text-lg font-semibold text-crm-text-primary mb-3 flex items-center">
                        <DocumentTextIcon className="w-5 h-5 mr-2 text-crm-primary" />
                        Notas
                      </h4>
                      <div className="p-4 bg-crm-card-hover rounded-lg">
                        <p className="text-sm text-crm-text-secondary whitespace-pre-wrap">{cliente.notas}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-crm-card-hover border-t border-crm-border flex justify-end">
                  <button
                    onClick={onClose}
                    className="px-6 py-2.5 bg-crm-primary text-white rounded-lg hover:bg-crm-primary/90 transition-colors duration-200 font-medium shadow-sm hover:shadow-md"
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
