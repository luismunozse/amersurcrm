import Link from "next/link";
import { Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { LazyDashboardStats } from "@/components/LazyDashboardStats";
import { RecentActivities } from "@/components/RecentActivities";
import { RecentProjects } from "@/components/RecentProjects";

// Loading component para el dashboard
function DashboardLoading() {
  return (
    <div className="space-y-8">
      {/* Stats loading */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-crm-card border border-crm-border rounded-xl p-6 animate-pulse">
            <div className="flex items-center justify-between mb-4">
              <div className="h-4 bg-crm-border rounded w-24"></div>
              <div className="w-8 h-8 bg-crm-border rounded-lg"></div>
            </div>
            <div className="h-8 bg-crm-border rounded w-16 mb-2"></div>
            <div className="h-3 bg-crm-border rounded w-32"></div>
          </div>
        ))}
      </div>
      
      {/* Content loading */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="h-6 bg-crm-border rounded w-32"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-crm-card border border-crm-border rounded-xl p-4 animate-pulse">
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-crm-border rounded"></div>
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-crm-border rounded w-24"></div>
                    <div className="h-3 bg-crm-border rounded w-40"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="h-6 bg-crm-border rounded w-32"></div>
          <div className="space-y-3">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="bg-crm-card border border-crm-border rounded-xl p-4 animate-pulse">
                <div className="space-y-2">
                  <div className="h-4 bg-crm-border rounded w-48"></div>
                  <div className="h-3 bg-crm-border rounded w-20"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardContent() {
  const quickActions = [
    {
      title: "Nuevo Cliente",
      description: "Agregar un nuevo cliente al sistema",
      href: "/dashboard/clientes",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      ),
      color: "primary",
    },
    {
      title: "Nuevo Proyecto",
      description: "Crear un nuevo proyecto inmobiliario",
      href: "/dashboard/proyectos",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      color: "success",
    },
    {
      title: "Ver Reportes",
      description: "Analizar métricas y reportes",
      href: "/dashboard/reportes",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      color: "info",
    },
  ];


  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-crm-text-primary font-display">Dashboard</h1>
        <p className="text-crm-text-secondary mt-2">Bienvenido de vuelta. Aquí tienes un resumen de tu CRM.</p>
      </div>

      {/* Stats */}
      <LazyDashboardStats />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Actions */}
        <div className="lg:col-span-2">
          <h2 className="text-xl font-semibold text-crm-text-primary mb-4">Acciones Rápidas</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {quickActions.map((action, index) => (
              <Link key={index} href={action.href}>
                <Card hover className="h-full">
                  <CardHeader className="pb-3">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      action.color === 'primary' ? 'bg-crm-primary/10 text-crm-primary' :
                      action.color === 'success' ? 'bg-crm-success/10 text-crm-success' :
                      'bg-crm-info/10 text-crm-info'
                    }`}>
                      {action.icon}
                    </div>
                    <CardTitle className="text-base">{action.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <CardDescription className="text-sm">{action.description}</CardDescription>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <Suspense fallback={
            <div>
              <h2 className="text-xl font-semibold text-crm-text-primary mb-4">Actividad Reciente</h2>
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="flex items-start space-x-3 animate-pulse">
                        <div className="w-8 h-8 bg-crm-border rounded-full"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-crm-border rounded w-3/4"></div>
                          <div className="h-3 bg-crm-border rounded w-1/2"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          }>
            <RecentActivities />
          </Suspense>
        </div>
      </div>

      {/* Recent Projects */}
      <Suspense fallback={
        <div>
          <h2 className="text-xl font-semibold text-crm-text-primary mb-4">Proyectos Recientes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="h-4 bg-crm-border rounded w-3/4"></div>
                    <div className="h-6 bg-crm-border rounded w-16"></div>
                  </div>
                  <div className="h-3 bg-crm-border rounded w-full mb-3"></div>
                  <div className="flex items-center justify-between">
                    <div className="h-3 bg-crm-border rounded w-1/3"></div>
                    <div className="h-3 bg-crm-border rounded w-1/4"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      }>
        <RecentProjects />
      </Suspense>
    </div>
  );
}