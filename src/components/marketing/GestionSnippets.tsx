"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  Edit,
  Trash2,
  Puzzle,
  AlertTriangle,
  X,
  Copy,
  Loader2,
  Save,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  obtenerSnippets,
  crearSnippet,
  actualizarSnippet,
  eliminarSnippet,
} from "@/app/dashboard/admin/marketing/_actions";
import type { MarketingSnippet } from "@/types/whatsapp-marketing";

interface SnippetFormProps {
  snippet?: MarketingSnippet;
  onClose: () => void;
  onSuccess: () => void;
}

function SnippetFormModal({ snippet, onClose, onSuccess }: SnippetFormProps) {
  const esEdicion = !!snippet;
  const [loading, setLoading] = useState(false);
  const [slug, setSlug] = useState(snippet?.slug ?? "");
  const [nombre, setNombre] = useState(snippet?.nombre ?? "");
  const [contenido, setContenido] = useState(snippet?.contenido ?? "");
  const [descripcion, setDescripcion] = useState(snippet?.descripcion ?? "");

  const handleSubmit = async () => {
    if (!slug.trim() || !nombre.trim() || !contenido.trim()) {
      toast.error("Slug, nombre y contenido son obligatorios");
      return;
    }
    setLoading(true);
    try {
      const result = esEdicion
        ? await actualizarSnippet(snippet!.id, {
            nombre: nombre.trim(),
            contenido,
            descripcion: descripcion.trim(),
          })
        : await crearSnippet({
            slug: slug.trim(),
            nombre: nombre.trim(),
            contenido,
            descripcion: descripcion.trim() || undefined,
          });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(esEdicion ? "Snippet actualizado" : "Snippet creado");
      onSuccess();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in duration-150">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-crm-card border-t sm:border border-crm-border rounded-t-xl sm:rounded-xl shadow-xl w-full sm:max-w-lg max-h-[92vh] flex flex-col">
        <div className="flex items-start justify-between p-5 border-b border-crm-border">
          <div>
            <h4 className="text-lg font-semibold text-crm-text-primary flex items-center gap-2">
              <Puzzle className="w-5 h-5 text-crm-primary" />
              {esEdicion ? "Editar snippet" : "Nuevo snippet"}
            </h4>
            <p className="text-xs text-crm-text-muted mt-1">
              Fragmentos reutilizables invocados con <code>{`{{>slug}}`}</code> en plantillas.
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

        <div className="overflow-y-auto p-5 space-y-3 flex-1">
          <div>
            <label className="block text-xs font-medium text-crm-text-muted uppercase mb-1">
              Slug *
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) =>
                setSlug(
                  e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9_-]/g, "")
                    .slice(0, 40),
                )
              }
              disabled={esEdicion}
              placeholder="firma_asesor"
              className="w-full px-3 py-2 bg-crm-bg-secondary border border-crm-border rounded-lg text-sm text-crm-text-primary font-mono disabled:opacity-50"
            />
            <p className="text-[10px] text-crm-text-muted mt-1">
              Solo minúsculas, números, guiones. {esEdicion ? "No se puede cambiar." : "Empieza con letra."}
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-crm-text-muted uppercase mb-1">
              Nombre *
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Firma del asesor"
              className="w-full px-3 py-2 bg-crm-bg-secondary border border-crm-border rounded-lg text-sm text-crm-text-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-crm-text-muted uppercase mb-1">
              Descripción
            </label>
            <input
              type="text"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Cuándo usar este snippet"
              className="w-full px-3 py-2 bg-crm-bg-secondary border border-crm-border rounded-lg text-sm text-crm-text-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-crm-text-muted uppercase mb-1">
              Contenido *
            </label>
            <textarea
              value={contenido}
              onChange={(e) => setContenido(e.target.value)}
              rows={5}
              placeholder="Saludos cordiales,&#10;{{vendedor}}"
              className="w-full px-3 py-2 bg-crm-bg-secondary border border-crm-border rounded-lg text-sm text-crm-text-primary font-mono"
            />
            <p className="text-[10px] text-crm-text-muted mt-1">
              Puede incluir variables <code>{`{{var}}`}</code> que serán reemplazadas
              cuando la plantilla padre las defina.
            </p>
          </div>
        </div>

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
            {esEdicion ? "Guardar" : "Crear snippet"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmarEliminar({
  nombre,
  onConfirmar,
  onCancelar,
}: {
  nombre: string;
  onConfirmar: () => void;
  onCancelar: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in duration-150">
      <div className="fixed inset-0 bg-black/50" onClick={onCancelar} />
      <div className="relative bg-crm-card border-t sm:border border-crm-border rounded-t-xl sm:rounded-xl shadow-xl p-5 sm:p-6 w-full sm:max-w-sm">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 bg-crm-error/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-crm-error" />
          </div>
          <div>
            <h4 className="text-base font-semibold text-crm-text-primary">
              Eliminar snippet
            </h4>
            <p className="text-sm text-crm-text-secondary mt-1">
              ¿Eliminar <strong>&quot;{nombre}&quot;</strong>? Las plantillas que lo
              referencian dejarán de expandirlo.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancelar}
            className="px-4 py-2 text-sm text-crm-text-secondary border border-crm-border rounded-lg hover:bg-crm-card-hover"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirmar}
            className="px-4 py-2 text-sm bg-crm-error text-white rounded-lg hover:bg-crm-error/90"
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function GestionSnippets() {
  const [snippets, setSnippets] = useState<MarketingSnippet[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ snippet?: MarketingSnippet } | null>(null);
  const [confirmarEliminar, setConfirmarEliminar] = useState<MarketingSnippet | null>(
    null,
  );

  const cargar = async () => {
    setLoading(true);
    const result = await obtenerSnippets();
    if (result.error) {
      toast.error(result.error);
    } else if (result.data) {
      setSnippets(result.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    cargar();
  }, []);

  const handleEliminar = async () => {
    if (!confirmarEliminar) return;
    const result = await eliminarSnippet(confirmarEliminar.id);
    if (result.success) {
      toast.success("Snippet eliminado");
      setConfirmarEliminar(null);
      cargar();
    } else {
      toast.error(result.error || "Error");
    }
  };

  const copiar = (slug: string) => {
    navigator.clipboard.writeText(`{{>${slug}}}`);
    toast.success(`Copiado: {{>${slug}}}`);
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div
            key={idx}
            className="bg-crm-card border border-crm-border rounded-xl p-5 animate-pulse h-24"
          />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-crm-text-primary flex items-center gap-2">
              <Puzzle className="w-5 h-5 text-crm-primary" />
              Snippets reutilizables
            </h2>
            <p className="text-sm text-crm-text-secondary mt-1">
              Fragmentos compartidos entre plantillas. Invoca con{" "}
              <code className="px-1 bg-crm-bg-secondary rounded">{`{{>slug}}`}</code>.
            </p>
          </div>
          <button
            onClick={() => setModal({})}
            className="flex items-center gap-2 px-4 py-2 bg-crm-primary text-white rounded-lg hover:bg-crm-primary-hover"
          >
            <Plus className="w-4 h-4" />
            Nuevo snippet
          </button>
        </div>

        {snippets.length === 0 ? (
          <div className="bg-crm-card border border-crm-border rounded-xl p-12 text-center">
            <Puzzle className="w-12 h-12 text-crm-text-muted mx-auto mb-3" />
            <h3 className="text-lg font-medium text-crm-text-primary mb-2">
              Sin snippets
            </h3>
            <p className="text-sm text-crm-text-secondary mb-6">
              Crea fragmentos como firma, disclaimer u horarios para reusar en plantillas.
            </p>
            <button
              onClick={() => setModal({})}
              className="inline-flex items-center gap-2 px-4 py-2 bg-crm-primary text-white rounded-lg hover:bg-crm-primary-hover"
            >
              <Plus className="w-4 h-4" />
              Crear primer snippet
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {snippets.map((s) => (
              <div
                key={s.id}
                className="bg-crm-card border border-crm-border rounded-xl p-5 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-crm-text-primary truncate">
                      {s.nombre}
                    </h3>
                    <button
                      type="button"
                      onClick={() => copiar(s.slug)}
                      className="inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-300 hover:underline mt-0.5"
                      title="Copiar invocación al portapapeles"
                    >
                      <code className="font-mono">{`{{>${s.slug}}}`}</code>
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                {s.descripcion && (
                  <p className="text-xs text-crm-text-muted mb-2">{s.descripcion}</p>
                )}
                <pre className="text-xs bg-crm-bg-secondary border border-crm-border rounded-lg p-2 text-crm-text-secondary whitespace-pre-wrap line-clamp-4 font-mono">
                  {s.contenido}
                </pre>
                <div className="flex items-center gap-2 pt-3 mt-3 border-t border-crm-border">
                  <button
                    onClick={() => setModal({ snippet: s })}
                    className="inline-flex items-center justify-center w-8 h-8 text-crm-secondary hover:bg-crm-secondary/10 rounded-lg"
                    title="Editar"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setConfirmarEliminar(s)}
                    className="inline-flex items-center justify-center w-8 h-8 text-crm-error hover:bg-crm-error/10 rounded-lg ml-auto"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal && (
        <SnippetFormModal
          snippet={modal.snippet}
          onClose={() => setModal(null)}
          onSuccess={cargar}
        />
      )}

      {confirmarEliminar && (
        <ConfirmarEliminar
          nombre={confirmarEliminar.nombre}
          onConfirmar={handleEliminar}
          onCancelar={() => setConfirmarEliminar(null)}
        />
      )}
    </>
  );
}
