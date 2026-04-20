import Link from "next/link";
import { ClipboardCheck, Check, User, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { getCachedSeguimientosHoy } from "@/lib/cache.server";
import type { SeguimientoHoy } from "@/lib/cache.server";
import { differenceInCalendarDays } from "date-fns";

const estadoLabels: Record<string, string> = {
  por_contactar: "Por contactar",
  contactado: "Contactado",
  intermedio: "En proceso",
  potencial: "Potencial",
};

const estadoColors: Record<string, string> = {
  por_contactar: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  contactado: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  intermedio: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  potencial: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
};

function getUrgencia(cliente: SeguimientoHoy): { label: string; color: string } {
  if (cliente.proxima_accion) {
    const dias = differenceInCalendarDays(new Date(cliente.proxima_accion), new Date());
    if (dias < 0) return { label: `Vencido hace ${Math.abs(dias)}d`, color: "text-crm-danger" };
    if (dias === 0) return { label: "Para hoy", color: "text-crm-warning font-semibold" };
    return { label: `En ${dias}d`, color: "text-crm-text-muted" };
  }
  if (!cliente.ultimo_contacto) {
    return { label: "Sin contacto", color: "text-crm-danger" };
  }
  const dias = differenceInCalendarDays(new Date(), new Date(cliente.ultimo_contacto));
  return { label: `${dias}d sin contacto`, color: dias >= 7 ? "text-crm-danger" : "text-crm-warning" };
}

export async function SeguimientosHoy() {
  const seguimientos = await getCachedSeguimientosHoy();

  if (seguimientos.length === 0) {
    return (
      <Card variant="elevated" className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-crm-text-primary">
            <ClipboardCheck className="w-5 h-5 text-crm-primary" aria-hidden="true" />
            Seguimientos de hoy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="rounded-full bg-crm-success/10 p-3 mb-3">
              <Check className="w-6 h-6 text-crm-success" aria-hidden="true" />
            </div>
            <p className="text-sm font-medium text-crm-text-primary">Todo al día</p>
            <p className="text-xs text-crm-text-muted mt-1">No hay seguimientos pendientes</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="elevated" className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-crm-text-primary">
            <ClipboardCheck className="w-5 h-5 text-crm-primary" aria-hidden="true" />
            Seguimientos de hoy
          </CardTitle>
          <span className="rounded-full bg-crm-danger/10 px-2.5 py-0.5 text-xs font-semibold text-crm-danger">
            {seguimientos.length}
          </span>
        </div>
        <CardDescription className="text-sm">Clientes que necesitan tu atención hoy</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {seguimientos.map((cliente) => {
          const urgencia = getUrgencia(cliente);
          return (
            <Link
              key={cliente.id}
              href={`/dashboard/clientes/${cliente.id}`}
              className="flex items-center gap-3 rounded-xl border border-crm-border/60 bg-crm-card p-3 transition hover:border-crm-primary/40 hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-crm-primary/40"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-crm-primary/10 text-crm-primary">
                <User className="w-4 h-4" aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-crm-text-primary truncate">{cliente.nombre}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${estadoColors[cliente.estado_cliente] ?? "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"}`}>
                    {estadoLabels[cliente.estado_cliente] ?? cliente.estado_cliente}
                  </span>
                  {cliente.telefono && (
                    <span className="text-[11px] text-crm-text-muted truncate">{cliente.telefono}</span>
                  )}
                </div>
              </div>
              <span className={`text-xs whitespace-nowrap ${urgencia.color}`}>
                {urgencia.label}
              </span>
            </Link>
          );
        })}
        <Link
          href="/dashboard/clientes"
          className="flex items-center justify-center gap-1 pt-2 text-xs font-semibold text-crm-primary hover:text-crm-primary/80 transition"
        >
          Ver todos los clientes
          <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
        </Link>
      </CardContent>
    </Card>
  );
}
