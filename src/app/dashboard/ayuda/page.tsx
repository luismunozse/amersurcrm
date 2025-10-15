import { Book, FileQuestion, Mail, MessageCircle, Phone, Video, ExternalLink, Search } from "lucide-react";
import Link from "next/link";

export default function AyudaPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-crm-text-primary">Ayuda y Soporte</h1>
          <p className="text-sm text-crm-text-muted mt-1">
            Encuentra respuestas a tus preguntas o contacta con nuestro equipo de soporte
          </p>
        </div>
      </div>

      {/* Búsqueda rápida */}
      <div className="bg-crm-card rounded-xl p-6 border border-crm-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-crm-text-muted" />
          <input
            type="text"
            placeholder="Buscar en la documentación..."
            className="w-full pl-10 pr-4 py-3 bg-crm-bg-primary border border-crm-border rounded-lg focus:outline-none focus:ring-2 focus:ring-crm-primary text-crm-text-primary"
          />
        </div>
      </div>

      {/* Recursos principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Documentación */}
        <Link
          href="#documentacion"
          className="bg-crm-card rounded-xl p-6 border border-crm-border hover:border-crm-primary transition-all group"
        >
          <div className="flex items-start gap-4">
            <div className="p-3 bg-crm-primary/10 rounded-lg group-hover:bg-crm-primary/20 transition-colors">
              <Book className="w-6 h-6 text-crm-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-crm-text-primary group-hover:text-crm-primary transition-colors">
                Documentación
              </h3>
              <p className="text-sm text-crm-text-muted mt-1">
                Guías completas para usar todas las funcionalidades del sistema
              </p>
            </div>
            <ExternalLink className="w-5 h-5 text-crm-text-muted group-hover:text-crm-primary transition-colors" />
          </div>
        </Link>

        {/* Preguntas Frecuentes */}
        <Link
          href="#faq"
          className="bg-crm-card rounded-xl p-6 border border-crm-border hover:border-crm-primary transition-all group"
        >
          <div className="flex items-start gap-4">
            <div className="p-3 bg-crm-secondary/10 rounded-lg group-hover:bg-crm-secondary/20 transition-colors">
              <FileQuestion className="w-6 h-6 text-crm-secondary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-crm-text-primary group-hover:text-crm-primary transition-colors">
                Preguntas Frecuentes
              </h3>
              <p className="text-sm text-crm-text-muted mt-1">
                Respuestas a las preguntas más comunes de nuestros usuarios
              </p>
            </div>
            <ExternalLink className="w-5 h-5 text-crm-text-muted group-hover:text-crm-primary transition-colors" />
          </div>
        </Link>

        {/* Tutoriales en Video */}
        <Link
          href="#videos"
          className="bg-crm-card rounded-xl p-6 border border-crm-border hover:border-crm-primary transition-all group"
        >
          <div className="flex items-start gap-4">
            <div className="p-3 bg-crm-accent/10 rounded-lg group-hover:bg-crm-accent/20 transition-colors">
              <Video className="w-6 h-6 text-crm-accent" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-crm-text-primary group-hover:text-crm-primary transition-colors">
                Tutoriales en Video
              </h3>
              <p className="text-sm text-crm-text-muted mt-1">
                Aprende visualmente con nuestros video tutoriales paso a paso
              </p>
            </div>
            <ExternalLink className="w-5 h-5 text-crm-text-muted group-hover:text-crm-primary transition-colors" />
          </div>
        </Link>
      </div>

      {/* Contacto con Soporte */}
      <div className="bg-crm-card rounded-xl border border-crm-border overflow-hidden">
        <div className="bg-gradient-to-r from-crm-primary to-crm-accent p-6">
          <h2 className="text-xl font-bold text-white">¿Necesitas ayuda personalizada?</h2>
          <p className="text-white/90 text-sm mt-1">
            Nuestro equipo de soporte está disponible para ayudarte
          </p>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Chat en vivo */}
          <div className="flex items-start gap-4">
            <div className="p-3 bg-crm-info/10 rounded-lg">
              <MessageCircle className="w-6 h-6 text-crm-info" />
            </div>
            <div>
              <h3 className="font-semibold text-crm-text-primary">Chat en vivo</h3>
              <p className="text-sm text-crm-text-muted mt-1">Lun-Vie: 9am - 6pm</p>
              <button className="text-sm text-crm-primary hover:underline mt-2">
                Iniciar chat →
              </button>
            </div>
          </div>

          {/* Email */}
          <div className="flex items-start gap-4">
            <div className="p-3 bg-crm-secondary/10 rounded-lg">
              <Mail className="w-6 h-6 text-crm-secondary" />
            </div>
            <div>
              <h3 className="font-semibold text-crm-text-primary">Email</h3>
              <p className="text-sm text-crm-text-muted mt-1">Respuesta en 24h</p>
              <a
                href="mailto:soporte@amersur.com"
                className="text-sm text-crm-primary hover:underline mt-2 block"
              >
                soporte@amersur.com
              </a>
            </div>
          </div>

          {/* Teléfono */}
          <div className="flex items-start gap-4">
            <div className="p-3 bg-crm-success/10 rounded-lg">
              <Phone className="w-6 h-6 text-crm-success" />
            </div>
            <div>
              <h3 className="font-semibold text-crm-text-primary">Teléfono</h3>
              <p className="text-sm text-crm-text-muted mt-1">Lun-Vie: 9am - 6pm</p>
              <a
                href="tel:+51987654321"
                className="text-sm text-crm-primary hover:underline mt-2 block"
              >
                +51 987 654 321
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Preguntas Frecuentes */}
      <div id="faq" className="bg-crm-card rounded-xl p-6 border border-crm-border">
        <h2 className="text-xl font-bold text-crm-text-primary mb-4">Preguntas Frecuentes</h2>

        <div className="space-y-4">
          <details className="group">
            <summary className="flex items-center justify-between cursor-pointer p-4 bg-crm-bg-primary rounded-lg hover:bg-crm-card-hover transition-colors">
              <span className="font-medium text-crm-text-primary">¿Cómo puedo cambiar mi contraseña?</span>
              <span className="text-crm-text-muted group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div className="p-4 text-sm text-crm-text-muted">
              Puedes cambiar tu contraseña desde el menú de usuario (esquina superior derecha) → "Cambiar Contraseña".
              También puedes hacerlo desde tu perfil.
            </div>
          </details>

          <details className="group">
            <summary className="flex items-center justify-between cursor-pointer p-4 bg-crm-bg-primary rounded-lg hover:bg-crm-card-hover transition-colors">
              <span className="font-medium text-crm-text-primary">¿Cómo agrego un nuevo cliente?</span>
              <span className="text-crm-text-muted group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div className="p-4 text-sm text-crm-text-muted">
              Ve a la sección "Clientes" en el menú lateral y haz clic en el botón "Nuevo Cliente" (+).
              Completa el formulario con la información requerida y guarda.
            </div>
          </details>

          <details className="group">
            <summary className="flex items-center justify-between cursor-pointer p-4 bg-crm-bg-primary rounded-lg hover:bg-crm-card-hover transition-colors">
              <span className="font-medium text-crm-text-primary">¿Puedo exportar mis datos?</span>
              <span className="text-crm-text-muted group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div className="p-4 text-sm text-crm-text-muted">
              Sí, la mayoría de las tablas tienen un botón de exportación en la esquina superior derecha.
              Puedes exportar a Excel (XLSX) o CSV.
            </div>
          </details>

          <details className="group">
            <summary className="flex items-center justify-between cursor-pointer p-4 bg-crm-bg-primary rounded-lg hover:bg-crm-card-hover transition-colors">
              <span className="font-medium text-crm-text-primary">¿Cómo cambio mi foto de perfil?</span>
              <span className="text-crm-text-muted group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div className="p-4 text-sm text-crm-text-muted">
              Ve a tu perfil desde el menú de usuario → "Mi Perfil". Ahí encontrarás un botón para cambiar tu foto de perfil.
              Las imágenes deben ser JPG, PNG o WebP y no superar los 2MB.
            </div>
          </details>

          <details className="group">
            <summary className="flex items-center justify-between cursor-pointer p-4 bg-crm-bg-primary rounded-lg hover:bg-crm-card-hover transition-colors">
              <span className="font-medium text-crm-text-primary">¿Qué hago si encuentro un error?</span>
              <span className="text-crm-text-muted group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div className="p-4 text-sm text-crm-text-muted">
              Si encuentras un error o bug, por favor repórtalo usando la opción "Reportar Problema" en el menú de usuario.
              Nuestro equipo técnico lo revisará lo antes posible.
            </div>
          </details>
        </div>
      </div>

      {/* Reportar problema */}
      <div className="bg-crm-card rounded-xl p-6 border border-crm-border text-center">
        <h3 className="font-semibold text-crm-text-primary mb-2">¿No encontraste lo que buscabas?</h3>
        <p className="text-sm text-crm-text-muted mb-4">
          Reporta un problema o solicita una nueva funcionalidad
        </p>
        <Link
          href="/dashboard/reportar-problema"
          className="inline-flex items-center gap-2 px-6 py-3 bg-crm-primary text-white rounded-lg hover:bg-crm-primary-hover transition-colors"
        >
          <MessageCircle className="w-5 h-5" />
          Reportar Problema
        </Link>
      </div>
    </div>
  );
}
