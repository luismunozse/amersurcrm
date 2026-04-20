"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";

// Cambiar a false para ocultar el banner. Subir el número al forzar
// que vuelva a mostrarse incluso para quienes lo cerraron antes.
export const MAINTENANCE_BANNER_ACTIVE = true;
const BANNER_VERSION = 1;
const STORAGE_KEY = `maintenance-banner-dismissed-v${BANNER_VERSION}`;

export default function MaintenanceBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!MAINTENANCE_BANNER_ACTIVE) return;
    try {
      const dismissed = localStorage.getItem(STORAGE_KEY);
      if (!dismissed) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  function cerrar() {
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {}
  }

  if (!MAINTENANCE_BANNER_ACTIVE || !visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="relative flex items-start gap-3 border-b border-amber-400/40 bg-amber-50 dark:bg-amber-900/20 px-4 py-2.5 text-amber-900 dark:text-amber-100"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
      <div className="flex-1 text-sm leading-snug">
        <span className="font-semibold">Mantenimiento en curso.</span>{" "}
        Estamos realizando tareas de mantenimiento y actualizaciones en los módulos; algunos
        servicios pueden verse afectados. Ante cualquier inconveniente, comuníquese con{" "}
        <a
          href="mailto:soporteamersur@gmail.com"
          className="font-semibold underline underline-offset-2 hover:text-amber-700 dark:hover:text-amber-200"
        >
          soporte
        </a>
        .
      </div>
      <button
        type="button"
        onClick={cerrar}
        aria-label="Cerrar aviso"
        title="Cerrar aviso"
        className="shrink-0 -mr-1 grid place-items-center h-11 w-11 sm:h-8 sm:w-8 rounded text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-800/40 transition"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}
