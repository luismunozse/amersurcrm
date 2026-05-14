"use client";

import * as React from "react";
import Link from "next/link";
import {
  Phone,
  Mail,
  ExternalLink,
} from "lucide-react";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  obtenerClienteParaQuickView,
  type ClienteQuickView,
} from "@/app/dashboard/clientes/_actions";

type QuickViewContextValue = {
  open: (clienteId: string) => void;
  close: () => void;
};

const QuickViewContext = React.createContext<QuickViewContextValue | null>(null);

export function useClienteQuickView() {
  const ctx = React.useContext(QuickViewContext);
  if (!ctx) {
    throw new Error(
      "useClienteQuickView debe usarse dentro de <ClienteQuickViewProvider>"
    );
  }
  return ctx;
}

export function ClienteQuickViewProvider({ children }: { children: React.ReactNode }) {
  const [clienteId, setClienteId] = React.useState<string | null>(null);
  const [data, setData] = React.useState<ClienteQuickView | null>(null);
  const [loading, setLoading] = React.useState(false);

  const open = React.useCallback((id: string) => {
    setClienteId(id);
  }, []);

  const close = React.useCallback(() => {
    setClienteId(null);
  }, []);

  // Fetch al abrir
  React.useEffect(() => {
    if (!clienteId) {
      setData(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    obtenerClienteParaQuickView(clienteId)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [clienteId]);

  const contextValue = React.useMemo(() => ({ open, close }), [open, close]);

  return (
    <QuickViewContext.Provider value={contextValue}>
      {children}
      <Sheet open={!!clienteId} onOpenChange={(o) => !o && close()}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-sm overflow-y-auto bg-crm-card p-0"
        >
          <QuickViewBody data={data} loading={loading} />
        </SheetContent>
      </Sheet>
    </QuickViewContext.Provider>
  );
}

function QuickViewBody({
  data,
  loading,
}: {
  data: ClienteQuickView | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <>
        <SheetTitle className="sr-only">Cargando cliente</SheetTitle>
        <QuickViewSkeleton />
      </>
    );
  }
  if (!data) {
    return (
      <>
        <SheetTitle className="sr-only">Cliente no disponible</SheetTitle>
        <div className="py-10 text-center text-sm text-crm-text-muted">
          No se pudo cargar el cliente.
        </div>
      </>
    );
  }

  const initials = getInitials(data.nombre);
  const direccionStr = formatDireccion(data.direccion);
  const waDigits = data.telefono_whatsapp?.replace(/\D/g, "");

  return (
    <div className="flex h-full flex-col">
      {/* Header compacto */}
      <SheetHeader className="space-y-0 border-b border-crm-border bg-crm-card px-5 py-4 text-left">
        <div className="flex items-center gap-3 pr-6">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-crm-primary text-white text-sm font-semibold">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <SheetTitle className="truncate text-sm font-semibold text-crm-text-primary leading-tight">
              {data.nombre}
            </SheetTitle>
            <SheetDescription className="mt-0.5 flex items-center gap-2 text-xs">
              {data.codigo_cliente && (
                <span className="font-mono text-crm-text-muted">
                  {data.codigo_cliente}
                </span>
              )}
              {data.tipo_cliente && (
                <span className="text-crm-text-muted">·</span>
              )}
              {data.tipo_cliente && (
                <span className="text-crm-text-secondary capitalize">
                  {data.tipo_cliente}
                </span>
              )}
            </SheetDescription>
          </div>
        </div>
        {data.estado_cliente && (
          <div className="pt-2">
            <EstadoBadge estado={data.estado_cliente} />
          </div>
        )}
      </SheetHeader>

      {/* Quick actions — toolbar compacto */}
      {(data.telefono || waDigits || data.email) && (
        <div className="flex items-stretch border-b border-crm-border bg-crm-card-hover/30">
          <QuickAction
            icon={<Phone className="h-4 w-4" />}
            label="Llamar"
            href={data.telefono ? `tel:${data.telefono}` : undefined}
          />
          <QuickAction
            icon={<WhatsAppIcon className="h-4 w-4" />}
            label="WhatsApp"
            href={waDigits ? `https://wa.me/${waDigits}` : undefined}
            external
          />
          <QuickAction
            icon={<Mail className="h-4 w-4" />}
            label="Email"
            href={data.email ? `mailto:${data.email}` : undefined}
          />
        </div>
      )}

      {/* Body denso */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <div className="divide-y divide-crm-border">
          <Section title="Contacto">
            {data.telefono && <InfoRow label="Teléfono" value={data.telefono} mono />}
            {data.telefono_whatsapp && (
              <InfoRow label="WhatsApp" value={data.telefono_whatsapp} mono />
            )}
            {data.email && (
              <InfoRow
                label="Email"
                value={<span className="break-all">{data.email}</span>}
              />
            )}
            {direccionStr && <InfoRow label="Dirección" value={direccionStr} />}
          </Section>

          {(data.vendedor_nombre ||
            data.origen_lead ||
            data.interes_principal ||
            data.capacidad_compra_estimada != null) && (
            <Section title="Comercial">
              {data.vendedor_nombre && (
                <InfoRow label="Vendedor" value={data.vendedor_nombre} />
              )}
              {data.origen_lead && (
                <InfoRow label="Origen" value={data.origen_lead} />
              )}
              {data.interes_principal && (
                <InfoRow label="Interés" value={data.interes_principal} />
              )}
              {data.capacidad_compra_estimada != null && (
                <InfoRow
                  label="Capacidad"
                  value={
                    <span className="font-semibold text-crm-primary">
                      {new Intl.NumberFormat("es-PE", {
                        style: "currency",
                        currency: "PEN",
                        maximumFractionDigits: 0,
                      }).format(data.capacidad_compra_estimada)}
                    </span>
                  }
                />
              )}
            </Section>
          )}

          {(data.proxima_accion || data.fecha_proxima_accion) && (
            <Section title="Próxima acción">
              <InfoRow
                label={data.proxima_accion ?? "Pendiente"}
                value={
                  data.fecha_proxima_accion
                    ? formatFecha(data.fecha_proxima_accion)
                    : "—"
                }
              />
            </Section>
          )}

          {data.notas && (
            <Section title="Notas">
              <p className="text-sm text-crm-text-secondary whitespace-pre-wrap leading-snug">
                {data.notas}
              </p>
            </Section>
          )}
        </div>
      </div>

      {/* Footer CTA */}
      <div className="border-t border-crm-border bg-crm-card px-5 py-3">
        <Link
          href={`/dashboard/clientes/${data.id}`}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-crm-primary px-4 py-2 text-sm font-medium text-white hover:bg-crm-primary-hover transition-colors"
        >
          Ver ficha completa
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}

function QuickAction({
  icon,
  label,
  href,
  external,
}: {
  icon: React.ReactNode;
  label: string;
  href?: string;
  external?: boolean;
}) {
  const disabled = !href;
  const classes =
    "group flex flex-1 items-center justify-center gap-2 border-r border-crm-border last:border-r-0 px-3 py-3 text-xs font-medium text-crm-text-secondary hover:bg-crm-card hover:text-crm-primary transition-colors";
  const content = (
    <>
      <span className="text-crm-text-muted group-hover:text-crm-primary transition-colors">
        {icon}
      </span>
      <span>{label}</span>
    </>
  );

  if (disabled) {
    return (
      <div className={`${classes} opacity-40 pointer-events-none`}>{content}</div>
    );
  }

  return external ? (
    <a href={href} target="_blank" rel="noreferrer" className={classes}>
      {content}
    </a>
  ) : (
    <a href={href} className={classes}>
      {content}
    </a>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="py-3 first:pt-0 last:pb-0">
      <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-crm-text-muted">
        {title}
      </h3>
      <div className="space-y-1">{children}</div>
    </section>
  );
}

function InfoRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="grid grid-cols-[88px_1fr] gap-3 py-1 text-sm">
      <span className="text-crm-text-muted text-xs pt-0.5">{label}</span>
      <span
        className={`text-crm-text-primary ${mono ? "font-mono text-xs" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}

function EstadoBadge({ estado }: { estado: string }) {
  const label = estado.replace(/_/g, " ");
  const styles = ESTADO_STYLES[estado] ?? ESTADO_STYLES.default;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${styles}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

const ESTADO_STYLES: Record<string, string> = {
  por_contactar:
    "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30",
  contactado:
    "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/30",
  intermedio:
    "bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/30",
  potencial:
    "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30",
  desestimado:
    "bg-gray-100 text-gray-700 border border-gray-200 dark:bg-gray-500/10 dark:text-gray-400 dark:border-gray-500/30",
  transferido:
    "bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/30",
  default:
    "bg-crm-primary/10 text-crm-primary border border-crm-primary/30",
};

function QuickViewSkeleton() {
  return (
    <div className="flex flex-col animate-pulse">
      <div className="border-b border-crm-border px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-crm-card-hover" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-3/4 rounded bg-crm-card-hover" />
            <div className="h-2.5 w-1/2 rounded bg-crm-card-hover" />
          </div>
        </div>
      </div>
      <div className="h-12 border-b border-crm-border bg-crm-card-hover/30" />
      <div className="px-5 py-4 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <div className="h-2.5 w-20 rounded bg-crm-card-hover" />
            <div className="h-16 rounded bg-crm-card-hover/60" />
          </div>
        ))}
      </div>
    </div>
  );
}

function getInitials(nombre: string): string {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "?";
}

function formatDireccion(dir: Record<string, unknown> | null): string | null {
  if (!dir) return null;
  const parts = [dir.calle, dir.numero, dir.distrito, dir.ciudad, dir.departamento]
    .filter((p) => typeof p === "string" && (p as string).trim().length > 0);
  return parts.length > 0 ? parts.join(", ") : null;
}

function formatFecha(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
