"use client";

import { useMemo, useState } from "react";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";

export type SortDir = "asc" | "desc";

export type SortAccessor<T, K extends string> = Record<K, (row: T) => string | number | null | undefined>;

export interface UseTableSortOptions<K extends string> {
  defaultKey: K;
  defaultDir?: SortDir;
  /** Para columnas que deben empezar en asc al primer click (default: desc para numéricas, asc para fechas/texto). */
  ascByDefault?: K[];
}

export interface UseTableSortResult<T, K extends string> {
  sortKey: K;
  sortDir: SortDir;
  sortedData: T[];
  handleSort: (key: K) => void;
  isActive: (key: K) => boolean;
}

export function useTableSort<T, K extends string>(
  data: T[],
  accessors: SortAccessor<T, K>,
  options: UseTableSortOptions<K>,
): UseTableSortResult<T, K> {
  const { defaultKey, defaultDir = "asc", ascByDefault = [] } = options;
  const [sortKey, setSortKey] = useState<K>(defaultKey);
  const [sortDir, setSortDir] = useState<SortDir>(defaultDir);

  const sortedData = useMemo(() => {
    const accessor = accessors[sortKey];
    if (!accessor) return data;
    const copy = [...data];
    copy.sort((a, b) => {
      const va = accessor(a);
      const vb = accessor(b);
      const aNull = va === null || va === undefined;
      const bNull = vb === null || vb === undefined;
      if (aNull && bNull) return 0;
      if (aNull) return 1;
      if (bNull) return -1;

      let cmp: number;
      if (typeof va === "number" && typeof vb === "number") {
        cmp = va - vb;
      } else {
        cmp = String(va).localeCompare(String(vb), "es", { numeric: true });
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [data, accessors, sortKey, sortDir]);

  const handleSort = (key: K) => {
    if (sortKey === key) {
      setSortDir((p) => (p === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(ascByDefault.includes(key) ? "asc" : "desc");
    }
  };

  return {
    sortKey,
    sortDir,
    sortedData,
    handleSort,
    isActive: (k: K) => k === sortKey,
  };
}

interface SortableHeaderProps<K extends string> {
  label: string;
  sortKey: K;
  current: K;
  dir: SortDir;
  onSort: (k: K) => void;
  align?: "left" | "right" | "center";
  /** className extra para el TH. */
  className?: string;
}

/**
 * Encabezado <th> clickable con icono direccional.
 * Diseñado para tablas plain HTML. Para CRMTable usar SortableTableHead (más abajo).
 */
export function SortableHeader<K extends string>({
  label,
  sortKey,
  current,
  dir,
  onSort,
  align = "right",
  className = "",
}: SortableHeaderProps<K>) {
  const isActive = current === sortKey;
  const Icon = !isActive ? ArrowUpDown : dir === "asc" ? ArrowUp : ArrowDown;
  const alignClass =
    align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  const flexAlign =
    align === "right" ? "flex-row-reverse" : align === "center" ? "justify-center" : "";

  return (
    <th
      onClick={() => onSort(sortKey)}
      className={`px-4 py-2 font-medium cursor-pointer select-none hover:text-crm-text-primary transition-colors ${alignClass} ${className}`}
      title="Ordenar"
    >
      <span className={`inline-flex items-center gap-1 ${flexAlign}`}>
        <span>{label}</span>
        <Icon className={`w-3 h-3 ${isActive ? "text-crm-primary" : "opacity-50"}`} />
      </span>
    </th>
  );
}

/**
 * Wrapper para CRMTableHead (componente del design system).
 * Renderiza el contenido clickable adentro del head ya estilado por CRMTable.
 */
export function SortableHeadContent<K extends string>({
  label,
  sortKey,
  current,
  dir,
  onSort,
  align = "right",
}: Omit<SortableHeaderProps<K>, "className">) {
  const isActive = current === sortKey;
  const Icon = !isActive ? ArrowUpDown : dir === "asc" ? ArrowUp : ArrowDown;
  const flexAlign =
    align === "right" ? "flex-row-reverse" : align === "center" ? "justify-center" : "";

  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className="inline-flex items-center gap-1 cursor-pointer select-none hover:text-crm-text-primary transition-colors w-full"
      title="Ordenar"
    >
      <span className={`inline-flex items-center gap-1 ${flexAlign} ${align === "center" ? "mx-auto" : ""} ${align === "right" ? "ml-auto" : ""}`}>
        <span>{label}</span>
        <Icon className={`w-3 h-3 ${isActive ? "text-crm-primary" : "opacity-50"}`} />
      </span>
    </button>
  );
}
