import { PageLoader } from "@/components/ui/PageLoader";

export default function ConfigAdminLoading() {
  return (
    <div className="flex items-center justify-center min-h-[calc(100dvh-5rem)]">
      <PageLoader size="md" text="Cargando configuraci\u00f3n..." />
    </div>
  );
}
