"use client";

import { useState } from "react";
import { Calendar, Download, Filter, TrendingUp, Users, Building, DollarSign, BarChart3, UserCheck, UserCog } from "lucide-react";

export default function ReportesPage() {
  const [selectedPeriod, setSelectedPeriod] = useState("30");
  const [activeTab, setActiveTab] = useState("ventas");

  const reportCards = [
    {
      title: "Ventas Totales",
      value: "S/ 2,450,000",
      change: "+12.5%",
      changeType: "positive" as const,
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Clientes Activos",
      value: "1,247",
      change: "+8.2%",
      changeType: "positive" as const,
      icon: UserCheck,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Propiedades Vendidas",
      value: "89",
      change: "+15.3%",
      changeType: "positive" as const,
      icon: Building,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "Conversión",
      value: "24.8%",
      change: "+3.1%",
      changeType: "positive" as const,
      icon: TrendingUp,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
  ];

  const reportTypes = [
    {
      id: "ventas",
      title: "Reporte de Ventas",
      description: "Análisis detallado de ventas por período",
      icon: DollarSign,
    },
    {
      id: "clientes",
      title: "Reporte de Clientes",
      description: "Estadísticas de clientes y leads",
      icon: UserCheck,
    },
    {
      id: "propiedades",
      title: "Reporte de Propiedades",
      description: "Inventario y ventas de propiedades",
      icon: Building,
    },
    {
      id: "rendimiento",
      title: "Rendimiento de Vendedores",
      description: "Métricas de productividad del equipo",
      icon: UserCog,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-crm-text-primary font-display">Reportes</h1>
          <p className="text-crm-text-secondary mt-1">
            Análisis detallado y métricas del sistema
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-crm-text-muted" />
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent"
            >
              <option value="7">Últimos 7 días</option>
              <option value="30">Últimos 30 días</option>
              <option value="90">Últimos 90 días</option>
              <option value="365">Último año</option>
            </select>
          </div>
          
          <button className="flex items-center gap-2 px-4 py-2 bg-crm-primary text-white rounded-lg hover:bg-crm-primary-hover transition-colors">
            <Download className="w-4 h-4" />
            Exportar
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {reportCards.map((card, index) => (
          <div key={index} className="bg-crm-card border border-crm-border rounded-xl p-6 hover:shadow-lg transition-shadow duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-crm-text-secondary">
                {card.title}
              </h3>
              <div className={`p-2 rounded-lg ${card.bgColor}`}>
                <card.icon className={`w-4 h-4 ${card.color}`} />
              </div>
            </div>
            <div className="text-2xl font-bold text-crm-text-primary mb-1">{card.value}</div>
            <p className={`text-xs ${
              card.changeType === "positive" ? "text-green-600" : "text-red-600"
            }`}>
              {card.change} vs período anterior
            </p>
          </div>
        ))}
      </div>

      {/* Reports Tabs */}
      <div className="bg-crm-card border border-crm-border rounded-xl p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-crm-text-primary flex items-center gap-2 mb-2">
            <BarChart3 className="w-5 h-5" />
            Reportes Detallados
          </h2>
          <p className="text-crm-text-secondary">
            Selecciona el tipo de reporte que deseas visualizar
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-6">
          {reportTypes.map((report) => (
            <button
              key={report.id}
              onClick={() => setActiveTab(report.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === report.id
                  ? 'bg-crm-primary text-white'
                  : 'bg-crm-card-hover text-crm-text-primary hover:bg-crm-sidebar-hover'
              }`}
            >
              <report.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{report.title.split(' ')[0]}</span>
            </button>
          ))}
        </div>
        
        {/* Tab Content */}
        {reportTypes.map((report) => (
          activeTab === report.id && (
            <div key={report.id} className="bg-crm-card border border-crm-border rounded-xl p-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-crm-text-primary flex items-center gap-2 mb-2">
                  <report.icon className="w-5 h-5" />
                  {report.title}
                </h3>
                <p className="text-crm-text-secondary">{report.description}</p>
              </div>
              
              <div className="text-center py-12">
                <div className={`w-16 h-16 mx-auto mb-4 rounded-full ${
                  report.icon === DollarSign ? 'bg-green-50' : 
                  report.icon === UserCheck ? 'bg-blue-50' : 
                  report.icon === Building ? 'bg-purple-50' : 'bg-orange-50'
                } flex items-center justify-center`}>
                  <report.icon className={`w-8 h-8 ${
                    report.icon === DollarSign ? 'text-green-600' : 
                    report.icon === UserCheck ? 'text-blue-600' : 
                    report.icon === Building ? 'text-purple-600' : 'text-orange-600'
                  }`} />
                </div>
                <h4 className="text-lg font-semibold text-crm-text-primary mb-2">
                  {report.title}
                </h4>
                <p className="text-crm-text-secondary mb-6 max-w-md mx-auto">
                  {report.description}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button className="flex items-center gap-2 px-4 py-2 bg-crm-primary text-white rounded-lg hover:bg-crm-primary-hover transition-colors">
                    <BarChart3 className="w-4 h-4" />
                    Generar Reporte
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 border border-crm-border bg-transparent text-crm-text-primary rounded-lg hover:bg-crm-card-hover transition-colors">
                    <Download className="w-4 h-4" />
                    Descargar PDF
                  </button>
                </div>
              </div>
            </div>
          )
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-crm-card border border-crm-border rounded-xl p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-crm-text-primary mb-2">Acciones Rápidas</h2>
          <p className="text-crm-text-secondary">
            Herramientas adicionales para análisis y reportes
          </p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <button className="h-auto p-4 flex flex-col items-start gap-2 border border-crm-border bg-transparent text-crm-text-primary rounded-lg hover:bg-crm-card-hover transition-colors">
            <Filter className="w-5 h-5" />
            <span className="font-medium">Filtros Avanzados</span>
            <span className="text-sm text-crm-text-muted">Personalizar reportes</span>
          </button>
          
          <button className="h-auto p-4 flex flex-col items-start gap-2 border border-crm-border bg-transparent text-crm-text-primary rounded-lg hover:bg-crm-card-hover transition-colors">
            <Calendar className="w-5 h-5" />
            <span className="font-medium">Comparar Períodos</span>
            <span className="text-sm text-crm-text-muted">Análisis comparativo</span>
          </button>
          
          <button className="h-auto p-4 flex flex-col items-start gap-2 border border-crm-border bg-transparent text-crm-text-primary rounded-lg hover:bg-crm-card-hover transition-colors">
            <TrendingUp className="w-5 h-5" />
            <span className="font-medium">Tendencias</span>
            <span className="text-sm text-crm-text-muted">Análisis de tendencias</span>
          </button>
        </div>
      </div>
    </div>
  );
}