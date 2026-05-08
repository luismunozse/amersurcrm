"use client";

import { pdf } from "@react-pdf/renderer";
import React from "react";
import type { ProformaDatos, ProformaMoneda, ProformaRecord } from "@/types/proforma";
import type {
  ProformaInput,
  ProformaTerreno,
} from "./ProformaDocument";

export type { ProformaInput, ProformaTerreno } from "./ProformaDocument";

export interface ProformaPdfResult {
  blob: Blob;
  fileName: string;
}

export interface ProformaPdfInput {
  numero?: string | null;
  moneda: ProformaMoneda;
  total?: number | null;
  datos: ProformaDatos;
  created_at?: string | Date | null;
  updated_at?: string | Date | null;
}

// ── Mapeo: ProformaPdfInput (DB record) → ProformaInput (componente) ────────
function mapToInput(p: ProformaPdfInput): ProformaInput {
  const datos = p.datos;
  const moneda: "PEN" | "USD" = p.moneda === "USD" ? "USD" : "PEN";

  // Si la proforma ya fue creada con datos del terreno, armamos 1 fila.
  // El template tiene capacidad para 4 filas — futuro: arrays de items.
  const terrenos: ProformaTerreno[] = [];
  if (datos.terreno && (datos.terreno.proyecto || datos.terreno.lote)) {
    terrenos.push({
      proyecto: datos.terreno.proyecto ?? "",
      lote: datos.terreno.lote ?? "",
      etapaSector: datos.terreno.etapa ?? "",
      areaTerreno: datos.terreno.area ?? "",
      precioLista: formatCurrency(
        datos.terreno.precioLista ?? datos.precios.precioLista ?? null,
        moneda,
      ),
    });
  }

  return {
    numero: p.numero ?? "",
    cliente: {
      nombreApellido: datos.cliente?.nombre ?? "",
      dni: datos.cliente?.dni ?? "",
      telefono: datos.cliente?.telefono ?? "",
      correo: datos.cliente?.email ?? "",
    },
    asesor: {
      nombre: datos.asesor?.nombre ?? "",
      celular: datos.asesor?.celular ?? "",
    },
    terrenos,
    precioLista: formatCurrency(datos.precios?.precioLista ?? null, moneda),
    descuento: formatCurrency(datos.precios?.descuento ?? null, moneda),
    precioFinal: formatCurrency(datos.precios?.precioFinal ?? p.total ?? null, moneda),
    separacion: formatCurrency(datos.formaPago?.separacion ?? null, moneda),
    abonoPrincipal: formatCurrency(datos.formaPago?.abonoPrincipal ?? null, moneda),
    numeroCuotas: datos.formaPago?.numeroCuotas != null ? String(datos.formaPago.numeroCuotas) : "",
    monedaSeleccionada: moneda,
    comentariosAdicionales: datos.comentariosAdicionales ?? null,
  };
}

function formatCurrency(value: number | null | undefined, moneda: "PEN" | "USD"): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "";
  const simbolo = moneda === "USD" ? "US$" : "S/";
  const num = value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${simbolo} ${num}`;
}

function buildFileName(numero: string | null, datos: ProformaDatos): string {
  const base = numero ?? "proforma";
  const cliente = (datos?.cliente?.nombre ?? "cliente")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  return `${base}_${cliente}.pdf`.replace(/\s+/g, "_");
}

// ── Construir Blob del PDF ──────────────────────────────────────────────────
export async function buildProformaPdf(p: ProformaPdfInput): Promise<{
  bytes: Uint8Array;
  fileName: string;
}> {
  const { ProformaDocument } = await import("./ProformaDocument");
  const input = mapToInput(p);
  const element = React.createElement(ProformaDocument, { input }) as any;
  const blob = await pdf(element).toBlob();
  const arrayBuffer = await blob.arrayBuffer();
  return {
    bytes: new Uint8Array(arrayBuffer),
    fileName: buildFileName(p.numero ?? null, p.datos),
  };
}

// ── Pública: a partir de un ProformaRecord, descarga el PDF ─────────────────
export async function generarProformaPdf(proforma: ProformaRecord): Promise<void> {
  const { bytes, fileName } = await buildProformaPdf({
    numero: proforma.numero,
    total: proforma.total,
    moneda: proforma.moneda,
    datos: proforma.datos,
    created_at: proforma.created_at,
    updated_at: proforma.updated_at,
  });
  const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

// ── Pública: input directo, retorna Blob y fileName ─────────────────────────
export async function generarProformaPdfDesdeInput(
  input: ProformaInput,
): Promise<ProformaPdfResult> {
  const { ProformaDocument } = await import("./ProformaDocument");
  const element = React.createElement(ProformaDocument, { input }) as any;
  const blob = await pdf(element).toBlob();
  return { blob, fileName: `proforma-${input.numero}_${input.cliente.nombreApellido.replace(/\s+/g, "-").toLowerCase()}.pdf` };
}

export async function descargarProformaPdf(input: ProformaInput): Promise<void> {
  const { blob, fileName } = await generarProformaPdfDesdeInput(input);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
