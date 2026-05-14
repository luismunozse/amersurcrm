"use client";

import { generate } from "@pdfme/generator";
import { text } from "@pdfme/schemas";
import type { Template } from "@pdfme/common";
import type { ProformaDatos, ProformaMoneda, ProformaRecord } from "@/types/proforma";
import templateSchema from "./proforma-template.json";

// Re-exportamos los tipos públicos para mantener compat con callers existentes.
export interface ProformaTerreno {
  proyecto: string;
  lote: string;
  etapaSector?: string | null;
  areaTerreno: string;
  precioLista: string;
}

export interface ProformaInput {
  numero: string;
  cliente: {
    nombreApellido: string;
    dni: string;
    telefono: string;
    correo: string;
  };
  asesor: {
    nombre: string;
    celular: string;
  };
  terrenos: ProformaTerreno[];
  precioLista: string;
  descuento: string;
  precioFinal: string;
  separacion: string;
  abonoPrincipal: string;
  numeroCuotas: string;
  monedaSeleccionada: "PEN" | "USD";
  comentariosAdicionales?: string | null;
}

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

const TEMPLATE_PDF_PATH = "/proforma-template.pdf";

// ── Carga del PDF base ──────────────────────────────────────────────────────
let cachedBasePdf: ArrayBuffer | null = null;

async function loadBasePdf(): Promise<ArrayBuffer> {
  if (cachedBasePdf) return cachedBasePdf;
  const response = await fetch(TEMPLATE_PDF_PATH);
  if (!response.ok) {
    throw new Error(`No se pudo cargar el PDF base de la proforma (${response.status})`);
  }
  cachedBasePdf = await response.arrayBuffer();
  return cachedBasePdf;
}

// ── Mapeo: ProformaPdfInput → inputs (data) para pdfme ──────────────────────
function formatCurrency(value: number | null | undefined, moneda: "PEN" | "USD"): string {
  // Si no hay valor o es 0 (cuando viene de cálculo sin datos), devolver vacío
  // para no imprimir "S/ 0.00" en celdas no rellenadas.
  if (value === null || value === undefined || Number.isNaN(value) || value === 0) return "";
  const simbolo = moneda === "USD" ? "US$" : "S/";
  const num = value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${simbolo} ${num}`;
}

function buildInputs(p: ProformaPdfInput): Record<string, string> {
  const datos = p.datos;
  const moneda: "PEN" | "USD" = p.moneda === "USD" ? "USD" : "PEN";

  const terreno = datos.terreno ?? {};
  const cliente = datos.cliente ?? { nombre: "" };
  const asesor = datos.asesor ?? { nombre: "" };

  return {
    proforma_numero: p.numero ?? "",
    cliente_nombre: cliente.nombre ?? "",
    cliente_dni: cliente.dni ?? "",
    cliente_telefono: cliente.telefono ?? "",
    cliente_correo: cliente.email ?? "",
    asesor_nombre: asesor.nombre ?? "",
    asesor_celular: asesor.celular ?? "",
    terreno_proyecto: terreno.proyecto ?? "",
    terreno_lote: terreno.lote ?? "",
    terreno_etapa: terreno.etapa ?? "",
    terreno_area: terreno.area ?? "",
    terreno_precio: formatCurrency(
      terreno.precioLista ?? datos.precios?.precioLista ?? null,
      moneda,
    ),
    precio_lista: formatCurrency(datos.precios?.precioLista ?? null, moneda),
    descuento: formatCurrency(datos.precios?.descuento ?? null, moneda),
    precio_final: formatCurrency(datos.precios?.precioFinal ?? p.total ?? null, moneda),
    separacion: formatCurrency(datos.formaPago?.separacion ?? null, moneda),
    abono_principal: formatCurrency(datos.formaPago?.abonoPrincipal ?? null, moneda),
    numero_cuotas:
      datos.formaPago?.numeroCuotas != null ? String(datos.formaPago.numeroCuotas) : "",
    moneda_soles: moneda === "PEN" ? "X" : "",
    moneda_dolares: moneda === "USD" ? "X" : "",
    comentarios: datos.comentariosAdicionales ?? "",
    asesor_footer: asesor.nombre ? `${asesor.nombre} - AMERSUR SAC` : "AMERSUR SAC",
  };
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

// ── Generador principal ─────────────────────────────────────────────────────
export async function buildProformaPdf(p: ProformaPdfInput): Promise<{
  bytes: Uint8Array;
  fileName: string;
}> {
  const basePdf = await loadBasePdf();
  const inputs = [buildInputs(p)];

  const template: Template = {
    basePdf: new Uint8Array(basePdf),
    schemas: (templateSchema as any).schemas,
  };

  const pdfBytes = await generate({
    template,
    inputs,
    plugins: { text },
  });

  return {
    bytes: pdfBytes,
    fileName: buildFileName(p.numero ?? null, p.datos),
  };
}

// API pública (compat) — descarga directa
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

// API pública adicional — input directo, retorna Blob
export async function generarProformaPdfDesdeInput(input: ProformaInput): Promise<ProformaPdfResult> {
  const datos: ProformaDatos = {
    cliente: {
      nombre: input.cliente.nombreApellido,
      dni: input.cliente.dni,
      telefono: input.cliente.telefono,
      email: input.cliente.correo,
    },
    asesor: {
      nombre: input.asesor.nombre,
      celular: input.asesor.celular,
    },
    terreno: input.terrenos[0]
      ? {
          proyecto: input.terrenos[0].proyecto,
          lote: input.terrenos[0].lote,
          etapa: input.terrenos[0].etapaSector ?? null,
          area: input.terrenos[0].areaTerreno,
        }
      : {},
    precios: {},
    formaPago: {},
    condicionesComerciales: [],
    mediosPago: { soles: null, dolares: null },
    requisitosContrato: [],
    cuentasEmpresa: [],
    comentariosAdicionales: input.comentariosAdicionales ?? null,
    validezDias: 3,
  };

  const { bytes, fileName } = await buildProformaPdf({
    numero: input.numero,
    moneda: input.monedaSeleccionada,
    datos,
  });
  const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
  return { blob, fileName };
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
