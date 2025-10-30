"use client";

import { useMemo, useState, FormEvent } from "react";
import Link from "next/link";
import {
  Book,
  FileQuestion,
  Mail,
  MessageCircle,
  Phone,
  Video,
  ExternalLink,
  Search
} from "lucide-react";

type ResourceCard = {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  external?: boolean;
};

type FaqItem = {
  question: string;
  answer: string;
};

const documentationLinks: ResourceCard[] = [
  {
    id: "doc-drive",
    title: "Sincronización con Google Drive",
    description: "Configura la conexión y gestiona documentos directamente desde el CRM.",
    href: "/dashboard/documentos",
    icon: Book
  },
  {
    id: "doc-config",
    title: "Panel de Configuración",
    description: "Actualiza datos de la empresa, credenciales y parámetros clave.",
    href: "/dashboard/configuracion",
    icon: Book
  },
  {
    id: "doc-proyectos",
    title: "Proyectos y Lotes",
    description: "Aprende a crear proyectos, editar lotes y trabajar con mapas.",
    href: "/dashboard/proyectos",
    icon: Book
  }
];

const videoResources: ResourceCard[] = [
  {
    id: "video-overview",
    title: "Recorrido general del CRM",
    description: "Video introductorio con las funciones más usadas para nuevos usuarios.",
    href: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    icon: Video,
    external: true
  },
  {
    id: "video-documentos",
    title: "Documentos y Google Drive",
    description: "Tutorial para navegar carpetas, sincronizar y descargar archivos.",
    href: "https://www.youtube.com/watch?v=EE-xtCF3T94",
    icon: Video,
    external: true
  },
  {
    id: "video-lotes",
    title: "Mapeo de Lotes",
    description: "Guía visual para trazar polígonos, guardar coordenadas y duplicar lotes.",
    href: "https://www.youtube.com/watch?v=oHg5SJYRHA0",
    icon: Video,
    external: true
  }
];

const faqItems: FaqItem[] = [
  {
    question: "¿Cómo puedo cambiar mi contraseña?",
    answer:
      "Abre el menú de usuario (esquina superior derecha) y selecciona “Cambiar contraseña”. También puedes hacerlo desde /dashboard/perfil."
  },
  {
    question: "¿Cómo agrego un nuevo cliente?",
    answer:
      "En la sección Clientes presiona el botón “Nuevo Cliente” (+), completa el formulario obligatorio y guarda los cambios."
  },
  {
    question: "¿Puedo exportar mis datos?",
    answer:
      "Sí. Las tablas principales (Clientes, Proyectos, Documentos) incluyen un botón de exportación con formato XLSX o CSV."
  },
  {
    question: "¿Qué hago si encuentro un error?",
    answer:
      "Utiliza la opción “Reportar problema” o visita /dashboard/reportar-problema. Describe el incidente y adjunta capturas si es posible."
  },
  {
    question: "¿Cómo asigno coordenadas a un lote?",
    answer:
      "Ingresa al proyecto, abre el mapa de lotes y usa la herramienta de dibujo para marcar el polígono. Luego guarda los cambios."
  }
];

const supportChannels = [
  {
    title: "Chat en vivo",
    description: "Atención vía WhatsApp • Lun-Vie 9:00 - 18:00",
    href: "https://wa.me/51987654321?text=Hola%2C+necesito+ayuda+con+el+CRM",
    icon: MessageCircle,
    cta: "Abrir chat ↗",
    external: true
  },
  {
    title: "Email",
    description: "Responderemos en menos de 24 horas.",
    href: "mailto:soporte@amersur.com",
    icon: Mail,
    cta: "Escribir correo ↗",
    external: true
  },
  {
    title: "Teléfono",
    description: "Comunícate con soporte técnico.",
    href: "tel:+51987654321",
    icon: Phone,
    cta: "+51 987 654 321",
    external: false
  }
];

export default function AyudaPage() {
  const [query, setQuery] = useState("");

  const normalizedQuery = query.trim().toLowerCase();
  const hasQuery = normalizedQuery.length > 0;

  const filteredDocumentation = useMemo(() => {
    if (!hasQuery) return documentationLinks;
    return documentationLinks.filter((item) =>
      [item.title, item.description].some((field) =>
        field.toLowerCase().includes(normalizedQuery)
      )
    );
  }, [hasQuery, normalizedQuery]);

  const filteredVideos = useMemo(() => {
    if (!hasQuery) return videoResources;
    return videoResources.filter((item) =>
      [item.title, item.description].some((field) =>
        field.toLowerCase().includes(normalizedQuery)
      )
    );
  }, [hasQuery, normalizedQuery]);

  const filteredFaqs = useMemo(() => {
    if (!hasQuery) return faqItems;
    return faqItems.filter((item) =>
      [item.question, item.answer].some((field) =>
        field.toLowerCase().includes(normalizedQuery)
      )
    );
  }, [hasQuery, normalizedQuery]);

  const filteredSupport = useMemo(() => {
    if (!hasQuery) return supportChannels;
    return supportChannels.filter((item) =>
      [item.title, item.description, item.cta].some((field) =>
        field.toLowerCase().includes(normalizedQuery)
      )
    );
  }, [hasQuery, normalizedQuery]);

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const targetId = filteredDocumentation[0]?.id || filteredVideos[0]?.id || "faq";
    if (targetId) {
      const element = document.getElementById(targetId);
      element?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const noResults =
    hasQuery &&
    filteredDocumentation.length === 0 &&
    filteredVideos.length === 0 &&
    filteredFaqs.length === 0 &&
    filteredSupport.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-crm-text-primary">Ayuda y Soporte</h1>
          <p className="text-sm text-crm-text-muted mt-1">
            Encuentra respuestas, guías y canales de contacto oficiales.
          </p>
        </div>
      </div>

      <div className="bg-crm-card rounded-xl p-6 border border-crm-border">
        <form className="relative" onSubmit={handleSearchSubmit}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-crm-text-muted" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Busca términos como “drive”, “clientes”, “exportar”..."
            className="w-full pl-10 pr-4 py-3 bg-crm-bg-primary border border-crm-border rounded-lg focus:outline-none focus:ring-2 focus:ring-crm-primary text-crm-text-primary"
            aria-label="Buscar en la sección de ayuda"
          />
        </form>
        {hasQuery && (
          <p className="text-xs text-crm-text-muted mt-2">
            {noResults ? "No encontramos resultados. Intenta con otra palabra clave." : "Filtrando resultados según tu búsqueda."}
          </p>
        )}
      </div>

      <section id="documentacion" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-crm-text-primary">Documentación destacada</h2>
          <Link href="/docs" className="text-sm text-crm-primary hover:underline">
            Ver toda la documentación
          </Link>
        </div>

        {filteredDocumentation.length === 0 ? (
          <p className="text-sm text-crm-text-muted">No hay guías que coincidan con tu búsqueda.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDocumentation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.id}
                  id={item.id}
                  href={item.href}
                  className="bg-crm-card rounded-xl p-6 border border-crm-border hover:border-crm-primary transition-all group"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-crm-primary/10 rounded-lg group-hover:bg-crm-primary/20 transition-colors">
                      <Icon className="w-6 h-6 text-crm-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-crm-text-primary group-hover:text-crm-primary transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-sm text-crm-text-muted mt-1">{item.description}</p>
                    </div>
                    <ExternalLink className="w-5 h-5 text-crm-text-muted group-hover:text-crm-primary transition-colors" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section id="videos" className="space-y-4">
        <h2 className="text-xl font-semibold text-crm-text-primary">Tutoriales en video</h2>
        {filteredVideos.length === 0 ? (
          <p className="text-sm text-crm-text-muted">No encontramos videos relacionados con tu búsqueda.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVideos.map((item) => {
              const Icon = item.icon;
              const content = (
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-crm-accent/10 rounded-lg group-hover:bg-crm-accent/20 transition-colors">
                    <Icon className="w-6 h-6 text-crm-accent" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-crm-text-primary group-hover:text-crm-primary transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-sm text-crm-text-muted mt-1">{item.description}</p>
                  </div>
                  <ExternalLink className="w-5 h-5 text-crm-text-muted group-hover:text-crm-primary transition-colors" />
                </div>
              );

              return item.external ? (
                <a
                  key={item.id}
                  id={item.id}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-crm-card rounded-xl p-6 border border-crm-border hover:border-crm-primary transition-all group"
                >
                  {content}
                </a>
              ) : (
                <Link
                  key={item.id}
                  id={item.id}
                  href={item.href}
                  className="bg-crm-card rounded-xl p-6 border border-crm-border hover:border-crm-primary transition-all group"
                >
                  {content}
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className="bg-crm-card rounded-xl border border-crm-border overflow-hidden">
        <div className="bg-gradient-to-r from-crm-primary to-crm-accent p-6">
          <h2 className="text-xl font-bold text-white">¿Necesitas ayuda personalizada?</h2>
          <p className="text-white/90 text-sm mt-1">
            Contacta al equipo de soporte por el canal que prefieras.
          </p>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          {filteredSupport.length === 0 ? (
            <p className="text-sm text-crm-text-muted col-span-full">
              No hay canales que coincidan con tu búsqueda.
            </p>
          ) : (
            filteredSupport.map((channel) => {
              const Icon = channel.icon;
              const content = (
                <>
                  <div className="p-3 bg-crm-card-hover rounded-lg">
                    <Icon className="w-6 h-6 text-crm-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-crm-text-primary">{channel.title}</h3>
                    <p className="text-sm text-crm-text-muted mt-1">{channel.description}</p>
                    <span className="text-sm text-crm-primary hover:underline mt-2 inline-block">
                      {channel.cta}
                    </span>
                  </div>
                </>
              );

              return channel.external ? (
                <a
                  key={channel.title}
                  href={channel.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-4 hover:bg-crm-card-hover/80 transition-colors rounded-lg p-3"
                >
                  {content}
                </a>
              ) : (
                <a
                  key={channel.title}
                  href={channel.href}
                  className="flex items-start gap-4 hover:bg-crm-card-hover/80 transition-colors rounded-lg p-3"
                >
                  {content}
                </a>
              );
            })
          )}
        </div>
      </section>

      <section id="faq" className="bg-crm-card rounded-xl p-6 border border-crm-border space-y-4">
        <h2 className="text-xl font-bold text-crm-text-primary">Preguntas frecuentes</h2>
        {filteredFaqs.length === 0 ? (
          <p className="text-sm text-crm-text-muted">No hay preguntas que coincidan con tu búsqueda.</p>
        ) : (
          filteredFaqs.map((item) => (
            <details key={item.question} className="group">
              <summary className="flex items-center justify-between cursor-pointer p-4 bg-crm-bg-primary rounded-lg hover:bg-crm-card-hover transition-colors">
                <span className="font-medium text-crm-text-primary">{item.question}</span>
                <span className="text-crm-text-muted group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="p-4 text-sm text-crm-text-muted leading-relaxed">{item.answer}</div>
            </details>
          ))
        )}
      </section>

      <section className="bg-crm-card rounded-xl p-6 border border-crm-border text-center">
        <h3 className="font-semibold text-crm-text-primary mb-2">¿No encontraste lo que buscabas?</h3>
        <p className="text-sm text-crm-text-muted mb-4">
          Reporta un problema o solicita una nueva funcionalidad desde nuestro formulario.
        </p>
        <Link
          href="/dashboard/reportar-problema"
          className="inline-flex items-center gap-2 px-6 py-3 bg-crm-primary text-white rounded-lg hover:bg-crm-primary-hover transition-colors"
        >
          <MessageCircle className="w-5 h-5" />
          Reportar problema
        </Link>
      </section>

      {noResults && (
        <div className="bg-crm-card rounded-xl p-6 border border-dashed border-crm-border text-center text-sm text-crm-text-muted">
          No encontramos resultados para “{query}”. Si necesitas asistencia inmediata, contáctanos por chat o teléfono.
        </div>
      )}
    </div>
  );
}
