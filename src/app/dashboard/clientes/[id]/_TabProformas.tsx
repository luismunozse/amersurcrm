"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Download, FilePlus2, FileText, PenSquare } from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import type { ProformaRecord } from "@/types/proforma";
import CrearProformaModal from "./_CrearProformaModal";
import { generarProformaPdf } from "@/components/proforma/generarProformaPdf";
import { useSearchParams } from "next/navigation";

interface TabProformasProps {
  cliente: any;
  proformas: ProformaRecord[];
  reservas: any[];
  ventas: any[];
  asesorActual: any | null;
}

function formatearFecha(fecha: string) {
  try {
    return new Date(fecha).toLocaleDateString("es-PE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return fecha;
  }
}

function formatearMoneda(valor: number | null | undefined, moneda: string) {
  if (valor === null || valor === undefined) return "—";
  try {
    const formato = new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: moneda === "USD" ? "USD" : "PEN",
      minimumFractionDigits: 2,
    });
    return formato.format(valor);
  } catch {
    return `${moneda} ${valor.toFixed(2)}`;
  }
}

export default function TabProformas({
  cliente,
  proformas,
  reservas,
  ventas,
  asesorActual,
}: TabProformasProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [proformaSeleccionada, setProformaSeleccionada] = useState<ProformaRecord | null>(null);
  const [isGenerating, startTransition] = useTransition();

  const proformasOrdenadas = useMemo(
    () =>
      [...(proformas || [])].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      ),
    [proformas],
  );

  const handleDescargar = (proforma: ProformaRecord) => {
    startTransition(async () => {
      try {
        await generarProformaPdf(proforma);
        toast.success("Proforma descargada");
      } catch (error) {
        console.error("Error generando PDF", error);
        toast.error("No se pudo generar la proforma");
      }
    });
  };

  useEffect(() => {
    if (!searchParams) return;
    const action = searchParams.get("action");
    if (action === "new") {
      setIsModalOpen(true);
      const params = new URLSearchParams(searchParams.toString());
      params.delete("action");
      const query = params.toString();
      if (typeof window !== "undefined") {
        const destination = query ? `${window.location.pathname}?${query}` : window.location.pathname;
        router.replace(destination, { scroll: false });
      }
    }
  }, [searchParams, router]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-crm-text">Proformas</h3>
          <p className="text-sm text-crm-text-muted">
            Genera proformas personalizadas para tu cliente antes de confirmar una reserva o venta.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-crm-primary text-white rounded-lg hover:bg-crm-primary-dark transition-colors"
        >
          <FilePlus2 className="w-4 h-4" />
          Nueva Proforma
        </button>
      </div>

      {proformasOrdenadas.length === 0 ? (
        <div className="text-center py-16 bg-crm-background rounded-xl border border-dashed border-crm-border">
          <FileText className="w-12 h-12 mx-auto text-crm-text-muted mb-4 opacity-50" />
          <h4 className="text-lg font-semibold text-crm-text mb-2">Sin proformas registradas</h4>
          <p className="text-sm text-crm-text-muted mb-4">
            Crea la primera proforma para este cliente y compártela antes de concretar la reserva.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 text-crm-primary hover:text-crm-primary/80 transition-colors"
          >
            <FilePlus2 className="w-4 h-4" />
            Crear proforma
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {proformasOrdenadas.map((proforma) => (
            <div
              key={proforma.id}
              className="border border-crm-border rounded-xl bg-crm-background p-4 hover:border-crm-primary/60 transition-colors"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-crm-text text-sm md:text-base">
                      {proforma.numero || "Sin número"}
                    </p>
                    <span
                      className={`
                        px-2 py-0.5 text-xs font-semibold rounded-full
                        ${
                          proforma.estado === "aprobada"
                            ? "bg-green-100 text-green-700"
                            : proforma.estado === "enviada"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-crm-card text-crm-text-muted border border-crm-border"
                        }
                      `}
                    >
                      {proforma.estado.toUpperCase()}
                    </span>
                    <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-crm-card text-crm-text-muted border border-crm-border">
                      {proforma.tipo_operacion.toUpperCase()}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-crm-text-muted">
                    Creada el {formatearFecha(proforma.created_at)}
                  </div>
                  {proforma.datos?.terreno?.proyecto && (
                    <div className="mt-1 text-sm text-crm-text">
                      {proforma.datos.terreno.proyecto} · Lote {proforma.datos.terreno.lote || "-"}
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm text-crm-text-muted">Importe final</p>
                    <p className="text-lg font-semibold text-crm-text">
                      {formatearMoneda(proforma.total, proforma.moneda)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setProformaSeleccionada(proforma);
                        setIsModalOpen(true);
                      }}
                      className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-crm-border rounded-lg text-crm-text hover:border-crm-primary transition-colors"
                    >
                      <PenSquare className="w-4 h-4" />
                      Editar
                    </button>
                    <button
                      onClick={() => handleDescargar(proforma)}
                      disabled={isGenerating}
                      className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-crm-primary text-white rounded-lg hover:bg-crm-primary-dark transition-colors disabled:opacity-60"
                    >
                      <Download className="w-4 h-4" />
                      Descargar
                    </button>
                  </div>
                </div>
              </div>

              {proforma.datos?.comentariosAdicionales && (
                <p className="mt-3 text-sm text-crm-text-muted">
                  {proforma.datos.comentariosAdicionales}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <CrearProformaModal
        key={proformaSeleccionada?.id || "crear-proforma"}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setProformaSeleccionada(null);
        }}
        cliente={cliente}
        reservas={reservas}
        ventas={ventas}
        asesorActual={asesorActual}
        proformaInicial={proformaSeleccionada}
        onCreated={(result, download) => {
          setIsModalOpen(false);
          setProformaSeleccionada(null);
          if (download && result) {
            handleDescargar(result);
          } else {
            toast.success("Proforma guardada correctamente");
          }
          router.refresh();
        }}
      />
    </div>
  );
}
