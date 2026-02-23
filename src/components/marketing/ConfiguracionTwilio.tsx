"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { ShieldCheck, PlugZap, Loader2, Save, Copy, RefreshCw, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";

type TwilioConfigResponse = {
  hasCredential: boolean;
  accountSid: string | null;
  whatsappFrom: string | null;
  smsFrom: string | null;
  webhookVerifyToken: string | null;
  esSandbox: boolean | null;
  updatedAt: string | null;
};

const initialFormState = {
  accountSid: "",
  authToken: "",
  whatsappFrom: "",
  smsFrom: "",
  webhookVerifyToken: "",
  esSandbox: false,
};

export default function ConfiguracionTwilio() {
  const [config, setConfig] = useState<TwilioConfigResponse | null>(null);
  const [form, setForm] = useState(initialFormState);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [webhookUrl, setWebhookUrl] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setWebhookUrl(`${window.location.origin}/api/twilio/webhook`);
    }
    cargarConfig();
  }, []);

  const cargarConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/marketing/twilio-config");
      if (!res.ok) {
        throw new Error(await res.text());
      }
      const data: TwilioConfigResponse = await res.json();
      setConfig(data);
      setForm((prev) => ({
        ...prev,
        accountSid: data.accountSid ?? "",
        whatsappFrom: data.whatsappFrom ?? "",
        smsFrom: data.smsFrom ?? "",
        webhookVerifyToken: data.webhookVerifyToken ?? "",
        esSandbox: data.esSandbox ?? false,
        authToken: "",
      }));
    } catch (error) {
      console.error(error);
      toast.error("No se pudo cargar la configuración de Twilio.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copiado`);
    } catch {
      toast.error("No se pudo copiar.");
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startTransition(() => {
      void guardarConfig();
    });
  };

  const guardarConfig = async () => {
    try {
      const respuesta = await fetch("/api/marketing/twilio-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!respuesta.ok) {
        const data = await respuesta.json().catch(() => ({}));
        throw new Error(data.error || "No se pudo guardar la configuración");
      }

      toast.success("Credenciales guardadas");
      setForm((prev) => ({ ...prev, authToken: "" }));
      await cargarConfig();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Error guardando credenciales");
    }
  };

  const statusLabel = useMemo(() => {
    if (loading) return "Verificando...";
    if (config?.hasCredential) return "Conectado";
    return "Sin configurar";
  }, [config, loading]);

  return (
    <div className="space-y-6">
      <div className="bg-crm-card border border-crm-border rounded-2xl p-6 shadow-crm-lg">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-crm-text-primary flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              Configuración de Twilio
            </h2>
            <p className="text-sm text-crm-text-secondary mt-1">
              Define las credenciales para enviar campañas por WhatsApp y SMS desde el CRM.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${config?.hasCredential ? "bg-emerald-100 text-emerald-700" : "bg-crm-warning/10 text-crm-warning"}`}>
              {statusLabel}
            </span>
            <button
              type="button"
              onClick={cargarConfig}
              className="inline-flex items-center gap-2 text-sm text-crm-text-secondary hover:text-crm-text-primary"
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Refrescar
            </button>
          </div>
        </div>

        {/* Banner sandbox activo */}
        {form.esSandbox && config?.hasCredential && (
          <div className="mt-4 flex items-start gap-3 rounded-xl bg-crm-warning/10 border border-crm-warning/30 px-4 py-3">
            <AlertTriangle className="w-4 h-4 text-crm-warning flex-shrink-0 mt-0.5" />
            <p className="text-sm text-crm-warning">
              <span className="font-semibold">Modo Sandbox activo.</span>{" "}
              Los mensajes solo llegarán a los números autorizados en el Sandbox de Twilio.
              Desactívalo para enviar a números reales en producción.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-crm-text-secondary">Account SID</label>
              <input
                type="text"
                value={form.accountSid}
                onChange={(e) => setForm((prev) => ({ ...prev, accountSid: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-crm-border bg-transparent px-3 py-2 text-sm focus:border-crm-primary focus:ring-2 focus:ring-crm-primary/40"
                placeholder="ACxxxxxxxxxxxxxxxxxxxxxx"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-crm-text-secondary flex items-center justify-between">
                Auth Token
                {config?.hasCredential && <span className="text-xs text-crm-text-muted">Deja vacío para mantener el actual</span>}
              </label>
              <input
                type="password"
                value={form.authToken}
                onChange={(e) => setForm((prev) => ({ ...prev, authToken: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-crm-border bg-transparent px-3 py-2 text-sm focus:border-crm-primary focus:ring-2 focus:ring-crm-primary/40"
                placeholder="••••••••••"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-crm-text-secondary">WhatsApp From</label>
              <input
                type="text"
                value={form.whatsappFrom}
                onChange={(e) => setForm((prev) => ({ ...prev, whatsappFrom: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-crm-border bg-transparent px-3 py-2 text-sm focus:border-crm-primary focus:ring-2 focus:ring-crm-primary/40"
                placeholder="whatsapp:+1xxxxxxxxxx"
                required
              />
              <p className="text-xs text-crm-text-muted mt-1">Debe incluir el prefijo <code>whatsapp:</code></p>
            </div>

            <div>
              <label className="text-sm font-medium text-crm-text-secondary">SMS From (opcional)</label>
              <input
                type="text"
                value={form.smsFrom}
                onChange={(e) => setForm((prev) => ({ ...prev, smsFrom: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-crm-border bg-transparent px-3 py-2 text-sm focus:border-crm-primary focus:ring-2 focus:ring-crm-primary/40"
                placeholder="+1xxxxxxxxxx"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-crm-text-secondary">Webhook Verify Token</label>
              <input
                type="text"
                value={form.webhookVerifyToken}
                onChange={(e) => setForm((prev) => ({ ...prev, webhookVerifyToken: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-crm-border bg-transparent px-3 py-2 text-sm focus:border-crm-primary focus:ring-2 focus:ring-crm-primary/40"
                placeholder="token_unico_para_webhook"
                required
              />
            </div>

            <div
              className={`flex items-center gap-3 mt-4 rounded-xl border px-4 py-3 transition-colors ${
                form.esSandbox
                  ? "bg-crm-warning/10 border-crm-warning/40"
                  : "bg-crm-card-hover border-crm-border"
              }`}
            >
              <input
                id="sandbox"
                type="checkbox"
                className="h-4 w-4 rounded border-crm-border text-crm-primary focus:ring-crm-primary"
                checked={form.esSandbox}
                onChange={(e) => setForm((prev) => ({ ...prev, esSandbox: e.target.checked }))}
              />
              <div>
                <label
                  htmlFor="sandbox"
                  className={`text-sm font-medium cursor-pointer ${form.esSandbox ? "text-crm-warning" : "text-crm-text-secondary"}`}
                >
                  Modo Sandbox
                </label>
                <p className="text-xs text-crm-text-muted mt-0.5">
                  {form.esSandbox
                    ? "Activo — solo para pruebas, no apto para producción"
                    : "Inactivo — modo producción, mensajes a números reales"}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              type="submit"
              disabled={isPending || loading}
              className="inline-flex items-center gap-2 rounded-xl bg-crm-primary px-5 py-2.5 text-sm font-semibold text-white shadow-crm-lg hover:bg-crm-primary/90 disabled:opacity-60"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Guardar Cambios
            </button>
          </div>
        </form>
      </div>

      <div className="bg-crm-card border border-crm-border rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <PlugZap className="w-5 h-5 text-blue-500" />
          <h3 className="text-lg font-semibold text-crm-text-primary">Webhook de Twilio</h3>
        </div>
        <p className="text-sm text-crm-text-secondary">
          Configura este webhook en Twilio Console para recibir mensajes entrantes y estados de entrega:
        </p>
        <div className="mt-4 flex flex-col gap-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div>
              <p className="text-xs uppercase text-crm-text-muted">URL del Webhook</p>
              <p className="font-mono text-sm text-crm-text-primary break-all">{webhookUrl || "https://tu-dominio.com/api/twilio/webhook"}</p>
            </div>
            <button
              type="button"
              onClick={() => webhookUrl && handleCopy(webhookUrl, "URL")}
              className="inline-flex items-center gap-2 rounded-lg border border-crm-border px-3 py-1.5 text-sm text-crm-text-secondary hover:text-crm-text-primary"
            >
              <Copy className="w-4 h-4" />
              Copiar URL
            </button>
          </div>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div>
              <p className="text-xs uppercase text-crm-text-muted">Verify Token</p>
              <p className="font-mono text-sm text-crm-text-primary break-all">{form.webhookVerifyToken || config?.webhookVerifyToken || "Define un token único"}</p>
            </div>
            <button
              type="button"
              onClick={() => (form.webhookVerifyToken || config?.webhookVerifyToken) && handleCopy(form.webhookVerifyToken || config?.webhookVerifyToken || "", "Verify Token")}
              className="inline-flex items-center gap-2 rounded-lg border border-crm-border px-3 py-1.5 text-sm text-crm-text-secondary hover:text-crm-text-primary"
            >
              <Copy className="w-4 h-4" />
              Copiar Token
            </button>
          </div>

          <p className="text-xs text-crm-text-muted">
            En Twilio Console → Messaging → WhatsApp → Sandbox Settings, pega la URL y el Verify Token anteriores para recibir eventos.
          </p>
        </div>
      </div>
    </div>
  );
}
