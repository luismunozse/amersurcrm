import { Suspense } from "react";
import { createServerOnlyClient } from "@/lib/supabase.server";
import { redirect } from "next/navigation";
import { esAdmin } from "@/lib/permissions/server";
import Link from "next/link";
import { FileText, Users, Settings, Building2, BarChart3, DollarSign, ShieldCheck, RefreshCw } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminPage() {
  const supabase = await createServerOnlyClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const isAdminUser = await esAdmin();
  if (!isAdminUser) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-crm-bg-primary">
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-crm-text-primary">Administración</h1>
          <p className="text-crm-text-secondary mt-2">
            Panel de administración del sistema
          </p>
        </div>

        <Suspense fallback={
          <div className="crm-card p-6">
            <div className="animate-pulse">
              <div className="h-8 bg-crm-border rounded mb-4"></div>
              <div className="h-64 bg-crm-border rounded"></div>
            </div>
          </div>
        }>
          <AdminDashboard />
        </Suspense>
      </div>
    </div>
  );
}

function AdminDashboard() {
  return (
    <div className="space-y-6">
      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="crm-card p-4 text-center">
          <div className="text-2xl font-bold text-crm-text-primary">12</div>
          <div className="text-sm text-crm-text-muted">Usuarios Activos</div>
        </div>
        <div className="crm-card p-4 text-center">
          <div className="text-2xl font-bold text-green-600">8</div>
          <div className="text-sm text-crm-text-muted">Vendedores</div>
        </div>
        <div className="crm-card p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">156</div>
          <div className="text-sm text-crm-text-muted">Clientes</div>
        </div>
        <div className="crm-card p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">24</div>
          <div className="text-sm text-crm-text-muted">Proyectos</div>
        </div>
      </div>

      {/* Funciones principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link
          href="/dashboard/admin/extension-logs"
          className="crm-card p-6 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <FileText className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="font-semibold text-crm-text-primary">Logs de Extensión</h3>
              <p className="text-sm text-crm-text-muted">Monitoreo de logs y métricas</p>
            </div>
          </div>
        </Link>
        {/* Gestión de Usuarios */}
        <div className="crm-card p-6 hover:shadow-lg transition-all duration-200">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-crm-text-primary">Gestión de Usuarios</h3>
              <p className="text-sm text-crm-text-muted">Crear y administrar vendedores</p>
            </div>
          </div>
          <p className="text-crm-text-secondary text-sm mb-4">
            Crea nuevos vendedores, asigna roles, gestiona permisos y configura metas de ventas.
          </p>
          <a
            href="/dashboard/admin/usuarios"
            className="crm-button-primary px-4 py-2 rounded-lg text-sm font-medium inline-block w-full text-center"
          >
            Gestionar Usuarios
          </a>
        </div>

        {/* Asignación Automática de Leads */}
        <div className="crm-card p-6 hover:shadow-lg transition-all duration-200">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-crm-text-primary">Vendedores Activos</h3>
              <p className="text-sm text-crm-text-muted">Asignación automática</p>
            </div>
          </div>
          <p className="text-crm-text-secondary text-sm mb-4">
            Configura vendedores para asignación automática de leads desde WhatsApp Web.
          </p>
          <a
            href="/dashboard/admin/vendedores-activos"
            className="crm-button-primary px-4 py-2 rounded-lg text-sm font-medium inline-block w-full text-center"
          >
            Configurar Asignación
          </a>
        </div>

        {/* Configuración del Sistema */}
        <div className="crm-card p-6 hover:shadow-lg transition-all duration-200">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Settings className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-crm-text-primary">Configuración</h3>
              <p className="text-sm text-crm-text-muted">Personalizar el CRM</p>
            </div>
          </div>
          <p className="text-crm-text-secondary text-sm mb-4">
            Configura parámetros del sistema, personaliza campos, ajusta comisiones y más.
          </p>
          <a
            href="/dashboard/admin/configuracion"
            className="crm-button-primary px-4 py-2 rounded-lg text-sm font-medium inline-block w-full text-center"
          >
            Configurar Sistema
          </a>
        </div>

        {/* Gestión de Proyectos */}
        <div className="crm-card p-6 hover:shadow-lg transition-all duration-200">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-crm-text-primary">Proyectos</h3>
              <p className="text-sm text-crm-text-muted">Administrar proyectos</p>
            </div>
          </div>
          <p className="text-crm-text-secondary text-sm mb-4">
            Gestiona proyectos inmobiliarios, asigna vendedores y configura precios.
          </p>
          <Link
            href="/dashboard/proyectos"
            className="crm-button-primary px-4 py-2 rounded-lg text-sm font-medium inline-block w-full text-center"
          >
            Gestionar Proyectos
          </Link>
        </div>

        {/* Reportes del Sistema */}
        <div className="crm-card p-6 hover:shadow-lg transition-all duration-200">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-crm-text-primary">Reportes</h3>
              <p className="text-sm text-crm-text-muted">Análisis y estadísticas</p>
            </div>
          </div>
          <p className="text-crm-text-secondary text-sm mb-4">
            Reportes detallados del sistema, ventas, rendimiento de vendedores y más.
          </p>
          <a
            href="/dashboard/admin/reportes"
            className="crm-button-primary px-4 py-2 rounded-lg text-sm font-medium inline-block w-full text-center"
          >
            Ver Reportes
          </a>
        </div>

        {/* Configuración de Comisiones */}
        <div className="crm-card p-6 hover:shadow-lg transition-all duration-200">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-crm-text-primary">Comisiones</h3>
              <p className="text-sm text-crm-text-muted">Configurar comisiones</p>
            </div>
          </div>
          <p className="text-crm-text-secondary text-sm mb-4">
            Establece porcentajes de comisión por tipo de venta y configura metas.
          </p>
          <a
            href="/dashboard/admin/comisiones"
            className="crm-button-primary px-4 py-2 rounded-lg text-sm font-medium inline-block w-full text-center"
          >
            Configurar Comisiones
          </a>
        </div>

        {/* Backup y Seguridad */}
        <div className="crm-card p-6 hover:shadow-lg transition-all duration-200">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-crm-text-primary">Seguridad</h3>
              <p className="text-sm text-crm-text-muted">Backup y seguridad</p>
            </div>
          </div>
          <p className="text-crm-text-secondary text-sm mb-4">
            Gestiona backups, configura seguridad y monitorea accesos al sistema.
          </p>
          <a
            href="/dashboard/admin/seguridad"
            className="crm-button-primary px-4 py-2 rounded-lg text-sm font-medium inline-block w-full text-center"
          >
            Configurar Seguridad
          </a>
        </div>

        {/* Sincronización de Campos de Vendedor */}
        <Link
          href="/dashboard/admin/sync-vendedor-fields"
          className="crm-card p-6 hover:shadow-lg transition-all duration-200"
        >
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg flex items-center justify-center">
              <RefreshCw className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-crm-text-primary">Sincronizar Campos</h3>
              <p className="text-sm text-crm-text-muted">Vendedor asignado</p>
            </div>
          </div>
          <p className="text-crm-text-secondary text-sm mb-4">
            Verifica y sincroniza los campos vendedor_asignado y vendedor_username en la tabla cliente.
          </p>
          <div className="crm-button-primary px-4 py-2 rounded-lg text-sm font-medium inline-block w-full text-center">
            Sincronizar Campos
          </div>
        </Link>
      </div>
    </div>
  );
}
