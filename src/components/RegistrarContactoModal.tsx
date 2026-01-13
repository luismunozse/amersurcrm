"use client";

import { useState, useTransition } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { XMarkIcon, PhoneIcon, EnvelopeIcon, ChatBubbleLeftRightIcon, UserGroupIcon, VideoCameraIcon, ChatBubbleBottomCenterTextIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { registrarInteraccion } from '@/app/dashboard/clientes/_actions_crm';
import DatePicker from "@/components/ui/DatePicker";

interface RegistrarContactoModalProps {
  isOpen: boolean;
  onClose: () => void;
  clienteId: string;
  clienteNombre: string;
  onSuccess: () => void;
}

type TipoInteraccion = 'llamada' | 'email' | 'whatsapp' | 'visita' | 'reunion' | 'mensaje';
type ResultadoInteraccion = 'contesto' | 'no_contesto' | 'reagendo' | 'interesado' | 'no_interesado' | 'cerrado' | 'pendiente';
type ProximaAccion = 'llamar' | 'enviar_propuesta' | 'reunion' | 'visita' | 'seguimiento' | 'cierre' | 'ninguna';

export default function RegistrarContactoModal({
  isOpen,
  onClose,
  clienteId,
  clienteNombre,
  onSuccess
}: RegistrarContactoModalProps) {
  const [isPending, startTransition] = useTransition();

  // Form state
  const [tipo, setTipo] = useState<TipoInteraccion>('llamada');
  const [resultado, setResultado] = useState<ResultadoInteraccion>('contesto');
  const [notas, setNotas] = useState('');
  const [duracionMinutos, setDuracionMinutos] = useState('');
  const [proximaAccion, setProximaAccion] = useState<ProximaAccion>('ninguna');
  const [fechaProximaAccion, setFechaProximaAccion] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!notas.trim()) {
      toast.error('Debes agregar notas sobre la conversación');
      return;
    }

    startTransition(async () => {
      const result = await registrarInteraccion({
        clienteId,
        tipo,
        resultado,
        notas: notas.trim(),
        duracionMinutos: duracionMinutos ? parseInt(duracionMinutos) : undefined,
        proximaAccion: proximaAccion !== 'ninguna' ? proximaAccion : undefined,
        fechaProximaAccion: fechaProximaAccion || undefined,
      });

      if (result.success) {
        toast.success('Interacción registrada exitosamente');
        resetForm();
        onSuccess();
      } else {
        toast.error(result.error || 'Error al registrar la interacción');
        console.error('❌ Error al registrar:', result.error);
      }
    });
  };

  const resetForm = () => {
    setTipo('llamada');
    setResultado('contesto');
    setNotas('');
    setDuracionMinutos('');
    setProximaAccion('ninguna');
    setFechaProximaAccion('');
  };

  const getTipoIcon = (tipoInteraccion: TipoInteraccion) => {
    switch (tipoInteraccion) {
      case 'llamada': return <PhoneIcon className="w-5 h-5" />;
      case 'email': return <EnvelopeIcon className="w-5 h-5" />;
      case 'whatsapp': return <ChatBubbleLeftRightIcon className="w-5 h-5" />;
      case 'visita': return <UserGroupIcon className="w-5 h-5" />;
      case 'reunion': return <VideoCameraIcon className="w-5 h-5" />;
      case 'mensaje': return <ChatBubbleBottomCenterTextIcon className="w-5 h-5" />;
    }
  };

  const tiposInteraccion: { value: TipoInteraccion; label: string }[] = [
    { value: 'llamada', label: 'Llamada telefónica' },
    { value: 'whatsapp', label: 'WhatsApp' },
    { value: 'email', label: 'Email' },
    { value: 'visita', label: 'Visita' },
    { value: 'reunion', label: 'Reunión' },
    { value: 'mensaje', label: 'Mensaje' },
  ];

  const resultadosInteraccion: { value: ResultadoInteraccion; label: string }[] = [
    { value: 'contesto', label: 'Contestó' },
    { value: 'no_contesto', label: 'No contestó' },
    { value: 'reagendo', label: 'Reagendó' },
    { value: 'interesado', label: 'Interesado' },
    { value: 'no_interesado', label: 'No interesado' },
    { value: 'pendiente', label: 'Pendiente' },
    { value: 'cerrado', label: 'Cerrado' },
  ];

  const proximasAcciones: { value: ProximaAccion; label: string }[] = [
    { value: 'ninguna', label: 'Ninguna' },
    { value: 'llamar', label: 'Llamar' },
    { value: 'enviar_propuesta', label: 'Enviar propuesta' },
    { value: 'reunion', label: 'Agendar reunión' },
    { value: 'visita', label: 'Agendar visita' },
    { value: 'seguimiento', label: 'Hacer seguimiento' },
    { value: 'cierre', label: 'Cerrar venta' },
  ];

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
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-crm-card border border-crm-border shadow-xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-crm-border bg-gradient-to-r from-crm-primary/10 to-crm-primary/5">
                  <div>
                    <Dialog.Title className="text-xl font-semibold text-crm-text-primary">
                      Registrar Contacto
                    </Dialog.Title>
                    <p className="text-sm text-crm-text-muted mt-1">
                      Cliente: <span className="font-medium text-crm-text-primary">{clienteNombre}</span>
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="text-crm-text-muted hover:text-crm-text-primary transition-colors rounded-lg p-1 hover:bg-crm-border"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                  {/* Tipo de Interacción */}
                  <div>
                    <label className="block text-sm font-medium text-crm-text-primary mb-3">
                      Tipo de contacto
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {tiposInteraccion.map((tipoItem) => (
                        <button
                          key={tipoItem.value}
                          type="button"
                          onClick={() => setTipo(tipoItem.value)}
                          className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                            tipo === tipoItem.value
                              ? 'border-crm-primary bg-crm-primary/10 text-crm-primary'
                              : 'border-crm-border text-crm-text-secondary hover:border-crm-primary/50 hover:bg-crm-card-hover'
                          }`}
                        >
                          {getTipoIcon(tipoItem.value)}
                          <span className="text-sm font-medium">{tipoItem.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Resultado */}
                  <div>
                    <label className="block text-sm font-medium text-crm-text-primary mb-2">
                      Resultado
                    </label>
                    <select
                      value={resultado}
                      onChange={(e) => setResultado(e.target.value as ResultadoInteraccion)}
                      className="w-full px-4 py-2.5 border border-crm-border rounded-lg bg-crm-background text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent"
                    >
                      {resultadosInteraccion.map((res) => (
                        <option key={res.value} value={res.value}>
                          {res.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Notas (Obligatorio) */}
                  <div>
                    <label className="block text-sm font-medium text-crm-text-primary mb-2">
                      ¿Qué se habló con el cliente? <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={notas}
                      onChange={(e) => setNotas(e.target.value)}
                      rows={4}
                      required
                      placeholder="Describe la conversación, intereses del cliente, acuerdos tomados, etc."
                      className="w-full px-4 py-2.5 border border-crm-border rounded-lg bg-crm-background text-crm-text-primary placeholder-crm-text-muted focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent resize-none"
                    />
                    <p className="text-xs text-crm-text-muted mt-1">
                      Esta información es importante para mantener la trazabilidad del cliente
                    </p>
                  </div>

                  {/* Duración (opcional) */}
                  <div>
                    <label className="block text-sm font-medium text-crm-text-primary mb-2">
                      Duración (minutos)
                    </label>
                    <input
                      type="number"
                      value={duracionMinutos}
                      onChange={(e) => setDuracionMinutos(e.target.value)}
                      min="1"
                      placeholder="Ej: 15"
                      className="w-full px-4 py-2.5 border border-crm-border rounded-lg bg-crm-background text-crm-text-primary placeholder-crm-text-muted focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent"
                    />
                  </div>

                  {/* Próxima Acción */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-crm-text-primary mb-2">
                        Próxima acción
                      </label>
                      <select
                        value={proximaAccion}
                        onChange={(e) => setProximaAccion(e.target.value as ProximaAccion)}
                        className="w-full px-4 py-2.5 border border-crm-border rounded-lg bg-crm-background text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent"
                      >
                        {proximasAcciones.map((accion) => (
                          <option key={accion.value} value={accion.value}>
                            {accion.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {proximaAccion !== 'ninguna' && (
                      <div>
                        <label className="block text-sm font-medium text-crm-text-primary mb-2">
                          Fecha próxima acción
                        </label>
                        <DatePicker
                          value={fechaProximaAccion}
                          onChange={setFechaProximaAccion}
                          placeholder="Seleccionar fecha"
                          minDate={new Date()}
                        />
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-crm-border">
                    <button
                      type="button"
                      onClick={onClose}
                      disabled={isPending}
                      className="px-4 py-2.5 text-sm font-medium text-crm-text-secondary hover:text-crm-text-primary border border-crm-border rounded-lg hover:bg-crm-card-hover transition-colors disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isPending || !notas.trim()}
                      className="px-6 py-2.5 text-sm font-medium text-white bg-crm-primary rounded-lg hover:bg-crm-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isPending ? 'Registrando...' : 'Registrar Contacto'}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
