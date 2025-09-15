"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-crm-primary mx-auto mb-4"></div>
        <p className="text-crm-text-muted">Redirigiendo al dashboard...</p>
      </div>
    </main>
  );
}
