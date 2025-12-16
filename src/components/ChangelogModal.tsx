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
        <div className="absolute -left-3 top-0 bottom-0 w-1 bg-gradient-to-b from-crm-primary to-crm-primary/50 rounded-full" />
      )}
      <div className="flex items-center gap-3 mb-3">
        <span
          className={`px-3 py-1 rounded-full text-sm font-semibold ${
            isLatest
              ? "bg-crm-primary text-white"
              : "bg-crm-border text-crm-text-secondary"
          }`}
        >
          v{version.version}
        </span>
        <span className="text-sm text-crm-text-muted">{version.date}</span>
        {isLatest && (
          <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-medium rounded-full flex items-center gap-1">
            <Gift className="w-3 h-3" />
            Nuevo
          </span>
        )}
      </div>
      <h3 className="text-lg font-semibold text-crm-text-primary mb-3">{version.title}</h3>
      <ul className="space-y-2">
        {version.changes.map((change, idx) => {
          const config = changeTypeConfig[change.type];
          const Icon = config.icon;
          return (
            <li key={idx} className="flex items-start gap-3">
              <span className={`p-1.5 rounded-lg ${config.bgColor} flex-shrink-0`}>
                <Icon className={`w-4 h-4 ${config.color}`} />
              </span>
              <span className="text-crm-text-secondary text-sm leading-relaxed">
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl animate-in zoom-in-95 fade-in duration-200 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="relative overflow-hidden rounded-t-2xl bg-crm-primary p-6 text-white">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />

          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 hover:bg-white/20 rounded-lg transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="relative">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-white/20 rounded-xl">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Novedades del CRM</h2>
                <p className="text-white/80 text-sm">Versión {CURRENT_VERSION}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Contenido scrolleable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {changelog.map((version, idx) => (
            <VersionCard key={version.version} version={version} isLatest={idx === 0} />
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-crm-border p-4 bg-crm-card-hover/50 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 px-4 bg-crm-primary hover:bg-crm-primary/90 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <span>Entendido</span>
          </button>
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
