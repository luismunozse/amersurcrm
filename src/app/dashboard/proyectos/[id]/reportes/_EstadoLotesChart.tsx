"use client";

export default function EstadoLotesChart({
  vendidos,
  reservados,
  disponibles,
}: {
  vendidos: number;
  reservados: number;
  disponibles: number;
}) {
  const total = vendidos + reservados + disponibles;

  if (total === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-crm-text-muted">
        <div className="text-center">
          <p className="text-sm">No hay lotes registrados</p>
        </div>
      </div>
    );
  }

  const porcentajeVendidos = Math.round((vendidos / total) * 100);
  const porcentajeReservados = Math.round((reservados / total) * 100);
  const porcentajeDisponibles = Math.round((disponibles / total) * 100);

  return (
    <div className="h-64">
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-6">
          {/* Donut Chart Simplificado */}
          <div className="relative w-40 h-40">
            {/* SVG Donut */}
            <svg className="w-40 h-40 transform -rotate-90" viewBox="0 0 120 120">
              <circle
                cx="60"
                cy="60"
                r="50"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="20"
              />

              {/* Vendidos */}
              {vendidos > 0 && (
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  fill="none"
                  stroke="#22c55e"
                  strokeWidth="20"
                  strokeDasharray={`${(vendidos / total) * 314} 314`}
                  strokeDashoffset="0"
                  className="transition-all duration-500"
                />
              )}

              {/* Reservados */}
              {reservados > 0 && (
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  fill="none"
                  stroke="#eab308"
                  strokeWidth="20"
                  strokeDasharray={`${(reservados / total) * 314} 314`}
                  strokeDashoffset={`-${(vendidos / total) * 314}`}
                  className="transition-all duration-500"
                />
              )}

              {/* Disponibles */}
              {disponibles > 0 && (
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  fill="none"
                  stroke="#86901F"
                  strokeWidth="20"
                  strokeDasharray={`${(disponibles / total) * 314} 314`}
                  strokeDashoffset={`-${((vendidos + reservados) / total) * 314}`}
                  className="transition-all duration-500"
                />
              )}
            </svg>

            {/* Centro con total */}
            <div className="absolute inset-0 flex items-center justify-center flex-col">
              <p className="text-3xl font-bold text-crm-text-primary">{total}</p>
              <p className="text-xs text-crm-text-muted">Total</p>
            </div>
          </div>

          {/* Leyenda */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-sm text-crm-text-primary font-medium">
                Vendidos: {vendidos} ({porcentajeVendidos}%)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <span className="text-sm text-crm-text-primary font-medium">
                Reservados: {reservados} ({porcentajeReservados}%)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-crm-primary"></div>
              <span className="text-sm text-crm-text-primary font-medium">
                Disponibles: {disponibles} ({porcentajeDisponibles}%)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
