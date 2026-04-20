"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

const STORAGE_KEY = "pwa-install-dismissed-v1";
const DISMISS_DAYS = 14;

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt(): Promise<void>;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function dismissRecent(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const ts = Number(raw);
    if (!Number.isFinite(ts)) return false;
    const elapsedDays = (Date.now() - ts) / (1000 * 60 * 60 * 24);
    return elapsedDays < DISMISS_DAYS;
  } catch {
    return false;
  }
}

export default function PWAInstallPrompt() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandalone() || dismissRecent()) return;

    const handler = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler as EventListener);

    const installedHandler = () => {
      setVisible(false);
      setPromptEvent(null);
    };
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler as EventListener);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  if (!visible || !promptEvent) return null;

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {}
  };

  const install = async () => {
    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice.outcome === "accepted") {
        setVisible(false);
        setPromptEvent(null);
      } else {
        dismiss();
      }
    } catch {
      dismiss();
    }
  };

  return (
    <div
      role="dialog"
      aria-label="Instalar aplicación"
      className="fixed inset-x-3 z-40 bottom-[calc(env(safe-area-inset-bottom)+12px)] sm:bottom-6 sm:right-6 sm:left-auto sm:max-w-sm rounded-2xl border border-crm-border bg-crm-card shadow-2xl p-4 animate-in fade-in slide-in-from-bottom-4 duration-200"
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 flex items-center justify-center w-10 h-10 rounded-xl bg-crm-primary/10 text-crm-primary">
          <Download className="w-5 h-5" aria-hidden />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-crm-text-primary">Instalar AMERSUR CRM</p>
          <p className="text-xs text-crm-text-muted mt-0.5">
            Accedé desde tu pantalla de inicio, más rápido y sin barra del navegador.
          </p>
          <div className="flex items-center gap-2 mt-3">
            <button
              type="button"
              onClick={install}
              className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-crm-primary text-white text-xs font-semibold hover:bg-crm-primary-hover transition-colors"
            >
              <Download className="w-3.5 h-3.5" aria-hidden />
              Instalar
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="px-3 h-9 rounded-lg text-xs font-medium text-crm-text-muted hover:text-crm-text-primary hover:bg-crm-card-hover transition-colors"
            >
              Ahora no
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Cerrar"
          title="Cerrar"
          className="shrink-0 -mr-1 -mt-1 grid place-items-center w-8 h-8 rounded-lg text-crm-text-muted hover:text-crm-text-primary hover:bg-crm-card-hover transition-colors"
        >
          <X className="w-4 h-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
