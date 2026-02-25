"use client";

import { useEffect, useState, useTransition } from "react";
import { User, Mail, Phone, MapPin, DollarSign, FileText, UserCheck, PenSquare } from "lucide-react";
import { TIPOS_DOCUMENTO_OPTIONS, ESTADO_CIVIL_OPTIONS, ORIGENES_LEAD_OPTIONS, INTERESES_PRINCIPALES_OPTIONS, FORMAS_PAGO_OPTIONS } from "@/lib/types/clientes";
import { formatCapacidadCompra } from "@/lib/types/clientes";
import toast from "react-hot-toast";
import { asignarVendedorCliente } from "@/app/dashboard/clientes/_actions";
import { useRouter } from "next/navigation";
import { usePermissions, PERMISOS } from "@/lib/permissions";
import EditarClienteModal from "@/components/EditarClienteModal";

import type { ClienteCompleto } from "@/lib/types/clientes";

interface Props {
  cliente: ClienteCompleto;
  vendedores: Array<{ id: string; username: string; nombre_completo?: string | null; telefono?: string | null; email?: string | null }>;
}

export default function TabInformacionBasica({ cliente, vendedores }: Props) {
  const router = useRouter();
  const { tienePermiso, esAdminOCoordinador } = usePermissions();
  const puedeEditar = esAdminOCoordinador() || tienePermiso(PERMISOS.CLIENTES.EDITAR_TODOS) || tienePermiso(PERMISOS.CLIENTES.EDITAR_ASIGNADOS);
  const tipoDoc = TIPOS_DOCUMENTO_OPTIONS.find(t => t.value === cliente.tipo_documento)?.label;
  const estadoCivil = ESTADO_CIVIL_OPTIONS.find(e => e.value === cliente.estado_civil)?.label;
  const origenLead = ORIGENES_LEAD_OPTIONS.find(o => o.value === cliente.origen_lead)?.label;
  const interesPrincipal = INTERESES_PRINCIPALES_OPTIONS.find(i => i.value === cliente.interes_principal)?.label;
  const formaPago = FORMAS_PAGO_OPTIONS.find(f => f.value === cliente.forma_pago_preferida)?.label;
  const [isAssigning, startTransition] = useTransition();
  const [selectedVendedor, setSelectedVendedor] = useState<string>(cliente.vendedor_username || "");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    setSelectedVendedor(cliente.vendedor_username || "");
  }, [cliente.vendedor_username]);

  const handleAsignarVendedor = (value: string) => {
    setSelectedVendedor(value);
    startTransition(async () => {
      try {
        await asignarVendedorCliente(cliente.id, value || null);
        toast.success(value ? "Vendedor asignado exitosamente" : "Cliente sin asesor asignado");
      } catch (error) {
        console.error(error);
        toast.error("No se pudo actualizar el vendedor");
        setSelectedVendedor(cliente.vendedor_username || "");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Botón Editar */}
      {puedeEditar && (
        <div className="flex justify-end">
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm border border-crm-border rounded-lg text-crm-text hover:border-crm-primary hover:text-crm-primary transition-colors"
          >
            <PenSquare className="h-4 w-4" />
            Editar informacion
          </button>
        </div>
      )}

      <div>
        <h3 className="text-lg font-semibold text-crm-text mb-4 flex items-center gap-2">
          <UserCheck className="h-5 w-5 text-crm-primary" />
          Asesor Responsable
        </h3>
        <div className="p-4 bg-crm-background rounded-lg border border-crm-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-crm-text-muted mb-1">Vendedor asignado</p>
            <p className="text-sm text-crm-text font-medium">
              {selectedVendedor
                ? vendedores.find((v) => v.username === selectedVendedor)?.nombre_completo || selectedVendedor
                : "Sin asignar"}
            </p>
            <p className="text-xs text-crm-text-muted mt-1">
              Los asesores asignados pueden gestionar proformas y el seguimiento del cliente.
            </p>
          </div>
          <div className="w-full sm:w-64">
            <select
              value={selectedVendedor}
              onChange={(e) => handleAsignarVendedor(e.target.value)}
              disabled={isAssigning}
              className="w-full px-3 py-2 text-sm border border-crm-border rounded-lg bg-crm-card text-crm-text focus:outline-none focus:ring-2 focus:ring-crm-primary/40 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">Sin asignar</option>
              {vendedores.map((vendedor) => (
                <option key={vendedor.id} value={vendedor.username || ""}>
                  {vendedor.nombre_completo || vendedor.username}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Información Personal */}
      <div>
        <h3 className="text-lg font-semibold text-crm-text mb-4 flex items-center gap-2">
          <User className="h-5 w-5 text-crm-primary" />
          Información Personal
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-crm-background rounded-lg">
            <p className="text-xs font-medium text-crm-text-muted mb-1">Tipo de Cliente</p>
            <p className="text-sm text-crm-text font-medium capitalize">{cliente.tipo_cliente}</p>
          </div>

          {cliente.tipo_documento && (
            <div className="p-4 bg-crm-background rounded-lg">
              <p className="text-xs font-medium text-crm-text-muted mb-1">Documento</p>
              <p className="text-sm text-crm-text font-medium">
                {tipoDoc}: {cliente.documento_identidad}
              </p>
            </div>
          )}

          {cliente.estado_civil && (
            <div className="p-4 bg-crm-background rounded-lg">
              <p className="text-xs font-medium text-crm-text-muted mb-1">Estado Civil</p>
              <p className="text-sm text-crm-text font-medium">{estadoCivil}</p>
            </div>
          )}

          <div className="p-4 bg-crm-background rounded-lg">
            <p className="text-xs font-medium text-crm-text-muted mb-1">Fecha de Alta</p>
            <p className="text-sm text-crm-text font-medium">
              {(() => {
                const date = new Date(cliente.fecha_alta);
                const fechaParte = date.toLocaleDateString('es-PE', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric'
                });
                const horaParte = date.toLocaleTimeString('es-PE', {
                  hour: '2-digit',
                  minute: '2-digit'
                });
                return `${fechaParte} a las ${horaParte}`;
              })()}
            </p>
          </div>
        </div>
      </div>

      {/* Información de Contacto */}
      <div>
        <h3 className="text-lg font-semibold text-crm-text mb-4 flex items-center gap-2">
          <Phone className="h-5 w-5 text-crm-primary" />
          Contacto
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cliente.email && (
            <div className="p-4 bg-crm-background rounded-lg">
              <p className="text-xs font-medium text-crm-text-muted mb-1 flex items-center gap-1">
                <Mail className="h-3 w-3" /> Email
              </p>
              <a href={`mailto:${cliente.email}`} className="text-sm text-crm-primary hover:underline">
                {cliente.email}
              </a>
            </div>
          )}

          {cliente.telefono && (
            <div className="p-4 bg-crm-background rounded-lg">
              <p className="text-xs font-medium text-crm-text-muted mb-1 flex items-center gap-1">
                <Phone className="h-3 w-3" /> Teléfono
              </p>
              <a href={`tel:${cliente.telefono}`} className="text-sm text-crm-primary hover:underline">
                {cliente.telefono}
              </a>
            </div>
          )}

          {cliente.telefono_whatsapp && (
            <div className="p-4 bg-crm-background rounded-lg">
              <p className="text-xs font-medium text-crm-text-muted mb-1">WhatsApp</p>
              <a
                href={`https://wa.me/${cliente.telefono_whatsapp.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-crm-primary hover:underline"
              >
                {cliente.telefono_whatsapp}
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Ubicación */}
      {cliente.direccion && Object.keys(cliente.direccion).length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-crm-text mb-4 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-crm-primary" />
            Ubicación
          </h3>
          <div className="p-4 bg-crm-background rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              {cliente.direccion.calle && (
                <div>
                  <span className="text-crm-text-muted">Calle: </span>
                  <span className="text-crm-text font-medium">{cliente.direccion.calle}</span>
                </div>
              )}
              {cliente.direccion.ciudad && (
                <div>
                  <span className="text-crm-text-muted">Ciudad: </span>
                  <span className="text-crm-text font-medium">{cliente.direccion.ciudad}</span>
                </div>
              )}
              {cliente.direccion.provincia && (
                <div>
                  <span className="text-crm-text-muted">Provincia: </span>
                  <span className="text-crm-text font-medium">{cliente.direccion.provincia}</span>
                </div>
              )}
              {cliente.direccion.pais && (
                <div>
                  <span className="text-crm-text-muted">País: </span>
                  <span className="text-crm-text font-medium">{cliente.direccion.pais}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Información Comercial */}
      <div>
        <h3 className="text-lg font-semibold text-crm-text mb-4 flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-crm-primary" />
          Información Comercial
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cliente.origen_lead && (
            <div className="p-4 bg-crm-background rounded-lg">
              <p className="text-xs font-medium text-crm-text-muted mb-1">Origen del Lead</p>
              <p className="text-sm text-crm-text font-medium">{origenLead}</p>
            </div>
          )}

          {cliente.interes_principal && (
            <div className="p-4 bg-crm-background rounded-lg">
              <p className="text-xs font-medium text-crm-text-muted mb-1">Interés Principal</p>
              <p className="text-sm text-crm-text font-medium">{interesPrincipal}</p>
            </div>
          )}

          {cliente.capacidad_compra_estimada && (
            <div className="p-4 bg-crm-background rounded-lg">
              <p className="text-xs font-medium text-crm-text-muted mb-1">Capacidad de Compra</p>
              <p className="text-sm text-crm-text font-medium">
                {formatCapacidadCompra(cliente.capacidad_compra_estimada)}
              </p>
            </div>
          )}

          {cliente.forma_pago_preferida && (
            <div className="p-4 bg-crm-background rounded-lg">
              <p className="text-xs font-medium text-crm-text-muted mb-1">Forma de Pago Preferida</p>
              <p className="text-sm text-crm-text font-medium">{formaPago}</p>
            </div>
          )}
        </div>
      </div>

      {/* Estadísticas */}
      <div>
        <h3 className="text-lg font-semibold text-crm-text mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5 text-crm-primary" />
          Estadísticas
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-center">
            <p className="text-2xl font-bold text-green-700 dark:text-green-300">
              {cliente.propiedades_reservadas || 0}
            </p>
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">Reservadas</p>
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-center">
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
              {cliente.propiedades_compradas || 0}
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Compradas</p>
          </div>

          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg text-center">
            <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
              {cliente.propiedades_alquiladas || 0}
            </p>
            <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">Alquiladas</p>
          </div>

          <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg text-center">
            <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">
              S/ {cliente.saldo_pendiente?.toLocaleString() || 0}
            </p>
            <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">Saldo Pendiente</p>
          </div>
        </div>
      </div>

      {/* Notas */}
      {cliente.notas && (
        <div>
          <h3 className="text-lg font-semibold text-crm-text mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-crm-primary" />
            Notas
          </h3>
          <div className="p-4 bg-crm-background rounded-lg">
            <p className="text-sm text-crm-text whitespace-pre-wrap">{cliente.notas}</p>
          </div>
        </div>
      )}

      {/* Modal de edición */}
      <EditarClienteModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          router.refresh();
        }}
        cliente={cliente}
      />
    </div>
  );
}
