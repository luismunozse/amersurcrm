"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  X,
  MapPin,
  Ruler,
  DollarSign,
  User,
  Phone,
  Mail,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Share2,
  Edit,
  FileText,
  Image as ImageIcon,
  Map,
  Box,
  ExternalLink,
  Copy,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { obtenerDetalleLote } from "./_actions";

type LoteBasico = {
  id: string;
  codigo: string;
  sup_m2: number | null;
  precio: number | null;
  moneda: string | null;
  estado: "disponible" | "reservado" | "vendido";
  created_at?: string;
  proyecto?: { id: string; nombre: string } | null;
  data?: any;
};

type LoteDetalle = {
  lote: any;
  reserva: any | null;
  cliente: any | null;
  proyecto: any | null;
};

interface Props {
  open: boolean;
  onClose: () => void;
  lote: LoteBasico | null;
  proyectoId: string;
  onReservar?: () => void;
  onEditar?: () => void;
}

export default function LoteDetailModal({
  open,
  onClose,
  lote,
  proyectoId,
  onReservar,
  onEditar,
}: Props) {
  const [detalle, setDetalle] = useState<LoteDetalle | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"info" | "fotos" | "plano" | "3d">("info");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Cargar detalle completo al abrir
  useEffect(() => {
    if (open && lote) {
      setLoading(true);
      obtenerDetalleLote(lote.id)
        .then(({ data, error }) => {
          if (error) {
            console.error(error);
          } else if (data) {
            setDetalle(data);
          }
        })
        .finally(() => setLoading(false));
    } else {
      setDetalle(null);
      setActiveTab("info");
      setCurrentImageIndex(0);
    }
  }, [open, lote]);

  if (!open || !lote) return null;

  const d = parseData(lote.data);
  const fotos = Array.isArray(d?.fotos) ? d.fotos : [];
  const plano = d?.plano || null;
  const renders = Array.isArray(d?.renders) ? d.renders : [];
  const links3D = Array.isArray(d?.links3D) ? d.links3D : [];
  const allImages = [...fotos, ...renders];

  const precioFmt = (precio: number | null, moneda: string | null) => {
    if (!precio) return "Sin precio";
    try {
      const currency = moneda || "PEN";
      const f = new Intl.NumberFormat("es-PE", {
        style: "currency",
        currency: currency as any,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      });
      return f.format(precio).replace("PEN", "S/");
    } catch {
      return `S/ ${precio.toLocaleString("es-PE")}`;
    }
  };

  const precioM2 =
    lote.precio && lote.sup_m2
      ? Math.round(lote.precio / lote.sup_m2)
      : null;

  const estadoConfig = {
    disponible: {
      icon: CheckCircle,
      color: "text-green-500",
      bg: "bg-green-500/10",
      border: "border-green-500/30",
      label: "Disponible",
    },
    reservado: {
      icon: Clock,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      border: "border-amber-500/30",
      label: "Reservado",
    },
    vendido: {
      icon: XCircle,
      color: "text-red-500",
      bg: "bg-red-500/10",
      border: "border-red-500/30",
      label: "Vendido",
    },
  };

  const estado = estadoConfig[lote.estado];
  const EstadoIcon = estado.icon;

  const copyLink = async () => {
    try {
      const url = `${window.location.origin}/dashboard/proyectos/${proyectoId}?lote=${lote.id}`;
      await navigator.clipboard.writeText(url);
      toast.success("Enlace copiado");
    } catch {
      toast.error("No se pudo copiar");
    }
  };

  const cliente = detalle?.cliente;
  const reserva = detalle?.reserva;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full md:max-w-2xl md:mx-4 bg-crm-card border-t md:border border-crm-border md:rounded-2xl shadow-2xl max-h-[92vh] md:max-h-[85vh] flex flex-col overflow-hidden animate-slide-up">
        {/* Header fijo */}
        <div className="shrink-0 border-b border-crm-border bg-crm-card/95 backdrop-blur-sm">
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 py-3 md:px-6 md:py-4">
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-xl ${estado.bg} ${estado.border} border`}
              >
                <EstadoIcon className={`w-5 h-5 ${estado.color}`} />
              </div>
              <div>
                <h2 className="text-lg md:text-xl font-bold text-crm-text-primary">
                  Lote {lote.codigo}
                </h2>
                <p className="text-xs text-crm-text-muted">
                  {detalle?.proyecto?.nombre || lote.proyecto?.nombre || "Proyecto"}
                  {d?.manzana && ` • Mz. ${d.manzana}`}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-crm-text-muted hover:text-crm-text-primary hover:bg-crm-card-hover rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Precio destacado */}
          <div className="px-4 pb-3 md:px-6 md:pb-4">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-2xl md:text-3xl font-bold text-crm-primary">
                {precioFmt(lote.precio, lote.moneda)}
              </span>
              {lote.sup_m2 && (
                <span className="text-sm text-crm-text-muted">
                  {lote.sup_m2} m²
                  {precioM2 && ` • S/ ${precioM2.toLocaleString()}/m²`}
                </span>
              )}
            </div>
          </div>

          {/* Tabs - Solo si hay contenido multimedia */}
          {(allImages.length > 0 || plano || links3D.length > 0) && (
            <div className="flex gap-1 px-4 md:px-6 overflow-x-auto scrollbar-hide">
              <TabButton
                active={activeTab === "info"}
                onClick={() => setActiveTab("info")}
                icon={<FileText className="w-4 h-4" />}
                label="Info"
              />
              {allImages.length > 0 && (
                <TabButton
                  active={activeTab === "fotos"}
                  onClick={() => setActiveTab("fotos")}
                  icon={<ImageIcon className="w-4 h-4" />}
                  label={`Fotos (${allImages.length})`}
                />
              )}
              {plano && (
                <TabButton
                  active={activeTab === "plano"}
                  onClick={() => setActiveTab("plano")}
                  icon={<Map className="w-4 h-4" />}
                  label="Plano"
                />
              )}
              {links3D.length > 0 && (
                <TabButton
                  active={activeTab === "3d"}
                  onClick={() => setActiveTab("3d")}
                  icon={<Box className="w-4 h-4" />}
                  label="3D"
                />
              )}
            </div>
          )}
        </div>

        {/* Contenido scrolleable */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-crm-primary" />
            </div>
          ) : (
            <>
              {/* Tab: Info */}
              {activeTab === "info" && (
                <div className="p-4 md:p-6 space-y-5">
                  {/* Cliente (si reservado/vendido) */}
                  {cliente && (
                    <div className={`p-4 rounded-xl border ${estado.border} ${estado.bg}`}>
                      <div className="flex items-center gap-2 mb-3">
                        <User className={`w-4 h-4 ${estado.color}`} />
                        <span className={`text-sm font-semibold ${estado.color}`}>
                          {lote.estado === "reservado" ? "Reservado por" : "Vendido a"}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <p className="font-semibold text-crm-text-primary">
                          {cliente.nombre}
                        </p>
                        <div className="flex flex-wrap gap-3 text-sm">
                          {cliente.telefono && (
                            <a
                              href={`tel:${cliente.telefono}`}
                              className="inline-flex items-center gap-1.5 text-crm-text-secondary hover:text-crm-primary transition-colors"
                            >
                              <Phone className="w-3.5 h-3.5" />
                              {cliente.telefono}
                            </a>
                          )}
                          {cliente.email && (
                            <a
                              href={`mailto:${cliente.email}`}
                              className="inline-flex items-center gap-1.5 text-crm-text-secondary hover:text-crm-primary transition-colors"
                            >
                              <Mail className="w-3.5 h-3.5" />
                              {cliente.email}
                            </a>
                          )}
                        </div>
                        {reserva && (
                          <div className="flex items-center gap-2 text-xs text-crm-text-muted pt-2 border-t border-crm-border/50 mt-2">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>
                              {reserva.created_at
                                ? `Desde ${formatDate(reserva.created_at)}`
                                : "Fecha no disponible"}
                            </span>
                            {reserva.codigo_reserva && (
                              <span className="ml-auto font-mono text-[10px] bg-crm-card px-2 py-0.5 rounded">
                                {reserva.codigo_reserva}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Características */}
                  <div>
                    <h3 className="text-sm font-semibold text-crm-text-primary mb-3">
                      Características
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <InfoCard
                        icon={<Ruler className="w-4 h-4" />}
                        label="Superficie"
                        value={lote.sup_m2 ? `${lote.sup_m2} m²` : "—"}
                      />
                      <InfoCard
                        icon={<DollarSign className="w-4 h-4" />}
                        label="Precio/m²"
                        value={precioM2 ? `S/ ${precioM2.toLocaleString()}` : "—"}
                      />
                      {d?.manzana && (
                        <InfoCard
                          icon={<MapPin className="w-4 h-4" />}
                          label="Manzana"
                          value={d.manzana}
                        />
                      )}
                      {d?.numero && (
                        <InfoCard
                          icon={<FileText className="w-4 h-4" />}
                          label="Número"
                          value={d.numero}
                        />
                      )}
                      {d?.etapa && (
                        <InfoCard
                          icon={<Calendar className="w-4 h-4" />}
                          label="Etapa"
                          value={d.etapa}
                        />
                      )}
                      {d?.tipo_unidad && (
                        <InfoCard
                          icon={<Box className="w-4 h-4" />}
                          label="Tipo"
                          value={d.tipo_unidad}
                        />
                      )}
                    </div>
                  </div>

                  {/* Ubicación */}
                  {d?.ubicacion && (
                    <div>
                      <h3 className="text-sm font-semibold text-crm-text-primary mb-2">
                        Ubicación
                      </h3>
                      <p className="text-sm text-crm-text-secondary">
                        {d.ubicacion}
                      </p>
                    </div>
                  )}

                  {/* Condiciones */}
                  {d?.condiciones && (
                    <div>
                      <h3 className="text-sm font-semibold text-crm-text-primary mb-2">
                        Condiciones
                      </h3>
                      <p className="text-sm text-crm-text-secondary whitespace-pre-wrap">
                        {d.condiciones}
                      </p>
                    </div>
                  )}

                  {/* Descuento */}
                  {d?.descuento && d.descuento > 0 && (
                    <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-xl">
                      <div className="flex items-center gap-2">
                        <span className="text-green-500 text-sm font-semibold">
                          🏷️ Descuento disponible: {d.descuento}%
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Notas */}
                  {d?.notas && (
                    <div>
                      <h3 className="text-sm font-semibold text-crm-text-primary mb-2">
                        Notas
                      </h3>
                      <p className="text-sm text-crm-text-secondary whitespace-pre-wrap bg-crm-card-hover p-3 rounded-lg">
                        {d.notas}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Fotos */}
              {activeTab === "fotos" && allImages.length > 0 && (
                <div className="p-4 md:p-6">
                  {/* Imagen principal */}
                  <div className="relative aspect-video bg-crm-card-hover rounded-xl overflow-hidden mb-3">
                    <img
                      src={allImages[currentImageIndex]}
                      alt={`Lote ${lote.codigo} - Imagen ${currentImageIndex + 1}`}
                      className="w-full h-full object-contain"
                    />
                    {allImages.length > 1 && (
                      <>
                        <button
                          onClick={() =>
                            setCurrentImageIndex((i) =>
                              i === 0 ? allImages.length - 1 : i - 1
                            )
                          }
                          className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() =>
                            setCurrentImageIndex((i) =>
                              i === allImages.length - 1 ? 0 : i + 1
                            )
                          }
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/50 text-white text-xs rounded-full">
                          {currentImageIndex + 1} / {allImages.length}
                        </div>
                      </>
                    )}
                  </div>
                  {/* Thumbnails */}
                  {allImages.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                      {allImages.map((img, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCurrentImageIndex(idx)}
                          className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                            idx === currentImageIndex
                              ? "border-crm-primary"
                              : "border-transparent opacity-60 hover:opacity-100"
                          }`}
                        >
                          <img
                            src={img}
                            alt={`Thumbnail ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Plano */}
              {activeTab === "plano" && plano && (
                <div className="p-4 md:p-6">
                  <div className="aspect-square bg-crm-card-hover rounded-xl overflow-hidden">
                    <img
                      src={plano}
                      alt={`Plano del lote ${lote.codigo}`}
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              )}

              {/* Tab: 3D */}
              {activeTab === "3d" && links3D.length > 0 && (
                <div className="p-4 md:p-6 space-y-3">
                  <p className="text-sm text-crm-text-muted">
                    Tours virtuales y visualizaciones 3D
                  </p>
                  {links3D.map((link: string, idx: number) => (
                    <a
                      key={idx}
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-4 bg-crm-card-hover hover:bg-crm-border/50 rounded-xl transition-colors group"
                    >
                      <div className="p-2 bg-crm-primary/10 rounded-lg">
                        <Box className="w-5 h-5 text-crm-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-crm-text-primary truncate">
                          Tour Virtual {idx + 1}
                        </p>
                        <p className="text-xs text-crm-text-muted truncate">
                          {link}
                        </p>
                      </div>
                      <ExternalLink className="w-4 h-4 text-crm-text-muted group-hover:text-crm-primary transition-colors" />
                    </a>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer con acciones - Fijo en bottom */}
        <div className="shrink-0 border-t border-crm-border bg-crm-card/95 backdrop-blur-sm p-4 md:px-6">
          <div className="flex gap-2">
            {/* Acciones secundarias */}
            <button
              onClick={copyLink}
              className="p-3 text-crm-text-muted hover:text-crm-text-primary hover:bg-crm-card-hover rounded-xl transition-colors"
              title="Copiar enlace"
            >
              <Share2 className="w-5 h-5" />
            </button>
            
            {onEditar && (
              <button
                onClick={() => {
                  onClose();
                  onEditar();
                }}
                className="p-3 text-crm-text-muted hover:text-crm-text-primary hover:bg-crm-card-hover rounded-xl transition-colors"
                title="Editar lote"
              >
                <Edit className="w-5 h-5" />
              </button>
            )}

            {/* Acción principal según estado */}
            <div className="flex-1 flex gap-2">
              {lote.estado === "disponible" && onReservar && (
                <button
                  onClick={() => {
                    onClose();
                    onReservar();
                  }}
                  className="flex-1 py-3 px-4 bg-crm-primary hover:bg-crm-primary-hover text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  Reservar Lote
                </button>
              )}

              {lote.estado === "reservado" && cliente && (
                <a
                  href={`tel:${cliente.telefono}`}
                  className="flex-1 py-3 px-4 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <Phone className="w-5 h-5" />
                  Llamar Cliente
                </a>
              )}

              {lote.estado === "vendido" && (
                <Link
                  href={`/dashboard/clientes/${cliente?.id}`}
                  className="flex-1 py-3 px-4 bg-crm-secondary hover:bg-crm-secondary/90 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <User className="w-5 h-5" />
                  Ver Cliente
                </Link>
              )}

              {/* Botón cerrar si no hay acción principal */}
              {(lote.estado === "disponible" && !onReservar) ||
              (lote.estado === "reservado" && !cliente) ||
              (lote.estado === "vendido" && !cliente) ? (
                <button
                  onClick={onClose}
                  className="flex-1 py-3 px-4 bg-crm-card-hover hover:bg-crm-border text-crm-text-primary font-semibold rounded-xl transition-colors"
                >
                  Cerrar
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// Componentes auxiliares
function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap ${
        active
          ? "bg-crm-card text-crm-primary border-b-2 border-crm-primary -mb-px"
          : "text-crm-text-muted hover:text-crm-text-primary"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function InfoCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 p-3 bg-crm-card-hover rounded-xl">
      <div className="text-crm-text-muted">{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] text-crm-text-muted uppercase tracking-wide">
          {label}
        </p>
        <p className="text-sm font-medium text-crm-text-primary truncate">
          {value}
        </p>
      </div>
    </div>
  );
}

function parseData(data: any) {
  if (!data) return null;
  if (typeof data === "string") {
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }
  return data;
}

function formatDate(dateStr: string) {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("es-PE", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}
