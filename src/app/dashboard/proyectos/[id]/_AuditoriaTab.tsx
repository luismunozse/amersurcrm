"use client";

import { useEffect, useState, useTransition } from "react";
import { History, FilePlus2, FileMinus2, FilePenLine, AlertCircle } from "lucide-react";
import {
  obtenerAuditoriaProyecto,
  type AuditoriaEntry,
  type AuditoriaCambioCampo,
} from "./_auditoria-actions";

interface Props {
  proyectoId: string;
}

const PAGE_SIZE = 10;

const ACCION_LABEL: Record<AuditoriaEntry["accion"], string> = {
  insert: "Creación",
  update: "Modificación",
  delete: "Eliminación",
};

const ENTIDAD_LABEL: Record<AuditoriaEntry["entidad_tipo"], string> = {
  proyecto: "Proyecto",
  lote: "Lote",
};

function isCambioCampo(value: unknown): value is AuditoriaCambioCampo {
  return (
    !!value &&
    typeof value === "object" &&
    "old" in (value as Record<string, unknown>) &&
    "new" in (value as Record<string, unknown>)
  );
}

function formatValor(valor: unknown): string {
  if (valor === null || valor === undefined) return "—";
  if (typeof valor === "string") return valor.length > 80 ? `${valor.slice(0, 80)}…` : valor;
  if (typeof valor === "number" || typeof valor === "boolean") return String(valor);
  try {
    const s = JSON.stringify(valor);
    return s.length > 80 ? `${s.slice(0, 80)}…` : s;
  } catch {
    return "[no serializable]";
  }
}

function formatCampoNombre(campo: string): string {
  return campo.replace(/_/g, " ");
}

const fechaFormatter = new Intl.DateTimeFormat("es-PE", {
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function formatFecha(iso: string): string {
  try {
    return fechaFormatter.format(new Date(iso));
  } catch {
    return iso;
  }
}

function AccionIcon({ accion }: { accion: AuditoriaEntry["accion"] }) {
  if (accion === "insert") {
    return <FilePlus2 className="w-4 h-4 text-green-600" />;
  }
  if (accion === "delete") {
    return <FileMinus2 className="w-4 h-4 text-red-600" />;
  }
  return <FilePenLine className="w-4 h-4 text-blue-600" />;
}

function CambiosResumen({ entry }: { entry: AuditoriaEntry }) {
  const { cambios, accion } = entry;
  if (!cambios || typeof cambios !== "object") {
    return <p className="text-sm text-crm-text-muted">Sin detalles</p>;
  }

  const keys = Object.keys(cambios);
  if (keys.length === 0) {
    return <p className="text-sm text-crm-text-muted">Sin cambios registrados</p>;
  }

  if (accion === "update") {
    return (
      <ul className="space-y-1 text-sm">
        {keys.map((campo) => {
          const valor = (cambios as Record<string, unknown>)[campo];
          if (isCambioCampo(valor)) {
            return (
              <li key={campo} className="font-mono text-xs sm:text-sm">
                <span className="font-semibold text-crm-text-primary">
                  {formatCampoNombre(campo)}:
                </span>{" "}
                <span className="text-crm-text-secondary line-through">{formatValor(valor.old)}</span>
                <span className="mx-1 text-crm-text-muted">→</span>
                <span className="text-crm-text-primary">{formatValor(valor.new)}</span>
              </li>
            );
          }
          return (
            <li key={campo} className="font-mono text-xs sm:text-sm">
              <span className="font-semibold text-crm-text-primary">
                {formatCampoNombre(campo)}:
              </span>{" "}
              <span className="text-crm-text-primary">{formatValor(valor)}</span>
            </li>
          );
        })}
      </ul>
    );
  }

  // INSERT o DELETE: lista plana campo: valor
  return (
    <ul className="space-y-1 text-sm">
      {keys.map((campo) => (
        <li key={campo} className="font-mono text-xs sm:text-sm">
          <span className="font-semibold text-crm-text-primary">
            {formatCampoNombre(campo)}:
          </span>{" "}
          <span className="text-crm-text-primary">
            {formatValor((cambios as Record<string, unknown>)[campo])}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function AuditoriaTab({ proyectoId }: Props) {
  const [entries, setEntries] = useState<AuditoriaEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accesoDenegado, setAccesoDenegado] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelado = false;
    setLoading(true);
    setError(null);
    setAccesoDenegado(false);

    obtenerAuditoriaProyecto(proyectoId, { limit: PAGE_SIZE, offset: 0 })
      .then((res) => {
        if (cancelado) return;
        if (res.error) {
          const denegado = /Solo administradores|Permiso denegado|autorizado|autenticado/i.test(
            res.error,
          );
          if (denegado) {
            setAccesoDenegado(true);
          } else {
            setError(res.error);
          }
          setEntries([]);
          setTotal(0);
        } else {
          setEntries(res.data);
          setTotal(res.total);
          setOffset(res.data.length);
        }
      })
      .catch((err: unknown) => {
        if (cancelado) return;
        setError(err instanceof Error ? err.message : "Error cargando auditoría");
      })
      .finally(() => {
        if (!cancelado) setLoading(false);
      });

    return () => {
      cancelado = true;
    };
  }, [proyectoId]);

  const cargarMas = () => {
    startTransition(async () => {
      const res = await obtenerAuditoriaProyecto(proyectoId, {
        limit: PAGE_SIZE,
        offset,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      setEntries((prev) => [...prev, ...res.data]);
      setTotal(res.total);
      setOffset((prev) => prev + res.data.length);
    });
  };

  if (accesoDenegado) {
    return (
      <div className="crm-card p-6 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-crm-text-muted flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-crm-text-primary">Sin acceso</h3>
          <p className="text-sm text-crm-text-secondary mt-1">
            La auditoría está disponible únicamente para administradores y coordinadores.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="crm-card p-6">
        <p className="text-sm text-crm-text-secondary">Cargando auditoría…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="crm-card p-6 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-crm-text-primary">No se pudo cargar la auditoría</h3>
          <p className="text-sm text-crm-text-secondary mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="crm-card p-6 flex items-start gap-3">
        <History className="w-5 h-5 text-crm-text-muted flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-crm-text-primary">Sin actividad registrada</h3>
          <p className="text-sm text-crm-text-secondary mt-1">
            Aún no hay cambios auditados sobre este proyecto ni sus lotes.
          </p>
        </div>
      </div>
    );
  }

  const hayMas = entries.length < total;

  return (
    <div className="space-y-4">
      <div className="crm-card p-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-crm-accent" />
          <h2 className="font-semibold text-crm-text-primary">Auditoría del proyecto</h2>
        </div>
        <span className="text-sm text-crm-text-secondary">
          {entries.length} de {total} {total === 1 ? "registro" : "registros"}
        </span>
      </div>

      <ul className="space-y-3">
        {entries.map((entry) => (
          <li key={entry.id} className="crm-card p-4 space-y-3">
            <header className="flex flex-wrap items-center gap-3 text-sm">
              <AccionIcon accion={entry.accion} />
              <span className="font-semibold text-crm-text-primary">
                {ACCION_LABEL[entry.accion]}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-crm-card-hover text-xs text-crm-text-secondary">
                {ENTIDAD_LABEL[entry.entidad_tipo]}
              </span>
              <span className="text-crm-text-muted">·</span>
              <span className="text-crm-text-secondary">
                {entry.usuario_username ? `@${entry.usuario_username}` : "Sistema"}
              </span>
              <span className="text-crm-text-muted">·</span>
              <time className="text-crm-text-secondary">{formatFecha(entry.created_at)}</time>
            </header>
            <CambiosResumen entry={entry} />
          </li>
        ))}
      </ul>

      {hayMas && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={cargarMas}
            disabled={isPending}
            className="crm-button-secondary px-4 py-2 rounded-lg text-sm disabled:opacity-50"
          >
            {isPending ? "Cargando…" : "Cargar más"}
          </button>
        </div>
      )}
    </div>
  );
}
