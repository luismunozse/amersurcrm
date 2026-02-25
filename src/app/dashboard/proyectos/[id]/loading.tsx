import { PageLoader } from "@/components/ui/PageLoader";

export default function ProyectoDetailLoading() {
  return (
    <div className="flex items-center justify-center min-h-[calc(100dvh-5rem)]">
      <PageLoader size="md" text="Cargando proyecto..." />
    </div>
  );
}
