"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  BookOpen, Zap, HelpCircle, Mail, Search, X, List,
  ThumbsUp, ThumbsDown, CheckCircle,
} from "lucide-react";

type TabType = "guia" | "manual" | "faq";

interface Tab {
  id: TabType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  content: string;
  description: string;
}

interface SearchResult {
  tab: TabType;
  tabLabel: string;
  section: string;
}

interface TocEntry {
  text: string;
  id: string;
}

interface HelpCenterProps {
  guiaRapida: string;
  manualVendedor: string;
  faqVendedores: string;
  initialTab?: TabType;
}

function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase();
}

function getChildrenText(children: React.ReactNode): string {
  if (typeof children === "string") return children;
  if (Array.isArray(children))
    return children.map((c) => (typeof c === "string" ? c : "")).join("");
  return "";
}

// --- Feedback por sección ---
function FeedbackBar({ tabId }: { tabId: TabType }) {
  const storageKey = `ayuda_feedback_${tabId}`;
  const [voted, setVoted] = useState<"up" | "down" | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      setVoted(saved === "up" || saved === "down" ? saved : null);
    } catch {}
    setLoaded(true);
  }, [storageKey]);

  const handleVote = (vote: "up" | "down") => {
    try { localStorage.setItem(storageKey, vote); } catch {}
    setVoted(vote);
  };

  const handleChange = () => {
    try { localStorage.removeItem(storageKey); } catch {}
    setVoted(null);
  };

  if (!loaded) return null;

  return (
    <div className="flex items-center justify-between flex-wrap gap-3 px-8 py-5 border-t border-crm-border bg-crm-bg-primary/50 rounded-b-xl">
      {voted ? (
        <div className="flex items-center gap-2 text-sm text-crm-text-secondary">
          <CheckCircle className="w-4 h-4 text-crm-success flex-shrink-0" />
          <span>Gracias por tu feedback.</span>
          <button
            onClick={handleChange}
            className="text-xs text-crm-text-muted hover:text-crm-primary underline ml-1 transition-colors"
          >
            Cambiar
          </button>
        </div>
      ) : (
        <>
          <span className="text-sm text-crm-text-secondary">
            ¿Te fue útil esta sección?
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => handleVote("up")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-crm-text-secondary hover:bg-crm-success/10 hover:text-crm-success border border-crm-border transition-colors"
            >
              <ThumbsUp className="w-3.5 h-3.5" />
              Sí, me ayudó
            </button>
            <button
              onClick={() => handleVote("down")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-crm-text-secondary hover:bg-red-500/10 hover:text-red-500 border border-crm-border transition-colors"
            >
              <ThumbsDown className="w-3.5 h-3.5" />
              No del todo
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// --- Componente principal ---
export default function HelpCenter({
  guiaRapida,
  manualVendedor,
  faqVendedores,
  initialTab = "guia",
}: HelpCenterProps) {
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSection, setActiveSection] = useState<string>("");
  const [panelHeight, setPanelHeight] = useState<string | undefined>(undefined);

  const activeTocRef = useRef<HTMLButtonElement | null>(null);
  const panelContainerRef = useRef<HTMLDivElement>(null);
  const contentPanelRef = useRef<HTMLDivElement>(null);

  const tabs: Tab[] = [
    { id: "guia", label: "Guía Rápida", icon: Zap, content: guiaRapida, description: "Empieza en 10 minutos" },
    { id: "manual", label: "Manual Completo", icon: BookOpen, content: manualVendedor, description: "Referencia completa del sistema" },
    { id: "faq", label: "Preguntas Frecuentes", icon: HelpCircle, content: faqVendedores, description: "Respuestas a dudas comunes" },
  ];

  // TOC del manual
  const manualToc = useMemo((): TocEntry[] =>
    manualVendedor
      .split("\n")
      .filter((line) => line.match(/^## /))
      .map((line) => {
        const text = line.replace(/^## /, "").trim();
        return { text, id: slugify(text) };
      }),
  [manualVendedor]);

  // Índice de búsqueda
  const searchIndex = useMemo(() => {
    const docs = [
      { id: "guia" as TabType, label: "Guía Rápida", content: guiaRapida },
      { id: "manual" as TabType, label: "Manual Completo", content: manualVendedor },
      { id: "faq" as TabType, label: "Preguntas Frecuentes", content: faqVendedores },
    ];
    const entries: { tab: TabType; tabLabel: string; section: string; text: string }[] = [];
    for (const doc of docs) {
      let currentSection = doc.label;
      for (const line of doc.content.split("\n")) {
        if (line.match(/^#{1,3} /)) currentSection = line.replace(/^#{1,3} /, "").trim();
        if (line.trim()) entries.push({ tab: doc.id, tabLabel: doc.label, section: currentSection, text: line });
      }
    }
    return entries;
  }, [guiaRapida, manualVendedor, faqVendedores]);

  const searchResults = useMemo((): SearchResult[] => {
    if (searchQuery.trim().length < 2) return [];
    const q = searchQuery.toLowerCase();
    const seen = new Set<string>();
    const results: SearchResult[] = [];
    for (const entry of searchIndex) {
      const key = `${entry.tab}::${entry.section}`;
      if (!seen.has(key) && entry.text.toLowerCase().includes(q)) {
        seen.add(key);
        results.push({ tab: entry.tab, tabLabel: entry.tabLabel, section: entry.section });
      }
    }
    return results.slice(0, 8);
  }, [searchQuery, searchIndex]);

  // Altura dinámica del panel (solo desktop)
  useEffect(() => {
    const update = () => {
      if (!panelContainerRef.current) return;
      if (window.matchMedia("(min-width: 1024px)").matches) {
        const top = panelContainerRef.current.getBoundingClientRect().top;
        setPanelHeight(`calc(100dvh - ${top + 24}px)`);
      } else {
        setPanelHeight(undefined);
      }
    };
    const t = setTimeout(update, 0);
    window.addEventListener("resize", update);
    return () => { clearTimeout(t); window.removeEventListener("resize", update); };
  }, []);

  // Reset al cambiar de tab
  useEffect(() => {
    setActiveSection("");
    if (window.matchMedia("(min-width: 1024px)").matches) {
      contentPanelRef.current?.scrollTo({ top: 0 });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [activeTab]);

  // IntersectionObserver — sección activa en el manual
  useEffect(() => {
    if (activeTab !== "manual") return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) setActiveSection(visible[0].target.id);
      },
      { rootMargin: "-8% 0px -82% 0px", threshold: 0 }
    );
    const t = setTimeout(() => {
      document.querySelectorAll("h2[id]").forEach((h) => observer.observe(h));
    }, 150);
    return () => { clearTimeout(t); observer.disconnect(); };
  }, [activeTab, manualVendedor]);

  // Mantener item activo del TOC en vista
  useEffect(() => {
    activeTocRef.current?.scrollIntoView({ block: "nearest" });
  }, [activeSection]);

  const currentTab = tabs.find((t) => t.id === activeTab) || tabs[0];
  const isSearching = searchQuery.trim().length >= 2;

  const handleResultClick = (tab: TabType) => {
    setActiveTab(tab);
    setSearchQuery("");
  };

  const scrollToSection = (id: string) => {
    const container = contentPanelRef.current;
    if (container && window.matchMedia("(min-width: 1024px)").matches) {
      const el = container.querySelector(`#${id}`) as HTMLElement | null;
      if (el) {
        container.scrollTo({ top: el.offsetTop - 16, behavior: "smooth" });
        return;
      }
    }
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // JSX del sidebar (reutilizado en desktop y mobile)
  const sidebarContent = (
    <>
      {/* Buscador */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-crm-text-muted pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar en la ayuda..."
          className="w-full pl-9 pr-8 py-2 text-sm bg-crm-bg-primary border border-crm-border rounded-lg text-crm-text-primary placeholder:text-crm-text-muted focus:outline-none focus:ring-2 focus:ring-crm-primary/40 focus:border-crm-primary transition-colors"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-crm-text-muted hover:text-crm-text-primary transition-colors"
            aria-label="Limpiar búsqueda"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Resultados de búsqueda */}
      {isSearching ? (
        searchResults.length > 0 ? (
          <div className="space-y-1">
            <p className="text-xs text-crm-text-muted mb-2">
              {searchResults.length} resultado{searchResults.length !== 1 ? "s" : ""}
            </p>
            {searchResults.map((result, i) => (
              <button
                key={i}
                onClick={() => handleResultClick(result.tab)}
                className="w-full text-left px-3 py-2.5 rounded-lg text-sm hover:bg-crm-primary/10 hover:text-crm-primary transition-colors border border-crm-border"
              >
                <div className="font-medium text-crm-text-primary truncate leading-snug">{result.section}</div>
                <div className="text-xs text-crm-text-muted mt-0.5">{result.tabLabel}</div>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-xs text-crm-text-muted text-center py-4">
            Sin resultados para &ldquo;{searchQuery}&rdquo;
          </p>
        )
      ) : (
        <>
          <h3 className="text-sm font-semibold text-crm-text-primary mb-3">Documentos</h3>
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left ${
                    activeTab === tab.id
                      ? "bg-crm-primary/10 text-crm-primary font-medium"
                      : "text-crm-text-secondary hover:bg-crm-card-hover hover:text-crm-text-primary"
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="truncate">{tab.label}</div>
                    <div className="text-xs text-crm-text-muted truncate">{tab.description}</div>
                  </div>
                </button>
              );
            })}
          </nav>

          {/* TOC del manual */}
          {activeTab === "manual" && manualToc.length > 0 && (
            <div className="mt-5 pt-5 border-t border-crm-border">
              <div className="flex items-center gap-2 mb-3">
                <List className="w-3.5 h-3.5 text-crm-text-muted" />
                <h4 className="text-xs font-semibold text-crm-text-primary uppercase tracking-wider">
                  En este manual
                </h4>
              </div>
              <nav className="space-y-0.5">
                {manualToc.map((entry) => {
                  const isActive = activeSection === entry.id;
                  return (
                    <button
                      key={entry.id}
                      ref={isActive ? activeTocRef : null}
                      onClick={() => scrollToSection(entry.id)}
                      className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors truncate ${
                        isActive
                          ? "text-crm-primary bg-crm-primary/10 font-medium"
                          : "text-crm-text-secondary hover:text-crm-primary hover:bg-crm-primary/5"
                      }`}
                    >
                      {isActive && (
                        <span className="inline-block w-1 h-3 bg-crm-primary rounded-full mr-1.5 align-middle" />
                      )}
                      {entry.text}
                    </button>
                  );
                })}
              </nav>
            </div>
          )}
        </>
      )}

      {/* Contacto */}
      <div className="mt-6 pt-6 border-t border-crm-border">
        <h4 className="text-xs font-semibold text-crm-text-primary mb-3">¿Necesitas ayuda?</h4>
        <a
          href="mailto:soporteamersur@gmail.com"
          className="flex items-center gap-2 text-xs text-crm-text-secondary hover:text-crm-primary transition-colors"
        >
          <Mail className="w-3.5 h-3.5" />
          <span>soporteamersur@gmail.com</span>
        </a>
      </div>
    </>
  );

  return (
    <div className="bg-crm-bg-primary">
      {/* Header */}
      <div className="bg-crm-card border-b border-crm-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-crm-primary/10 rounded-xl">
              <BookOpen className="w-6 h-6 text-crm-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-crm-text-primary">Centro de Ayuda</h1>
              <p className="text-sm text-crm-text-secondary mt-0.5">
                Documentación y guías para usar el sistema
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Layout de dos paneles */}
      <div
        ref={panelContainerRef}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col lg:flex-row gap-6 lg:overflow-hidden"
        style={panelHeight ? { height: panelHeight } : undefined}
      >
        {/* Sidebar — desktop */}
        <aside className="hidden lg:flex flex-col w-64 xl:w-72 flex-shrink-0">
          <div className="crm-card p-5 flex-1 overflow-y-auto">
            {sidebarContent}
          </div>
        </aside>

        {/* Panel de contenido */}
        <div
          ref={contentPanelRef}
          className="flex-1 min-w-0 lg:overflow-y-auto"
        >
          <article className="crm-card">
            {/* Cabecera */}
            <div className="px-8 py-6 border-b border-crm-border">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-crm-primary/10 rounded-lg">
                  <currentTab.icon className="w-5 h-5 text-crm-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-crm-text-primary">{currentTab.label}</h2>
                  <p className="text-sm text-crm-text-secondary mt-0.5">{currentTab.description}</p>
                </div>
              </div>
            </div>

            {/* Markdown */}
            <div className="px-8 py-8">
              <div
                className="
                  prose prose-base dark:prose-invert max-w-none
                  prose-headings:font-bold prose-headings:text-crm-text-primary prose-headings:tracking-tight
                  prose-h1:text-3xl prose-h1:mb-6 prose-h1:pb-4 prose-h1:border-b prose-h1:border-crm-border
                  prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4
                  prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
                  prose-p:text-crm-text-secondary prose-p:leading-relaxed prose-p:mb-4
                  prose-a:text-crm-primary prose-a:no-underline prose-a:font-medium hover:prose-a:underline
                  prose-ul:my-4 prose-ul:space-y-2 prose-ol:my-4 prose-ol:space-y-2
                  prose-li:text-crm-text-secondary prose-li:marker:text-crm-primary
                  prose-code:text-crm-primary prose-code:bg-crm-primary/5 prose-code:px-1.5 prose-code:py-0.5
                  prose-code:rounded prose-code:text-sm prose-code:font-mono
                  prose-code:before:content-[''] prose-code:after:content-['']
                  prose-pre:bg-crm-text-primary prose-pre:text-gray-100 prose-pre:rounded-lg prose-pre:border prose-pre:border-crm-border
                  prose-blockquote:border-l-4 prose-blockquote:border-crm-primary prose-blockquote:bg-crm-primary/5
                  prose-blockquote:py-3 prose-blockquote:px-4 prose-blockquote:rounded-r-lg
                  prose-blockquote:not-italic prose-blockquote:text-crm-text-secondary
                  prose-table:border-collapse prose-table:w-full prose-table:my-6
                  prose-th:bg-crm-bg-primary prose-th:px-4 prose-th:py-2 prose-th:text-left
                  prose-th:font-semibold prose-th:text-crm-text-primary prose-th:border prose-th:border-crm-border
                  prose-td:px-4 prose-td:py-2 prose-td:border prose-td:border-crm-border prose-td:text-crm-text-secondary
                  prose-strong:text-crm-text-primary prose-strong:font-semibold
                  prose-hr:border-crm-border prose-hr:my-8
                "
              >
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h2: ({ node: _node, children, ...props }) => {
                      const text = getChildrenText(children);
                      const id = slugify(text);
                      return (
                        <h2 id={id} className="flex items-center gap-3 group scroll-mt-4" {...props}>
                          <span className="inline-block w-1 h-6 bg-crm-primary rounded-full flex-shrink-0" />
                          {children}
                        </h2>
                      );
                    },
                  }}
                >
                  {currentTab.content}
                </ReactMarkdown>
              </div>
            </div>

            {/* Feedback */}
            <FeedbackBar tabId={activeTab} />
          </article>

          {/* Sidebar — mobile (debajo del artículo) */}
          <aside className="lg:hidden mt-6 mb-6">
            <div className="crm-card p-5">{sidebarContent}</div>
          </aside>
        </div>
      </div>
    </div>
  );
}
