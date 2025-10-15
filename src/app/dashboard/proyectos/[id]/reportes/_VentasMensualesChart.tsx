"use client";

export default function VentasMensualesChart({ data }: { data: Record<string, number> }) {
  const meses = Object.keys(data);
  const valores = Object.values(data);
  const maxValor = Math.max(...valores, 1);

  // Convertir formato de fecha (YYYY-MM a "Ene 2025")
  const formatearMes = (mesAno: string) => {
    const [ano, mes] = mesAno.split('-');
    const mesesCortos = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${mesesCortos[parseInt(mes) - 1]} ${ano}`;
  };

  if (valores.every(v => v === 0)) {
    return (
      <div className="h-64 flex items-center justify-center text-crm-text-muted">
        <div className="text-center">
          <p className="text-sm">No hay ventas registradas en los últimos 6 meses</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-64">
      <div className="flex items-end justify-between h-full gap-2">
        {meses.map((mes, index) => {
          const valor = valores[index];
          const altura = maxValor > 0 ? (valor / maxValor) * 100 : 0;

          return (
            <div key={mes} className="flex-1 flex flex-col items-center gap-2">
              {/* Barra */}
              <div className="w-full flex flex-col justify-end h-full">
                <div
                  className="w-full bg-gradient-to-t from-crm-primary to-crm-accent rounded-t-lg transition-all duration-500 hover:opacity-80 relative group"
                  style={{ height: `${altura}%`, minHeight: valor > 0 ? '20px' : '0' }}
                >
                  {/* Tooltip */}
                  {valor > 0 && (
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <div className="bg-crm-text-primary text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap">
                        {valor} venta{valor !== 1 ? 's' : ''}
                      </div>
                      <div className="w-2 h-2 bg-crm-text-primary transform rotate-45 absolute top-full left-1/2 -translate-x-1/2 -mt-1"></div>
                    </div>
                  )}
                  {/* Valor encima */}
                  {valor > 0 && (
                    <span className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-semibold text-crm-text-primary">
                      {valor}
                    </span>
                  )}
                </div>
              </div>

              {/* Label del mes */}
              <p className="text-xs text-crm-text-muted text-center font-medium">
                {formatearMes(mes).split(' ')[0]}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
