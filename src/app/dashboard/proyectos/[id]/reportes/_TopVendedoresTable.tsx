"use client";

import { TrophyIcon } from "@heroicons/react/24/solid";

export default function TopVendedoresTable({
  data,
}: {
  data: Record<string, { vendidos: number; ingresos: number }>;
}) {
  const vendedores = Object.entries(data)
    .map(([username, stats]) => ({
      username,
      ...stats,
    }))
    .sort((a, b) => b.vendidos - a.vendidos)
    .slice(0, 5); // Top 5

  if (vendedores.length === 0) {
    return (
      <div className="py-8 text-center text-crm-text-muted">
        <p className="text-sm">No hay ventas registradas aún</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-crm-border">
            <th className="text-left py-3 px-4 text-sm font-semibold text-crm-text-primary">
              Posición
            </th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-crm-text-primary">
              Vendedor
            </th>
            <th className="text-center py-3 px-4 text-sm font-semibold text-crm-text-primary">
              Lotes Vendidos
            </th>
            <th className="text-right py-3 px-4 text-sm font-semibold text-crm-text-primary">
              Ingresos Generados
            </th>
          </tr>
        </thead>
        <tbody>
          {vendedores.map((vendedor, index) => {
            const esTop3 = index < 3;
            const iconoColor = index === 0
              ? 'text-yellow-500'
              : index === 1
              ? 'text-gray-400'
              : index === 2
              ? 'text-amber-600'
              : '';

            return (
              <tr
                key={vendedor.username}
                className="border-b border-crm-border hover:bg-crm-card-hover transition-colors"
              >
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    {esTop3 ? (
                      <TrophyIcon className={`w-5 h-5 ${iconoColor}`} />
                    ) : (
                      <span className="text-sm font-medium text-crm-text-muted w-5 text-center">
                        {index + 1}
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className="text-sm font-medium text-crm-text-primary">
                    {vendedor.username}
                  </span>
                </td>
                <td className="py-3 px-4 text-center">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-crm-primary/10 text-crm-primary">
                    {vendedor.vendidos} lote{vendedor.vendidos !== 1 ? 's' : ''}
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  <span className="text-sm font-bold text-green-600">
                    S/ {vendedor.ingresos.toLocaleString('es-PE', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Totales */}
      <div className="mt-4 pt-4 border-t border-crm-border flex justify-between items-center">
        <div className="text-sm text-crm-text-muted">
          Total de {vendedores.length} vendedor{vendedores.length !== 1 ? 'es' : ''}
        </div>
        <div className="text-right">
          <p className="text-sm text-crm-text-muted">Total Vendido</p>
          <p className="text-lg font-bold text-crm-primary">
            {vendedores.reduce((sum, v) => sum + v.vendidos, 0)} lotes
          </p>
        </div>
      </div>
    </div>
  );
}
