"use client";
import { useEffect, useState } from "react";
import { Toaster } from "react-hot-toast";

export default function AppToaster() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Evitar hidratación mismatch - Toaster solo se renderiza en cliente
  if (!mounted) return null;

  return (
    <Toaster
      position="bottom-right"
      toastOptions={{
        style: { borderRadius: "12px", padding: "10px 12px" },
        success: { iconTheme: { primary: "var(--brand-500)", secondary: "white" } },
        error:   { iconTheme: { primary: "#DC2626",         secondary: "white" } },
      }}
    />
  );
}
