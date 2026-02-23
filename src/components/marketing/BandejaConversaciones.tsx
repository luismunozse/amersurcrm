"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  MessageSquare, User, Clock, CheckCircle, Archive, Send,
  Loader2, Check, CheckCheck, XCircle, ChevronLeft, Search,
  UserPlus, StickyNote, BellOff, Bell, TrendingUp, ChevronDown, ChevronUp,
} from "lucide-react";
import {
  obtenerConversaciones,
  actualizarEstadoConversacion,
  obtenerMensajesConversacion,
  asignarVendedorConversacion,
  actualizarNotasConversacion,
  toggleOptOut,
  registrarConversion,
  obtenerVendedores,
} from "@/app/dashboard/admin/marketing/_actions";
import type { MarketingConversacion, MarketingMensaje, EstadoConversacion, EstadoMensaje } from "@/types/whatsapp-marketing";
import toast from "react-hot-toast";

// ─────────────────────────────────────────────────────────
// Sub-componentes internos
// ─────────────────────────────────────────────────────────

function StatusTick({ estado }: { estado: EstadoMensaje }) {
  if (estado === "READ")
    return <CheckCheck className="w-3 h-3 text-blue-300 flex-shrink-0" />;
  if (estado === "DELIVERED")
    return <CheckCheck className="w-3 h-3 text-white/60 flex-shrink-0" />;
  if (estado === "SENT")
    return <Check className="w-3 h-3 text-white/60 flex-shrink-0" />;
  if (estado === "FAILED")
    return <XCircle className="w-3 h-3 text-red-300 flex-shrink-0" />;
  return <Clock className="w-3 h-3 text-white/40 flex-shrink-0" />;
}

function SeparadorFecha({ fecha }: { fecha: string }) {
  const label = new Date(fecha).toLocaleDateString("es-PE", {
    weekday: "short", day: "numeric", month: "short",
  });
  return (
    <div className="flex items-center gap-3 my-3">
      <div className="flex-1 h-px bg-crm-border" />
      <span className="text-[11px] text-crm-text-muted px-2 whitespace-nowrap">{label}</span>
      <div className="flex-1 h-px bg-crm-border" />
    </div>
  );
}

function BurbujaMensaje({ mensaje }: { mensaje: MarketingMensaje }) {
  const esOut = mensaje.direccion === "OUT";
  const hora = new Date(mensaje.sent_at || mensaje.created_at).toLocaleTimeString("es-PE", {
    hour: "2-digit", minute: "2-digit",
  });

  return (
    <div className={`flex ${esOut ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
          esOut
            ? "bg-crm-primary text-white rounded-br-sm"
            : "bg-crm-card-hover text-crm-text-primary rounded-bl-sm border border-crm-border"
        }`}
      >
        {mensaje.contenido_texto && (
          <p className="whitespace-pre-wrap break-words leading-relaxed">{mensaje.contenido_texto}</p>
        )}
        {!mensaje.contenido_texto && mensaje.contenido_tipo !== "TEXT" && (
          <p className="italic opacity-70">[{mensaje.contenido_tipo.toLowerCase()}]</p>
        )}
        <div className={`flex items-center gap-1 mt-1 ${esOut ? "justify-end" : "justify-start"}`}>
          <span className={`text-[10px] ${esOut ? "text-white/60" : "text-crm-text-muted"}`}>{hora}</span>
          {esOut && <StatusTick estado={mensaje.estado} />}
        </div>
      </div>
    </div>
  );
}

function ItemConversacion({
  conv,
  seleccionada,
  onSeleccionar,
}: {
  conv: MarketingConversacion;
  seleccionada: boolean;
  onSeleccionar: () => void;
}) {
  const nombre = conv.cliente?.nombre || conv.telefono;
  const subtitulo = conv.cliente?.nombre ? conv.telefono : undefined;
  const tiempo = conv.last_inbound_at
    ? formatTiempoRelativo(conv.last_inbound_at)
    : conv.updated_at
    ? formatTiempoRelativo(conv.updated_at)
    : null;

  const vendedor = (conv as any).vendedor_asignado;
  const optOut = (conv as any).cliente?.whatsapp_opt_out;

  return (
    <button
      onClick={onSeleccionar}
      className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors border-b border-crm-border/50 ${
        seleccionada
          ? "bg-crm-primary/10 border-l-2 border-l-crm-primary"
          : "hover:bg-crm-card-hover border-l-2 border-l-transparent"
      }`}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div className="w-10 h-10 bg-crm-primary/10 rounded-full flex items-center justify-center">
          <User className="w-5 h-5 text-crm-primary" />
        </div>
        {conv.is_session_open && (
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-crm-success rounded-full border-2 border-crm-card" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <span className="text-sm font-medium text-crm-text-primary truncate">{nombre}</span>
          {tiempo && (
            <span className="text-[10px] text-crm-text-muted flex-shrink-0">{tiempo}</span>
          )}
        </div>
        <div className="flex items-center justify-between gap-1 mt-0.5">
          <span className="text-xs text-crm-text-muted truncate">
            {subtitulo || `${conv.total_mensajes_in} recibidos · ${conv.total_mensajes_out} enviados`}
          </span>
          <div className="flex items-center gap-1 flex-shrink-0">
            {optOut && (
              <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium">Opt-out</span>
            )}
            {vendedor && (
              <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-medium truncate max-w-[60px]">
                {vendedor}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────
// Modal confirmación opt-out
// ─────────────────────────────────────────────────────────

function ModalOptOut({
  activar,
  onConfirmar,
  onCancelar,
}: {
  activar: boolean;
  onConfirmar: (motivo: string) => void;
  onCancelar: () => void;
}) {
  const [motivo, setMotivo] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-crm-card border border-crm-border rounded-2xl p-6 w-full max-w-sm shadow-crm-lg">
        <h3 className="text-base font-semibold text-crm-text-primary mb-2">
          {activar ? "Activar opt-out" : "Desactivar opt-out"}
        </h3>
        <p className="text-sm text-crm-text-secondary mb-4">
          {activar
            ? "El cliente dejará de recibir mensajes de marketing. Esta acción es reversible."
            : "El cliente volverá a recibir mensajes de marketing."}
        </p>
        {activar && (
          <div className="mb-4">
            <label className="text-xs font-medium text-crm-text-secondary mb-1 block">Motivo (opcional)</label>
            <input
              type="text"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej: Solicitado por el cliente"
              className="w-full border border-crm-border rounded-xl px-3 py-2 text-sm bg-transparent text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary"
            />
          </div>
        )}
        <div className="flex gap-2">
          <button
            onClick={onCancelar}
            className="flex-1 py-2 text-sm border border-crm-border rounded-xl text-crm-text-secondary hover:bg-crm-card-hover"
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirmar(motivo)}
            className={`flex-1 py-2 text-sm rounded-xl text-white font-medium ${
              activar ? "bg-red-500 hover:bg-red-600" : "bg-crm-success hover:bg-crm-success/90"
            }`}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Modal registrar conversión
// ─────────────────────────────────────────────────────────

function ModalConversion({
  onConfirmar,
  onCancelar,
}: {
  onConfirmar: (monto: number | undefined, nota: string) => void;
  onCancelar: () => void;
}) {
  const [monto, setMonto] = useState("");
  const [nota, setNota] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-crm-card border border-crm-border rounded-2xl p-6 w-full max-w-sm shadow-crm-lg">
        <h3 className="text-base font-semibold text-crm-text-primary mb-2 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-crm-success" />
          Registrar conversión
        </h3>
        <p className="text-sm text-crm-text-secondary mb-4">
          Marca esta conversación como una venta o conversión exitosa para el seguimiento de ROI.
        </p>
        <div className="space-y-3 mb-4">
          <div>
            <label className="text-xs font-medium text-crm-text-secondary mb-1 block">Monto (S/) — opcional</label>
            <input
              type="number"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              placeholder="0.00"
              className="w-full border border-crm-border rounded-xl px-3 py-2 text-sm bg-transparent text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-crm-text-secondary mb-1 block">Nota — opcional</label>
            <input
              type="text"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Ej: Departamento A3 vendido"
              className="w-full border border-crm-border rounded-xl px-3 py-2 text-sm bg-transparent text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onCancelar}
            className="flex-1 py-2 text-sm border border-crm-border rounded-xl text-crm-text-secondary hover:bg-crm-card-hover"
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirmar(monto ? parseFloat(monto) : undefined, nota)}
            className="flex-1 py-2 text-sm rounded-xl text-white font-medium bg-crm-success hover:bg-crm-success/90"
          >
            Registrar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────────────────

function formatTiempoRelativo(fecha: string) {
  const diff = Date.now() - new Date(fecha).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1) return "Ahora";
  if (m < 60) return `${m}m`;
  if (h < 24) return `${h}h`;
  return `${d}d`;
}

function esMismoDia(a: string, b: string) {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

// ─────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────

type FiltroEstado = "ABIERTA" | "CERRADA" | undefined;
type Vendedor = { username: string; nombre_completo: string | null; rol: string };

export default function BandejaConversaciones() {
  const [conversaciones, setConversaciones] = useState<MarketingConversacion[]>([]);
  const [mensajes, setMensajes] = useState<MarketingMensaje[]>([]);
  const [conversacionActual, setConversacionActual] = useState<MarketingConversacion | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>("ABIERTA");
  const [busqueda, setBusqueda] = useState("");
  const [vistaMovil, setVistaMovil] = useState<"lista" | "hilo">("lista");

  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMensajes, setLoadingMensajes] = useState(false);
  const [archivandoId, setArchivandoId] = useState<string | null>(null);
  const [mensajeTexto, setMensajeTexto] = useState("");
  const [enviandoMensaje, setEnviandoMensaje] = useState(false);

  // -- Assignment
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [asignandoVendedor, setAsignandoVendedor] = useState(false);

  // -- Notes
  const [notasTexto, setNotasTexto] = useState("");
  const [guardandoNotas, setGuardandoNotas] = useState(false);
  const [notasExpandidas, setNotasExpandidas] = useState(false);
  const notasDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // -- Opt-out
  const [modalOptOut, setModalOptOut] = useState<{ mostrar: boolean; activar: boolean } | null>(null);
  const [procesandoOptOut, setProcesandoOptOut] = useState(false);

  // -- Conversion
  const [modalConversion, setModalConversion] = useState(false);
  const [registrandoConversion, setRegistrandoConversion] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const isInitialLoad = useRef(true);

  // -- cargar vendedores una sola vez
  useEffect(() => {
    obtenerVendedores().then((r) => {
      if (r.data) setVendedores(r.data as Vendedor[]);
    });
  }, []);

  // -- cargar conversaciones
  const cargarConversaciones = useCallback(async () => {
    setLoadingConvs(true);
    const result = await obtenerConversaciones({ estado: filtroEstado as EstadoConversacion | undefined });
    if (result.error) toast.error(result.error);
    else if (result.data) setConversaciones(result.data);
    setLoadingConvs(false);
  }, [filtroEstado]);

  useEffect(() => { cargarConversaciones(); }, [cargarConversaciones]);

  // -- scroll al fondo cuando cargan/llegan mensajes
  useEffect(() => {
    if (!mensajes.length) return;
    bottomRef.current?.scrollIntoView({
      behavior: isInitialLoad.current ? "instant" : "smooth",
    });
    isInitialLoad.current = false;
  }, [mensajes]);

  // -- seleccionar conversación
  const seleccionarConversacion = async (conv: MarketingConversacion) => {
    setConversacionActual(conv);
    setVistaMovil("hilo");
    isInitialLoad.current = true;
    setMensajes([]);
    setNotasTexto((conv as any).notas_internas ?? "");
    setNotasExpandidas(false);
    setLoadingMensajes(true);
    const result = await obtenerMensajesConversacion(conv.id);
    if (result.error) toast.error(result.error);
    else if (result.data) setMensajes(result.data);
    setLoadingMensajes(false);
  };

  // -- enviar mensaje
  const enviarMensaje = async () => {
    if (!conversacionActual || !mensajeTexto.trim()) return;
    setEnviandoMensaje(true);
    try {
      const res = await fetch("/api/twilio/send-whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversacion_id: conversacionActual.id,
          telefono: conversacionActual.telefono,
          contenido_texto: mensajeTexto.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMensajeTexto("");
        const result = await obtenerMensajesConversacion(conversacionActual.id);
        if (result.data) setMensajes(result.data);
        cargarConversaciones();
      } else {
        toast.error(data.error || "Error enviando mensaje");
      }
    } catch {
      toast.error("Error enviando mensaje");
    } finally {
      setEnviandoMensaje(false);
    }
  };

  // -- archivar conversación
  const archivarConversacion = async () => {
    if (!conversacionActual) return;
    setArchivandoId(conversacionActual.id);
    const result = await actualizarEstadoConversacion(conversacionActual.id, "ARCHIVADA");
    if (result.success) {
      toast.success("Conversación archivada");
      setConversacionActual(null);
      setMensajes([]);
      setVistaMovil("lista");
      cargarConversaciones();
    } else {
      toast.error(result.error || "Error archivando");
    }
    setArchivandoId(null);
  };

  // -- asignar vendedor
  const handleAsignarVendedor = async (username: string) => {
    if (!conversacionActual) return;
    setAsignandoVendedor(true);
    const result = await asignarVendedorConversacion(conversacionActual.id, username);
    if (result.success) {
      toast.success("Conversación asignada");
      setConversacionActual((prev) => prev ? { ...prev, vendedor_asignado: username } as any : prev);
      cargarConversaciones();
    } else {
      toast.error(result.error || "Error asignando");
    }
    setAsignandoVendedor(false);
  };

  // -- actualizar notas con debounce
  const handleNotasChange = (valor: string) => {
    setNotasTexto(valor);
    if (notasDebounceRef.current) clearTimeout(notasDebounceRef.current);
    notasDebounceRef.current = setTimeout(async () => {
      if (!conversacionActual) return;
      setGuardandoNotas(true);
      await actualizarNotasConversacion(conversacionActual.id, valor);
      setGuardandoNotas(false);
    }, 800);
  };

  // -- toggle opt-out
  const handleOptOutConfirm = async (motivo: string) => {
    if (!conversacionActual || !modalOptOut) return;
    const clienteId = (conversacionActual as any).cliente_id;
    if (!clienteId) return;
    setProcesandoOptOut(true);
    const result = await toggleOptOut(clienteId, modalOptOut.activar, motivo);
    if (result.success) {
      toast.success(modalOptOut.activar ? "Opt-out activado" : "Opt-out desactivado");
      setConversacionActual((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          cliente: prev.cliente ? { ...prev.cliente, whatsapp_opt_out: modalOptOut.activar } : prev.cliente,
        } as any;
      });
      cargarConversaciones();
    } else {
      toast.error(result.error || "Error actualizando opt-out");
    }
    setProcesandoOptOut(false);
    setModalOptOut(null);
  };

  // -- registrar conversión
  const handleConversionConfirm = async (monto: number | undefined, nota: string) => {
    if (!conversacionActual) return;
    setRegistrandoConversion(true);
    const result = await registrarConversion(conversacionActual.id, monto, nota);
    if (result.success) {
      toast.success("Conversión registrada");
      setConversacionActual((prev) =>
        prev ? { ...prev, conversion_registrada_at: new Date().toISOString() } as any : prev
      );
    } else {
      toast.error(result.error || "Error registrando conversión");
    }
    setRegistrandoConversion(false);
    setModalConversion(false);
  };

  // -- filtrado por búsqueda
  const convsFiltradas = conversaciones.filter((c) => {
    if (!busqueda.trim()) return true;
    const q = busqueda.toLowerCase();
    return (
      c.telefono.includes(q) ||
      c.cliente?.nombre?.toLowerCase().includes(q) ||
      false
    );
  });

  // Info derivada de conversación actual
  const optOutActivo = !!(conversacionActual as any)?.cliente?.whatsapp_opt_out;
  const conversionRegistrada = !!(conversacionActual as any)?.conversion_registrada_at;
  const vendedorAsignado = (conversacionActual as any)?.vendedor_asignado as string | undefined;

  // ── Panel lista ──────────────────────────────────────────
  const PanelLista = (
    <div
      className={`flex flex-col h-full border-r border-crm-border bg-crm-card
        ${vistaMovil === "hilo" ? "hidden lg:flex" : "flex"} lg:flex`}
    >
      <div className="flex-shrink-0 p-3 border-b border-crm-border space-y-2">
        <div className="flex gap-1">
          {(["ABIERTA", "CERRADA", undefined] as FiltroEstado[]).map((f) => {
            const label = f === "ABIERTA" ? "Abiertas" : f === "CERRADA" ? "Cerradas" : "Todas";
            const activo = filtroEstado === f;
            return (
              <button
                key={String(f)}
                onClick={() => setFiltroEstado(f)}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  activo
                    ? "bg-crm-primary text-white"
                    : "text-crm-text-secondary hover:bg-crm-card-hover"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-crm-text-muted" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o teléfono..."
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-crm-border rounded-lg bg-crm-bg-primary text-crm-text-primary focus:outline-none focus:ring-1 focus:ring-crm-primary"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loadingConvs ? (
          <div className="p-3 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse flex items-center gap-3 px-1 py-2">
                <div className="w-10 h-10 bg-crm-border rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-crm-border rounded w-3/4" />
                  <div className="h-2.5 bg-crm-border rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : convsFiltradas.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <MessageSquare className="w-8 h-8 text-crm-text-muted mb-2" />
            <p className="text-sm text-crm-text-muted">
              {busqueda ? "Sin resultados" : "No hay conversaciones"}
            </p>
          </div>
        ) : (
          convsFiltradas.map((conv) => (
            <ItemConversacion
              key={conv.id}
              conv={conv}
              seleccionada={conversacionActual?.id === conv.id}
              onSeleccionar={() => seleccionarConversacion(conv)}
            />
          ))
        )}
      </div>
    </div>
  );

  // ── Panel hilo ───────────────────────────────────────────
  const PanelHilo = (
    <div
      className={`flex flex-col h-full bg-crm-bg-primary
        ${vistaMovil === "lista" ? "hidden lg:flex" : "flex"} lg:flex`}
    >
      {!conversacionActual ? (
        <div className="flex flex-col items-center justify-center h-full text-center p-8">
          <div className="w-16 h-16 bg-crm-primary/10 rounded-full flex items-center justify-center mb-4">
            <MessageSquare className="w-8 h-8 text-crm-primary" />
          </div>
          <h3 className="text-base font-semibold text-crm-text-primary mb-1">
            Selecciona una conversación
          </h3>
          <p className="text-sm text-crm-text-secondary max-w-xs">
            Elige una conversación de la lista para ver el historial de mensajes
          </p>
        </div>
      ) : (
        <>
          {/* Cabecera */}
          <div className="flex-shrink-0 border-b border-crm-border bg-crm-card">
            {/* Fila principal */}
            <div className="flex items-center gap-3 px-4 py-3">
              <button
                onClick={() => setVistaMovil("lista")}
                className="lg:hidden p-1 -ml-1 text-crm-text-secondary hover:text-crm-text-primary"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div className="relative flex-shrink-0">
                <div className="w-9 h-9 bg-crm-primary/10 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-crm-primary" />
                </div>
                {conversacionActual.is_session_open && (
                  <span className="absolute bottom-0 right-0 w-2 h-2 bg-crm-success rounded-full border-2 border-crm-card" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-crm-text-primary truncate">
                    {conversacionActual.cliente?.nombre || conversacionActual.telefono}
                  </p>
                  {optOutActivo && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full flex-shrink-0">
                      <BellOff className="w-2.5 h-2.5" />
                      Opt-out
                    </span>
                  )}
                  {conversionRegistrada && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-green-100 text-green-600 px-1.5 py-0.5 rounded-full flex-shrink-0">
                      <TrendingUp className="w-2.5 h-2.5" />
                      Conversión
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-crm-text-muted truncate">{conversacionActual.telefono}</p>
                  {conversacionActual.is_session_open ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-crm-success">
                      <CheckCircle className="w-3 h-3" />
                      Sesión activa
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] text-crm-text-muted">
                      <Clock className="w-3 h-3" />
                      Sesión cerrada
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                {/* Opt-out */}
                <button
                  onClick={() => setModalOptOut({ mostrar: true, activar: !optOutActivo })}
                  disabled={procesandoOptOut}
                  title={optOutActivo ? "Desactivar opt-out" : "Activar opt-out"}
                  className={`p-1.5 rounded-lg border transition-colors ${
                    optOutActivo
                      ? "border-red-200 bg-red-50 text-red-500 hover:bg-red-100"
                      : "border-crm-border text-crm-text-muted hover:text-crm-text-primary hover:bg-crm-card-hover"
                  }`}
                >
                  {optOutActivo ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
                </button>

                {/* Conversión */}
                {!conversionRegistrada && (
                  <button
                    onClick={() => setModalConversion(true)}
                    disabled={registrandoConversion}
                    title="Registrar conversión"
                    className="p-1.5 rounded-lg border border-crm-border text-crm-text-muted hover:text-crm-success hover:border-crm-success/40 hover:bg-crm-success/5 transition-colors"
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Archivar */}
                {conversacionActual.estado === "ABIERTA" && (
                  <button
                    onClick={archivarConversacion}
                    disabled={archivandoId === conversacionActual.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-crm-text-secondary border border-crm-border rounded-lg hover:bg-crm-card-hover transition-colors disabled:opacity-50"
                  >
                    {archivandoId === conversacionActual.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Archive className="w-3.5 h-3.5" />
                    )}
                    <span className="hidden sm:inline">Archivar</span>
                  </button>
                )}
              </div>
            </div>

            {/* Fila asignación */}
            <div className="flex items-center gap-2 px-4 py-2 border-t border-crm-border/50 bg-crm-card-hover/30">
              <UserPlus className="w-3.5 h-3.5 text-crm-text-muted flex-shrink-0" />
              <span className="text-xs text-crm-text-muted flex-shrink-0">Asignado a:</span>
              <select
                value={vendedorAsignado ?? ""}
                onChange={(e) => handleAsignarVendedor(e.target.value)}
                disabled={asignandoVendedor}
                className="flex-1 text-xs bg-transparent text-crm-text-primary border-none outline-none cursor-pointer disabled:opacity-50 min-w-0"
              >
                <option value="">— Sin asignar —</option>
                {vendedores.map((v) => (
                  <option key={v.username} value={v.username}>
                    {v.nombre_completo || v.username}
                  </option>
                ))}
              </select>
              {asignandoVendedor && <Loader2 className="w-3 h-3 animate-spin text-crm-text-muted flex-shrink-0" />}
            </div>
          </div>

          {/* Mensajes */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {loadingMensajes ? (
              <div className="space-y-4">
                {[false, true, false, true, true].map((esOut, i) => (
                  <div key={i} className={`flex ${esOut ? "justify-end" : "justify-start"} animate-pulse`}>
                    <div className={`h-10 rounded-2xl ${esOut ? "bg-crm-primary/20 w-48" : "bg-crm-border w-40"}`} />
                  </div>
                ))}
              </div>
            ) : mensajes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <MessageSquare className="w-8 h-8 text-crm-text-muted mb-2" />
                <p className="text-sm text-crm-text-muted">Sin mensajes registrados</p>
                <p className="text-xs text-crm-text-muted mt-1">Los mensajes de Twilio se registran aquí</p>
              </div>
            ) : (
              <div className="space-y-1">
                {mensajes.map((msg, idx) => {
                  const prevMsg = idx > 0 ? mensajes[idx - 1] : null;
                  const mostrarFecha = !prevMsg || !esMismoDia(prevMsg.created_at, msg.created_at);
                  return (
                    <div key={msg.id}>
                      {mostrarFecha && <SeparadorFecha fecha={msg.created_at} />}
                      <BurbujaMensaje mensaje={msg} />
                    </div>
                  );
                })}
              </div>
            )}
            <div ref={bottomRef} className="h-1" />
          </div>

          {/* Notas internas */}
          <div className="flex-shrink-0 border-t border-crm-border">
            <button
              onClick={() => setNotasExpandidas((v) => !v)}
              className="w-full flex items-center gap-2 px-4 py-2 text-xs hover:bg-amber-50/50 transition-colors"
            >
              <StickyNote className="w-3.5 h-3.5 text-amber-500" />
              <span className="font-medium text-amber-600">Notas internas</span>
              <span className="text-crm-text-muted ml-1">(no se envían al cliente)</span>
              {guardandoNotas && <Loader2 className="w-3 h-3 animate-spin ml-auto text-amber-500" />}
              {!guardandoNotas && (notasExpandidas
                ? <ChevronUp className="w-3.5 h-3.5 ml-auto text-crm-text-muted" />
                : <ChevronDown className="w-3.5 h-3.5 ml-auto text-crm-text-muted" />
              )}
            </button>
            {notasExpandidas && (
              <div className="px-4 pb-3 bg-amber-50/30">
                <textarea
                  value={notasTexto}
                  onChange={(e) => handleNotasChange(e.target.value)}
                  placeholder="Agrega notas internas sobre esta conversación..."
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-amber-200 rounded-xl bg-amber-50 text-crm-text-primary placeholder-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                />
              </div>
            )}
          </div>

          {/* Composición */}
          <div className="flex-shrink-0 border-t border-crm-border bg-crm-card">
            {optOutActivo && (
              <div className="px-4 pt-3 pb-0">
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-center gap-2">
                  <BellOff className="w-3.5 h-3.5 flex-shrink-0" />
                  Opt-out activo — este cliente no recibirá mensajes de marketing.
                </p>
              </div>
            )}
            {!conversacionActual.is_session_open && !optOutActivo && (
              <div className="px-4 pt-3 pb-0">
                <p className="text-xs text-crm-warning bg-crm-warning/10 border border-crm-warning/20 rounded-lg px-3 py-2">
                  La ventana de 24h está cerrada. Solo se pueden enviar plantillas aprobadas por WhatsApp desde la sección Campañas.
                </p>
              </div>
            )}
            <div className="flex items-end gap-2 p-3">
              <textarea
                value={mensajeTexto}
                onChange={(e) => setMensajeTexto(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    enviarMensaje();
                  }
                }}
                placeholder={
                  optOutActivo
                    ? "Opt-out activo — no se pueden enviar mensajes"
                    : conversacionActual.is_session_open
                    ? "Escribe un mensaje… (Enter para enviar)"
                    : "Sesión cerrada — usa Campañas para enviar plantillas"
                }
                disabled={!conversacionActual.is_session_open || optOutActivo}
                rows={2}
                className="flex-1 px-3 py-2 text-sm border border-crm-border rounded-xl bg-crm-bg-primary text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary resize-none disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                onClick={enviarMensaje}
                disabled={enviandoMensaje || !mensajeTexto.trim() || !conversacionActual.is_session_open || optOutActivo}
                className="flex-shrink-0 w-10 h-10 bg-crm-primary text-white rounded-xl flex items-center justify-center hover:bg-crm-primary-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {enviandoMensaje
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Send className="w-4 h-4" />
                }
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );

  return (
    <>
      {/* Modales */}
      {modalOptOut?.mostrar && (
        <ModalOptOut
          activar={modalOptOut.activar}
          onConfirmar={handleOptOutConfirm}
          onCancelar={() => setModalOptOut(null)}
        />
      )}
      {modalConversion && (
        <ModalConversion
          onConfirmar={handleConversionConfirm}
          onCancelar={() => setModalConversion(false)}
        />
      )}

      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-xl font-semibold text-crm-text-primary">Bandeja de Conversaciones</h2>
          <p className="text-sm text-crm-text-secondary mt-1">
            Gestiona las conversaciones de WhatsApp con tus clientes
          </p>
        </div>

        <div
          className="grid grid-cols-1 lg:grid-cols-[300px_1fr] border border-crm-border rounded-xl overflow-hidden"
          style={{ height: "calc(100vh - 260px)", minHeight: "540px" }}
        >
          {PanelLista}
          {PanelHilo}
        </div>
      </div>
    </>
  );
}
