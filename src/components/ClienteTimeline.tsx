"use client";

import { Phone, Mail, MessageSquare, Users, Video, FileText, Eye, Tag, DollarSign, CreditCard, Calendar } from "lucide-react";
import { formatearMoneda } from "@/lib/types/crm-flujo";
import { getSmallBadgeClasses, getTimelineIconClasses } from "@/lib/utils/badge";

interface TimelineEvent {
  id: string;
  type: 'interaccion' | 'visita' | 'reserva' | 'venta' | 'pago';
  fecha: string;
  titulo: string;
  descripcion?: string;
  metadata?: Record<string, any>;
}

interface Props {
  eventos: TimelineEvent[];
}

export default function ClienteTimeline({ eventos }: Props) {
  const getIconoEvento = (type: string, metadata?: Record<string, any>) => {
    if (type === 'interaccion') {
      const tipoInteraccion = metadata?.tipo || '';
      const iconos = {
        'llamada': <Phone className="h-4 w-4" />,
        'email': <Mail className="h-4 w-4" />,
        'whatsapp': <MessageSquare className="h-4 w-4" />,
        'visita': <Users className="h-4 w-4" />,
        'reunion': <Video className="h-4 w-4" />,
        'mensaje': <FileText className="h-4 w-4" />,
      };
      return iconos[tipoInteraccion as keyof typeof iconos] || <FileText className="h-4 w-4" />;
    }
    if (type === 'visita') return <Eye className="h-4 w-4" />;
    if (type === 'reserva') return <Tag className="h-4 w-4" />;
    if (type === 'venta') return <DollarSign className="h-4 w-4" />;
    if (type === 'pago') return <CreditCard className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  const getColorEvento = (type: string) => {
    const colores = {
      'interaccion': 'blue',
      'visita': 'purple',
      'reserva': 'yellow',
      'venta': 'green',
      'pago': 'teal',
    };
    return colores[type as keyof typeof colores] || 'gray';
  };

  const formatearFecha = (fecha: string) => {
    const date = new Date(fecha);
    const hoy = new Date();
    const ayer = new Date(hoy);
    ayer.setDate(ayer.getDate() - 1);

    if (date.toDateString() === hoy.toDateString()) {
      return `Hoy a las ${date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (date.toDateString() === ayer.toDateString()) {
      return `Ayer a las ${date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleDateString('es-PE', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  if (!eventos || eventos.length === 0) {
    return (
      <div className="text-center py-12 bg-crm-background rounded-lg">
        <Calendar className="h-12 w-12 mx-auto mb-3 text-crm-text-muted opacity-50" />
        <p className="text-crm-text-muted">No hay eventos en el historial</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Línea vertical del timeline */}
      <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-crm-border" />

      <div className="space-y-6">
        {eventos.map((evento, index) => {
          const color = getColorEvento(evento.type);
          const icono = getIconoEvento(evento.type, evento.metadata);

          return (
            <div key={evento.id} className="relative pl-16">
              {/* Círculo del evento */}
              <div className={getTimelineIconClasses(color)}>
                {icono}
              </div>

              {/* Contenido del evento */}
              <div className="bg-crm-card border border-crm-border rounded-lg p-4 hover:border-crm-primary transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h4 className="font-semibold text-crm-text">{evento.titulo}</h4>
                    <p className="text-xs text-crm-text-muted mt-1">
                      {formatearFecha(evento.fecha)}
                    </p>
                  </div>
                  <span className={getSmallBadgeClasses(color)}>
                    {evento.type.charAt(0).toUpperCase() + evento.type.slice(1)}
                  </span>
                </div>

                {evento.descripcion && (
                  <p className="text-sm text-crm-text-muted mt-2">{evento.descripcion}</p>
                )}

                {/* Metadata específica por tipo */}
                {evento.metadata && (
                  <div className="mt-3 pt-3 border-t border-crm-border">
                    {/* Interacciones */}
                    {evento.type === 'interaccion' && (
                      <div className="flex flex-wrap gap-3 text-xs">
                        {evento.metadata.resultado && (
                          <span className="text-crm-text-muted">
                            Resultado: <strong className="text-crm-text">{evento.metadata.resultado}</strong>
                          </span>
                        )}
                        {evento.metadata.duracion_minutos && (
                          <span className="text-crm-text-muted">
                            Duración: <strong className="text-crm-text">{evento.metadata.duracion_minutos} min</strong>
                          </span>
                        )}
                        {evento.metadata.proxima_accion && evento.metadata.proxima_accion !== 'ninguna' && (
                          <span className="text-crm-text-muted">
                            Próxima acción: <strong className="text-crm-text">{evento.metadata.proxima_accion}</strong>
                          </span>
                        )}
                      </div>
                    )}

                    {/* Visitas */}
                    {evento.type === 'visita' && (
                      <div className="flex flex-wrap gap-3 text-xs">
                        {evento.metadata.lote && (
                          <span className="text-crm-text-muted">
                            Lote: <strong className="text-crm-text">{evento.metadata.lote}</strong>
                          </span>
                        )}
                        {evento.metadata.nivel_interes && (
                          <span className="text-crm-text-muted">
                            Nivel de interés: <strong className="text-crm-text">{evento.metadata.nivel_interes}/5</strong>
                          </span>
                        )}
                        {evento.metadata.duracion_minutos && (
                          <span className="text-crm-text-muted">
                            Duración: <strong className="text-crm-text">{evento.metadata.duracion_minutos} min</strong>
                          </span>
                        )}
                      </div>
                    )}

                    {/* Reservas */}
                    {evento.type === 'reserva' && (
                      <div className="flex flex-wrap gap-3 text-xs">
                        {evento.metadata.codigo && (
                          <span className="text-crm-text-muted">
                            Código: <strong className="text-crm-text font-mono">{evento.metadata.codigo}</strong>
                          </span>
                        )}
                        {evento.metadata.monto && evento.metadata.moneda && (
                          <span className="text-crm-text-muted">
                            Monto: <strong className="text-crm-text">
                              {formatearMoneda(evento.metadata.monto, evento.metadata.moneda)}
                            </strong>
                          </span>
                        )}
                        {evento.metadata.lote && (
                          <span className="text-crm-text-muted">
                            Lote: <strong className="text-crm-text">{evento.metadata.lote}</strong>
                          </span>
                        )}
                        {evento.metadata.estado && (
                          <span className="text-crm-text-muted">
                            Estado: <strong className="text-crm-text capitalize">{evento.metadata.estado}</strong>
                          </span>
                        )}
                      </div>
                    )}

                    {/* Ventas */}
                    {evento.type === 'venta' && (
                      <div className="flex flex-wrap gap-3 text-xs">
                        {evento.metadata.codigo && (
                          <span className="text-crm-text-muted">
                            Código: <strong className="text-crm-text font-mono">{evento.metadata.codigo}</strong>
                          </span>
                        )}
                        {evento.metadata.precio_total && evento.metadata.moneda && (
                          <span className="text-crm-text-muted">
                            Precio: <strong className="text-crm-text">
                              {formatearMoneda(evento.metadata.precio_total, evento.metadata.moneda)}
                            </strong>
                          </span>
                        )}
                        {evento.metadata.forma_pago && (
                          <span className="text-crm-text-muted">
                            Pago: <strong className="text-crm-text capitalize">{evento.metadata.forma_pago.replace('_', ' ')}</strong>
                          </span>
                        )}
                        {evento.metadata.lote && (
                          <span className="text-crm-text-muted">
                            Lote: <strong className="text-crm-text">{evento.metadata.lote}</strong>
                          </span>
                        )}
                      </div>
                    )}

                    {/* Pagos */}
                    {evento.type === 'pago' && (
                      <div className="flex flex-wrap gap-3 text-xs">
                        {evento.metadata.monto && evento.metadata.moneda && (
                          <span className="text-crm-text-muted">
                            Monto: <strong className="text-green-600 dark:text-green-400">
                              {formatearMoneda(evento.metadata.monto, evento.metadata.moneda)}
                            </strong>
                          </span>
                        )}
                        {evento.metadata.numero_cuota && (
                          <span className="text-crm-text-muted">
                            Cuota: <strong className="text-crm-text">#{evento.metadata.numero_cuota}</strong>
                          </span>
                        )}
                        {evento.metadata.metodo_pago && (
                          <span className="text-crm-text-muted">
                            Método: <strong className="text-crm-text capitalize">{evento.metadata.metodo_pago}</strong>
                          </span>
                        )}
                        {evento.metadata.venta_codigo && (
                          <span className="text-crm-text-muted">
                            Venta: <strong className="text-crm-text font-mono">{evento.metadata.venta_codigo}</strong>
                          </span>
                        )}
                      </div>
                    )}

                    {/* Vendedor/Usuario */}
                    {evento.metadata.vendedor_username && (
                      <div className="mt-2 text-xs text-crm-text-muted">
                        Por: {evento.metadata.vendedor_username}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
