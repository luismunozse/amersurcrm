"use client";

import EditarPerfilForm from "./_EditarPerfilForm";
import CambiarPasswordForm from "./_CambiarPasswordForm";
import EstadisticasUsuario from "./_EstadisticasUsuario";
import { Mail, Briefcase } from "lucide-react";

interface PerfilTabsContentProps {
  activeTab: string;
  perfil: any;
  isAdmin: boolean;
  currentEmail: string;
  userId: string;
  fechaAlta: string;
  ultimoAcceso?: string | null;
  user: any;
}

export default function PerfilTabsContent({
  activeTab,
  perfil,
  isAdmin,
  currentEmail,
  userId,
  fechaAlta,
  ultimoAcceso,
  user,
}: PerfilTabsContentProps) {
  switch (activeTab) {
    case 'informacion':
      return (
        <div className="space-y-6">
          {/* Grid de información */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Información de contacto */}
            <div className="bg-crm-bg-primary dark:bg-crm-card border border-crm-border rounded-xl p-5">
              <h2 className="text-lg font-semibold text-crm-text-primary mb-4 flex items-center gap-2">
                <Mail className="h-5 w-5 text-crm-primary" />
                Información de Contacto
              </h2>
              <div className="space-y-3">
                {user.email && (
                  <div>
                    <p className="text-xs text-crm-text-muted mb-1">Email</p>
                    <p className="text-sm text-crm-text-primary font-medium">{user.email}</p>
                  </div>
                )}
                {perfil.dni && (
                  <div>
                    <p className="text-xs text-crm-text-muted mb-1">DNI</p>
                    <p className="text-sm text-crm-text-primary font-medium">{perfil.dni}</p>
                  </div>
                )}
                {perfil.telefono && (
                  <div>
                    <p className="text-xs text-crm-text-muted mb-1">Teléfono</p>
                    <p className="text-sm text-crm-text-primary font-medium">{perfil.telefono}</p>
                  </div>
                )}
                {!user.email && !perfil.dni && !perfil.telefono && (
                  <p className="text-sm text-crm-text-muted">No hay información de contacto</p>
                )}
              </div>
            </div>

            {/* Información profesional */}
            <div className="bg-crm-bg-primary dark:bg-crm-card border border-crm-border rounded-xl p-5">
              <h2 className="text-lg font-semibold text-crm-text-primary mb-4 flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-crm-primary" />
                Información Profesional
              </h2>
              <div className="space-y-3">
                {perfil.meta_mensual && (
                  <div>
                    <p className="text-xs text-crm-text-muted mb-1">Meta Mensual</p>
                    <p className="text-sm text-crm-text-primary font-medium">
                      S/ {perfil.meta_mensual.toLocaleString()}
                    </p>
                  </div>
                )}
                {perfil.comision_porcentaje && (
                  <div>
                    <p className="text-xs text-crm-text-muted mb-1">Comisión</p>
                    <p className="text-sm text-crm-text-primary font-medium">
                      {perfil.comision_porcentaje}%
                    </p>
                  </div>
                )}
                {perfil.created_at && (
                  <div>
                    <p className="text-xs text-crm-text-muted mb-1">Fecha de Alta</p>
                    <p className="text-sm text-crm-text-primary font-medium">
                      {new Date(perfil.created_at).toLocaleDateString('es-PE', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                )}
                {!perfil.meta_mensual && !perfil.comision_porcentaje && (
                  <p className="text-sm text-crm-text-muted">No hay información profesional</p>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    case 'editar':
      return (
        <EditarPerfilForm
          perfil={perfil}
          isAdmin={isAdmin}
          currentEmail={currentEmail}
        />
      );
    case 'seguridad':
      return <CambiarPasswordForm />;
    case 'estadisticas':
      return (
        <EstadisticasUsuario
          userId={userId}
          fechaAlta={fechaAlta}
          ultimoAcceso={ultimoAcceso}
        />
      );
    default:
      return null;
  }
}

