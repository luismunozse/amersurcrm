import "./globals.css";
import type { Metadata } from "next";
import localFont from "next/font/local";
import { ThemeProvider } from "@/components/ThemeProvider";
import AppToaster from "@/components/Toaster";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SpeedInsights } from "@vercel/speed-insights/next";
import DevErrorFilter from "@/components/DevErrorFilter";

const inter = localFont({
  src: [
    {
      path: "../fonts/inter/Inter-400.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../fonts/inter/Inter-500.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../fonts/inter/Inter-600.ttf",
      weight: "600",
      style: "normal",
    },
    {
      path: "../fonts/inter/Inter-700.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-inter",
  display: "swap",
  fallback: ["system-ui", "Segoe UI", "sans-serif"],
});

const mont = localFont({
  src: [
    {
      path: "../fonts/montserrat/Montserrat-400.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../fonts/montserrat/Montserrat-500.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../fonts/montserrat/Montserrat-600.ttf",
      weight: "600",
      style: "normal",
    },
    {
      path: "../fonts/montserrat/Montserrat-700.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-mont",
  display: "swap",
  fallback: ["Inter", "system-ui", "sans-serif"],
});

export const metadata: Metadata = {
  title: {
    default: "AMERSUR CRM",
    template: "%s | AMERSUR CRM",
  },
  description: "Tu Propiedad, sin fronteras - Sistema de gestión inmobiliaria",
  keywords: ["CRM", "Inmobiliaria", "AMERSUR", "Propiedades", "Gestión"],
  authors: [{ name: "AMERSUR" }],
  creator: "AMERSUR",
  publisher: "AMERSUR",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${mont.variable} font-sans bg-bg text-text`}>
        <ThemeProvider>
          <DevErrorFilter />
          <ErrorBoundary>
            {children}
            <AppToaster />
            <SpeedInsights />
          </ErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  );
}
