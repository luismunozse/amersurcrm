"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

/**
 * Route-level error boundary for `/dashboard` (Next.js App Router
 * convention: client component receiving `{ error, reset }`). Catches any
 * uncaught throw from the page or its server components (e.g.
 * `getCachedSeguimientosHoy`/`getCachedClientes`) so a single failure never
 * takes down the whole streamed dashboard shell. Per-block try/catch inside
 * the cockpit blocks is the first line of defense; this is the backstop.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Error en el panel del dashboard:", error);
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center px-4 py-16 text-center">
      <Card variant="elevated" className="w-full">
        <CardContent className="flex flex-col items-center gap-4 p-8">
          <div className="rounded-full bg-crm-danger/10 p-3">
            <AlertTriangle className="h-6 w-6 text-crm-danger" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <p className="text-base font-semibold text-crm-text-primary">No se pudo cargar el panel</p>
            <p className="text-sm text-crm-text-muted">
              Ocurrió un problema al cargar esta sección. Intente nuevamente.
            </p>
          </div>
          <Button onClick={() => reset()} variant="primary" size="md">
            Reintentar
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
