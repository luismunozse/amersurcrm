import "./globals.css";
import type { Metadata } from "next";
import { Inter, Montserrat } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import AppToaster from "@/components/Toaster";

export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const mont = Montserrat({
  subsets: ["latin"],
  variable: "--font-mont",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AMERSUR CRM",
  description: "",
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
          {children}
          <AppToaster />
          </ThemeProvider>
      </body>
    </html>
  );
}
