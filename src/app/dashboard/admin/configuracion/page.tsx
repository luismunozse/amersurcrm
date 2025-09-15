import { Suspense } from "react";
import { createServerOnlyClient } from "@/lib/supabase.server";
import { redirect } from "next/navigation";
import { esAdmin } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminConfiguracionPage() {
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
          <h1 className="text-3xl font-bold text-crm-text-primary">Configuración del Sistema</h1>
          <p className="text-crm-text-secondary mt-2">
            Personaliza y configura parámetros del CRM
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
          <ConfiguracionSistema />
        </Suspense>
      </div>
    </div>
  );
}

function ConfiguracionSistema() {
  return (
    <div className="space-y-6">
      {/* Configuración General */}
      <div className="crm-card p-6">
        <h2 className="text-xl font-semibold text-crm-text-primary mb-4">Configuración General</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-crm-text-primary mb-2">
              Nombre de la Empresa
            </label>
            <input
              type="text"
              defaultValue="AMERSUR Inmobiliaria"
              className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary placeholder-crm-text-muted focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-crm-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-crm-text-primary mb-2">
              Moneda Principal
            </label>
            <select className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-crm-primary">
              <option value="PEN">Soles Peruanos (S/.)</option>
              <option value="USD">Dólares Americanos ($)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-crm-text-primary mb-2">
              Zona Horaria
            </label>
            <select className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-crm-primary">
              <option value="America/Lima">Lima, Perú (GMT-5)</option>
              <option value="America/New_York">Nueva York (GMT-5)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-crm-text-primary mb-2">
              Idioma
            </label>
            <select className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-crm-primary">
              <option value="es">Español</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>
      </div>

      {/* Configuración de Comisiones */}
      <div className="crm-card p-6">
        <h2 className="text-xl font-semibold text-crm-text-primary mb-4">Configuración de Comisiones</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-crm-text-primary mb-2">
              Comisión por Venta de Lote (%)
            </label>
            <input
              type="number"
              defaultValue="2.5"
              min="0"
              max="100"
              step="0.1"
              className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary placeholder-crm-text-muted focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-crm-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-crm-text-primary mb-2">
              Comisión por Venta de Casa (%)
            </label>
            <input
              type="number"
              defaultValue="2.0"
              min="0"
              max="100"
              step="0.1"
              className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary placeholder-crm-text-muted focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-crm-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-crm-text-primary mb-2">
              Comisión por Alquiler (%)
            </label>
            <input
              type="number"
              defaultValue="1.0"
              min="0"
              max="100"
              step="0.1"
              className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary placeholder-crm-text-muted focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-crm-primary"
            />
          </div>
        </div>
      </div>

      {/* Configuración de Notificaciones */}
      <div className="crm-card p-6">
        <h2 className="text-xl font-semibold text-crm-text-primary mb-4">Configuración de Notificaciones</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-crm-text-primary">Notificaciones por Email</h3>
              <p className="text-xs text-crm-text-muted">Enviar notificaciones por correo electrónico</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-11 h-6 bg-crm-border peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-crm-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-crm-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-crm-primary"></div>
            </label>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-crm-text-primary">Notificaciones Push</h3>
              <p className="text-xs text-crm-text-muted">Enviar notificaciones push al navegador</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-11 h-6 bg-crm-border peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-crm-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-crm-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-crm-primary"></div>
            </label>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-crm-text-primary">Recordatorios Automáticos</h3>
              <p className="text-xs text-crm-text-muted">Crear recordatorios automáticos para eventos</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-11 h-6 bg-crm-border peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-crm-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-crm-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-crm-primary"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Configuración de Campos Personalizados */}
      <div className="crm-card p-6">
        <h2 className="text-xl font-semibold text-crm-text-primary mb-4">Campos Personalizados</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-crm-text-primary mb-2">
              Campos Adicionales para Clientes
            </label>
            <textarea
              rows={3}
              placeholder="Ejemplo: Profesión, Empresa, Referencia, etc."
              className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary placeholder-crm-text-muted focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-crm-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-crm-text-primary mb-2">
              Campos Adicionales para Propiedades
            </label>
            <textarea
              rows={3}
              placeholder="Ejemplo: Orientación, Vista, Servicios, etc."
              className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary placeholder-crm-text-muted focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-crm-primary"
            />
          </div>
        </div>
      </div>

      {/* Configuración de Integraciones */}
      <div className="crm-card p-6">
        <h2 className="text-xl font-semibold text-crm-text-primary mb-4">Integraciones</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-crm-text-primary mb-2">
              WhatsApp Business API
            </label>
            <input
              type="text"
              placeholder="Token de WhatsApp Business"
              className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary placeholder-crm-text-muted focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-crm-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-crm-text-primary mb-2">
              Email SMTP
            </label>
            <input
              type="text"
              placeholder="Servidor SMTP"
              className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary placeholder-crm-text-muted focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-crm-primary"
            />
          </div>
        </div>
      </div>

      {/* Botones de acción */}
      <div className="flex justify-end space-x-4">
        <button className="px-6 py-2 text-crm-text-muted hover:text-crm-text-primary border border-crm-border rounded-lg transition-colors">
          Cancelar
        </button>
        <button className="crm-button-primary px-6 py-2 rounded-lg font-medium">
          Guardar Configuración
        </button>
      </div>
    </div>
  );
}
