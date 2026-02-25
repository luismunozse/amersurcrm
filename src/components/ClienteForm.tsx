"use client";

import { useState, FormEvent, useRef, useEffect, useCallback } from "react";
import { Spinner } from '@/components/ui/Spinner';
import { crearCliente, actualizarCliente, obtenerVendedores } from "@/app/dashboard/clientes/_actions";
import { detectarDuplicados } from "@/app/dashboard/clientes/_actions-duplicates";
import type { DuplicadoEncontrado } from "@/app/dashboard/clientes/_actions-helpers";
import DuplicateWarning from "./DuplicateWarning";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/errors";
import {
  TIPOS_CLIENTE_OPTIONS,
  TIPOS_DOCUMENTO_OPTIONS,
  ESTADOS_CLIENTE_OPTIONS,
  ORIGENES_LEAD_OPTIONS,
  INTERESES_PRINCIPALES_OPTIONS,
  ESTADO_CIVIL_OPTIONS
} from "@/lib/types/clientes";
import UbicacionSelector from "./UbicacionSelector";
import PhoneInput from "./PhoneInput";
import { usePermissions, PERMISOS } from "@/lib/permissions";

interface ClienteFormProps {
  cliente?: {
    id: string;
    nombre: string;
    email?: string;
    telefono?: string;
    tipo_cliente?: string;
    tipo_documento?: string;
    documento_identidad?: string;
    telefono_whatsapp?: string;
    direccion?: any;
    estado_cliente?: string;
    origen_lead?: string;
    vendedor_asignado?: string;
    interes_principal?: string;
    notas?: string;
    estado_civil?: string;
  };
  onSuccess?: () => void;
  onCancel?: () => void;
  isEditing?: boolean;
}

export default function ClienteForm({
  cliente,
  onSuccess,
  onCancel,
  isEditing = false
}: ClienteFormProps) {
  const [pending, setPending] = useState(false);
  const [tipoCliente, setTipoCliente] = useState(cliente?.tipo_cliente || "persona");
  const [tipoDocumento, setTipoDocumento] = useState(cliente?.tipo_documento || "DNI");
  const [ubicacion, setUbicacion] = useState({
    departamento: cliente?.direccion?.departamento || '',
    provincia: cliente?.direccion?.provincia || '',
    distrito: cliente?.direccion?.distrito || '',
    codigoDepartamento: '',
    codigoProvincia: '',
    codigoDistrito: ''
  });
  const formRef = useRef<HTMLFormElement>(null);
  const [vendedores, setVendedores] = useState<Array<{
    id: string;
    username: string;
    nombre_completo: string;
    email: string;
  }>>([]);
  const [loadingVendedores, setLoadingVendedores] = useState(true);
  const [errorVendedores, setErrorVendedores] = useState(false);
  const {
    loading: permisosLoading,
    tienePermiso,
    esAdminOCoordinador,
  } = usePermissions();
  const esSupervisor = esAdminOCoordinador();
  const puedeGestionarVendedor = !permisosLoading && (esSupervisor || tienePermiso(PERMISOS.CLIENTES.REASIGNAR));

  // Duplicate detection state
  const [duplicados, setDuplicados] = useState<DuplicadoEncontrado[]>([]);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [nombreForCheck, setNombreForCheck] = useState(cliente?.nombre || "");
  const [emailForCheck, setEmailForCheck] = useState(cliente?.email || "");
  const [telefonoForCheck, setTelefonoForCheck] = useState(cliente?.telefono || "");

  // Cargar vendedores al montar el componente
  useEffect(() => {
    const cargarVendedores = async () => {
      try {
        setLoadingVendedores(true);
        setErrorVendedores(false);
        const vendedoresData = await obtenerVendedores();
        setVendedores(vendedoresData);
      } catch (error) {
        console.error("Error cargando vendedores:", error);
        setErrorVendedores(true);
        setVendedores([]);
      } finally {
        setLoadingVendedores(false);
      }
    };

    cargarVendedores();
  }, []);

  // Debounced duplicate check
  useEffect(() => {
    if (!nombreForCheck && !emailForCheck && !telefonoForCheck) {
      setDuplicados([]);
      return;
    }

    // Don't check if name is too short
    if (nombreForCheck.length < 3 && !emailForCheck && !telefonoForCheck) {
      setDuplicados([]);
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingDuplicates(true);
      try {
        const result = await detectarDuplicados({
          nombre: nombreForCheck,
          telefono: telefonoForCheck || undefined,
          email: emailForCheck || undefined,
          excludeId: isEditing ? cliente?.id : undefined,
        });
        setDuplicados(result.duplicados);
      } catch {
        // Silently fail - this is a non-blocking check
      } finally {
        setCheckingDuplicates(false);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [nombreForCheck, emailForCheck, telefonoForCheck, isEditing, cliente?.id]);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPending(true);
    const form = formRef.current ?? e.currentTarget;
    const fd = new FormData(form);
    
    // Procesar números de teléfono para incluir código de país
    const telefonoFull = fd.get("telefono_full") as string;
    const telefonoWhatsappFull = fd.get("telefono_whatsapp_full") as string;
    
    // Usar el número completo con código de país si está disponible
    if (telefonoFull) {
      fd.set("telefono", telefonoFull);
    }
    
    if (telefonoWhatsappFull) {
      fd.set("telefono_whatsapp", telefonoWhatsappFull);
    }
    
    try {
      if (isEditing && cliente?.id) {
        fd.set("id", cliente.id);
        await actualizarCliente(fd);
        toast.success("Cliente actualizado exitosamente");
      } else {
        await crearCliente(fd);
        toast.success("Cliente creado exitosamente");
      }
      
      form.reset();
      onSuccess?.();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || "No se pudo guardar el cliente");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="crm-card p-4 md:p-6 max-w-7xl mx-auto h-[calc(100vh-8rem)] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-8 h-8 bg-gradient-to-br from-crm-primary to-crm-primary/80 rounded-lg flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-bold text-crm-text-primary">
            {isEditing ? "Editar Cliente" : "Nuevo Cliente"}
          </h2>
          <p className="text-xs text-crm-text-muted">
            {isEditing ? "Actualiza la información del cliente" : "Registra un nuevo cliente en el sistema"}
          </p>
        </div>
      </div>

      <form ref={formRef} onSubmit={onSubmit} className="flex-1 overflow-y-auto space-y-4 pr-2">
        {/* Grid de 2 columnas principales */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Columna Izquierda: Información Básica */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 mb-3">
              <div className="w-5 h-5 bg-crm-primary/10 rounded-lg flex items-center justify-center">
                <svg className="w-3 h-3 text-crm-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-crm-text-primary">Información Básica</h3>
            </div>

            <div className="space-y-3">
              {/* Tipo de Cliente */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-crm-text-primary">
                  Tipo de Cliente <span className="text-red-500">*</span>
                </label>
                <select
                  name="tipo_cliente"
                  required
                  value={tipoCliente}
                  onChange={(e) => setTipoCliente(e.target.value)}
                  className="w-full px-3 py-2 border border-crm-border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary disabled:opacity-50 transition-all"
                  disabled={pending}
                >
                  {TIPOS_CLIENTE_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              {/* Nombre/Razón Social */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-crm-text-primary">
                  {tipoCliente === 'persona' ? 'Nombre Completo' : 'Razón Social'} <span className="text-red-500">*</span>
                </label>
                <input
                  name="nombre"
                  required
                  minLength={2}
                  autoComplete={tipoCliente === 'persona' ? 'name' : 'organization'}
                  defaultValue={cliente?.nombre || ""}
                  className="w-full px-3 py-2 border border-crm-border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary disabled:opacity-50 transition-all"
                  disabled={pending}
                  placeholder={tipoCliente === 'persona' ? 'Juan Pérez García' : 'Empresa Constructora S.A.C.'}
                  onChange={(e) => setNombreForCheck(e.target.value)}
                  onInvalid={(e) => {
                    const target = e.target as HTMLInputElement;
                    if (target.validity.valueMissing) {
                      target.setCustomValidity('El nombre es obligatorio');
                    } else if (target.validity.tooShort) {
                      target.setCustomValidity('El nombre debe tener al menos 2 caracteres');
                    }
                  }}
                  onInput={(e) => {
                    const target = e.target as HTMLInputElement;
                    target.setCustomValidity('');
                  }}
                />
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-crm-text-primary">Email</label>
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  defaultValue={cliente?.email || ""}
                  className="w-full px-3 py-2 border border-crm-border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary disabled:opacity-50 transition-all"
                  disabled={pending}
                  placeholder="cliente@ejemplo.com"
                  onChange={(e) => setEmailForCheck(e.target.value)}
                />
              </div>

              {/* Documento en grid (opcional) */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-crm-text-primary">
                    Tipo Doc
                  </label>
                  <select
                    name="tipo_documento"
                    value={tipoDocumento}
                    onChange={(e) => setTipoDocumento(e.target.value)}
                    className="w-full px-3 py-2 border border-crm-border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary disabled:opacity-50 transition-all"
                    disabled={pending}
                  >
                    {TIPOS_DOCUMENTO_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-crm-text-primary">
                    Número
                  </label>
                  <input
                    name="documento_identidad"
                    defaultValue={cliente?.documento_identidad || ""}
                    className="w-full px-3 py-2 border border-crm-border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary disabled:opacity-50 transition-all"
                    disabled={pending}
                    placeholder={tipoDocumento === 'DNI' ? '12345678 (opcional)' : tipoDocumento === 'RUC' ? '20123456789 (opcional)' : 'AB123456 (opcional)'}
                    minLength={tipoDocumento === 'DNI' ? 8 : tipoDocumento === 'RUC' ? 11 : 8}
                    maxLength={tipoDocumento === 'DNI' ? 8 : tipoDocumento === 'RUC' ? 11 : 15}
                    pattern={tipoDocumento === 'DNI' ? '[0-9]{8}' : tipoDocumento === 'RUC' ? '[0-9]{11}' : tipoDocumento === 'PAS' ? '[A-Z0-9]{6,15}' : '[A-Z0-9]{8,15}'}
                    title={tipoDocumento === 'DNI' ? 'Debe tener exactamente 8 dígitos' : tipoDocumento === 'RUC' ? 'Debe tener exactamente 11 dígitos' : 'Ingrese un documento válido'}
                    onInvalid={(e) => {
                      const target = e.target as HTMLInputElement;
                      if (target.validity.patternMismatch && target.value.trim()) {
                        if (tipoDocumento === 'DNI') {
                          target.setCustomValidity('El DNI debe tener exactamente 8 dígitos');
                        } else if (tipoDocumento === 'RUC') {
                          target.setCustomValidity('El RUC debe tener exactamente 11 dígitos');
                        } else {
                          target.setCustomValidity('Formato de documento inválido');
                        }
                      } else if ((target.validity.tooShort || target.validity.tooLong) && target.value.trim()) {
                        if (tipoDocumento === 'DNI') {
                          target.setCustomValidity('El DNI debe tener exactamente 8 dígitos');
                        } else if (tipoDocumento === 'RUC') {
                          target.setCustomValidity('El RUC debe tener exactamente 11 dígitos');
                        }
                      }
                    }}
                    onInput={(e) => {
                      const target = e.target as HTMLInputElement;
                      target.setCustomValidity('');
                    }}
                  />
                </div>
              </div>

              {/* Teléfonos */}
              <PhoneInput
                name="telefono"
                defaultValue={cliente?.telefono || ""}
                placeholder="Número de teléfono"
                disabled={pending}
                label="Teléfono"
                required
                onValueChange={setTelefonoForCheck}
              />

              <PhoneInput
                name="telefono_whatsapp"
                defaultValue={cliente?.telefono_whatsapp || ""}
                placeholder="Número de WhatsApp"
                disabled={pending}
                label="WhatsApp"
              />

              {/* Estado Civil */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-crm-text-primary">Estado Civil</label>
                <select
                  name="estado_civil"
                  defaultValue={cliente?.estado_civil || ""}
                  className="w-full px-3 py-2 border border-crm-border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary disabled:opacity-50 transition-all"
                  disabled={pending}
                >
                  <option value="">Sin especificar</option>
                  {ESTADO_CIVIL_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Columna Derecha: Dirección + Información Comercial */}
          <div className="space-y-4">
            {/* Dirección */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2 mb-3">
                <div className="w-5 h-5 bg-crm-primary/10 rounded-lg flex items-center justify-center">
                  <svg className="w-3 h-3 text-crm-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                </div>
                <h3 className="text-sm font-semibold text-crm-text-primary">Dirección</h3>
              </div>

              <div className="space-y-3">
                {/* Calle y Número */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 space-y-1.5">
                    <label className="block text-xs font-medium text-crm-text-primary">Calle</label>
                    <input
                      name="direccion_calle"
                      autoComplete="address-line1"
                      defaultValue={cliente?.direccion?.calle || ""}
                      className="w-full px-3 py-2 border border-crm-border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary disabled:opacity-50 transition-all"
                      disabled={pending}
                      placeholder="Av. Principal"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-crm-text-primary">Número</label>
                    <input
                      name="direccion_numero"
                      autoComplete="address-line2"
                      defaultValue={cliente?.direccion?.numero || ""}
                      className="w-full px-3 py-2 border border-crm-border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary disabled:opacity-50 transition-all"
                      disabled={pending}
                      placeholder="123"
                    />
                  </div>
                </div>

                {/* Ubicación */}
                <UbicacionSelector
                  departamento={cliente?.direccion?.departamento || ""}
                  provincia={cliente?.direccion?.provincia || ""}
                  distrito={cliente?.direccion?.distrito || ""}
                  onUbicacionChange={setUbicacion}
                  disabled={pending}
                />

                {/* Campos ocultos */}
                <input type="hidden" name="direccion_departamento" value={ubicacion.departamento || ""} />
                <input type="hidden" name="direccion_provincia" value={ubicacion.provincia || ""} />
                <input type="hidden" name="direccion_distrito" value={ubicacion.distrito || ""} />
                <input type="hidden" name="direccion_pais" value="Perú" />
              </div>
            </div>

            {/* Información Comercial */}
            <div className="space-y-3 pt-3 border-t border-crm-border">
              <div className="flex items-center space-x-2 mb-3">
                <div className="w-5 h-5 bg-crm-primary/10 rounded-lg flex items-center justify-center">
                  <svg className="w-3 h-3 text-crm-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                  </svg>
                </div>
                <h3 className="text-sm font-semibold text-crm-text-primary">Información Comercial</h3>
              </div>

              <div className="space-y-3">
                {/* Estado del Cliente */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-crm-text-primary">
                    Estado del Cliente <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="estado_cliente"
                    required
                    defaultValue={cliente?.estado_cliente || "por_contactar"}
                    className="w-full px-3 py-2 border border-crm-border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary disabled:opacity-50 transition-all"
                    disabled={pending}
                  >
                    {ESTADOS_CLIENTE_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>

                {/* Origen del Lead */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-crm-text-primary">Origen del Lead</label>
                  <select
                    name="origen_lead"
                    defaultValue={cliente?.origen_lead || ""}
                    className="w-full px-3 py-2 border border-crm-border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary disabled:opacity-50 transition-all"
                    disabled={pending}
                  >
                    <option value="">Seleccionar origen</option>
                    {ORIGENES_LEAD_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>

                {/* Vendedor */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <label className="block text-xs font-medium text-crm-text-primary">Vendedor</label>
                    {!permisosLoading && !puedeGestionarVendedor && (
                      <span className="text-[10px] text-crm-text-muted uppercase tracking-wide font-semibold">
                        Solo coordinadores/admin
                      </span>
                    )}
                  </div>
                  {permisosLoading ? (
                    <div className="h-10 rounded-lg bg-crm-border/60 animate-pulse" />
                  ) : puedeGestionarVendedor ? (
                    <select
                      name="vendedor_asignado"
                      defaultValue={cliente?.vendedor_asignado || ""}
                      className="w-full px-3 py-2 border border-crm-border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary disabled:opacity-50 transition-all"
                      disabled={pending || loadingVendedores}
                    >
                      <option value="">
                        {loadingVendedores ? "Cargando vendedores..." : "Sin asignar"}
                      </option>
                      {vendedores.map((vendedor) => (
                        <option key={vendedor.id} value={vendedor.username}>
                          {vendedor.nombre_completo}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="w-full px-3 py-2 border border-dashed border-crm-border rounded-lg bg-crm-card-hover/40 text-xs text-crm-text-muted">
                      No cuentas con permisos para reasignar vendedores. Contacta a tu coordinador si necesitas realizar cambios.
                    </div>
                  )}
                  {errorVendedores && puedeGestionarVendedor && (
                    <p className="text-xs text-yellow-600 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                      </svg>
                      No se pudieron cargar los vendedores
                    </p>
                  )}
                </div>

                {/* Interés Principal */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-crm-text-primary">Interés Principal</label>
                  <select
                    name="interes_principal"
                    defaultValue={cliente?.interes_principal || ""}
                    className="w-full px-3 py-2 border border-crm-border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary disabled:opacity-50 transition-all"
                    disabled={pending}
                  >
                    <option value="">Seleccionar interés</option>
                    {INTERESES_PRINCIPALES_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>

                {/* Notas Adicionales */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-crm-text-primary">Notas Adicionales</label>
                  <textarea
                    name="notas"
                    rows={3}
                    defaultValue={cliente?.notas || ""}
                    className="w-full px-3 py-2 border border-crm-border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary disabled:opacity-50 transition-all resize-none"
                    disabled={pending}
                    placeholder="Información adicional sobre el cliente..."
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Duplicate Warning */}
        <DuplicateWarning duplicados={duplicados} checking={checkingDuplicates} />
      </form>

      {/* Botones de Acción - Fijos en la parte inferior */}
      <div className="flex justify-end space-x-3 pt-4 border-t border-crm-border bg-crm-card">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2 text-xs font-medium text-crm-text-secondary bg-crm-card-hover hover:bg-crm-border rounded-lg transition-all duration-200"
            disabled={pending}
          >
            Cancelar
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            formRef.current?.requestSubmit();
          }}
          disabled={pending || loadingVendedores}
          className="crm-button-primary px-6 py-2 rounded-lg text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-lg"
        >
          {pending ? (
            <div className="flex items-center space-x-2">
              <Spinner size="xs" color="white" />
              <span>Guardando...</span>
            </div>
          ) : loadingVendedores ? (
            <div className="flex items-center space-x-2">
              <Spinner size="xs" color="white" />
              <span>Cargando...</span>
            </div>
          ) : (
            isEditing ? "Actualizar Cliente" : "Crear Cliente"
          )}
        </button>
      </div>
    </div>
  );
}
