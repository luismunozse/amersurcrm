import { PERMISOS } from "@/lib/permissions";
import { protegerRuta } from "@/lib/permissions/middleware";
import WhatsAppBotConfig from "./_WhatsAppBotConfig";

export const metadata = {
  title: "Configuración WhatsApp Bot | AMERSUR CRM",
  description: "Administrar bot de WhatsApp para captura automática de leads",
};

export default async function WhatsAppBotConfigPage() {
  await protegerRuta({ permiso: PERMISOS.CONFIGURACION.SISTEMA });

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Configuración WhatsApp Bot</h1>
        <p className="text-gray-600 mt-2">
          Administra el bot de WhatsApp que captura automáticamente leads desde publicidades de Facebook/Instagram
        </p>
      </div>

      <WhatsAppBotConfig />
    </div>
  );
}
