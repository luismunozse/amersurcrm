"use client";

import { useEffect, useState, useCallback } from "react";
import { X, Sparkles, Wrench, Bug, Shield, Gift } from "lucide-react";
import {
  changelog,
  CURRENT_VERSION,
  CHANGELOG_STORAGE_KEY,
  type ChangeType,
  type ChangelogVersion,
} from "@/data/changelog";

const changeTypeConfig: Record<
  ChangeType,
  { icon: typeof Sparkles; color: string; bgColor: string; label: string }
> = {
  feature: {
    icon: Sparkles,
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
    label: "Nueva función",
  },
  improvement: {
    icon: Wrench,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    label: "Mejora",
  },
  fix: {
    icon: Bug,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    label: "Corrección",
  },
  security: {
    icon: Shield,
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-100 dark:bg-red-900/30",
    label: "Seguridad",
  },
};

function VersionCard({ version, isLatest }: { version: ChangelogVersion; isLatest: boolean }) {
  return (
    <div className={`relative ${isLatest ? "" : "opacity-75"}`}>
      {isLatest && (
        <div className="absolute -left-3 sm:-left-3 top-0 bottom-0 w-1 bg-gradient-to-b from-crm-primary to-crm-primary/50 rounded-full" />
      )}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
        <span
          className={`px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm font-semibold ${
            isLatest
              ? "bg-crm-primary text-white"
              : "bg-crm-border text-crm-text-secondary"
          }`}
        >
          v{version.version}
        </span>
        <span className="text-xs sm:text-sm text-crm-text-muted">{version.date}</span>
        {isLatest && (
          <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-medium rounded-full flex items-center gap-1">
            <Gift className="w-3 h-3" />
            Nuevo
          </span>
        )}
      </div>
      <h3 className="text-base sm:text-lg font-semibold text-crm-text-primary mb-2 sm:mb-3">
        {version.title}
      </h3>
      <ul className="space-y-1.5 sm:space-y-2">
        {version.changes.map((change, idx) => {
          const config = changeTypeConfig[change.type];
          const Icon = config.icon;
          return (
            <li key={idx} className="flex items-start gap-2 sm:gap-3">
              <span className={`p-1 sm:p-1.5 rounded-lg ${config.bgColor} flex-shrink-0`}>
                <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${config.color}`} />
              </span>
              <span className="text-crm-text-secondary text-xs sm:text-sm leading-relaxed">
                {change.description}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChangelogModal({ isOpen, onClose }: ChangelogModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal: bottom-sheet en móvil, centrado en desktop */}
      <div className="relative w-full sm:max-w-lg bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl animate-in slide-in-from-bottom sm:zoom-in-95 fade-in duration-200 max-h-[90vh] sm:max-h-[85vh] flex flex-col">
        {/* Indicador de drag en móvil */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
        </div>

        {/* Header */}
        <div className="relative overflow-hidden rounded-t-2xl bg-gradient-to-br from-crm-primary to-crm-primary/85 px-5 py-5 sm:px-6 sm:py-7 text-white">
          {/* Círculos decorativos sutiles */}
          <div className="absolute -top-6 -right-6 w-20 h-20 sm:w-28 sm:h-28 bg-white/5 rounded-full" />
          <div className="absolute -bottom-4 -left-4 w-14 h-14 sm:w-20 sm:h-20 bg-white/5 rounded-full" />

          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10 p-2 hover:bg-white/20 rounded-lg transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="relative z-[1] flex items-center gap-3 sm:gap-4">
            <div className="p-2 sm:p-2.5 bg-white/20 rounded-xl flex-shrink-0">
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-2xl font-bold leading-tight">Novedades del CRM</h2>
              <p className="text-white/90 text-sm sm:text-base mt-0.5">
                Versión {CURRENT_VERSION}
              </p>
            </div>
          </div>
        </div>

        {/* Contenido scrolleable */}
        <div className="flex-1 overflow-y-auto px-4 py-4 sm:p-6 space-y-6 sm:space-y-8 overscroll-contain">
          {changelog.map((version, idx) => (
            <VersionCard key={version.version} version={version} isLatest={idx === 0} />
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-crm-border p-3 sm:p-4 bg-crm-card-hover/50 sm:rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 sm:py-3 px-4 bg-crm-primary hover:bg-crm-primary/90 active:scale-[0.98] text-white font-medium rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <span>Entendido</span>
          </button>
          {/* Safe area para dispositivos con notch/home indicator */}
          <div className="h-[env(safe-area-inset-bottom,0px)] sm:hidden" />
        </div>
      </div>
    </div>
  );
}

// Hook para manejar la lógica del changelog
export function useChangelog() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasNewVersion, setHasNewVersion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const seenVersion = localStorage.getItem(CHANGELOG_STORAGE_KEY);

    if (seenVersion !== CURRENT_VERSION) {
      setHasNewVersion(true);
      // Auto-mostrar el modal si hay nueva versión
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1000); // Pequeño delay para mejor UX
      return () => clearTimeout(timer);
    }
  }, []);

  const openChangelog = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeChangelog = useCallback(() => {
    setIsOpen(false);
    setHasNewVersion(false);
    if (typeof window !== "undefined") {
      localStorage.setItem(CHANGELOG_STORAGE_KEY, CURRENT_VERSION);
    }
  }, []);

  return {
    isOpen,
    hasNewVersion,
    openChangelog,
    closeChangelog,
  };
}
