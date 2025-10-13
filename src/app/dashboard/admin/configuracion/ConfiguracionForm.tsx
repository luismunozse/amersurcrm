'use client';

import { useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { actualizarConfiguracion, ConfiguracionFormState } from "./actions";

export type ConfiguracionInicial = {
  empresaNombre: string;
  monedaPrincipal: "PEN" | "USD";
  zonaHoraria: string;
  idioma: "es" | "en";
  comisionLote: number;
  comisionCasa: number;
  comisionAlquiler: number;
  notificacionesEmail: boolean;
  notificacionesPush: boolean;
  notificacionesRecordatorios: boolean;
  camposCliente: string[];
  camposPropiedad: string[];
  whatsappTokenConfigurado: boolean;
  whatsappTokenActualizadoEn?: string | null;
  smtpHost?: string | null;
  smtpHostActualizadoEn?: string | null;
};

const initialState: ConfiguracionFormState = {
  status: "idle",
};

const ZONAS_HORARIAS = [
  { value: "America/Lima", label: "Lima, Perú (GMT-5)" },
  { value: "America/Bogota", label: "Bogotá, Colombia (GMT-5)" },
  { value: "America/Argentina/Cordoba", label: "Córdoba, Argentina (GMT-3)" },
  { value: "America/Mexico_City", label: "Ciudad de México (GMT-6)" },
  { value: "America/New_York", label: "Nueva York (GMT-5)" },
];

const IDIOMAS = [
  { value: "es", label: "Español" },
  { value: "en", label: "English" },
];

const MONEDAS = [
  { value: "PEN", label: "Soles Peruanos (S/.)" },
  { value: "USD", label: "Dólares Americanos ($)" },
];

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-sm text-red-500">{message}</p>;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="crm-button-primary px-6 py-2 rounded-lg font-medium disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {pending ? "Guardando..." : "Guardar Configuración"}
    </button>
  );
}

export function ConfiguracionForm({ config }: { config: ConfiguracionInicial }) {
  const [state, formAction] = useFormState(actualizarConfiguracion, initialState);
  const [reemplazarWhatsappToken, setReemplazarWhatsappToken] = useState(false);

  const camposClienteDefault = useMemo(
    () => config.camposCliente.join("\n"),
    [config.camposCliente]
  );
  const camposPropiedadDefault = useMemo(
    () => config.camposPropiedad.join("\n"),
    [config.camposPropiedad]
  );

  return (
    <form
      action={formAction}
      className="space-y-6"
      onReset={() => setReemplazarWhatsappToken(false)}
    >
      {state.status !== "idle" && state.message && (
        <div
          className={`border rounded-lg px-4 py-3 ${
            state.status === "success"
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-red-200 bg-red-50 text-red-600"
          }`}
        >
          {state.message}
        </div>
      )}

      {/* Configuración General */}
      <div className="crm-card p-6">
        <h2 className="text-xl font-semibold text-crm-text-primary mb-4">Configuración General</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-crm-text-primary mb-2" htmlFor="empresaNombre">
              Nombre de la Empresa
            </label>
            <input
              id="empresaNombre"
              name="empresaNombre"
              type="text"
              defaultValue={config.empresaNombre}
              className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary placeholder-crm-text-muted focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-crm-primary"
            />
            <FieldError message={state.fieldErrors?.empresaNombre} />
          </div>
          <div>
            <label className="block text-sm font-medium text-crm-text-primary mb-2" htmlFor="monedaPrincipal">
              Moneda Principal
            </label>
            <select
              id="monedaPrincipal"
              name="monedaPrincipal"
              defaultValue={config.monedaPrincipal}
              className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-crm-primary"
            >
              {MONEDAS.map((moneda) => (
                <option key={moneda.value} value={moneda.value}>
                  {moneda.label}
                </option>
              ))}
            </select>
            <FieldError message={state.fieldErrors?.monedaPrincipal} />
          </div>
          <div>
            <label className="block text-sm font-medium text-crm-text-primary mb-2" htmlFor="zonaHoraria">
              Zona Horaria
            </label>
            <select
              id="zonaHoraria"
              name="zonaHoraria"
              defaultValue={config.zonaHoraria}
              className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-crm-primary"
            >
              {ZONAS_HORARIAS.map((zona) => (
                <option key={zona.value} value={zona.value}>
                  {zona.label}
                </option>
              ))}
            </select>
            <FieldError message={state.fieldErrors?.zonaHoraria} />
          </div>
          <div>
            <label className="block text-sm font-medium text-crm-text-primary mb-2" htmlFor="idioma">
              Idioma
            </label>
            <select
              id="idioma"
              name="idioma"
              defaultValue={config.idioma}
              className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-crm-primary"
            >
              {IDIOMAS.map((idioma) => (
                <option key={idioma.value} value={idioma.value}>
                  {idioma.label}
                </option>
              ))}
            </select>
            <FieldError message={state.fieldErrors?.idioma} />
          </div>
        </div>
      </div>

      {/* Configuración de Comisiones */}
      <div className="crm-card p-6">
        <h2 className="text-xl font-semibold text-crm-text-primary mb-4">Configuración de Comisiones</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-crm-text-primary mb-2" htmlFor="comisionLote">
              Comisión por Venta de Lote (%)
            </label>
            <input
              id="comisionLote"
              name="comisionLote"
              type="number"
              min="0"
              max="100"
              step="0.1"
              defaultValue={config.comisionLote}
              className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary placeholder-crm-text-muted focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-crm-primary"
            />
            <FieldError message={state.fieldErrors?.comisionLote} />
          </div>
          <div>
            <label className="block text-sm font-medium text-crm-text-primary mb-2" htmlFor="comisionCasa">
              Comisión por Venta de Casa (%)
            </label>
            <input
              id="comisionCasa"
              name="comisionCasa"
              type="number"
              min="0"
              max="100"
              step="0.1"
              defaultValue={config.comisionCasa}
              className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary placeholder-crm-text-muted focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-crm-primary"
            />
            <FieldError message={state.fieldErrors?.comisionCasa} />
          </div>
          <div>
            <label className="block text-sm font-medium text-crm-text-primary mb-2" htmlFor="comisionAlquiler">
              Comisión por Alquiler (%)
            </label>
            <input
              id="comisionAlquiler"
              name="comisionAlquiler"
              type="number"
              min="0"
              max="100"
              step="0.1"
              defaultValue={config.comisionAlquiler}
              className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary placeholder-crm-text-muted focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-crm-primary"
            />
            <FieldError message={state.fieldErrors?.comisionAlquiler} />
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
              <input
                type="checkbox"
                name="notificacionesEmail"
                defaultChecked={config.notificacionesEmail}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-crm-border peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-crm-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-crm-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-crm-primary"></div>
            </label>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-crm-text-primary">Notificaciones Push</h3>
              <p className="text-xs text-crm-text-muted">Enviar notificaciones push al navegador</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                name="notificacionesPush"
                defaultChecked={config.notificacionesPush}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-crm-border peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-crm-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-crm-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-crm-primary"></div>
            </label>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-crm-text-primary">Recordatorios Automáticos</h3>
              <p className="text-xs text-crm-text-muted">Crear recordatorios automáticos para eventos</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                name="notificacionesRecordatorios"
                defaultChecked={config.notificacionesRecordatorios}
                className="sr-only peer"
              />
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
            <label className="block text-sm font-medium text-crm-text-primary mb-2" htmlFor="camposCliente">
              Campos Adicionales para Clientes
            </label>
            <textarea
              id="camposCliente"
              name="camposCliente"
              rows={3}
              defaultValue={camposClienteDefault}
              placeholder="Ejemplo: Profesión&#10;Empresa&#10;Referencia"
              className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary placeholder-crm-text-muted focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-crm-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-crm-text-primary mb-2" htmlFor="camposPropiedad">
              Campos Adicionales para Propiedades
            </label>
            <textarea
              id="camposPropiedad"
              name="camposPropiedad"
              rows={3}
              defaultValue={camposPropiedadDefault}
              placeholder="Ejemplo: Orientación&#10;Vista&#10;Servicios"
              className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary placeholder-crm-text-muted focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-crm-primary"
            />
          </div>
        </div>
      </div>

      {/* Configuración de Integraciones */}
      <div className="crm-card p-6 space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-crm-text-primary mb-4">Integraciones</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-crm-text-primary" htmlFor="whatsappToken">
                  Token de WhatsApp Cloud API
                </label>
                <div className="text-xs text-crm-text-muted">
                  {config.whatsappTokenConfigurado
                    ? `Actualizado ${config.whatsappTokenActualizadoEn ? new Date(config.whatsappTokenActualizadoEn).toLocaleString() : ""}`
                    : "Sin configurar"}
                </div>
              </div>
              <div className="space-y-2">
                <label className="inline-flex items-center gap-2 text-sm text-crm-text-primary">
                  <input
                    type="checkbox"
                    checked={reemplazarWhatsappToken}
                    onChange={(event) => setReemplazarWhatsappToken(event.target.checked)}
                    className="h-4 w-4 rounded border-crm-border text-crm-primary focus:ring-crm-primary"
                  />
                  Reemplazar token actual
                </label>
                <input
                  id="whatsappToken"
                name="whatsappToken"
                type="password"
                disabled={!reemplazarWhatsappToken}
                placeholder={
                  config.whatsappTokenConfigurado
                    ? "Ingresa un token nuevo para reemplazar el existente"
                    : "Ingresa el token de WhatsApp"
                }
                autoComplete="new-password"
                required={reemplazarWhatsappToken}
                className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary placeholder-crm-text-muted focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-crm-primary disabled:bg-crm-background disabled:text-crm-text-muted disabled:cursor-not-allowed"
              />
                <FieldError message={state.fieldErrors?.whatsappToken} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-crm-text-primary" htmlFor="smtpHost">
                Servidor SMTP
              </label>
              <input
                id="smtpHost"
                name="smtpHost"
                type="text"
                defaultValue={config.smtpHost ?? ""}
                placeholder="smtp.tudominio.com"
                className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary placeholder-crm-text-muted focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-crm-primary"
              />
              {config.smtpHostActualizadoEn && (
                <p className="text-xs text-crm-text-muted">
                  Actualizado {new Date(config.smtpHostActualizadoEn).toLocaleString()}
                </p>
              )}
              <FieldError message={state.fieldErrors?.smtpHost} />
            </div>
          </div>
        </div>
      </div>

      {/* Botones de acción */}
      <input type="hidden" name="replaceWhatsappToken" value={reemplazarWhatsappToken ? "true" : "false"} />
      <div className="flex justify-end space-x-4">
        <button
          type="reset"
          className="px-6 py-2 text-crm-text-muted hover:text-crm-text-primary border border-crm-border rounded-lg transition-colors"
        >
          Cancelar
        </button>
        <SubmitButton />
      </div>
    </form>
  );
}
