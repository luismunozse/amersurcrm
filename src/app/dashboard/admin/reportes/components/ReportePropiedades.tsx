"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Building, Calendar, Download } from "lucide-react";

export default function ReportePropiedades() {
  const propertyStats = [
    { label: "Total Propiedades", value: "1,456", change: "+5.2%", type: "positive" },
    { label: "Disponibles", value: "892", change: "-2.1%", type: "negative" },
    { label: "Vendidas", value: "564", change: "+15.3%", type: "positive" },
    { label: "Valor Total", value: "S/ 45.2M", change: "+8.7%", type: "positive" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-crm-text-primary flex items-center gap-2">
            <Building className="w-6 h-6" />
            Reporte de Propiedades
          </h2>
          <p className="text-crm-text-secondary mt-1">
            Inventario completo y análisis de propiedades
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
        {propertyStats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-crm-text-secondary">
                {stat.label}
              </CardTitle>
              <Building className="h-4 w-4 text-crm-text-muted" />
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

      {/* Content placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Análisis de Propiedades</CardTitle>
          <CardDescription>
            Reporte detallado en desarrollo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Building className="w-16 h-16 mx-auto mb-4 text-crm-text-muted" />
            <h3 className="text-lg font-semibold text-crm-text-primary mb-2">
              Reporte de Propiedades
            </h3>
            <p className="text-crm-text-secondary mb-6">
              Análisis completo del inventario de propiedades
            </p>
            <Button className="flex items-center gap-2">
              <Building className="w-4 h-4" />
              Generar Reporte
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
