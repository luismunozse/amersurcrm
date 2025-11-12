import { Metadata } from "next";
import { readFileSync } from "fs";
import { join } from "path";
import HelpCenter from "./HelpCenter";

export const metadata: Metadata = {
  title: "Centro de Ayuda | AMERSUR CRM",
  description: "Documentación y guías para usar el sistema",
};

export default function AyudaPage() {
  // Leer los archivos markdown en el servidor
  const docsPath = join(process.cwd(), "docs");

  const guiaRapida = readFileSync(join(docsPath, "GUIA_INICIO_RAPIDO.md"), "utf-8");
  const manualVendedor = readFileSync(join(docsPath, "MANUAL_VENDEDOR.md"), "utf-8");
  const faqVendedores = readFileSync(join(docsPath, "FAQ_VENDEDORES.md"), "utf-8");

  return (
    <HelpCenter
      guiaRapida={guiaRapida}
      manualVendedor={manualVendedor}
      faqVendedores={faqVendedores}
    />
  );
}
