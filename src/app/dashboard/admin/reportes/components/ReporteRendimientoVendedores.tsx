"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, TrendingUp, Target, Award, Calendar, Download } from "lucide-react";

export default function ReporteRendimientoVendedores() {
  const performanceStats = [
    { label: "Total Vendedores", value: "24", change: "+2", type: "positive" },
    { label: "Ventas Totales", value: "S/ 2.4M", change: "+18.5%", type: "positive" },
    { label: "Promedio por Vendedor", value: "S/ 100K", change: "+12.3%", type: "positive" },
    { label: "Tasa de Conversión", value: "24.8%", change: "+3.2%", type: "positive" },
  ];

  const topPerformers = [
    { 
      name: "María González", 
      sales: "S/ 450,000", 
      deals: 12, 
      conversion: "28.5%",
      avatar: "MG"
    },
    { 
      name: "Carlos Rodríguez", 
      sales: "S/ 380,000", 
      deals: 10, 
      conversion: "26.8%",
      avatar: "CR"
    },
    { 
      name: "Ana Martínez", 
      sales: "S/ 320,000", 
      deals: 8, 
      conversion: "25.2%",
      avatar: "AM"
    },
    { 
      name: "Luis Fernández", 
      sales: "S/ 290,000", 
      deals: 7, 
      conversion: "23.1%",
      avatar: "LF"
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-crm-text-primary flex items-center gap-2">
            <Users className="w-6 h-6" />
            Rendimiento de Vendedores
          </h2>
          <p className="text-crm-text-secondary mt-1">
            Análisis de productividad y métricas del equipo de ventas
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {performanceStats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-crm-text-secondary">
                {stat.label}
              </CardTitle>
              {index === 0 && <Users className="h-4 w-4 text-crm-text-muted" />}
              {index === 1 && <TrendingUp className="h-4 w-4 text-crm-text-muted" />}
              {index === 2 && <Target className="h-4 w-4 text-crm-text-muted" />}
              {index === 3 && <Award className="h-4 w-4 text-crm-text-muted" />}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-crm-text-primary">{stat.value}</div>
              <p className={`text-xs mt-1 ${
                stat.type === "positive" ? "text-green-600" : "text-red-600"
              }`}>
                {stat.change} vs período anterior
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Top Performers */}
      <Card>
        <CardHeader>
          <CardTitle>Top Performers</CardTitle>
          <CardDescription>
            Vendedores con mejor rendimiento del período
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topPerformers.map((performer, index) => (
              <div key={index} className="flex items-center justify-between p-4 border border-crm-border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-crm-primary text-white rounded-full flex items-center justify-center font-bold">
                    {performer.avatar}
                  </div>
                  <div>
                    <h4 className="font-medium text-crm-text-primary">{performer.name}</h4>
                    <p className="text-sm text-crm-text-secondary">{performer.deals} ventas realizadas</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-crm-text-primary">{performer.sales}</p>
                  <p className="text-sm text-crm-text-secondary">{performer.conversion} conversión</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Métricas de Equipo</CardTitle>
            <CardDescription>
              Indicadores de rendimiento general
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-crm-text-secondary">Objetivo Mensual</span>
              <span className="font-bold text-crm-text-primary">S/ 2.0M</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-crm-text-secondary">Ventas Realizadas</span>
              <span className="font-bold text-green-600">S/ 2.4M</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-crm-text-secondary">Cumplimiento</span>
              <span className="font-bold text-green-600">120%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-crm-text-secondary">Promedio de Cierre</span>
              <span className="font-bold text-crm-text-primary">45 días</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Objetivos por Vendedor</CardTitle>
            <CardDescription>
              Progreso hacia metas individuales
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-crm-text-secondary">Vendedores que Superaron Meta</span>
                <span className="text-sm text-crm-text-muted">18 / 24</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: '75%' }}></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-crm-text-secondary">Conversión Promedio</span>
                <span className="text-sm text-crm-text-muted">24.8% / 25%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: '99%' }}></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-crm-text-secondary">Satisfacción Cliente</span>
                <span className="text-sm text-crm-text-muted">4.7 / 5.0</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-purple-500 h-2 rounded-full" style={{ width: '94%' }}></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}