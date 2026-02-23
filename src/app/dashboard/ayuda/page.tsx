import { Metadata } from "next";
import { readFileSync } from "fs";
import { join } from "path";
import HelpCenter from "./HelpCenter";

export const metadata: Metadata = {
  title: "Centro de Ayuda | AMERSUR CRM",
  description: "Documentación y guías para usar el sistema",
};

type TabType = "guia" | "manual" | "faq";
const VALID_TABS: TabType[] = ["guia", "manual", "faq"];

export default async function AyudaPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const docsPath = join(process.cwd(), "docs");

  let guiaRapida = "";
  let manualVendedor = "";
  let faqVendedores = "";

  try {
    guiaRapida = readFileSync(join(docsPath, "GUIA_INICIO_RAPIDO.md"), "utf-8");
  } catch {
    guiaRapida = "# Guía Rápida\n\nDocumento no encontrado. Contacta a soporte técnico.";
  }

  try {
    manualVendedor = readFileSync(join(docsPath, "MANUAL_VENDEDOR.md"), "utf-8");
  } catch {
    manualVendedor = "# Manual Completo\n\nDocumento no encontrado. Contacta a soporte técnico.";
  }

  try {
    faqVendedores = readFileSync(join(docsPath, "FAQ_VENDEDORES.md"), "utf-8");
  } catch {
    faqVendedores = "# Preguntas Frecuentes\n\nDocumento no encontrado. Contacta a soporte técnico.";
  }

  const rawTab = params?.tab ?? "guia";
  const initialTab: TabType = VALID_TABS.includes(rawTab as TabType)
    ? (rawTab as TabType)
    : "guia";

  return (
    <HelpCenter
      guiaRapida={guiaRapida}
      manualVendedor={manualVendedor}
      faqVendedores={faqVendedores}
      initialTab={initialTab}
    />
  );
}
