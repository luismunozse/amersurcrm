"use client";

import { useMemo } from "react";
import { Home, TrendingUp, DollarSign, Archive } from "lucide-react";

interface Propiedad {
  estado_comercial: string;
  tipo: string;
  precio: number | null;
  moneda: string;
}

interface EstadisticasPropiedadesProps {
  propiedades: Propiedad[];
}

export default function EstadisticasPropiedades({ propiedades }: EstadisticasPropiedadesProps) {
  const stats = useMemo(() => {
    const total = propiedades.length;
    const disponibles = propiedades.filter(p => p.estado_comercial === 'disponible').length;
    const reservadas = propiedades.filter(p => p.estado_comercial === 'reservado').length;
    const vendidas = propiedades.filter(p => p.estado_comercial === 'vendido').length;
    const bloqueadas = propiedades.filter(p => p.estado_comercial === 'bloqueado').length;

    // Calcular valor total de propiedades disponibles
    const valorDisponible = propiedades
      .filter(p => p.estado_comercial === 'disponible' && p.precio)
      .reduce((sum, p) => sum + (p.precio || 0), 0);

    // Contar por tipo
    const porTipo = propiedades.reduce((acc, p) => {
      acc[p.tipo] = (acc[p.tipo] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total,
      disponibles,
      reservadas,
      vendidas,
      bloqueadas,
      valorDisponible,
      porTipo
    };
  }, [propiedades]);

  const formatearPrecio = (precio: number) => {
    if (precio >= 1000000) {
      return `$${(precio / 1000000).toFixed(1)}M`;
    } else if (precio >= 1000) {
      return `$${(precio / 1000).toFixed(0)}K`;
    }
    return `$${precio}`;
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
      {/* Total */}
      <div className="crm-card p-4 border-l-4 border-blue-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-crm-text-muted font-medium mb-1">Total</p>
            <p className="text-2xl font-bold text-crm-text-primary">{stats.total}</p>
          </div>
          <Home className="w-8 h-8 text-blue-500 opacity-20" />
        </div>
      </div>

      {/* Disponibles */}
      <div className="crm-card p-4 border-l-4 border-green-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-crm-text-muted font-medium mb-1">Disponibles</p>
            <p className="text-2xl font-bold text-green-600">{stats.disponibles}</p>
          </div>
          <div className="text-xs text-green-600 font-semibold">
            {stats.total > 0 ? Math.round((stats.disponibles / stats.total) * 100) : 0}%
          </div>
        </div>
      </div>

      {/* Reservadas */}
      <div className="crm-card p-4 border-l-4 border-yellow-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-crm-text-muted font-medium mb-1">Reservadas</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.reservadas}</p>
          </div>
          <div className="text-xs text-yellow-600 font-semibold">
            {stats.total > 0 ? Math.round((stats.reservadas / stats.total) * 100) : 0}%
          </div>
        </div>
      </div>

      {/* Vendidas */}
      <div className="crm-card p-4 border-l-4 border-red-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-crm-text-muted font-medium mb-1">Vendidas</p>
            <p className="text-2xl font-bold text-red-600">{stats.vendidas}</p>
          </div>
          <div className="text-xs text-red-600 font-semibold">
            {stats.total > 0 ? Math.round((stats.vendidas / stats.total) * 100) : 0}%
          </div>
        </div>
      </div>

      {/* Bloqueadas */}
      <div className="crm-card p-4 border-l-4 border-gray-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-crm-text-muted font-medium mb-1">Bloqueadas</p>
            <p className="text-2xl font-bold text-gray-600">{stats.bloqueadas}</p>
          </div>
          <Archive className="w-6 h-6 text-gray-400 opacity-50" />
        </div>
      </div>

      {/* Valor Disponible */}
      <div className="crm-card p-4 border-l-4 border-emerald-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-crm-text-muted font-medium mb-1">Valor Disponible</p>
            <p className="text-2xl font-bold text-emerald-600">
              {formatearPrecio(stats.valorDisponible)}
            </p>
          </div>
          <DollarSign className="w-8 h-8 text-emerald-500 opacity-20" />
        </div>
      </div>
    </div>
  );
}
