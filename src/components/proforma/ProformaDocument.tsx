"use client";

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";

// ── Tipos ───────────────────────────────────────────────────────────────────
export interface ProformaTerreno {
  proyecto: string;
  lote: string;
  etapaSector?: string | null;
  areaTerreno: string;       // ej: "200 m²"
  precioLista: string;       // ej: "US$ 50,000.00"
}

export interface ProformaInput {
  numero: string;            // ej: "0000001"
  // Cliente
  cliente: {
    nombreApellido: string;
    dni: string;
    telefono: string;
    correo: string;
  };
  // Asesor
  asesor: {
    nombre: string;
    celular: string;
  };
  // Terrenos (hasta 4 filas)
  terrenos: ProformaTerreno[];
  // Descuentos y promociones
  precioLista: string;
  descuento: string;
  precioFinal: string;
  // Forma de pago
  separacion: string;
  abonoPrincipal: string;
  numeroCuotas: string;
  // Medios de pago (qué moneda eligió)
  monedaSeleccionada: "PEN" | "USD";
  // Comentarios libres
  comentariosAdicionales?: string | null;
}

// ── Constantes de layout (en pt, A4 = 595.28 × 841.89) ──────────────────────
const PAGE_W = 595.28;
const PAGE_H = 841.89;

const C_TEXT = "#1F2937";
const C_RED_NUMERO = "#DC2626";

// Posiciones de los campos sobre el template.
// Calibradas detectando bandas verdes del PNG: DATOS y ATENDIDO POR
// están a y≈181, CARACTERÍSTICAS DEL TERRENO a y≈283, DESCUENTOS y FORMA
// DE PAGO a y≈394, MEDIOS DE PAGO y COMENTARIOS a y≈487, CUENTAS a y≈627.
const POS = {
  // Filas detectadas en template (líneas divisoras a y=189.6, 207.8, 226.6, 244.8, 264.0)
  // Cada fila ~18pt de alto. y_top = centro - fontSize/2 - offset_baseline.
  // En react-pdf el `top` posiciona la caja de línea (no baseline), así que
  // ajustamos un poco hacia arriba para que el texto se vea centrado vs el label.
  cliente: {
    nombre:    { x: 175, y: 198, w: 200 },
    dni:       { x: 175, y: 217, w: 200 },
    telefono:  { x: 175, y: 235, w: 200 },
    correo:    { x: 175, y: 254, w: 200 },
  },
  atendido: {
    asesor:    { x: 425, y: 198, w: 125 },
    celular:   { x: 388, y: 217, w: 162 },
    numero:    { x: 415, y: 236, w: 135 },
  },
  // Tabla CARACTERÍSTICAS DEL TERRENO (líneas a 292.3, 310.1, 328.3, 347.0, 365.7)
  // 4 filas de ~18pt, centros en 301, 319, 338, 356
  tabla: {
    y0: 301,
    rowH: 18.4,
    cols: {
      proyecto:    { x: 56, w: 100 },
      lote:        { x: 165, w: 60 },
      etapaSector: { x: 230, w: 195 },
      area:        { x: 432, w: 78 },
      precio:      { x: 515, w: 70 },
    },
  },
  descuentos: {
    precioLista:  { x: 200, y: 412, w: 110 },
    descuento:    { x: 200, y: 430, w: 110 },
    precioFinal:  { x: 200, y: 449, w: 110 },
  },
  pago: {
    separacion:    { x: 365, y: 412, w: 100 },
    abonoPrincipal:{ x: 365, y: 430, w: 100 },
    numeroCuotas:  { x: 365, y: 449, w: 100 },
  },
  // X dentro de círculos Soles/Dólares
  moneda: {
    soles:   { x: 290, y: 510 },
    dolares: { x: 348, y: 510 },
  },
  // COMENTARIOS ADICIONALES (textarea, header en y≈487)
  comentarios: { x: 305, y: 510, w: 235, h: 75 },
  // Asesor footer (entre CUENTAS y footer band)
  asesorFooter: { y: 750 },
};

// ── Estilos ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: C_TEXT,
    position: "relative",
  },
  templateImg: {
    position: "absolute",
    top: 0,
    left: 0,
    width: PAGE_W,
    height: PAGE_H,
  },
  field: {
    position: "absolute",
    fontSize: 9,
    color: C_TEXT,
  },
  fieldSmall: {
    position: "absolute",
    fontSize: 8,
    color: C_TEXT,
  },
  numero: {
    position: "absolute",
    fontSize: 14,
    fontWeight: 700,
    color: C_RED_NUMERO,
  },
  checkbox: {
    position: "absolute",
    fontSize: 9,
    fontWeight: 700,
    color: C_TEXT,
  },
  comentarios: {
    position: "absolute",
    fontSize: 8,
    color: C_TEXT,
    lineHeight: 1.3,
  },
  asesorFooter: {
    position: "absolute",
    width: PAGE_W,
    textAlign: "center",
    fontSize: 9,
    fontStyle: "italic",
    color: C_TEXT,
  },
});

const DEFAULT_TEMPLATE_SRC = "/proforma-template.png";

// ── Componente Document ─────────────────────────────────────────────────────
export function ProformaDocument({
  input,
  templateSrc = DEFAULT_TEMPLATE_SRC,
}: {
  input: ProformaInput;
  templateSrc?: string;
}) {
  const terrenos = (input.terrenos ?? []).slice(0, 4);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Template como imagen full-page */}
        <Image src={templateSrc} style={styles.templateImg} fixed />

        {/* DATOS DEL CLIENTE */}
        <Text style={[styles.field, { left: POS.cliente.nombre.x, top: POS.cliente.nombre.y, width: POS.cliente.nombre.w }]}>
          {input.cliente.nombreApellido}
        </Text>
        <Text style={[styles.field, { left: POS.cliente.dni.x, top: POS.cliente.dni.y, width: POS.cliente.dni.w }]}>
          {input.cliente.dni}
        </Text>
        <Text style={[styles.field, { left: POS.cliente.telefono.x, top: POS.cliente.telefono.y, width: POS.cliente.telefono.w }]}>
          {input.cliente.telefono}
        </Text>
        <Text style={[styles.field, { left: POS.cliente.correo.x, top: POS.cliente.correo.y, width: POS.cliente.correo.w }]}>
          {input.cliente.correo}
        </Text>

        {/* ATENDIDO POR */}
        <Text style={[styles.field, { left: POS.atendido.asesor.x, top: POS.atendido.asesor.y, width: POS.atendido.asesor.w }]}>
          {input.asesor.nombre}
        </Text>
        <Text style={[styles.field, { left: POS.atendido.celular.x, top: POS.atendido.celular.y, width: POS.atendido.celular.w }]}>
          {input.asesor.celular}
        </Text>
        <Text style={[styles.numero, { left: POS.atendido.numero.x, top: POS.atendido.numero.y, width: POS.atendido.numero.w }]}>
          {input.numero}
        </Text>

        {/* TABLA CARACTERÍSTICAS DEL TERRENO */}
        {terrenos.map((t, i) => {
          const y = POS.tabla.y0 + i * POS.tabla.rowH;
          return (
            <View key={i}>
              <Text style={[styles.fieldSmall, { left: POS.tabla.cols.proyecto.x, top: y, width: POS.tabla.cols.proyecto.w }]}>
                {t.proyecto}
              </Text>
              <Text style={[styles.fieldSmall, { left: POS.tabla.cols.lote.x, top: y, width: POS.tabla.cols.lote.w }]}>
                {t.lote}
              </Text>
              <Text style={[styles.fieldSmall, { left: POS.tabla.cols.etapaSector.x, top: y, width: POS.tabla.cols.etapaSector.w }]}>
                {t.etapaSector ?? ""}
              </Text>
              <Text style={[styles.fieldSmall, { left: POS.tabla.cols.area.x, top: y, width: POS.tabla.cols.area.w }]}>
                {t.areaTerreno}
              </Text>
              <Text style={[styles.fieldSmall, { left: POS.tabla.cols.precio.x, top: y, width: POS.tabla.cols.precio.w }]}>
                {t.precioLista}
              </Text>
            </View>
          );
        })}

        {/* DESCUENTOS Y PROMOCIONES */}
        <Text style={[styles.field, { left: POS.descuentos.precioLista.x, top: POS.descuentos.precioLista.y, width: POS.descuentos.precioLista.w }]}>
          {input.precioLista}
        </Text>
        <Text style={[styles.field, { left: POS.descuentos.descuento.x, top: POS.descuentos.descuento.y, width: POS.descuentos.descuento.w }]}>
          {input.descuento}
        </Text>
        <Text style={[styles.field, { left: POS.descuentos.precioFinal.x, top: POS.descuentos.precioFinal.y, width: POS.descuentos.precioFinal.w }]}>
          {input.precioFinal}
        </Text>

        {/* FORMA DE PAGO */}
        <Text style={[styles.field, { left: POS.pago.separacion.x, top: POS.pago.separacion.y, width: POS.pago.separacion.w }]}>
          {input.separacion}
        </Text>
        <Text style={[styles.field, { left: POS.pago.abonoPrincipal.x, top: POS.pago.abonoPrincipal.y, width: POS.pago.abonoPrincipal.w }]}>
          {input.abonoPrincipal}
        </Text>
        <Text style={[styles.field, { left: POS.pago.numeroCuotas.x, top: POS.pago.numeroCuotas.y, width: POS.pago.numeroCuotas.w }]}>
          {input.numeroCuotas}
        </Text>

        {/* MEDIOS DE PAGO - marca "X" en el círculo de la moneda elegida */}
        {input.monedaSeleccionada === "PEN" && (
          <Text style={[styles.checkbox, { left: POS.moneda.soles.x, top: POS.moneda.soles.y }]}>
            X
          </Text>
        )}
        {input.monedaSeleccionada === "USD" && (
          <Text style={[styles.checkbox, { left: POS.moneda.dolares.x, top: POS.moneda.dolares.y }]}>
            X
          </Text>
        )}

        {/* COMENTARIOS ADICIONALES */}
        {input.comentariosAdicionales && (
          <Text
            style={[
              styles.comentarios,
              {
                left: POS.comentarios.x,
                top: POS.comentarios.y,
                width: POS.comentarios.w,
                height: POS.comentarios.h,
              },
            ]}
          >
            {input.comentariosAdicionales}
          </Text>
        )}

        {/* Asesor footer (entre el bloque cuentas y el footer image) */}
        <Text style={[styles.asesorFooter, { top: POS.asesorFooter.y }]}>
          {input.asesor.nombre} - AMERSUR SAC
        </Text>
      </Page>
    </Document>
  );
}
