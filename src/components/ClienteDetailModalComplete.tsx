"use client";

import { Fragment, useEffect, useState } from 'react';
import type { SVGProps } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, PhoneIcon, EnvelopeIcon, MapPinIcon, UserIcon, BuildingOfficeIcon, CalendarIcon, CurrencyDollarIcon, DocumentTextIcon, ArrowTopRightOnSquareIcon, ClipboardDocumentIcon, CheckIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

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

const WhatsAppIcon = ({ className, ...props }: SVGProps<SVGSVGElement>) => (
        <svg
          viewBox="0 0 32 32"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          role="img"
          aria-label="WhatsApp"
          focusable="false"
    {...props}
  >
    <path
      fill="currentColor"
      d="M27.6 4.4A15.84 15.84 0 0 0 16 0C7.2 0 .02 7.18.02 16a15.86 15.86 0 0 0 2.18 8l-1.43 5.24a1 1 0 0 0 1.23 1.22l5.24-1.43A15.86 15.86 0 0 0 16 31.98C24.82 32 32 24.82 32 16a15.84 15.84 0 0 0-4.4-11.6ZM16 29.98a13.9 13.9 0 0 1-7.42-2.13 1 1 0 0 0-.71-.13l-4.06 1.11 1.12-4.06a1 1 0 0 0-.13-.71A13.9 13.9 0 0 1 2.02 16C2.02 8.29 8.27 2 16 2s13.98 6.27 13.98 14S23.73 29.98 16 29.98Zm7.74-10.93c-.42-.21-2.48-1.22-2.87-1.36-.39-.14-.67-.21-.96.21s-1.1 1.36-1.36 1.64-.5.32-.92.11a11.36 11.36 0 0 1-3.34-2.06 12.5 12.5 0 0 1-2.32-2.86c-.24-.42 0-.65.18-.86.19-.21.42-.54.63-.8.21-.26.28-.42.43-.7s.07-.53-.03-.74c-.11-.21-.96-2.32-1.33-3.19-.35-.84-.71-.73-.96-.75h-.81c-.26 0-.69.1-1.05.53s-1.38 1.35-1.38 3.28 1.41 3.81 1.61 4.07c.21.28 2.78 4.25 6.73 5.82.94.41 1.67.66 2.24.84.94.3 1.8.26 2.48.16.76-.1 2.48-1.01 2.83-1.98.35-.97.35-1.8.24-1.98-.1-.17-.38-.28-.8-.49Z"
    />
  </svg>
);

export default function ClienteDetailModalComplete({ isOpen, onClose, cliente }: ClienteDetailModalCompleteProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen || !cliente) {
    return null;
  }

  // Función para copiar al portapapeles
  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast.success(`${field} copiado al portapapeles`);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      toast('Error al copiar', { icon: '❌' });
    }
  };

  // Calcular días sin contactar
  const getDiasSinContactar = () => {
    if (!cliente.ultimo_contacto) return null;
    const now = new Date();
    const lastContact = new Date(cliente.ultimo_contacto);
    const diffTime = Math.abs(now.getTime() - lastContact.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Verificar alertas
  const getAlertas = () => {
    const alertas = [];
    const diasSinContactar = getDiasSinContactar();

    if (diasSinContactar && diasSinContactar > 15) {
      alertas.push({
        tipo: 'urgente',
        mensaje: `¡No contactado hace ${diasSinContactar} días!`,
        color: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-300 dark:border-red-700'
      });
    } else if (diasSinContactar && diasSinContactar > 7) {
      alertas.push({
        tipo: 'warning',
        mensaje: `Hace ${diasSinContactar} días sin contacto`,
        color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700'
      });
    }

    if (cliente.saldo_pendiente > 0) {
      alertas.push({
        tipo: 'info',
        mensaje: `Saldo pendiente: ${formatCapacidad(cliente.saldo_pendiente)}`,
        color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 border-orange-300 dark:border-orange-700'
      });
    }

    return alertas;
  };

  // Acciones rápidas
  const getWhatsappLink = (whatsapp: string | null) => {
    if (!whatsapp) return null;
    const digits = whatsapp.replace(/\D/g, '');
    return digits ? `https://wa.me/${digits}` : null;
  };

  const handleEmail = () => {
    if (cliente.email) {
      window.location.href = `mailto:${cliente.email}`;
    }
  };

  const handleGoToProfile = () => {
    router.push(`/dashboard/clientes/${cliente.id}`);
    onClose();
  };

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
              <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white dark:bg-crm-card border-2 border-gray-200 dark:border-crm-border text-left align-middle shadow-2xl transition-all">
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
                        <p className="text-white/70 text-sm flex items-center gap-2">
                          Código: {cliente.codigo_cliente}
                          <button
                            onClick={() => copyToClipboard(cliente.codigo_cliente, 'Código')}
                            className="text-white/60 hover:text-white transition-colors"
                            title="Copiar código"
                          >
                            {copiedField === 'Código' ? (
                              <CheckIcon className="w-4 h-4" />
                            ) : (
                              <ClipboardDocumentIcon className="w-4 h-4" />
                            )}
                          </button>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Botones de Acciones Rápidas */}
                      <div className="flex gap-2 mr-2">
                        {(cliente.telefono_whatsapp || cliente.telefono) && (
                          <a
                            href={getWhatsappLink(cliente.telefono_whatsapp || cliente.telefono) ?? undefined}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white p-2 rounded-lg transition-all duration-200 shadow-lg"
                            title="Contactar por WhatsApp"
                            onClick={(event) => {
                              if (!getWhatsappLink(cliente.telefono_whatsapp || cliente.telefono)) {
                                event.preventDefault();
                              }
                            }}
                          >
                            <WhatsAppIcon className="w-5 h-5" />
                          </a>
                        )}
                        {cliente.email && (
                          <button
                            onClick={handleEmail}
                            className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-lg transition-all duration-200 backdrop-blur-sm"
                            title="Enviar email"
                          >
                            <EnvelopeIcon className="w-5 h-5" />
                          </button>
                        )}
                        <button
                          onClick={handleGoToProfile}
                          className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-lg transition-all duration-200 backdrop-blur-sm"
                          title="Ver perfil completo"
                        >
                          <ArrowTopRightOnSquareIcon className="w-5 h-5" />
                        </button>
                      </div>
                      <button
                        onClick={onClose}
                        className="text-white/80 hover:text-white hover:bg-white/20 rounded-full p-2 transition-all duration-200"
                      >
                        <XMarkIcon className="w-6 h-6" />
                      </button>
                    </div>
                  </div>

                  {/* Estado */}
                  <div className="mt-4 flex items-center flex-wrap gap-2">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getEstadoColor(cliente.estado_cliente)}`}>
                      {getEstadoText(cliente.estado_cliente)}
                    </span>
                    {/* Indicadores de Urgencia */}
                    {getAlertas().map((alerta, index) => (
                      <span
                        key={index}
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${alerta.color}`}
                      >
                        {alerta.tipo === 'urgente' && <ExclamationTriangleIcon className="w-4 h-4" />}
                        {alerta.mensaje}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Content */}
                <div className="px-6 py-6 max-h-96 overflow-y-auto">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Información de Contacto */}
                    <div className="space-y-4">
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-crm-text-primary flex items-center">
                        <PhoneIcon className="w-5 h-5 mr-2 text-crm-primary" />
                        Información de Contacto
                      </h4>
                      
                      <div className="space-y-3">
                        {cliente.email && (
                          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-crm-card-hover border-2 border-gray-200 dark:border-crm-border rounded-lg hover:border-crm-primary hover:shadow-md transition-all group">
                            <div className="flex items-center space-x-3">
                              <EnvelopeIcon className="w-5 h-5 text-crm-primary" />
                              <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-crm-text-primary">Email</p>
                                <p className="text-sm text-gray-600 dark:text-crm-text-secondary">{cliente.email}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => copyToClipboard(cliente.email!, 'Email')}
                              className="opacity-0 group-hover:opacity-100 text-crm-primary hover:text-crm-primary/80 transition-all p-1 rounded"
                              title="Copiar email"
                            >
                              {copiedField === 'Email' ? (
                                <CheckIcon className="w-5 h-5 text-green-600" />
                              ) : (
                                <ClipboardDocumentIcon className="w-5 h-5" />
                              )}
                            </button>
                          </div>
                        )}

                        {cliente.telefono && (
                          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-crm-card-hover border-2 border-gray-200 dark:border-crm-border rounded-lg hover:border-crm-primary hover:shadow-md transition-all group">
                            <div className="flex items-center space-x-3">
                              <PhoneIcon className="w-5 h-5 text-crm-primary" />
                              <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-crm-text-primary">Teléfono</p>
                                <p className="text-sm text-gray-600 dark:text-crm-text-secondary">{cliente.telefono}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => copyToClipboard(cliente.telefono!, 'Teléfono')}
                              className="opacity-0 group-hover:opacity-100 text-crm-primary hover:text-crm-primary/80 transition-all p-1 rounded"
                              title="Copiar teléfono"
                            >
                              {copiedField === 'Teléfono' ? (
                                <CheckIcon className="w-5 h-5 text-green-600" />
                              ) : (
                                <ClipboardDocumentIcon className="w-5 h-5" />
                              )}
                            </button>
                          </div>
                        )}

                        {cliente.telefono_whatsapp && (
                          <div className="flex items-center justify-between p-3 bg-crm-success/10 dark:bg-green-900/20 border-2 border-crm-success/40 dark:border-green-800 rounded-lg hover:border-crm-success dark:hover:border-green-600 hover:shadow-md transition-all group">
                            <a
                              href={getWhatsappLink(cliente.telefono_whatsapp) ?? undefined}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex flex-1 items-center space-x-3"
                              onClick={(event) => {
                                if (!getWhatsappLink(cliente.telefono_whatsapp)) {
                                  event.preventDefault();
                                }
                              }}
                            >
                              <WhatsAppIcon className="w-5 h-5 text-crm-success" />
                              <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-crm-text-primary">WhatsApp</p>
                                <p className="text-sm text-gray-700 dark:text-crm-text-secondary">{cliente.telefono_whatsapp}</p>
                              </div>
                            </a>
                            <button
                              onClick={() => copyToClipboard(cliente.telefono_whatsapp!, 'WhatsApp')}
                              className="opacity-0 group-hover:opacity-100 text-green-600 hover:text-green-500 transition-all p-1 rounded"
                              title="Copiar WhatsApp"
                            >
                              {copiedField === 'WhatsApp' ? (
                                <CheckIcon className="w-5 h-5" />
                              ) : (
                                <ClipboardDocumentIcon className="w-5 h-5" />
                              )}
                            </button>
                          </div>
                        )}

                        {cliente.documento_identidad && (
                          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-crm-card-hover border-2 border-gray-200 dark:border-crm-border rounded-lg hover:border-crm-primary hover:shadow-md transition-all group">
                            <div className="flex items-center space-x-3">
                              <DocumentTextIcon className="w-5 h-5 text-crm-primary" />
                              <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-crm-text-primary">Documento</p>
                                <p className="text-sm text-gray-600 dark:text-crm-text-secondary">{cliente.documento_identidad}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => copyToClipboard(cliente.documento_identidad!, 'Documento')}
                              className="opacity-0 group-hover:opacity-100 text-crm-primary hover:text-crm-primary/80 transition-all p-1 rounded"
                              title="Copiar documento"
                            >
                              {copiedField === 'Documento' ? (
                                <CheckIcon className="w-5 h-5 text-green-600" />
                              ) : (
                                <ClipboardDocumentIcon className="w-5 h-5" />
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Información Comercial */}
                    <div className="space-y-4">
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-crm-text-primary flex items-center">
                        <BuildingOfficeIcon className="w-5 h-5 mr-2 text-crm-primary" />
                        Información Comercial
                      </h4>
                      
                      <div className="space-y-3">
                        {cliente.interes_principal && (
                          <div className="p-3 bg-gray-50 dark:bg-crm-card-hover border-2 border-gray-200 dark:border-crm-border rounded-lg">
                            <p className="text-sm font-medium text-gray-900 dark:text-crm-text-primary">Interés Principal</p>
                            <p className="text-sm text-gray-600 dark:text-crm-text-secondary capitalize">{cliente.interes_principal}</p>
                          </div>
                        )}

                        {cliente.origen_lead && (
                          <div className="p-3 bg-gray-50 dark:bg-crm-card-hover border-2 border-gray-200 dark:border-crm-border rounded-lg">
                            <p className="text-sm font-medium text-gray-900 dark:text-crm-text-primary">Origen del Lead</p>
                            <p className="text-sm text-gray-600 dark:text-crm-text-secondary capitalize">{cliente.origen_lead}</p>
                          </div>
                        )}

                        {cliente.capacidad_compra_estimada && (
                          <div className="p-3 bg-green-50 dark:bg-green-900/20 border-2 border-green-300 dark:border-green-800 rounded-lg">
                            <p className="text-sm font-medium text-gray-900 dark:text-crm-text-primary">Capacidad de Compra</p>
                            <p className="text-lg font-bold text-green-700 dark:text-green-400">{formatCapacidad(cliente.capacidad_compra_estimada)}</p>
                          </div>
                        )}

                        {cliente.forma_pago_preferida && (
                          <div className="p-3 bg-gray-50 dark:bg-crm-card-hover border-2 border-gray-200 dark:border-crm-border rounded-lg">
                            <p className="text-sm font-medium text-gray-900 dark:text-crm-text-primary">Forma de Pago Preferida</p>
                            <p className="text-sm text-gray-600 dark:text-crm-text-secondary capitalize">{cliente.forma_pago_preferida}</p>
                          </div>
                        )}

                        {cliente.vendedor_asignado && (
                          <div className="p-3 bg-gray-50 dark:bg-crm-card-hover border-2 border-gray-200 dark:border-crm-border rounded-lg">
                            <p className="text-sm font-medium text-gray-900 dark:text-crm-text-primary">Vendedor Asignado</p>
                            <p className="text-sm text-gray-600 dark:text-crm-text-secondary">{cliente.vendedor_asignado}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Dirección */}
                    <div className="space-y-4">
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-crm-text-primary flex items-center">
                        <MapPinIcon className="w-5 h-5 mr-2 text-crm-primary" />
                        Dirección
                      </h4>

                      <div className="p-3 bg-gray-50 dark:bg-crm-card-hover border-2 border-gray-200 dark:border-crm-border rounded-lg">
                        <p className="text-sm text-gray-700 dark:text-crm-text-secondary">{formatDireccion(cliente.direccion)}</p>
                      </div>
                    </div>

                    {/* Fechas y Acciones */}
                    <div className="space-y-4">
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-crm-text-primary flex items-center">
                        <CalendarIcon className="w-5 h-5 mr-2 text-crm-primary" />
                        Fechas y Acciones
                      </h4>

                      <div className="space-y-3">
                        <div className="p-3 bg-gray-50 dark:bg-crm-card-hover border-2 border-gray-200 dark:border-crm-border rounded-lg">
                          <p className="text-sm font-medium text-gray-900 dark:text-crm-text-primary">Fecha de Alta</p>
                          <p className="text-sm text-gray-600 dark:text-crm-text-secondary">{formatDate(cliente.fecha_alta)}</p>
                        </div>

                        {cliente.ultimo_contacto && (
                          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-300 dark:border-blue-800 rounded-lg">
                            <p className="text-sm font-medium text-gray-900 dark:text-crm-text-primary">Último Contacto</p>
                            <p className="text-sm text-gray-700 dark:text-crm-text-secondary">{formatDate(cliente.ultimo_contacto)}</p>
                          </div>
                        )}

                        {cliente.proxima_accion && (
                          <div className="p-3 bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-300 dark:border-orange-800 rounded-lg">
                            <p className="text-sm font-medium text-gray-900 dark:text-crm-text-primary">Próxima Acción</p>
                            <p className="text-sm text-gray-700 dark:text-crm-text-secondary capitalize">{cliente.proxima_accion}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Estadísticas de Propiedades */}
                  <div className="mt-6 pt-6 border-t-2 border-gray-200 dark:border-crm-border">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-crm-text-primary mb-4 flex items-center">
                      <CurrencyDollarIcon className="w-5 h-5 mr-2 text-crm-primary" />
                      Estadísticas de Propiedades
                    </h4>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-300 dark:border-blue-800 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{cliente.propiedades_reservadas}</div>
                        <div className="text-sm font-medium text-blue-800 dark:text-blue-300">Reservadas</div>
                      </div>
                      <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 border-2 border-green-300 dark:border-green-800 rounded-lg">
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">{cliente.propiedades_compradas}</div>
                        <div className="text-sm font-medium text-green-800 dark:text-green-300">Compradas</div>
                      </div>
                      <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-300 dark:border-yellow-800 rounded-lg">
                        <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{cliente.propiedades_alquiladas}</div>
                        <div className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Alquiladas</div>
                      </div>
                    </div>

                    {cliente.saldo_pendiente > 0 && (
                      <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-800 rounded-lg">
                        <p className="text-sm font-medium text-gray-900 dark:text-red-300">Saldo Pendiente</p>
                        <p className="text-lg font-bold text-red-600 dark:text-red-400">{formatCapacidad(cliente.saldo_pendiente)}</p>
                      </div>
                    )}
                  </div>

                  {/* Notas */}
                  {cliente.notas && (
                    <div className="mt-6 pt-6 border-t-2 border-gray-200 dark:border-crm-border">
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-crm-text-primary mb-3 flex items-center">
                        <DocumentTextIcon className="w-5 h-5 mr-2 text-crm-primary" />
                        Notas
                      </h4>
                      <div className="p-4 bg-gray-50 dark:bg-crm-card-hover border-2 border-gray-200 dark:border-crm-border rounded-lg">
                        <p className="text-sm text-gray-700 dark:text-crm-text-secondary whitespace-pre-wrap">{cliente.notas}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-100 dark:bg-crm-card-hover border-t-2 border-gray-200 dark:border-crm-border flex justify-end">
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
