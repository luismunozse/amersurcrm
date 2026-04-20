import Link from "next/link";
import { WifiOff } from "lucide-react";

export const metadata = {
  title: "Sin conexión · AMERSUR CRM",
  description: "No hay conexión a internet.",
};

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-crm-bg-primary px-6">
      <div className="max-w-md w-full text-center">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-crm-primary/10 flex items-center justify-center mb-5">
          <WifiOff className="w-8 h-8 text-crm-primary" aria-hidden />
        </div>
        <h1 className="text-xl font-semibold text-crm-text-primary mb-2">
          Sin conexión
        </h1>
        <p className="text-sm text-crm-text-muted mb-6">
          Parece que perdiste conexión a internet. Cuando vuelva la señal, el
          sistema retomará automáticamente donde quedaste.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center h-11 px-5 rounded-lg bg-crm-primary text-white text-sm font-medium hover:bg-crm-primary-hover transition-colors"
        >
          Reintentar
        </Link>
      </div>
    </div>
  );
}
