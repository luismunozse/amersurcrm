"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";

/**
 * Alias (username) de WhatsApp del contacto, capturado por la extensión.
 *
 * Se guarda sin "@" y en minúsculas (`crm.cliente.whatsapp_username`) y se
 * muestra siempre con "@". No existe deep link oficial por username: para un
 * chat iniciado por alias WhatsApp NO expone el teléfono real, así que lo
 * único accionable es leerlo o copiarlo para ubicar el chat en WhatsApp Web.
 */
export default function WhatsappAliasBadge({
  alias,
  className = "",
}: {
  alias: string;
  className?: string;
}) {
  const [copiado, setCopiado] = useState(false);
  const limpio = alias.replace(/^@/, "");

  const copiar = async (e: React.MouseEvent) => {
    // Las tarjetas/filas que contienen el badge abren un detalle al hacer
    // click: copiar no debe disparar esa navegación.
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(limpio);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      setCopiado(false);
    }
  };

  return (
    <span
      className={`inline-flex max-w-full items-center gap-1 rounded-full border border-crm-border bg-crm-card-hover px-2 py-0.5 text-[11px] text-crm-text-secondary ${className}`}
      title={`Alias de WhatsApp: @${limpio}`}
    >
      <WhatsAppIcon className="h-3 w-3 shrink-0 text-green-600" />
      <span className="truncate font-mono">@{limpio}</span>
      <button
        type="button"
        onClick={copiar}
        aria-label={copiado ? "Alias copiado" : "Copiar alias de WhatsApp"}
        className="shrink-0 rounded p-0.5 text-crm-text-muted transition-colors hover:bg-crm-border hover:text-crm-text-primary"
      >
        {copiado ? (
          <Check className="h-3 w-3 text-green-600" />
        ) : (
          <Copy className="h-3 w-3" />
        )}
      </button>
    </span>
  );
}
