"use client";

import { useState } from "react";
import { FileText, Clock, CheckCircle, XCircle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { formatearMoneda } from "@/lib/types/crm-flujo";
import CrearReservaModal from "@/components/CrearReservaModal";

interface Props {
  clienteId: string;
  clienteNombre: string;
  reservas: any[];
}

export default function TabReservas({ clienteId, clienteNombre, reservas }: Props) {
  const [isCrearModalOpen, setIsCrearModalOpen] = useState(false);
  const [selectedLote, setSelectedLote] = useState<{ id: string; nombre: string } | null>(null);

  const getEstadoColor = (estado: string) => {
    const colores = {
      'activa': 'green',
      'vencida': 'red',
      'cancelada': 'gray',
      'convertida_venta': 'blue',
    };
    return colores[estado as keyof typeof colores] || 'gray';
  };

  const getEstadoLabel = (estado: string) => {
    const labels = {
      'activa': 'Activa',
      'vencida': 'Vencida',
      'cancelada': 'Cancelada',
      'convertida_venta': 'Convertida en Venta',
    };
    return labels[estado as keyof typeof labels] || estado;
  };

  const getEstadoIcon = (estado: string) => {
    if (estado === 'activa') return <CheckCircle className="h-4 w-4" />;
    if (estado === 'vencida' || estado === 'cancelada') return <XCircle className="h-4 w-4" />;
    if (estado === 'convertida_venta') return <ArrowRight className="h-4 w-4" />;
    return null;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-crm-text">Reservas</h3>
        <button
          onClick={() => setIsCrearModalOpen(true)}
          className="px-4 py-2 bg-crm-primary text-white rounded-lg hover:bg-crm-primary-dark transition-colors text-sm"
        >
          Nueva Reserva
        </button>
      </div>

      {!reservas || reservas.length === 0 ? (
        <div className="text-center py-12 bg-crm-background rounded-lg">
          <FileText className="h-12 w-12 mx-auto mb-3 text-crm-text-muted opacity-50" />
          <p className="text-crm-text-muted mb-4">No hay reservas registradas</p>
          <button
            onClick={() => setIsCrearModalOpen(true)}
            className="text-crm-primary hover:underline"
          >
            Crear primera reserva
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {reservas.map((reserva) => {
            const estadoColor = getEstadoColor(reserva.estado);
            const estadoLabel = getEstadoLabel(reserva.estado);
            const estadoIcon = getEstadoIcon(reserva.estado);

            return (
              <div
                key={reserva.id}
                className="p-4 bg-crm-background rounded-lg border border-crm-border hover:border-crm-primary transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-mono font-semibold text-crm-text">
                        {reserva.codigo_reserva}
                      </p>
                      <span className={`flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded bg-${estadoColor}-100 dark:bg-${estadoColor}-900/30 text-${estadoColor}-700 dark:text-${estadoColor}-300`}>
                        {estadoIcon}
                        {estadoLabel}
                      </span>
                    </div>

                    {reserva.lote && (
                      <Link
                        href={`/dashboard/proyectos/${reserva.lote.proyecto?.id}`}
                        className="text-sm text-crm-text-muted hover:text-crm-primary transition-colors"
                      >
                        Lote {reserva.lote.numero_lote} - {reserva.lote.proyecto?.nombre}
                      </Link>
                    )}
                  </div>

                  <div className="text-right ml-4">
                    <p className="font-semibold text-crm-text">
                      {formatearMoneda(reserva.monto_reserva, reserva.moneda)}
                    </p>
                    <p className="text-xs text-crm-text-muted mt-1">
                      {reserva.metodo_pago || 'Sin método'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-crm-border">
                  <div className="text-sm">
                    <p className="text-crm-text-muted text-xs mb-1">Fecha de Reserva</p>
                    <p className="text-crm-text">
                      {new Date(reserva.fecha_reserva).toLocaleDateString('es-PE', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </p>
                  </div>

                  <div className="text-sm">
                    <p className="text-crm-text-muted text-xs mb-1 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Fecha de Vencimiento
                    </p>
                    <p className={`font-medium ${
                      reserva.estado === 'activa' && new Date(reserva.fecha_vencimiento) < new Date()
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-crm-text'
                    }`}>
                      {new Date(reserva.fecha_vencimiento).toLocaleDateString('es-PE', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                </div>

                {reserva.notas && (
                  <div className="mt-3 pt-3 border-t border-crm-border">
                    <p className="text-sm text-crm-text-muted">{reserva.notas}</p>
                  </div>
                )}

                {reserva.motivo_cancelacion && (
                  <div className="mt-3 pt-3 border-t border-crm-border">
                    <p className="text-xs text-red-600 dark:text-red-400">
                      Motivo de cancelación: {reserva.motivo_cancelacion}
                    </p>
                  </div>
                )}

                <div className="mt-3 text-xs text-crm-text-muted">
                  Vendedor: {reserva.vendedor?.username || 'desconocido'}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Crear Reserva */}
      <CrearReservaModal
        isOpen={isCrearModalOpen}
        onClose={() => {
          setIsCrearModalOpen(false);
          setSelectedLote(null);
        }}
        clienteId={clienteId}
        clienteNombre={clienteNombre}
        loteId={selectedLote?.id}
        loteNombre={selectedLote?.nombre}
      />
    </div>
  );
}
