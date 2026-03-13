"use client";

import { useState, useMemo } from "react";

interface UsePaginacionOptions {
  tamanioPagina?: number;
  paginaInicial?: number;
}

export function usePaginacion<T>(
  items: T[],
  options: UsePaginacionOptions = {}
) {
  const { tamanioPagina: initialPageSize = 10, paginaInicial = 1 } = options;
  const [paginaActual, setPaginaActual] = useState(paginaInicial);
  const [tamanioPagina, setTamanioPagina] = useState(initialPageSize);

  const totalPaginas = Math.max(1, Math.ceil(items.length / tamanioPagina));
  const safePagina = paginaActual > totalPaginas ? 1 : paginaActual;

  const itemsPaginados = useMemo(() => {
    const start = (safePagina - 1) * tamanioPagina;
    return items.slice(start, start + tamanioPagina);
  }, [items, safePagina, tamanioPagina]);

  const irAPagina = (page: number) => {
    setPaginaActual(Math.max(1, Math.min(page, totalPaginas)));
  };

  const paginaSiguiente = () => irAPagina(safePagina + 1);
  const paginaAnterior = () => irAPagina(safePagina - 1);

  const cambiarTamanioPagina = (newSize: number) => {
    setTamanioPagina(newSize);
    setPaginaActual(1);
  };

  return {
    items: itemsPaginados,
    paginaActual: safePagina,
    totalPaginas,
    totalItems: items.length,
    tamanioPagina,
    tieneSiguiente: safePagina < totalPaginas,
    tieneAnterior: safePagina > 1,
    irAPagina,
    paginaSiguiente,
    paginaAnterior,
    cambiarTamanioPagina,
  };
}
