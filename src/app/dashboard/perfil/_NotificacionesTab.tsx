"use client";

import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { Bell, BellOff, BellRing, AlertCircle, CheckCircle2, Loader2, Send } from "lucide-react";
import { useNotificationPermission } from "@/hooks/useNotificationPermission";
import { registerPushSubscription, unsubscribePush, tieneSuscripcionPushActiva } from "@/lib/pushClient";
import {
  obtenerEstadoPushAction,
  eliminarTodasSuscripcionesPushAction,
  enviarPushPruebaAction,
  type EstadoPush,
} from "./_actions-push";

export default function NotificacionesTab() {
  const { permission, requestPermission, isReady, isUnsupported, isDenied } =
    useNotificationPermission();

  const [estadoServer, setEstadoServer] = useState<EstadoPush | null>(null);
  const [suscritoBrowser, setSuscritoBrowser] = useState<boolean | null>(null);
  const [cargando, setCargando] = useState(false);
  const [accion, setAccion] = useState<null | "activar" | "desactivar" | "prueba" | "limpiar">(null);

  const cargarEstado = useCallback(async () => {
    setCargando(true);
    try {
      const [estado, sub] = await Promise.all([
        obtenerEstadoPushAction(),
        tieneSuscripcionPushActiva(),
      ]);
      setEstadoServer(estado);
      setSuscritoBrowser(sub);
    } catch (err) {
      console.error("Error cargando estado push:", err);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargarEstado();
  }, [cargarEstado]);

  const activarPush = async () => {
    if (!estadoServer?.vapidPublicKey) {
      toast.error("Push no está habilitado en la configuración del sistema");
      return;
    }
    setAccion("activar");
    try {
      // Solicitar permiso si aún no fue dado
      if (permission === "default") {
        const result = await requestPermission();
        if (result !== "granted") {
          toast.error("Permiso denegado por el navegador");
          return;
        }
      }
      if (permission === "denied") {
        toast.error("El navegador bloqueó las notificaciones. Habilítalas desde la configuración del sitio.");
        return;
      }

      await registerPushSubscription({
        vapidPublicKey: estadoServer.vapidPublicKey,
        onSubscribed: () => toast.success("Notificaciones push activadas en este dispositivo"),
      });

      await cargarEstado();
    } catch (err) {
      console.error("Error activando push:", err);
      toast.error("No se pudo activar push");
    } finally {
      setAccion(null);
    }
  };

  const desactivarPush = async () => {
    setAccion("desactivar");
    try {
      const { unsubscribed } = await unsubscribePush();
      if (unsubscribed) {
        toast.success("Notificaciones push desactivadas en este dispositivo");
      } else {
        toast("Este dispositivo no tenía suscripción activa");
      }
      await cargarEstado();
    } catch (err) {
      console.error("Error desactivando push:", err);
      toast.error("No se pudo desactivar push");
    } finally {
      setAccion(null);
    }
  };

  const limpiarTodos = async () => {
    if (!confirm("¿Eliminar todas las suscripciones push de todos los dispositivos? Tendrás que volver a activar en cada uno.")) return;
    setAccion("limpiar");
    try {
      const result = await eliminarTodasSuscripcionesPushAction();
      if (result.success) {
        // También cancelar la suscripción local del browser si existe
        await unsubscribePush().catch(() => undefined);
        toast.success(result.message ?? "Suscripciones eliminadas");
        await cargarEstado();
      } else {
        toast.error(result.error ?? "Error eliminando suscripciones");
      }
    } finally {
      setAccion(null);
    }
  };

  const enviarPrueba = async () => {
    setAccion("prueba");
    try {
      const result = await enviarPushPruebaAction();
      if (result.success) {
        toast.success(result.message ?? "Push de prueba enviado");
      } else {
        toast.error(result.error ?? "No se pudo enviar push de prueba");
      }
    } finally {
      setAccion(null);
    }
  };

  if (cargando && !estadoServer) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-crm-text-muted" />
      </div>
    );
  }

  const pushGlobalOff = estadoServer && !estadoServer.pushEnabledGlobal;
  const esteDispositivoActivo = suscritoBrowser === true;
  const otrosDispositivos = Math.max((estadoServer?.suscripcionesCount ?? 0) - (esteDispositivoActivo ? 1 : 0), 0);

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-crm-text-primary flex items-center gap-2">
          <Bell className="w-5 h-5 text-crm-primary" />
          Notificaciones Push
        </h2>
        <p className="text-sm text-crm-text-muted mt-1">
          Recibe avisos de recordatorios y eventos directo en este dispositivo, incluso si la PWA está cerrada.
        </p>
      </div>

      {/* Avisos de bloqueo */}
      {isUnsupported && (
        <div className="flex items-start gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Navegador no compatible</p>
            <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
              Este navegador no soporta notificaciones push web.
            </p>
          </div>
        </div>
      )}

      {pushGlobalOff && (
        <div className="flex items-start gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Push deshabilitado en el sistema</p>
            <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
              El administrador no ha habilitado las notificaciones push. Contacte al administrador.
            </p>
          </div>
        </div>
      )}

      {isDenied && (
        <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <BellOff className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800 dark:text-red-200">Permiso bloqueado en el navegador</p>
            <p className="text-xs text-red-700 dark:text-red-300 mt-1">
              Habilite las notificaciones desde la configuración del sitio en su navegador y luego recargue la página.
            </p>
          </div>
        </div>
      )}

      {/* Estado dispositivo actual */}
      {isReady && !isUnsupported && !pushGlobalOff && (
        <div className="border border-crm-border rounded-xl p-5 bg-crm-bg-primary dark:bg-crm-card">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              {esteDispositivoActivo ? (
                <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
              ) : (
                <BellOff className="w-6 h-6 text-crm-text-muted shrink-0 mt-0.5" />
              )}
              <div>
                <p className="text-sm font-medium text-crm-text-primary">
                  {esteDispositivoActivo ? "Activadas en este dispositivo" : "Desactivadas en este dispositivo"}
                </p>
                <p className="text-xs text-crm-text-muted mt-1">
                  {esteDispositivoActivo
                    ? "Recibirás notificaciones push aquí cuando lleguen recordatorios o eventos."
                    : "Activa las notificaciones para no perder recordatorios."}
                </p>
              </div>
            </div>

            <div className="shrink-0">
              {esteDispositivoActivo ? (
                <button
                  onClick={desactivarPush}
                  disabled={accion !== null}
                  className="px-4 py-2 text-sm font-medium text-crm-text-secondary border border-crm-border rounded-lg hover:bg-crm-card-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                >
                  {accion === "desactivar" ? <Loader2 className="w-4 h-4 animate-spin" /> : <BellOff className="w-4 h-4" />}
                  Desactivar
                </button>
              ) : (
                <button
                  onClick={activarPush}
                  disabled={accion !== null || isDenied}
                  className="px-4 py-2 text-sm font-medium text-white bg-crm-primary rounded-lg hover:bg-crm-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                >
                  {accion === "activar" ? <Loader2 className="w-4 h-4 animate-spin" /> : <BellRing className="w-4 h-4" />}
                  Activar
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Otros dispositivos */}
      {otrosDispositivos > 0 && (
        <div className="border border-crm-border rounded-xl p-5 bg-crm-bg-primary dark:bg-crm-card">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-crm-text-primary">
                {otrosDispositivos} otro{otrosDispositivos !== 1 ? "s" : ""} dispositivo{otrosDispositivos !== 1 ? "s" : ""} activo{otrosDispositivos !== 1 ? "s" : ""}
              </p>
              <p className="text-xs text-crm-text-muted mt-1">
                Tu cuenta recibe notificaciones en otros navegadores/dispositivos.
              </p>
            </div>
            <button
              onClick={limpiarTodos}
              disabled={accion !== null}
              className="px-4 py-2 text-sm font-medium text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2 shrink-0"
            >
              {accion === "limpiar" ? <Loader2 className="w-4 h-4 animate-spin" /> : <BellOff className="w-4 h-4" />}
              Cerrar todas las sesiones
            </button>
          </div>
        </div>
      )}

      {/* Prueba */}
      {esteDispositivoActivo && (
        <div className="border border-dashed border-crm-border rounded-xl p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-crm-text-primary">Probar notificación</p>
              <p className="text-xs text-crm-text-muted mt-1">
                Envíate una notificación de prueba a este dispositivo para verificar que funciona.
              </p>
            </div>
            <button
              onClick={enviarPrueba}
              disabled={accion !== null}
              className="px-4 py-2 text-sm font-medium text-crm-primary border border-crm-primary/30 rounded-lg hover:bg-crm-primary/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2 shrink-0"
            >
              {accion === "prueba" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Enviar prueba
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
