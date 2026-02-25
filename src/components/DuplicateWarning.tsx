"use client";

import { AlertTriangle, Phone, Mail, User, ExternalLink } from "lucide-react";
import Link from "next/link";
import type { DuplicadoEncontrado } from "@/app/dashboard/clientes/_actions-helpers";

interface Props {
  duplicados: DuplicadoEncontrado[];
  checking?: boolean;
}

const MATCH_LABELS: Record<string, { label: string; icon: typeof Phone }> = {
  telefono: { label: "Telefono", icon: Phone },
  email: { label: "Email", icon: Mail },
  nombre: { label: "Nombre", icon: User },
};

export default function DuplicateWarning({ duplicados, checking = false }: Props) {
  if (checking) {
    return (
      <div className="p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg">
        <p className="text-xs text-crm-text-muted animate-pulse">Verificando duplicados...</p>
      </div>
    );
  }

  if (duplicados.length === 0) return null;

  return (
    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
        <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-200">
          {duplicados.length === 1
            ? "Posible duplicado encontrado"
            : `${duplicados.length} posibles duplicados encontrados`}
        </h4>
      </div>
      <p className="text-xs text-amber-700 dark:text-amber-300 mb-3">
        Verifica que no estes creando un cliente que ya existe. Puedes continuar guardando si no es un duplicado.
      </p>
      <div className="space-y-2">
        {duplicados.map((dup) => {
          const match = MATCH_LABELS[dup.matchType] || MATCH_LABELS.nombre;
          const MatchIcon = match.icon;

          return (
            <div
              key={dup.id}
              className="flex items-center justify-between gap-3 p-2.5 bg-white dark:bg-gray-800 rounded-md border border-amber-100 dark:border-amber-800/50"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/40 rounded text-xs font-medium text-amber-700 dark:text-amber-300 flex-shrink-0">
                  <MatchIcon className="h-3 w-3" />
                  {match.label}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-crm-text truncate">{dup.nombre}</p>
                  <p className="text-xs text-crm-text-muted truncate">
                    {dup.codigo_cliente}
                    {dup.telefono ? ` · ${dup.telefono}` : ""}
                    {dup.email ? ` · ${dup.email}` : ""}
                  </p>
                </div>
              </div>
              <Link
                href={`/dashboard/clientes/${dup.id}`}
                target="_blank"
                className="flex items-center gap-1 text-xs text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 flex-shrink-0 transition-colors"
              >
                Ver
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
