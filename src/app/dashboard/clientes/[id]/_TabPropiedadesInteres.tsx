"use client";

import { Heart, MapPin, DollarSign, Tag } from "lucide-react";
import Link from "next/link";
import { formatearMoneda } from "@/lib/types/crm-flujo";

interface Props {
  clienteId: string;
  propiedades: any[];
}

export default function TabPropiedadesInteres({ clienteId, propiedades }: Props) {
  const getPrioridadColor = (prioridad: number) => {
    if (prioridad === 1) return 'red';
    if (prioridad === 2) return 'yellow';
    return 'green';
  };

  const getPrioridadLabel = (prioridad: number) => {
    if (prioridad === 1) return 'Alta';
    if (prioridad === 2) return 'Media';
    return 'Baja';
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-crm-text">Lista de Deseos</h3>
        <p className="text-sm text-crm-text-muted">{propiedades.length} propiedades</p>
      </div>

      {!propiedades || propiedades.length === 0 ? (
        <div className="text-center py-12 bg-crm-background rounded-lg">
          <Heart className="h-12 w-12 mx-auto mb-3 text-crm-text-muted opacity-50" />
          <p className="text-crm-text-muted">No hay propiedades de interés registradas</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {propiedades.map((item) => {
            const prioridadColor = getPrioridadColor(item.prioridad);
            const prioridadLabel = getPrioridadLabel(item.prioridad);

            return (
              <div
                key={item.id}
                className="p-4 bg-crm-background rounded-lg border border-crm-border hover:border-crm-primary transition-colors"
              >
                {/* Lote Info */}
                {item.lote && (
                  <div className="mb-3">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <Link
                          href={`/dashboard/proyectos/${item.lote.proyecto?.id}`}
                          className="font-medium text-crm-text hover:text-crm-primary transition-colors"
                        >
                          Lote {item.lote.numero_lote}
                        </Link>
                        <p className="text-sm text-crm-text-muted">
                          {item.lote.proyecto?.nombre}
                        </p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded bg-${prioridadColor}-100 dark:bg-${prioridadColor}-900/30 text-${prioridadColor}-700 dark:text-${prioridadColor}-300`}>
                        {prioridadLabel}
                      </span>
                    </div>

                    {item.lote.precio_venta && (
                      <div className="flex items-center gap-2 text-sm text-crm-text">
                        <DollarSign className="h-4 w-4 text-crm-text-muted" />
                        <span className="font-semibold">
                          {formatearMoneda(item.lote.precio_venta, item.lote.moneda)}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-sm text-crm-text-muted mt-1">
                      <Tag className="h-3 w-3" />
                      <span className="capitalize">{item.lote.estado}</span>
                    </div>
                  </div>
                )}

                {/* Notas */}
                {item.notas && (
                  <p className="text-sm text-crm-text-muted mb-3 pt-3 border-t border-crm-border">
                    {item.notas}
                  </p>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between text-xs text-crm-text-muted pt-2 border-t border-crm-border">
                  <span>Agregado por {item.agregado_por_usuario?.username}</span>
                  <span>
                    {new Date(item.created_at).toLocaleDateString('es-PE', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
