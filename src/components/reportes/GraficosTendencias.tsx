"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, BarChart3, PieChart as PieChartIcon } from "lucide-react";

interface GraficosTendenciasProps {
  tendencias: Array<{
    mes: string;
    ventas: number;
    propiedades: number;
    clientes: number;
  }>;
  metricas: {
    ventas: {
      valorTotal: number;
      propiedadesVendidas: number;
    };
    clientes: {
      activos: number;
      nuevos: number;
    };
    propiedades: {
      vendidas: number;
      disponibles: number;
    };
  };
}

export default function GraficosTendencias({ tendencias, metricas }: GraficosTendenciasProps) {
  // Datos para gráfico de tendencias de ventas
  const datosVentas = tendencias.map(item => ({
    mes: item.mes,
    ventas: item.ventas / 1000, // Convertir a miles
    propiedades: item.propiedades
  }));

  // Datos para gráfico de distribución de propiedades
  const datosPropiedades = [
    { name: 'Vendidas', value: metricas.propiedades.vendidas, color: '#10B981' },
    { name: 'Disponibles', value: metricas.propiedades.disponibles, color: '#3B82F6' }
  ];

  // Datos para gráfico de clientes
  const datosClientes = [
    { name: 'Activos', value: metricas.clientes.activos, color: '#8B5CF6' },
    { name: 'Nuevos', value: metricas.clientes.nuevos, color: '#F59E0B' }
  ];

  const formatearMoneda = (value: number) => {
    return `S/ ${value}K`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{`Mes: ${label}`}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {`${entry.dataKey}: ${entry.dataKey === 'ventas' ? formatearMoneda(entry.value) : entry.value}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Gráfico de Tendencias de Ventas */}
      <div className="bg-crm-card border border-crm-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-crm-text-primary">Tendencias de Ventas</h3>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={datosVentas}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="mes" 
                tick={{ fontSize: 12 }}
                tickLine={{ stroke: '#9CA3AF' }}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickLine={{ stroke: '#9CA3AF' }}
                tickFormatter={(value) => `S/ ${value}K`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line 
                type="monotone" 
                dataKey="ventas" 
                stroke="#3B82F6" 
                strokeWidth={3}
                dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#3B82F6', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Barras - Propiedades */}
        <div className="bg-crm-card border border-crm-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-semibold text-crm-text-primary">Propiedades por Mes</h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={datosVentas}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="mes" 
                  tick={{ fontSize: 12 }}
                  tickLine={{ stroke: '#9CA3AF' }}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickLine={{ stroke: '#9CA3AF' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="propiedades" 
                  fill="#10B981"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico Circular - Distribución de Propiedades */}
        <div className="bg-crm-card border border-crm-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <PieChartIcon className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-crm-text-primary">Distribución de Propiedades</h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={datosPropiedades}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {datosPropiedades.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number, name: string) => [value, name]}
                  labelStyle={{ color: '#374151' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-4">
            {datosPropiedades.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: item.color }}
                ></div>
                <span className="text-sm text-crm-text-secondary">
                  {item.name}: {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Gráfico Circular - Clientes */}
      <div className="bg-crm-card border border-crm-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <PieChartIcon className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-crm-text-primary">Distribución de Clientes</h3>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={datosClientes}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {datosClientes.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number, name: string) => [value, name]}
                labelStyle={{ color: '#374151' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-center gap-4 mt-4">
          {datosClientes.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: item.color }}
              ></div>
              <span className="text-sm text-crm-text-secondary">
                {item.name}: {item.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

