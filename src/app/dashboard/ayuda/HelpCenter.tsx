"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { BookOpen, Zap, HelpCircle, Mail, Phone, Clock } from "lucide-react";

type TabType = "guia" | "manual" | "faq";

interface Tab {
  id: TabType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  content: string;
  description: string;
}

interface HelpCenterProps {
  guiaRapida: string;
  manualVendedor: string;
  faqVendedores: string;
}

export default function HelpCenter({
  guiaRapida,
  manualVendedor,
  faqVendedores,
}: HelpCenterProps) {
  const [activeTab, setActiveTab] = useState<TabType>("guia");

  const tabs: Tab[] = [
    {
      id: "guia",
      label: "Guía Rápida",
      icon: Zap,
      content: guiaRapida,
      description: "Empieza en 10 minutos",
    },
    {
      id: "manual",
      label: "Manual Completo",
      icon: BookOpen,
      content: manualVendedor,
      description: "Referencia completa del sistema",
    },
    {
      id: "faq",
      label: "Preguntas Frecuentes",
      icon: HelpCircle,
      content: faqVendedores,
      description: "Respuestas a dudas comunes",
    },
  ];

  const currentTab = tabs.find((tab) => tab.id === activeTab) || tabs[0];

  return (
    <div className="min-h-screen bg-crm-bg-primary">
      {/* Header Simple */}
      <div className="bg-crm-card border-b border-crm-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-crm-primary/10 rounded-xl">
              <BookOpen className="w-6 h-6 text-crm-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-crm-text-primary">
                Centro de Ayuda
              </h1>
              <p className="text-sm text-crm-text-secondary mt-0.5">
                Documentación y guías para usar el sistema
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs horizontales simples */}
        <div className="flex gap-2 mb-6 border-b border-crm-border">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors
                  ${
                    activeTab === tab.id
                      ? "border-crm-primary text-crm-primary"
                      : "border-transparent text-crm-text-secondary hover:text-crm-text-primary hover:border-crm-border"
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar izquierda */}
          <div className="lg:col-span-1">
            <div className="crm-card p-5 sticky top-4">
              <h3 className="text-sm font-semibold text-crm-text-primary mb-4">
                Documentos
              </h3>
              <nav className="space-y-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`
                        w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left
                        ${
                          activeTab === tab.id
                            ? "bg-crm-primary/10 text-crm-primary font-medium"
                            : "text-crm-text-secondary hover:bg-crm-card-hover hover:text-crm-text-primary"
                        }
                      `}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="truncate">{tab.label}</div>
                        <div className="text-xs text-crm-text-muted truncate">
                          {tab.description}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </nav>

              {/* Info de contacto */}
              <div className="mt-6 pt-6 border-t border-crm-border">
                <h4 className="text-xs font-semibold text-crm-text-primary mb-3">
                  ¿Necesitas ayuda?
                </h4>
                <div className="space-y-2.5">
                  <a
                    href="mailto:soporte@amersur.com"
                    className="flex items-center gap-2 text-xs text-crm-text-secondary hover:text-crm-primary transition-colors"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>soporteamersur@gmail.com</span>
                  </a>
                  <div className="flex items-center gap-2 text-xs text-crm-text-secondary">
                    <Phone className="w-3.5 h-3.5" />
                    <span>(+51) XXX-XXXX</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-crm-text-secondary">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Lun-Vie 9am-6pm</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="lg:col-span-3">
            <article className="crm-card">
              {/* Article header */}
              <div className="px-8 py-6 border-b border-crm-border">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-crm-primary/10 rounded-lg">
                    <currentTab.icon className="w-5 h-5 text-crm-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-crm-text-primary">
                      {currentTab.label}
                    </h2>
                    <p className="text-sm text-crm-text-secondary mt-0.5">
                      {currentTab.description}
                    </p>
                  </div>
                </div>
              </div>

              {/* Article content */}
              <div className="px-8 py-8">
                <div
                  className="
                    prose prose-base
                    dark:prose-invert
                    max-w-none

                    /* Headings */
                    prose-headings:font-bold
                    prose-headings:text-crm-text-primary
                    prose-headings:tracking-tight
                    prose-h1:text-3xl
                    prose-h1:mb-6
                    prose-h1:pb-4
                    prose-h1:border-b
                    prose-h1:border-crm-border
                    prose-h2:text-2xl
                    prose-h2:mt-10
                    prose-h2:mb-4
                    prose-h3:text-xl
                    prose-h3:mt-8
                    prose-h3:mb-3

                    /* Paragraphs */
                    prose-p:text-crm-text-secondary
                    prose-p:leading-relaxed
                    prose-p:mb-4

                    /* Links */
                    prose-a:text-crm-primary
                    prose-a:no-underline
                    prose-a:font-medium
                    hover:prose-a:underline

                    /* Lists */
                    prose-ul:my-4
                    prose-ul:space-y-2
                    prose-ol:my-4
                    prose-ol:space-y-2
                    prose-li:text-crm-text-secondary
                    prose-li:marker:text-crm-primary

                    /* Code */
                    prose-code:text-crm-primary
                    prose-code:bg-crm-primary/5
                    prose-code:px-1.5
                    prose-code:py-0.5
                    prose-code:rounded
                    prose-code:text-sm
                    prose-code:font-mono
                    prose-code:before:content-['']
                    prose-code:after:content-['']

                    /* Pre/Code blocks */
                    prose-pre:bg-crm-text-primary
                    prose-pre:text-gray-100
                    prose-pre:rounded-lg
                    prose-pre:border
                    prose-pre:border-crm-border

                    /* Blockquotes */
                    prose-blockquote:border-l-4
                    prose-blockquote:border-crm-primary
                    prose-blockquote:bg-crm-primary/5
                    prose-blockquote:py-3
                    prose-blockquote:px-4
                    prose-blockquote:rounded-r-lg
                    prose-blockquote:not-italic
                    prose-blockquote:text-crm-text-secondary

                    /* Tables */
                    prose-table:border-collapse
                    prose-table:w-full
                    prose-table:my-6
                    prose-th:bg-crm-bg-primary
                    prose-th:px-4
                    prose-th:py-2
                    prose-th:text-left
                    prose-th:font-semibold
                    prose-th:text-crm-text-primary
                    prose-th:border
                    prose-th:border-crm-border
                    prose-td:px-4
                    prose-td:py-2
                    prose-td:border
                    prose-td:border-crm-border
                    prose-td:text-crm-text-secondary

                    /* Strong/Bold */
                    prose-strong:text-crm-text-primary
                    prose-strong:font-semibold

                    /* HR */
                    prose-hr:border-crm-border
                    prose-hr:my-8
                  "
                >
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h2: ({ node: _node, ...props }) => (
                        <h2 className="flex items-center gap-3 group" {...props}>
                          <span className="inline-block w-1 h-6 bg-crm-primary rounded-full" />
                          {props.children}
                        </h2>
                      ),
                      // Checkmarks mejorados
                      li: ({ node: _node, children, ...props }) => {
                        const content = String(children);
                        if (content.startsWith('✅') || content.startsWith('✓')) {
                          return (
                            <li className="flex items-start gap-2.5 list-none ml-0" {...props}>
                              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-crm-success/10 flex items-center justify-center text-crm-success text-xs mt-0.5">
                                ✓
                              </span>
                              <span className="flex-1">{children}</span>
                            </li>
                          );
                        }
                        return <li {...props}>{children}</li>;
                      },
                    }}
                  >
                    {currentTab.content}
                  </ReactMarkdown>
                </div>
              </div>
            </article>
          </div>
        </div>
      </div>
    </div>
  );
}
