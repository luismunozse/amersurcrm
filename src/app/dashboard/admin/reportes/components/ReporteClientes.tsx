"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, UserPlus, UserCheck, UserX, Download, Calendar } from "lucide-react";

export default function ReporteClientes() {
  const clientStats = [
    { label: "Total Clientes", value: "1,247", change: "+8.2%", type: "positive" },
    { label: "Clientes Activos", value: "892", change: "+12.5%", type: "positive" },
    { label: "Nuevos Clientes", value: "156", change: "+5.3%", type: "positive" },
    { label: "Clientes Perdidos", value: "23", change: "-2.1%", type: "negative" },
  ];

  const clientSources = [
    { source: "Referidos", count: 456, percentage: 36.5 },
    { source: "Website", count: 324, percentage: 26.0 },
    { source: "Redes Sociales", count: 234, percentage: 18.8 },
    { source: "Publicidad", count: 123, percentage: 9.9 },
    { source: "Otros", count: 110, percentage: 8.8 },
  ];

  const topClients = [
    { name: "María González", email: "maria.gonzalez@email.com", value: "S/ 450,000", status: "Activo" },
    { name: "Carlos Rodríguez", email: "carlos.rodriguez@email.com", value: "S/ 380,000", status: "Activo" },
    { name: "Ana Martínez", email: "ana.martinez@email.com", value: "S/ 320,000", status: "Prospecto" },
    { name: "Luis Fernández", email: "luis.fernandez@email.com", value: "S/ 290,000", status: "Activo" },
    { name: "Sofia López", email: "sofia.lopez@email.com", value: "S/ 260,000", status: "Inactivo" },
  ];

  const clientSegments = [
    { segment: "VIP", count: 89, color: "bg-purple-500" },
    { segment: "Premium", count: 234, color: "bg-blue-500" },
    { segment: "Standard", count: 567, color: "bg-green-500" },
    { segment: "Básico", count: 357, color: "bg-orange-500" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-crm-text-primary flex items-center gap-2">
            <Users className="w-6 h-6" />
            Reporte de Clientes
          </h2>
          <p className="text-crm-text-secondary mt-1">
            Análisis completo de la base de clientes y comportamiento
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
        {clientStats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-crm-text-secondary">
                {stat.label}
              </CardTitle>
              {index === 0 && <Users className="h-4 w-4 text-crm-text-muted" />}
              {index === 1 && <UserCheck className="h-4 w-4 text-crm-text-muted" />}
              {index === 2 && <UserPlus className="h-4 w-4 text-crm-text-muted" />}
              {index === 3 && <UserX className="h-4 w-4 text-crm-text-muted" />}
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

      {/* Client Sources & Segments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Client Sources */}
        <Card>
          <CardHeader>
            <CardTitle>Fuentes de Clientes</CardTitle>
            <CardDescription>
              Distribución por canal de adquisición
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {clientSources.map((source, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-crm-primary rounded-full"></div>
                    <span className="text-crm-text-primary">{source.source}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-crm-text-secondary">{source.count}</span>
                    <span className="text-sm font-medium text-crm-text-primary">
                      {source.percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Client Segments */}
        <Card>
          <CardHeader>
            <CardTitle>Segmentación de Clientes</CardTitle>
            <CardDescription>
              Clasificación por valor del cliente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {clientSegments.map((segment, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 ${segment.color} rounded-full`}></div>
                    <span className="text-crm-text-primary">{segment.segment}</span>
                  </div>
                  <span className="text-sm font-medium text-crm-text-primary">
                    {segment.count} clientes
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Clients */}
      <Card>
        <CardHeader>
          <CardTitle>Clientes de Mayor Valor</CardTitle>
          <CardDescription>
            Ranking de clientes por volumen de negocio
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topClients.map((client, index) => (
              <div key={index} className="flex items-center justify-between p-4 border border-crm-border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-crm-primary text-white rounded-full flex items-center justify-center font-bold">
                    {client.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <h4 className="font-medium text-crm-text-primary">{client.name}</h4>
                    <p className="text-sm text-crm-text-secondary">{client.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-crm-text-primary">{client.value}</p>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    client.status === 'Activo' ? 'bg-green-100 text-green-800' :
                    client.status === 'Prospecto' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {client.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Client Activity & Retention */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Actividad de Clientes</CardTitle>
            <CardDescription>
              Métricas de engagement y actividad
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-crm-text-secondary">Tasa de Retención</span>
              <span className="font-bold text-crm-text-primary">87.3%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-crm-text-secondary">Clientes Activos (30 días)</span>
              <span className="font-bold text-crm-text-primary">892</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-crm-text-secondary">Tiempo Promedio de Ciclo</span>
              <span className="font-bold text-crm-text-primary">45 días</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-crm-text-secondary">Satisfacción Promedio</span>
              <span className="font-bold text-crm-text-primary">4.7/5</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Objetivos de Clientes</CardTitle>
            <CardDescription>
              Progreso hacia objetivos mensuales
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-crm-text-secondary">Nuevos Clientes</span>
                <span className="text-sm text-crm-text-muted">156 / 200</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: '78%' }}></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-crm-text-secondary">Conversión</span>
                <span className="text-sm text-crm-text-muted">24.8% / 30%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: '83%' }}></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-crm-text-secondary">Retención</span>
                <span className="text-sm text-crm-text-muted">87.3% / 90%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-purple-500 h-2 rounded-full" style={{ width: '97%' }}></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}