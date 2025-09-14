"use client";
import { Toaster } from "react-hot-toast";

export default function AppToaster() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        style: { borderRadius: "12px", padding: "10px 12px" },
        success: { iconTheme: { primary: "var(--brand-500)", secondary: "white" } },
        error:   { iconTheme: { primary: "#DC2626",         secondary: "white" } },
      }}
    />
  );
}
