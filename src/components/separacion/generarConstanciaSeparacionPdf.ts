"use client";

import { pdf } from "@react-pdf/renderer";
import React from "react";

export type MetodoPagoConstancia =
  | "transferencia"
  | "deposito"
  | "efectivo"
  | "tarjeta"
  | "cheque";

export interface PartePersona {
  nombre: string;
  dni: string;
  nacionalidad?: string | null;
  gradoInstruccion?: string | null;
  ocupacion?: string | null;
  genero?: "M" | "F" | null;
}

export interface ConstanciaInput {
  comprador: PartePersona;
  coComprador?: PartePersona | null;
  compradorDomicilio?: string | null;
  montoSeparacion: number;
  moneda: "USD" | "PEN";
  metodoPago?: MetodoPagoConstancia | null;
  numeroCuentaBancaria?: string | null;
  banco?: string | null;
  numeroOperacion?: string | null;
  fechaTransferencia?: string | Date | null;
  loteNumero: string;
  loteArea: number;
  proyectoNombre: string;
  tipoUnidad?: "parcela agrícola" | "lote" | "departamento" | "casa" | string | null;
  fechaDocumento?: string | Date | null;
  ciudadDocumento?: string | null;
  observaciones?: string | null;
}

export interface ConstanciaPdfResult {
  blob: Blob;
  fileName: string;
}

function buildFileName(input: ConstanciaInput): string {
  const cliente = input.comprador.nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  const lote = input.loteNumero.replace(/\s+/g, "");
  return `constancia-separacion_${cliente}_lote-${lote}.pdf`;
}

export async function generarConstanciaSeparacionPdf(
  input: ConstanciaInput,
): Promise<ConstanciaPdfResult> {
  // Import dinámico para que el bundle del documento (que carga fuentes web)
  // solo se incluya cuando realmente se genere el PDF.
  const { ConstanciaSeparacionDocument } = await import("./ConstanciaSeparacionDocument");
  const element = React.createElement(ConstanciaSeparacionDocument, { input }) as any;
  const blob = await pdf(element).toBlob();
  return { blob, fileName: buildFileName(input) };
}

export async function descargarConstanciaSeparacion(input: ConstanciaInput): Promise<void> {
  const { blob, fileName } = await generarConstanciaSeparacionPdf(input);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
