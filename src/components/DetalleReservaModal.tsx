"use client";

import { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { createPortal } from "react-dom";
import {
  X,
  FileText,
  Calendar,
  Clock,
  User,
  MapPin,
  CreditCard,
  DollarSign,
  FileImage,
  MessageSquare,
  CheckCircle,
  XCircle,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";
import { formatearMoneda, type Moneda } from "@/lib/types/crm-flujo";
import { getSmallBadgeClasses } from "@/lib/utils/badge";

interface Reserva {
  id: string;
  codigo_reserva: string;
  cliente_id: string;
  lote_id?: string;
  propiedad_id?: string;
  vendedor_username: string;
  monto_reserva: number;
  moneda: string;
  fecha_reserva: string;
  fecha_vencimiento: string;
  estado: string;
  motivo_cancelacion?: string;
  metodo_pago?: string;
  comprobante_url?: string;
  notas?: string;
  created_at: string;
  updated_at: string;
  // Datos enriquecidos
  lote?: {
    id: string;
    codigo: string;
    numero_lote?: string;
    proyecto?: {
      id: string;
      nombre: string;
    };
  };
  vendedor?: {
    username: string;
    nombre_completo?: string;
  };
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  reserva: Reserva | null;
  clienteNombre: string;
}

export default function DetalleReservaModal({
  isOpen,
  onClose,
  reserva,
  clienteNombre,
}: Props) {
  if (!reserva) return null;

  const getEstadoColor = (estado: string) => {
    const colores: Record<string, string> = {
      activa: "green",
      vencida: "red",
      cancelada: "gray",
      convertida_venta: "blue",
    };
    return colores[estado] || "gray";
  };

  const getEstadoLabel = (estado: string) => {
    const labels: Record<string, string> = {
      activa: "Activa",
      vencida: "Vencida",
      cancelada: "Cancelada",
      convertida_venta: "Convertida en Venta",
    };
    return labels[estado] || estado;
  };

  const getEstadoIcon = (estado: string) => {
    if (estado === "activa") return <CheckCircle className="h-5 w-5" />;
    if (estado === "vencida") return <AlertTriangle className="h-5 w-5" />;
    if (estado === "cancelada") return <XCircle className="h-5 w-5" />;
    if (estado === "convertida_venta") return <ArrowRight className="h-5 w-5" />;
    return <FileText className="h-5 w-5" />;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-PE", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("es-PE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isVencida =
    reserva.estado === "activa" &&
    new Date(reserva.fecha_vencimiento) < new Date();

  const diasRestantes = Math.ceil(
    (new Date(reserva.fecha_vencimiento).getTime() - new Date().getTime()) /
      (1000 * 60 * 60 * 24)
  );

  const modalContent = (
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
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
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
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-crm-card border border-crm-border shadow-2xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-crm-border bg-crm-background">
                  <div>
                    <Dialog.Title className="text-xl font-bold text-crm-text flex items-center gap-2">
                      <FileText className="h-6 w-6 text-crm-primary" />
                      Detalle de Reserva
                    </Dialog.Title>
                    <p className="text-sm text-crm-text-muted mt-1">
                      {reserva.codigo_reserva}
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-crm-card-hover rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5 text-crm-text-muted" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                  {/* Estado y Monto - Destacado */}
                  <div className="flex flex-col sm:flex-row gap-4">
                    {/* Estado */}
                    <div className="flex-1 p-4 rounded-xl bg-crm-background border border-crm-border">
                      <div className="flex items-center gap-3">
                        <span
                          className={`p-2 rounded-lg ${getSmallBadgeClasses(
                            getEstadoColor(reserva.estado)
                          )}`}
                        >
                          {getEstadoIcon(reserva.estado)}
                        </span>
                        <div>
                          <p className="text-xs text-crm-text-muted uppercase tracking-wide">
                            Estado
                          </p>
                          <p className="text-lg font-semibold text-crm-text">
                            {getEstadoLabel(reserva.estado)}
                          </p>
                          {reserva.estado === "activa" && (
                            <p
                              className={`text-xs mt-1 ${
                                isVencida
                                  ? "text-red-600 dark:text-red-400"
                                  : diasRestantes <= 3
                                  ? "text-orange-600 dark:text-orange-400"
                                  : "text-green-600 dark:text-green-400"
                              }`}
                            >
                              {isVencida
                                ? "Vencida hace " +
                                  Math.abs(diasRestantes) +
                                  " dias"
                                : diasRestantes === 0
                                ? "Vence hoy"
                                : diasRestantes === 1
                                ? "Vence manana"
                                : `Vence en ${diasRestantes} dias`}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Monto */}
                    <div className="flex-1 p-4 rounded-xl bg-crm-primary/10 border border-crm-primary/20">
                      <div className="flex items-center gap-3">
                        <span className="p-2 rounded-lg bg-crm-primary/20 text-crm-primary">
                          <DollarSign className="h-5 w-5" />
                        </span>
                        <div>
                          <p className="text-xs text-crm-text-muted uppercase tracking-wide">
                            Monto de Reserva
                          </p>
                          <p className="text-xl font-bold text-crm-primary">
                            {formatearMoneda(reserva.monto_reserva, reserva.moneda as Moneda)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Informacion del Cliente */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-crm-text-muted uppercase tracking-wide flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Cliente
                    </h3>
                    <div className="p-4 rounded-xl bg-crm-background border border-crm-border">
                      <p className="font-semibold text-crm-text">{clienteNombre}</p>
                    </div>
                  </div>

                  {/* Informacion del Lote/Propiedad */}
                  {reserva.lote && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-crm-text-muted uppercase tracking-wide flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Lote Reservado
                      </h3>
                      <div className="p-4 rounded-xl bg-crm-background border border-crm-border">
                        <p className="font-semibold text-crm-text">
                          Lote {reserva.lote.numero_lote || reserva.lote.codigo}
                        </p>
                        {reserva.lote.proyecto && (
                          <p className="text-sm text-crm-text-muted mt-1">
                            Proyecto: {reserva.lote.proyecto.nombre}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Fechas */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-crm-text-muted uppercase tracking-wide flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Fecha de Reserva
                      </h3>
                      <div className="p-4 rounded-xl bg-crm-background border border-crm-border">
                        <p className="font-medium text-crm-text">
                          {formatDate(reserva.fecha_reserva)}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-crm-text-muted uppercase tracking-wide flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Fecha de Vencimiento
                      </h3>
                      <div
                        className={`p-4 rounded-xl border ${
                          isVencida
                            ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                            : "bg-crm-background border-crm-border"
                        }`}
                      >
                        <p
                          className={`font-medium ${
                            isVencida
                              ? "text-red-600 dark:text-red-400"
                              : "text-crm-text"
                          }`}
                        >
                          {formatDate(reserva.fecha_vencimiento)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Metodo de Pago */}
                  {reserva.metodo_pago && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-crm-text-muted uppercase tracking-wide flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        Metodo de Pago
                      </h3>
                      <div className="p-4 rounded-xl bg-crm-background border border-crm-border">
                        <p className="font-medium text-crm-text capitalize">
                          {reserva.metodo_pago}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Comprobante */}
                  {reserva.comprobante_url && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-crm-text-muted uppercase tracking-wide flex items-center gap-2">
                        <FileImage className="h-4 w-4" />
                        Comprobante de Pago
                      </h3>
                      <div className="p-4 rounded-xl bg-crm-background border border-crm-border">
                        <a
                          href={reserva.comprobante_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-crm-primary hover:underline flex items-center gap-2"
                        >
                          <FileImage className="h-4 w-4" />
                          Ver comprobante
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Notas */}
                  {reserva.notas && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-crm-text-muted uppercase tracking-wide flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Notas
                      </h3>
                      <div className="p-4 rounded-xl bg-crm-background border border-crm-border">
                        <p className="text-crm-text whitespace-pre-wrap">
                          {reserva.notas}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Motivo de Cancelacion */}
                  {reserva.motivo_cancelacion && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide flex items-center gap-2">
                        <XCircle className="h-4 w-4" />
                        Motivo de Cancelacion
                      </h3>
                      <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                        <p className="text-red-700 dark:text-red-300">
                          {reserva.motivo_cancelacion}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Vendedor y Timestamps */}
                  <div className="pt-4 border-t border-crm-border">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-crm-text-muted">Vendedor</p>
                        <p className="font-medium text-crm-text">
                          {reserva.vendedor?.nombre_completo ||
                            reserva.vendedor_username}
                        </p>
                      </div>
                      <div>
                        <p className="text-crm-text-muted">Creada</p>
                        <p className="font-medium text-crm-text">
                          {formatDateTime(reserva.created_at)}
                        </p>
                      </div>
                      <div>
                        <p className="text-crm-text-muted">Ultima actualizacion</p>
                        <p className="font-medium text-crm-text">
                          {formatDateTime(reserva.updated_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end px-6 py-4 border-t border-crm-border bg-crm-background">
                  <button
                    onClick={onClose}
                    className="px-6 py-2.5 bg-crm-primary text-white rounded-lg hover:bg-crm-primary-dark transition-colors"
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

  if (typeof document === "undefined") return null;
  return createPortal(modalContent, document.body);
}
