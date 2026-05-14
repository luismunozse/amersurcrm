"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { X, Save, Loader2, MessageSquare, Plus, Trash2, Smile, Paperclip, Image as ImageIcon, FileText as FileTextIcon, Video as VideoIcon, AudioLines } from "lucide-react";
import toast from "react-hot-toast";
import {
  crearPlantilla,
  actualizarPlantilla,
  obtenerSnippets,
} from "@/app/dashboard/admin/marketing/_actions";
import {
  extractVariables,
  extractSections,
  extractSnippetSlugs,
  renderTemplate,
} from "@/lib/marketing/whatsapp";
import type { MarketingTemplate, MarketingSnippet, MediaTipo } from "@/types/whatsapp-marketing";

interface ModalCrearPlantillaProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  plantilla?: MarketingTemplate;
}

const CATEGORIAS_SUGERIDAS = [
  "bienvenida",
  "seguimiento",
  "cotizacion",
  "visita",
  "reserva",
  "separacion",
  "documentacion",
  "cobranza",
  "post_venta",
  "promocion",
  "recordatorio",
  "general",
];

type EmojiItem = { e: string; k: string };
type EmojiGrupo = { id: string; label: string; icon: string; emojis: EmojiItem[] };

const EMOJI_GRUPOS: EmojiGrupo[] = [
  {
    id: "saludos",
    label: "Saludos",
    icon: "👋",
    emojis: [
      { e: "👋", k: "saludo hola mano adios" },
      { e: "🙌", k: "manos arriba celebracion" },
      { e: "🤝", k: "acuerdo apreton manos trato" },
      { e: "🙏", k: "gracias favor por porfa" },
      { e: "😊", k: "sonrisa feliz contento" },
      { e: "😀", k: "feliz sonrisa" },
      { e: "😃", k: "alegre feliz" },
      { e: "🥰", k: "amor carino" },
      { e: "😎", k: "cool genial" },
      { e: "🤩", k: "wow estrellas emocion" },
      { e: "👍", k: "ok bien aprobado pulgar" },
      { e: "👏", k: "aplauso felicitacion" },
      { e: "💪", k: "fuerza brazo musculo" },
      { e: "✨", k: "brillo nuevo destacado" },
      { e: "🎉", k: "fiesta celebracion" },
      { e: "🥳", k: "fiesta cumpleanos celebrar" },
    ],
  },
  {
    id: "inmueble",
    label: "Inmueble",
    icon: "🏠",
    emojis: [
      { e: "🏠", k: "casa hogar vivienda" },
      { e: "🏡", k: "casa jardin hogar" },
      { e: "🏢", k: "edificio oficina" },
      { e: "🏘️", k: "barrio casas vecindario" },
      { e: "🏗️", k: "construccion obra grua" },
      { e: "🔑", k: "llave entrega" },
      { e: "🗝️", k: "llave antigua" },
      { e: "🛋️", k: "sala sofa mueble" },
      { e: "🚪", k: "puerta entrada" },
      { e: "🛏️", k: "dormitorio cama" },
      { e: "🛁", k: "bano tina" },
      { e: "🌆", k: "ciudad atardecer" },
      { e: "🌳", k: "arbol verde area" },
      { e: "🏞️", k: "paisaje naturaleza" },
      { e: "📐", k: "plano medida arquitectura" },
      { e: "📏", k: "regla medida metros" },
    ],
  },
  {
    id: "dinero",
    label: "Dinero",
    icon: "💰",
    emojis: [
      { e: "💰", k: "dinero bolsa" },
      { e: "💵", k: "billete efectivo dolar" },
      { e: "💲", k: "precio costo" },
      { e: "💳", k: "tarjeta credito pago" },
      { e: "🧾", k: "factura recibo boleta" },
      { e: "📊", k: "grafico estadistica reporte" },
      { e: "📈", k: "subida crecimiento ganancia" },
      { e: "📉", k: "bajada caida" },
      { e: "💎", k: "diamante exclusivo premium" },
      { e: "🏦", k: "banco financiamiento credito" },
      { e: "💸", k: "pago transferencia" },
      { e: "🪙", k: "moneda" },
      { e: "🎁", k: "regalo promocion bono" },
      { e: "🏷️", k: "etiqueta precio oferta" },
      { e: "💼", k: "negocio maletin trabajo" },
      { e: "📝", k: "contrato firma documento" },
    ],
  },
  {
    id: "tiempo",
    label: "Tiempo",
    icon: "⏰",
    emojis: [
      { e: "⏰", k: "alarma reloj recordatorio" },
      { e: "📅", k: "calendario fecha cita" },
      { e: "🗓️", k: "agenda calendario" },
      { e: "⌛", k: "tiempo agotando urgencia" },
      { e: "⏳", k: "esperando arena reloj" },
      { e: "🔔", k: "notificacion aviso campana" },
      { e: "🕐", k: "hora reloj" },
      { e: "📌", k: "importante anclar pin" },
      { e: "🚀", k: "rapido lanzamiento exito" },
      { e: "⚡", k: "rapido urgente energia" },
      { e: "⭐", k: "favorito destacado estrella" },
      { e: "🔥", k: "fuego caliente oferta" },
      { e: "🎯", k: "objetivo meta diana" },
      { e: "✅", k: "listo confirmado check" },
      { e: "❗", k: "importante urgente" },
      { e: "⚠️", k: "atencion advertencia" },
    ],
  },
  {
    id: "contacto",
    label: "Contacto",
    icon: "📞",
    emojis: [
      { e: "📞", k: "telefono llamada" },
      { e: "📱", k: "celular movil" },
      { e: "💬", k: "chat mensaje" },
      { e: "📲", k: "whatsapp mensaje movil" },
      { e: "✉️", k: "correo email mensaje" },
      { e: "📧", k: "email correo" },
      { e: "🔗", k: "link enlace url" },
      { e: "📍", k: "ubicacion punto direccion" },
      { e: "🗺️", k: "mapa ubicacion" },
      { e: "🚗", k: "auto visita traslado" },
      { e: "🧭", k: "direccion brujula" },
      { e: "🎥", k: "video tour" },
      { e: "📷", k: "foto camara" },
      { e: "🖼️", k: "imagen foto galeria" },
      { e: "🌐", k: "web internet sitio" },
      { e: "📡", k: "senal cobertura" },
    ],
  },
  {
    id: "enfasis",
    label: "Énfasis",
    icon: "✨",
    emojis: [
      { e: "✅", k: "listo confirmado check ok" },
      { e: "❤️", k: "amor corazon rojo" },
      { e: "🧡", k: "naranja corazon" },
      { e: "💚", k: "verde corazon" },
      { e: "💙", k: "azul corazon" },
      { e: "💜", k: "morado corazon" },
      { e: "🔥", k: "fuego caliente oferta hot" },
      { e: "🎯", k: "objetivo meta" },
      { e: "⚠️", k: "atencion advertencia" },
      { e: "❗", k: "importante urgente exclamacion" },
      { e: "‼️", k: "doble urgente importante" },
      { e: "❓", k: "duda pregunta" },
      { e: "📝", k: "nota apunte" },
      { e: "👀", k: "atencion mira" },
      { e: "💯", k: "perfecto cien" },
      { e: "🌟", k: "estrella destacado" },
    ],
  },
];

const RECIENTES_KEY = "amersurcrm_plantilla_emojis_recientes";
const MAX_RECIENTES = 16;

// Valores demo para vista previa — más realistas que `[var]`.
const VALORES_DEMO: Record<string, string> = {
  cliente: "Luis García",
  proyecto: "Vista Alta",
  vendedor: "Carla Mendoza",
  monto: "S/ 12,500",
  fecha: "miércoles 20 de mayo, 10:30",
  cuota: "3",
  total_cuotas: "12",
  lote: "Mz B Lt 14",
  telefono: "+51 987 654 321",
};

const ESTADOS_CLIENTE_SUGERIDOS = [
  { value: "por_contactar", label: "Por contactar" },
  { value: "contactado", label: "Contactado" },
  { value: "intermedio", label: "Intermedio" },
  { value: "potencial", label: "Potencial" },
  { value: "en_proceso", label: "En proceso" },
  { value: "transferido", label: "Transferido" },
];

const FORM_DEFAULTS = {
  nombre: "",
  categoria: "general",
  body_texto: "",
  objetivo: "",
  tags: [] as string[],
  activo: true,
  media_url: "",
  media_tipo: "" as MediaTipo | "",
};

const MEDIA_TIPOS: { value: MediaTipo; label: string; Icon: typeof Paperclip }[] = [
  { value: "imagen", label: "Imagen", Icon: ImageIcon },
  { value: "pdf", label: "PDF", Icon: FileTextIcon },
  { value: "video", label: "Video", Icon: VideoIcon },
  { value: "audio", label: "Audio", Icon: AudioLines },
];

function detectarMediaTipo(url: string): MediaTipo | "" {
  const u = url.toLowerCase().trim();
  if (!u) return "";
  if (/\.(jpe?g|png|gif|webp|bmp|svg)(\?|$)/.test(u)) return "imagen";
  if (/\.pdf(\?|$)/.test(u)) return "pdf";
  if (/\.(mp4|mov|webm|avi|mkv)(\?|$)/.test(u)) return "video";
  if (/\.(mp3|ogg|wav|m4a|aac)(\?|$)/.test(u)) return "audio";
  return "";
}

export default function ModalCrearPlantilla({
  open,
  onClose,
  onSuccess,
  plantilla,
}: ModalCrearPlantillaProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(FORM_DEFAULTS);
  const [tagInput, setTagInput] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [emojiGrupo, setEmojiGrupo] = useState<string>("recientes");
  const [emojiBusqueda, setEmojiBusqueda] = useState("");
  const [emojiRecientes, setEmojiRecientes] = useState<string[]>([]);
  const [snippets, setSnippets] = useState<MarketingSnippet[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!open) return;
    obtenerSnippets().then((r) => {
      if (r.data) setSnippets(r.data);
    });
  }, [open]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECIENTES_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setEmojiRecientes(parsed.filter((x) => typeof x === "string"));
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!emojiOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setEmojiOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [emojiOpen]);

  const esEdicion = !!plantilla;

  useEffect(() => {
    if (!open) return;
    if (plantilla) {
      setForm({
        nombre: plantilla.nombre,
        categoria: plantilla.categoria || "general",
        body_texto: plantilla.body_texto,
        objetivo: plantilla.objetivo ?? "",
        tags: plantilla.tags ?? [],
        activo: plantilla.activo,
        media_url: plantilla.media_url ?? "",
        media_tipo: (plantilla.media_tipo as MediaTipo | null) ?? "",
      });
    } else {
      setForm(FORM_DEFAULTS);
    }
    setTagInput("");
  }, [open, plantilla]);

  const variablesDetectadas = useMemo(
    () => extractVariables(form.body_texto),
    [form.body_texto],
  );

  const seccionesDetectadas = useMemo(
    () => extractSections(form.body_texto),
    [form.body_texto],
  );

  const snippetsUsados = useMemo(
    () => extractSnippetSlugs(form.body_texto),
    [form.body_texto],
  );

  const snippetsMap = useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const s of snippets) map[s.slug] = s.contenido;
    return map;
  }, [snippets]);

  const snippetsFaltantes = useMemo(
    () => snippetsUsados.filter((slug) => !snippetsMap[slug]),
    [snippetsUsados, snippetsMap],
  );

  const previewSample = useMemo(() => {
    const sample: Record<string, string | boolean> = {};
    for (const v of variablesDetectadas) {
      sample[v] = VALORES_DEMO[v] ?? `[${v}]`;
    }
    // Secciones detectadas: por defecto truthy en preview
    for (const s of seccionesDetectadas) {
      if (sample[s] === undefined) sample[s] = true;
    }
    return renderTemplate(form.body_texto, sample as Record<string, string>, {
      snippets: snippetsMap,
    });
  }, [form.body_texto, variablesDetectadas, seccionesDetectadas, snippetsMap]);

  const emojisVisibles = useMemo<EmojiItem[]>(() => {
    const q = emojiBusqueda.trim().toLowerCase();
    if (q) {
      const seen = new Set<string>();
      const out: EmojiItem[] = [];
      for (const g of EMOJI_GRUPOS) {
        for (const it of g.emojis) {
          if (seen.has(it.e)) continue;
          if (it.k.includes(q) || g.label.toLowerCase().includes(q)) {
            seen.add(it.e);
            out.push(it);
          }
        }
      }
      return out;
    }
    if (emojiGrupo === "recientes") {
      return emojiRecientes.map((e) => ({ e, k: "" }));
    }
    const g = EMOJI_GRUPOS.find((x) => x.id === emojiGrupo);
    return g ? g.emojis : [];
  }, [emojiBusqueda, emojiGrupo, emojiRecientes]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim() || !form.body_texto.trim()) {
      toast.error("Nombre y mensaje son obligatorios");
      return;
    }

    setLoading(true);
    try {
      const mediaUrl = form.media_url.trim();
      const mediaTipoFinal: MediaTipo | "" = mediaUrl
        ? (form.media_tipo || detectarMediaTipo(mediaUrl) || "imagen")
        : "";

      const payload: Partial<MarketingTemplate> = {
        nombre: form.nombre.trim(),
        categoria: form.categoria.trim() || "general",
        body_texto: form.body_texto,
        variables: variablesDetectadas,
        objetivo: form.objetivo.trim() || undefined,
        tags: form.tags,
        activo: form.activo,
        media_url: mediaUrl || null,
        media_tipo: (mediaTipoFinal || null) as MediaTipo | null,
      };

      const result = esEdicion
        ? await actualizarPlantilla(plantilla!.id, payload)
        : await crearPlantilla(payload);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(esEdicion ? "Plantilla actualizada" : "Plantilla creada");
      onSuccess();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const agregarTag = () => {
    const t = tagInput.trim();
    if (!t || form.tags.includes(t)) return;
    setForm((f) => ({ ...f, tags: [...f.tags, t] }));
    setTagInput("");
  };

  const eliminarTag = (t: string) =>
    setForm((f) => ({ ...f, tags: f.tags.filter((x) => x !== t) }));

  const insertarEnCursor = (texto: string) => {
    const ta = textareaRef.current;
    setForm((f) => {
      if (!ta) return { ...f, body_texto: f.body_texto + texto };
      const start = ta.selectionStart ?? f.body_texto.length;
      const end = ta.selectionEnd ?? f.body_texto.length;
      const nuevo = f.body_texto.slice(0, start) + texto + f.body_texto.slice(end);
      requestAnimationFrame(() => {
        const pos = start + texto.length;
        ta.focus();
        ta.setSelectionRange(pos, pos);
      });
      return { ...f, body_texto: nuevo };
    });
  };

  const insertarVariable = (v: string) => insertarEnCursor(`{{${v}}}`);
  const insertarEmoji = (e: string) => {
    insertarEnCursor(e);
    setEmojiRecientes((prev) => {
      const next = [e, ...prev.filter((x) => x !== e)].slice(0, MAX_RECIENTES);
      try {
        localStorage.setItem(RECIENTES_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in duration-150">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-crm-card border-t sm:border border-crm-border rounded-t-xl sm:rounded-xl shadow-xl w-full sm:max-w-2xl max-h-[92vh] flex flex-col animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
        <div className="sm:hidden flex justify-center pt-2.5 pb-1">
          <span className="h-1 w-10 rounded-full bg-crm-border" />
        </div>

        <div className="flex items-start justify-between p-5 border-b border-crm-border">
          <div>
            <h4 className="text-lg font-semibold text-crm-text-primary flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-crm-primary" />
              {esEdicion ? "Editar plantilla" : "Nueva plantilla WhatsApp"}
            </h4>
            <p className="text-xs text-crm-text-muted mt-1">
              Texto enviable vía WhatsApp Web. Usa{" "}
              <code className="px-1 bg-crm-bg-secondary rounded">{`{{variable}}`}</code>{" "}
              para campos dinámicos.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-crm-text-muted hover:text-crm-text-primary"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="overflow-y-auto p-5 space-y-4 flex-1"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-crm-text-muted uppercase mb-1">
                Nombre *
              </label>
              <input
                type="text"
                value={form.nombre}
                onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                required
                placeholder="Ej: Bienvenida cliente nuevo"
                className="w-full px-3 py-2 bg-crm-bg-secondary border border-crm-border rounded-lg text-sm text-crm-text-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-crm-text-muted uppercase mb-1">
                Categoría
              </label>
              <input
                type="text"
                list="categorias-marketing"
                value={form.categoria}
                onChange={(e) =>
                  setForm((f) => ({ ...f, categoria: e.target.value }))
                }
                placeholder="general"
                className="w-full px-3 py-2 bg-crm-bg-secondary border border-crm-border rounded-lg text-sm text-crm-text-primary"
              />
              <datalist id="categorias-marketing">
                {CATEGORIAS_SUGERIDAS.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-crm-text-muted uppercase">
                Mensaje *
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setEmojiOpen((v) => !v);
                    setEmojiBusqueda("");
                  }}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors ${
                    emojiOpen
                      ? "bg-crm-primary/10 text-crm-primary border-crm-primary/30"
                      : "text-crm-text-secondary border-crm-border hover:bg-crm-card-hover"
                  }`}
                  aria-expanded={emojiOpen}
                  aria-label="Insertar emoji"
                >
                  <Smile className="w-3.5 h-3.5" />
                  Emojis
                </button>
                {emojiOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setEmojiOpen(false)}
                    />
                    <div className="absolute right-0 z-20 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] bg-crm-card border border-crm-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-150 origin-top-right">
                      <div className="p-2 border-b border-crm-border bg-crm-bg-secondary/50">
                        <div className="relative">
                          <input
                            type="text"
                            value={emojiBusqueda}
                            onChange={(e) => setEmojiBusqueda(e.target.value)}
                            placeholder="Buscar emoji…"
                            autoFocus
                            className="w-full pl-8 pr-7 py-1.5 bg-crm-card border border-crm-border rounded-lg text-sm text-crm-text-primary placeholder:text-crm-text-muted focus:outline-none focus:ring-2 focus:ring-crm-primary/30 focus:border-crm-primary"
                          />
                          <Smile className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-crm-text-muted pointer-events-none" />
                          {emojiBusqueda && (
                            <button
                              type="button"
                              onClick={() => setEmojiBusqueda("")}
                              className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded-md text-crm-text-muted hover:text-crm-text-primary hover:bg-crm-card-hover"
                              aria-label="Limpiar búsqueda"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {!emojiBusqueda && (
                        <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-crm-border overflow-x-auto">
                          <button
                            type="button"
                            onClick={() => setEmojiGrupo("recientes")}
                            disabled={emojiRecientes.length === 0}
                            title="Recientes"
                            className={`flex items-center justify-center w-9 h-9 rounded-lg text-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                              emojiGrupo === "recientes"
                                ? "bg-crm-primary/10 ring-1 ring-crm-primary/30"
                                : "hover:bg-crm-card-hover"
                            }`}
                          >
                            🕘
                          </button>
                          <div className="w-px h-5 bg-crm-border mx-0.5" />
                          {EMOJI_GRUPOS.map((g) => (
                            <button
                              key={g.id}
                              type="button"
                              onClick={() => setEmojiGrupo(g.id)}
                              title={g.label}
                              aria-label={g.label}
                              aria-pressed={emojiGrupo === g.id}
                              className={`flex items-center justify-center w-9 h-9 rounded-lg text-lg transition-all ${
                                emojiGrupo === g.id
                                  ? "bg-crm-primary/10 ring-1 ring-crm-primary/30 scale-105"
                                  : "hover:bg-crm-card-hover opacity-70 hover:opacity-100"
                              }`}
                            >
                              {g.icon}
                            </button>
                          ))}
                        </div>
                      )}

                      <div className="px-3 pt-2 pb-1 flex items-center justify-between">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-crm-text-muted">
                          {emojiBusqueda
                            ? `Resultados (${emojisVisibles.length})`
                            : emojiGrupo === "recientes"
                              ? "Recientes"
                              : EMOJI_GRUPOS.find((g) => g.id === emojiGrupo)?.label}
                        </span>
                      </div>

                      <div className="px-2 pb-2 max-h-64 overflow-y-auto">
                        {emojisVisibles.length === 0 ? (
                          <div className="py-8 text-center text-xs text-crm-text-muted">
                            {emojiBusqueda
                              ? `Sin resultados para “${emojiBusqueda}”`
                              : "Aún no usaste emojis. Elige una categoría arriba."}
                          </div>
                        ) : (
                          <div className="grid grid-cols-8 gap-0.5">
                            {emojisVisibles.map((it) => (
                              <button
                                key={it.e}
                                type="button"
                                onClick={() => insertarEmoji(it.e)}
                                className="text-xl w-9 h-9 flex items-center justify-center rounded-lg hover:bg-crm-primary/10 hover:scale-125 active:scale-95 transition-transform"
                                title={it.k || it.e}
                              >
                                {it.e}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
            <textarea
              ref={textareaRef}
              value={form.body_texto}
              onChange={(e) =>
                setForm((f) => ({ ...f, body_texto: e.target.value }))
              }
              required
              rows={6}
              placeholder={`Hola {{cliente}}, gracias por tu interés en {{proyecto}}...`}
              className="w-full px-3 py-2 bg-crm-bg-secondary border border-crm-border rounded-lg text-sm text-crm-text-primary font-mono"
            />
            <div className="flex flex-wrap gap-1 mt-2 items-center">
              <span className="text-xs text-crm-text-muted">
                Insertar:
              </span>
              {["cliente", "proyecto", "vendedor", "monto", "fecha"].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => insertarVariable(v)}
                  className="px-2 py-0.5 text-xs bg-crm-info/10 text-crm-info rounded border border-crm-info/20 hover:bg-crm-info/20"
                >
                  + {`{{${v}}}`}
                </button>
              ))}
              <button
                type="button"
                onClick={() => insertarEnCursor("{{#tieneReserva}}\n[texto si tiene reserva]\n{{/tieneReserva}}")}
                className="px-2 py-0.5 text-xs bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 rounded border border-purple-200 dark:border-purple-800 hover:bg-purple-200 dark:hover:bg-purple-900/40"
                title="Bloque condicional (si var es verdadera)"
              >
                + {`{{#…}}…{{/…}}`}
              </button>
              {snippets.length > 0 && (
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      insertarEnCursor(`{{>${e.target.value}}}`);
                      e.target.value = "";
                    }
                  }}
                  defaultValue=""
                  className="px-2 py-0.5 text-xs bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded border border-emerald-200 dark:border-emerald-800"
                  title="Insertar snippet reutilizable"
                >
                  <option value="">+ Snippet…</option>
                  {snippets.map((s) => (
                    <option key={s.slug} value={s.slug}>
                      {`{{>${s.slug}}}`} — {s.nombre}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <p className="text-[10px] text-crm-text-muted mt-1.5 leading-relaxed">
              <strong>Sintaxis:</strong> <code>{`{{var}}`}</code> variable ·{" "}
              <code>{`{{#var}}…{{/var}}`}</code> condicional ·{" "}
              <code>{`{{^var}}…{{/var}}`}</code> si NO ·{" "}
              <code>{`{{>slug}}`}</code> snippet
            </p>
          </div>

          {/* Multimedia */}
          <div>
            <label className="block text-xs font-medium text-crm-text-muted uppercase mb-1 flex items-center gap-1">
              <Paperclip className="w-3 h-3" />
              Adjunto (opcional)
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={form.media_url}
                onChange={(e) => {
                  const v = e.target.value;
                  setForm((f) => ({
                    ...f,
                    media_url: v,
                    media_tipo: f.media_tipo || detectarMediaTipo(v) || "",
                  }));
                }}
                placeholder="https://… (imagen, PDF, video o audio)"
                className="flex-1 px-3 py-2 bg-crm-bg-secondary border border-crm-border rounded-lg text-sm text-crm-text-primary"
              />
              {form.media_url && (
                <select
                  value={form.media_tipo}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, media_tipo: e.target.value as MediaTipo | "" }))
                  }
                  className="px-3 py-2 bg-crm-bg-secondary border border-crm-border rounded-lg text-sm text-crm-text-primary"
                >
                  <option value="">Auto</option>
                  {MEDIA_TIPOS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <p className="text-[10px] text-crm-text-muted mt-1">
              WhatsApp Web genera preview automático cuando la URL va al inicio del mensaje.
            </p>
          </div>

          {(variablesDetectadas.length > 0 ||
            seccionesDetectadas.length > 0 ||
            snippetsUsados.length > 0) && (
            <div className="bg-crm-bg-secondary border border-crm-border rounded-lg p-3 space-y-2">
              {variablesDetectadas.length > 0 && (
                <div>
                  <p className="text-[11px] font-medium text-crm-text-muted uppercase mb-1">
                    Variables ({variablesDetectadas.length})
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {variablesDetectadas.map((v) => (
                      <span
                        key={v}
                        className="px-2 py-0.5 text-xs bg-crm-info/10 text-crm-info rounded"
                      >
                        {`{{${v}}}`}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {seccionesDetectadas.length > 0 && (
                <div>
                  <p className="text-[11px] font-medium text-crm-text-muted uppercase mb-1">
                    Condicionales ({seccionesDetectadas.length})
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {seccionesDetectadas.map((s) => (
                      <span
                        key={s}
                        className="px-2 py-0.5 text-xs bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 rounded"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {snippetsUsados.length > 0 && (
                <div>
                  <p className="text-[11px] font-medium text-crm-text-muted uppercase mb-1">
                    Snippets ({snippetsUsados.length})
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {snippetsUsados.map((s) => {
                      const existe = !!snippetsMap[s];
                      return (
                        <span
                          key={s}
                          className={`px-2 py-0.5 text-xs rounded ${
                            existe
                              ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
                              : "bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800"
                          }`}
                          title={existe ? snippetsMap[s] : "Snippet no encontrado"}
                        >
                          {`{{>${s}}}`}
                          {!existe && " ⚠"}
                        </span>
                      );
                    })}
                  </div>
                  {snippetsFaltantes.length > 0 && (
                    <p className="text-[10px] text-red-600 dark:text-red-400 mt-1">
                      Snippets no encontrados: {snippetsFaltantes.join(", ")}. Créalos en
                      Marketing → Snippets.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {form.body_texto && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-crm-text-muted uppercase">
                  Vista previa
                </label>
                <span className="text-[10px] text-crm-text-muted italic">
                  con datos de ejemplo
                </span>
              </div>
              <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl p-3 text-sm text-green-900 dark:text-green-50 whitespace-pre-wrap">
                {previewSample}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-crm-text-muted uppercase mb-1">
              Objetivo (opcional)
            </label>
            <input
              type="text"
              value={form.objetivo}
              onChange={(e) =>
                setForm((f) => ({ ...f, objetivo: e.target.value }))
              }
              placeholder="Ej: Convertir lead a visita"
              className="w-full px-3 py-2 bg-crm-bg-secondary border border-crm-border rounded-lg text-sm text-crm-text-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-crm-text-muted uppercase mb-1">
              Estado de cliente sugerido
            </label>
            <p className="text-[11px] text-crm-text-muted mb-2">
              Al marcar un estado, la plantilla aparece destacada cuando el cliente esté en ese estado.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {ESTADOS_CLIENTE_SUGERIDOS.map((e) => {
                const activo = form.tags.includes(e.value);
                return (
                  <button
                    key={e.value}
                    type="button"
                    onClick={() => setForm((f) => ({
                      ...f,
                      tags: activo ? f.tags.filter((t) => t !== e.value) : [...f.tags, e.value],
                    }))}
                    className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                      activo
                        ? "bg-crm-primary text-white border-crm-primary"
                        : "bg-crm-bg-secondary text-crm-text-secondary border-crm-border hover:bg-crm-card-hover"
                    }`}
                  >
                    {activo ? "★ " : ""}{e.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-crm-text-muted uppercase mb-1">
              Tags adicionales
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    agregarTag();
                  }
                }}
                placeholder="Agregar tag…"
                className="flex-1 px-3 py-2 bg-crm-bg-secondary border border-crm-border rounded-lg text-sm text-crm-text-primary"
              />
              <button
                type="button"
                onClick={agregarTag}
                className="px-3 py-2 bg-crm-card-hover text-crm-text-primary rounded-lg hover:bg-crm-border"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {form.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {form.tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-crm-primary/10 text-crm-primary rounded"
                  >
                    {t}
                    <button
                      type="button"
                      onClick={() => eliminarTag(t)}
                      className="hover:text-crm-error"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm text-crm-text-primary">
            <input
              type="checkbox"
              checked={form.activo}
              onChange={(e) =>
                setForm((f) => ({ ...f, activo: e.target.checked }))
              }
              className="w-4 h-4"
            />
            Plantilla activa (disponible para envío)
          </label>
        </form>

        <div className="flex justify-end gap-3 p-5 border-t border-crm-border">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm text-crm-text-secondary border border-crm-border rounded-lg hover:bg-crm-card-hover"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 text-sm bg-crm-primary text-white rounded-lg hover:bg-crm-primary-hover flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {esEdicion ? "Guardar cambios" : "Crear plantilla"}
          </button>
        </div>
      </div>
    </div>
  );
}
