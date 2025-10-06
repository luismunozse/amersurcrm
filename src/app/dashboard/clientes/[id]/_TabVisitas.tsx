"use client";

import { Eye, MapPin, Clock, Star, FileText } from "lucide-react";
import Link from "next/link";

interface Props {
  clienteId: string;
  visitas: any[];
}

export default function TabVisitas({ clienteId, visitas }: Props) {
  const renderEstrellas = (nivel: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${
              i <= nivel
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300 dark:text-gray-600'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-crm-text">Visitas a Propiedades</h3>
        <p className="text-sm text-crm-text-muted">{visitas.length} visitas</p>
      </div>

      {!visitas || visitas.length === 0 ? (
        <div className="text-center py-12 bg-crm-background rounded-lg">
          <Eye className="h-12 w-12 mx-auto mb-3 text-crm-text-muted opacity-50" />
          <p className="text-crm-text-muted">No hay visitas registradas</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visitas.map((visita) => (
            <div
              key={visita.id}
              className="p-4 bg-crm-background rounded-lg border border-crm-border hover:border-crm-primary transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  {visita.lote && (
                    <div className="mb-2">
                      <Link
                        href={`/dashboard/proyectos/${visita.lote.proyecto?.id}`}
                        className="font-medium text-crm-text hover:text-crm-primary transition-colors"
                      >
                        Lote {visita.lote.numero_lote}
                      </Link>
                      <p className="text-sm text-crm-text-muted">
                        {visita.lote.proyecto?.nombre}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-sm text-crm-text-muted">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>
                        {new Date(visita.fecha_visita).toLocaleDateString('es-PE', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>

                    {visita.duracion_minutos && (
                      <span>{visita.duracion_minutos} minutos</span>
                    )}
                  </div>
                </div>

                {visita.nivel_interes && (
                  <div className="ml-4">
                    {renderEstrellas(visita.nivel_interes)}
                    <p className="text-xs text-crm-text-muted text-center mt-1">
                      Nivel de Interés
                    </p>
                  </div>
                )}
              </div>

              {visita.feedback && (
                <div className="pt-3 border-t border-crm-border">
                  <p className="text-sm text-crm-text flex items-start gap-2">
                    <FileText className="h-4 w-4 text-crm-text-muted mt-0.5 flex-shrink-0" />
                    <span>{visita.feedback}</span>
                  </p>
                </div>
              )}

              <div className="mt-3 text-xs text-crm-text-muted">
                Registrado por: {visita.vendedor?.username || 'desconocido'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
