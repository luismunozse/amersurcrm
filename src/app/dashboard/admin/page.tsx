import { Suspense } from "react";
import { createServerOnlyClient } from "@/lib/supabase.server";
import { redirect } from "next/navigation";
import { esAdmin } from "@/lib/auth/roles";
import Link from "next/link";

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
              <svg
                className="w-6 h-6 text-purple-600 dark:text-purple-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
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
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
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
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
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
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
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
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
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
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
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
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
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
              <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
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
              <svg className="w-6 h-6 text-cyan-600 dark:text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
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
