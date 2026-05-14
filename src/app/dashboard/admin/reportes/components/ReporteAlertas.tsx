"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Bell, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { PageLoader } from "@/components/ui/PageLoader";
import {
  listarAlertaReglas,
  toggleAlertaRegla,
  listarAlertaDisparos,
  type AlertaRegla,
  type AlertaDisparo,
} from "../_actions";
import toast from "react-hot-toast";

function formatearFecha(iso: string | null): string {
  if (!iso) return "Nunca";
  return new Date(iso).toLocaleString("es-PE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatearValor(valor: number | null, codigo: string): string {
  if (valor === null) return "—";
  if (codigo === "leads_diarios_caida") return `${(valor * 100).toFixed(0)}% del promedio 7d`;
  if (codigo === "ventas_semana_cero") return `${valor} venta${valor === 1 ? "" : "s"}`;
  if (codigo === "cobranza_atrasada_critica") return `+${valor} vs ayer`;
  return String(valor);
}

export default function ReporteAlertas() {
  const [reglas, setReglas] = useState<AlertaRegla[]>([]);
  const [disparos, setDisparos] = useState<AlertaDisparo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [reglasRes, disparosRes] = await Promise.all([
      listarAlertaReglas(),
      listarAlertaDisparos(50),
    ]);
    if (reglasRes.error) {
      setError(reglasRes.error);
      toast.error(reglasRes.error);
    } else {
      setReglas(reglasRes.data || []);
    }
    if (disparosRes.error) {
      toast.error(disparosRes.error);
    } else {
      setDisparos(disparosRes.data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const handleToggle = async (regla: AlertaRegla) => {
    setToggling(regla.id);
    const r = await toggleAlertaRegla(regla.id, !regla.activo);
    if (r.error) {
      toast.error(r.error);
    } else {
      toast.success(`${regla.nombre} ${r.data?.activo ? "activada" : "desactivada"}`);
      setReglas((prev) =>
        prev.map((rg) => (rg.id === regla.id ? { ...rg, activo: !!r.data?.activo } : rg)),
      );
    }
    setToggling(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <PageLoader size="sm" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 dark:text-red-400 mb-4">{error}</div>
        <Button onClick={cargar}>Reintentar</Button>
      </div>
    );
  }

  const activas = reglas.filter((r) => r.activo).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4" data-pdf-ignore>
        <div>
          <h2 className="text-2xl font-bold text-crm-text-primary flex items-center gap-2">
            <Bell className="w-6 h-6" />
            Centro de Alertas
          </h2>
          <p className="text-crm-text-secondary mt-1">
            Reglas evaluadas cada 30 min. Disparos se entregan como notificación in-app a admins y gerentes.
          </p>
        </div>

        <div className="text-xs text-crm-text-muted">
          {activas} de {reglas.length} reglas activas
        </div>
      </div>

      {/* Reglas */}
      <Card>
        <CardHeader>
          <CardTitle>Reglas configuradas</CardTitle>
          <CardDescription>
            Built-in iniciales. UI custom para crear nuevas reglas se agregará en una siguiente fase.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {reglas.length === 0 ? (
            <div className="text-center py-8 text-crm-text-muted">
              No hay reglas configuradas. Verifique que la migración 20260514000006_reporte_alertas.sql se haya aplicado.
            </div>
          ) : (
            reglas.map((regla) => (
              <div
                key={regla.id}
                className={
                  "border rounded-lg p-4 transition-colors " +
                  (regla.activo
                    ? "border-crm-border bg-crm-card"
                    : "border-crm-border bg-crm-card-hover/40 opacity-70")
                }
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-crm-text-primary">{regla.nombre}</h4>
                      <code className="text-xs px-1.5 py-0.5 bg-crm-card-hover rounded text-crm-text-muted">
                        {regla.codigo}
                      </code>
                    </div>
                    <p className="text-sm text-crm-text-secondary mb-2">{regla.descripcion}</p>
                    <div className="flex flex-wrap gap-3 text-xs text-crm-text-muted">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Cooldown: {regla.cooldownHoras}h
                      </span>
                      <span>Umbral: {regla.comparacion} {regla.umbral}</span>
                      <span>Última eval: {formatearFecha(regla.ultimaEvalAt)}</span>
                      {regla.ultimoDisparoAt && (
                        <span className="text-amber-600 dark:text-amber-400">
                          Último disparo: {formatearFecha(regla.ultimoDisparoAt)}
                        </span>
                      )}
                    </div>
                    {regla.ultimoValor !== null && (
                      <div className="text-xs text-crm-text-secondary mt-1">
                        Último valor observado:{" "}
                        <span className="font-medium text-crm-text-primary">
                          {formatearValor(regla.ultimoValor, regla.codigo)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleToggle(regla)}
                      disabled={toggling === regla.id}
                      className={
                        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 " +
                        (regla.activo ? "bg-emerald-500" : "bg-crm-card-hover")
                      }
                      role="switch"
                      aria-checked={regla.activo}
                      aria-label={`${regla.activo ? "Desactivar" : "Activar"} ${regla.nombre}`}
                    >
                      <span
                        className={
                          "inline-block h-4 w-4 transform rounded-full bg-white transition-transform " +
                          (regla.activo ? "translate-x-6" : "translate-x-1")
                        }
                      />
                    </button>
                    <span className="text-xs font-medium text-crm-text-secondary w-16">
                      {regla.activo ? "Activa" : "Pausada"}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Historial de disparos */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de disparos</CardTitle>
          <CardDescription>Últimos 50 disparos en orden cronológico inverso.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {disparos.length === 0 ? (
            <div className="text-center py-8 text-crm-text-muted inline-flex w-full items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Ningún disparo registrado todavía.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-crm-card-hover">
                  <tr className="text-left text-crm-text-secondary">
                    <th className="px-4 py-2 font-medium">Fecha</th>
                    <th className="px-4 py-2 font-medium">Regla</th>
                    <th className="px-4 py-2 font-medium text-right">Valor</th>
                    <th className="px-4 py-2 font-medium text-right">Notificados</th>
                  </tr>
                </thead>
                <tbody>
                  {disparos.map((d) => (
                    <tr key={d.id} className="border-t border-crm-border hover:bg-crm-card-hover/40">
                      <td className="px-4 py-2 text-crm-text-secondary tabular-nums whitespace-nowrap">
                        {formatearFecha(d.fechaDisparo)}
                      </td>
                      <td className="px-4 py-2 text-crm-text-primary font-medium">
                        <div className="inline-flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                          <span>{d.reglaNombre}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-right text-crm-text-primary tabular-nums">
                        {formatearValor(d.valorObservado, d.reglaCodigo)}
                      </td>
                      <td className="px-4 py-2 text-right text-crm-text-secondary tabular-nums">
                        {d.notificacionesCreadas}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cómo funciona</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-crm-text-secondary space-y-2">
          <p>
            Las reglas activas se evalúan cada 30 min vía Vercel Cron en{" "}
            <code className="text-xs bg-crm-card-hover px-1.5 py-0.5 rounded">/api/cron/reportes-alertas</code>.
          </p>
          <p>
            Cada regla respeta su <strong className="text-crm-text-primary">cooldown</strong> para evitar
            notificaciones duplicadas. Cuando dispara, crea una notificación en la campana del CRM para
            cada usuario con rol <code className="text-xs">ROL_ADMIN</code> o <code className="text-xs">ROL_GERENTE</code>.
          </p>
          <p>
            <strong className="text-crm-text-primary">Pausar</strong> una regla la excluye del evaluador hasta volver a activarla.
            Sin canales externos (email/WhatsApp) — agregables en fase posterior.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
