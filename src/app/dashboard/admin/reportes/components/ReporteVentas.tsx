"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { DollarSign, TrendingUp, Calendar, Download } from "lucide-react";

export default function ReporteVentas() {
  const salesData = [
    { month: "Enero", sales: 450000, properties: 12 },
    { month: "Febrero", sales: 520000, properties: 15 },
    { month: "Marzo", sales: 480000, properties: 13 },
    { month: "Abril", sales: 610000, properties: 18 },
    { month: "Mayo", sales: 580000, properties: 16 },
    { month: "Junio", sales: 720000, properties: 21 },
  ];

  const topProjects = [
    { name: "Residencial Los Olivos", sales: 1800000, units: 24 },
    { name: "Condominio San Isidro", sales: 1200000, units: 16 },
    { name: "Torre Miraflores", sales: 950000, units: 12 },
    { name: "Urbanización La Molina", sales: 800000, units: 10 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-crm-text-primary flex items-center gap-2">
            <DollarSign className="w-6 h-6" />
            Reporte de Ventas
          </h2>
          <p className="text-crm-text-secondary mt-1">
            Análisis detallado de ventas y rendimiento comercial
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Seleccionar Período
          </Button>
          <Button className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-crm-text-secondary">
              Ventas Totales
            </CardTitle>
            <DollarSign className="h-4 w-4 text-crm-text-muted" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-crm-text-primary">S/ 3,360,000</div>
            <p className="text-xs text-green-600 mt-1">
              +15.3% vs período anterior
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-crm-text-secondary">
              Propiedades Vendidas
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-crm-text-muted" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-crm-text-primary">95</div>
            <p className="text-xs text-green-600 mt-1">
              +12.7% vs período anterior
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-crm-text-secondary">
              Ticket Promedio
            </CardTitle>
            <DollarSign className="h-4 w-4 text-crm-text-muted" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-crm-text-primary">S/ 35,368</div>
            <p className="text-xs text-green-600 mt-1">
              +2.3% vs período anterior
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sales Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Evolución de Ventas</CardTitle>
          <CardDescription>
            Ventas mensuales de los últimos 6 meses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {salesData.map((data, index) => (
              <div key={index} className="flex items-center justify-between p-4 border border-crm-border rounded-lg">
                <div>
                  <h4 className="font-medium text-crm-text-primary">{data.month}</h4>
                  <p className="text-sm text-crm-text-secondary">{data.properties} propiedades</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-crm-text-primary">
                    S/ {data.sales.toLocaleString()}
                  </p>
                  <div className="w-32 bg-gray-200 rounded-full h-2 mt-1">
                    <div 
                      className="bg-crm-primary h-2 rounded-full" 
                      style={{ width: `${(data.sales / 720000) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Projects */}
      <Card>
        <CardHeader>
          <CardTitle>Proyectos Más Vendidos</CardTitle>
          <CardDescription>
            Ranking de proyectos por volumen de ventas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topProjects.map((project, index) => (
              <div key={index} className="flex items-center justify-between p-4 border border-crm-border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-crm-primary text-white rounded-full flex items-center justify-center font-bold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <h4 className="font-medium text-crm-text-primary">{project.name}</h4>
                    <p className="text-sm text-crm-text-secondary">{project.units} unidades</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-crm-text-primary">
                    S/ {project.sales.toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Métricas de Rendimiento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-crm-text-secondary">Tasa de Conversión</span>
              <span className="font-bold text-crm-text-primary">24.8%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-crm-text-secondary">Tiempo Promedio de Venta</span>
              <span className="font-bold text-crm-text-primary">45 días</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-crm-text-secondary">Lead Quality Score</span>
              <span className="font-bold text-crm-text-primary">8.2/10</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-crm-text-secondary">Customer Satisfaction</span>
              <span className="font-bold text-crm-text-primary">4.7/5</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Objetivos vs Realidad</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-crm-text-secondary">Ventas Mensuales</span>
                <span className="text-sm text-crm-text-muted">560K / 600K</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: '93%' }}></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-crm-text-secondary">Propiedades</span>
                <span className="text-sm text-crm-text-muted">95 / 100</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: '95%' }}></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-crm-text-secondary">Clientes Nuevos</span>
                <span className="text-sm text-crm-text-muted">45 / 50</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-purple-500 h-2 rounded-full" style={{ width: '90%' }}></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}