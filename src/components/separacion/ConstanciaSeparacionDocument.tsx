"use client";

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Svg,
  Path,
  Circle,
} from "@react-pdf/renderer";
import type { ConstanciaInput } from "./generarConstanciaSeparacionPdf";

// ── Datos fijos ──────────────────────────────────────────────────────────────
const VENDEDORA = {
  razonSocial: "AMERSUR S.A.C.",
  ruc: "20519277299",
  gerente: "ALEXANDER MARCOS ORIUNDO CHÁVEZ",
  gerenteDni: "42722820",
  partida: "12148444",
  registroLugar: "Lima",
  domicilioFiscal:
    "Lotización Colán Zamudio Mz. B Lote 1, distrito y provincia de Huaral, departamento de Lima",
};

const CUENTAS_DEFAULT = {
  PEN: { numero: "194-2484958-0-29", banco: "BCP", tipo: "cuenta corriente en moneda nacional" },
  USD: { numero: "370-2438307-1-45", banco: "BCP", tipo: "cuenta corriente en moneda extranjera" },
};

// ── Paleta ──────────────────────────────────────────────────────────────────
const C_GREEN_DARK = "#054d3a";
const C_GREEN_MID = "#3c9c00";
const C_TEXT = "#1F2937";
const C_GRAY = "#6B7280";
const C_WHITE = "#FFFFFF";

const PAGE_W = 595.28;

// ── Assets ──────────────────────────────────────────────────────────────────
// Banner único de header (incluye logo + contacto + pill, todo embebido).
// Aspect ratio esperado ~7:1 (ej: 2100x300 px). Si cambias la imagen, ajustá
// `headerImg.height` para mantener la proporción.
const DEFAULT_HEADER_SRC = "/constancia-header.png";
const DEFAULT_FOOTER_SRC = "/constancia-footer.png";

// Altura del banner en puntos. Para una imagen 2100x300 (aspect 7:1)
// renderizada a 595.28 de ancho, height = 595.28 / 7 ≈ 85pt.
const HEADER_H = 95;
const FOOTER_H = 80;

// ── Estilos ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: C_TEXT,
    paddingTop: 0,
    paddingBottom: 0,
  },

  headerImg: {
    width: PAGE_W,
    height: HEADER_H,
    objectFit: "cover",
  },

  // Title
  titulo: {
    fontSize: 22,
    fontWeight: 700,
    textAlign: "center",
    marginTop: 40,
    marginBottom: 24,
    color: C_GREEN_MID,
  },

  // Body
  body: {
    paddingHorizontal: 50,
  },
  parrafo: {
    fontSize: 10,
    lineHeight: 1.5,
    textAlign: "justify",
    marginBottom: 11,
  },
  bold: { fontWeight: 700, color: C_GREEN_MID },

  // Firma
  firmaWrap: {
    marginTop: 36,
    marginBottom: 24,
    alignItems: "center",
  },
  firmaLine: {
    width: 220,
    height: 0.8,
    backgroundColor: C_TEXT,
    marginBottom: 8,
  },
  firmaText: { fontSize: 11, fontWeight: 700, color: C_GREEN_MID },

  observaciones: {
    marginTop: 8,
    paddingHorizontal: 50,
    fontSize: 9,
    color: C_GRAY,
    fontStyle: "italic",
  },
  observacionesLabel: {
    fontSize: 9.5,
    fontWeight: 700,
    color: C_TEXT,
    marginBottom: 3,
    fontStyle: "normal",
  },

  // Footer (imagen banner — opcional)
  footerImg: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: PAGE_W,
    height: FOOTER_H,
    objectFit: "cover",
  },

  // Footer fallback (si no hay imagen)
  footerFallback: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: C_GREEN_DARK,
    paddingHorizontal: 40,
    paddingVertical: 14,
    height: FOOTER_H,
    flexDirection: "row",
    alignItems: "center",
  },
  footerColPair: {
    flexDirection: "column",
    justifyContent: "center",
    flex: 1,
  },
  footerCol: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 3,
  },
  footerIconWrap: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: C_GREEN_MID,
    marginRight: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  footerText: { color: C_WHITE, fontSize: 8 },
});

// ── Iconos SVG (footer fallback) ────────────────────────────────────────────
const Icon = ({ d, hasCircle }: { d?: string; hasCircle?: boolean }) => (
  <Svg viewBox="0 0 24 24" width={9} height={9}>
    {d && (
      <Path
        d={d}
        stroke={C_WHITE}
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    )}
    {hasCircle && <Circle cx="12" cy="10" r="3" stroke={C_WHITE} strokeWidth={2} fill="none" />}
  </Svg>
);

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatMonto(value: number, moneda: "USD" | "PEN"): string {
  const simbolo = moneda === "USD" ? "US$" : "S/";
  const num = value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${simbolo} ${num}`;
}

function formatArea(value: number): string {
  return value.toLocaleString("es-PE", { maximumFractionDigits: 2 });
}

function parseFechaSafe(value: string | Date | null | undefined): Date {
  if (!value) return new Date();
  if (value instanceof Date) return value;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return new Date(value);
}

const MESES_ES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function nombreMes(d: Date): string {
  return MESES_ES[d.getMonth()];
}

function formatFechaLarga(value: string | Date): string {
  const d = parseFechaSafe(value);
  return `${d.getDate()} de ${nombreMes(d)} del año ${d.getFullYear()}`;
}

const UNIDADES = ["", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve"];
const ESPECIALES = ["diez", "once", "doce", "trece", "catorce", "quince", "dieciséis", "diecisiete", "dieciocho", "diecinueve"];
const DECENAS_ARR = ["", "diez", "veinte", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa"];
const CENTENAS_ARR = ["", "ciento", "doscientos", "trescientos", "cuatrocientos", "quinientos", "seiscientos", "setecientos", "ochocientos", "novecientos"];

// Tildes en 22, 23, 26 según RAE.
const VEINTI: Record<number, string> = {
  1: "veintiuno",
  2: "veintidós",
  3: "veintitrés",
  4: "veinticuatro",
  5: "veinticinco",
  6: "veintiséis",
  7: "veintisiete",
  8: "veintiocho",
  9: "veintinueve",
};

function decenas(n: number): string {
  if (n < 10) return UNIDADES[n];
  if (n < 20) return ESPECIALES[n - 10];
  if (n === 20) return "veinte";
  if (n < 30) return VEINTI[n - 20];
  const d = Math.floor(n / 10);
  const u = n % 10;
  return u === 0 ? DECENAS_ARR[d] : `${DECENAS_ARR[d]} y ${UNIDADES[u]}`;
}

function centenas(n: number): string {
  if (n === 0) return "";
  if (n === 100) return "cien";
  const c = Math.floor(n / 100);
  const resto = n % 100;
  if (c === 0) return decenas(n);
  const cent = CENTENAS_ARR[c];
  if (resto === 0) return cent;
  return `${cent} ${decenas(resto)}`;
}

function miles(n: number): string {
  if (n < 1000) return centenas(n);
  const milesPart = Math.floor(n / 1000);
  const resto = n % 1000;
  let pre: string;
  if (milesPart === 1) pre = "mil";
  else if (milesPart < 100) pre = `${decenas(milesPart)} mil`;
  else pre = `${centenas(milesPart)} mil`;
  return resto === 0 ? pre : `${pre} ${centenas(resto)}`;
}

function numeroALetras(n: number): string {
  const entero = Math.floor(Math.abs(n));
  if (entero === 0) return "cero";
  if (entero < 1_000_000) return miles(entero).trim();
  const millonesPart = Math.floor(entero / 1_000_000);
  const resto = entero % 1_000_000;
  const pre = millonesPart === 1 ? "un millón" : `${miles(millonesPart)} millones`;
  return resto === 0 ? pre : `${pre} ${miles(resto)}`;
}

function construirDetallePago(input: ConstanciaInput): string {
  const metodo = input.metodoPago ?? "transferencia";
  const cuenta = input.numeroCuentaBancaria || CUENTAS_DEFAULT[input.moneda].numero;
  const banco = input.banco || CUENTAS_DEFAULT[input.moneda].banco;
  const tipoCuenta = CUENTAS_DEFAULT[input.moneda].tipo;
  const op = input.numeroOperacion ? `, con número de operación ${input.numeroOperacion}` : "";

  switch (metodo) {
    case "transferencia":
      return `mediante transferencia bancaria a la ${tipoCuenta} N° ${cuenta}, en el banco ${banco}${op}`;
    case "deposito":
      return `mediante depósito a la ${tipoCuenta} N° ${cuenta}, en el banco ${banco}${op}`;
    case "cheque":
      return `mediante cheque${op}`;
    case "tarjeta":
      return `mediante pago con tarjeta${op}`;
    case "efectivo":
      return "en efectivo";
    default:
      return `mediante ${metodo}`;
  }
}

// ── Footer fallback (cuando no hay imagen) ──────────────────────────────────
function FooterFallback() {
  return (
    <View style={styles.footerFallback} fixed>
      <View style={styles.footerColPair}>
        <View style={styles.footerCol}>
          <View style={styles.footerIconWrap}>
            <Icon d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
          </View>
          <Text style={styles.footerText}>+51 969 306 754</Text>
        </View>
        <View style={styles.footerCol}>
          <View style={styles.footerIconWrap}>
            <Icon d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" hasCircle />
          </View>
          <Text style={styles.footerText}>Lt. Colán Zamudio Mz. B</Text>
        </View>
        <View style={styles.footerCol}>
          <View style={{ ...styles.footerIconWrap, opacity: 0 }} />
          <Text style={styles.footerText}>Lt. 1 Ref. Av. El Palmo - Huaral</Text>
        </View>
      </View>
      <View style={styles.footerColPair}>
        <View style={styles.footerCol}>
          <View style={styles.footerIconWrap}>
            <Svg viewBox="0 0 24 24" width={9} height={9}>
              <Circle cx="12" cy="12" r="10" stroke={C_WHITE} strokeWidth={2} fill="none" />
              <Path d="M2 12h20" stroke={C_WHITE} strokeWidth={2} fill="none" />
              <Path
                d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"
                stroke={C_WHITE}
                strokeWidth={2}
                fill="none"
              />
            </Svg>
          </View>
          <Text style={styles.footerText}>www.amersursac.com</Text>
        </View>
        <View style={styles.footerCol}>
          <View style={styles.footerIconWrap}>
            <Svg viewBox="0 0 24 24" width={9} height={9}>
              <Path
                d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22 6l-10 7L2 6"
                stroke={C_WHITE}
                strokeWidth={2}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </View>
          <Text style={styles.footerText}>info@amersursac.com</Text>
        </View>
      </View>
    </View>
  );
}

// ── Componente Document ──────────────────────────────────────────────────────
export function ConstanciaSeparacionDocument({
  input,
  headerSrc = DEFAULT_HEADER_SRC,
  footerSrc = DEFAULT_FOOTER_SRC,
  useFooterImage = true,
}: {
  input: ConstanciaInput;
  headerSrc?: string;
  footerSrc?: string;
  useFooterImage?: boolean;
}) {
  const labelComprador = input.coComprador
    ? '"LOS COMPRADORES"'
    : input.comprador.genero === "F"
      ? '"LA COMPRADORA"'
      : '"EL COMPRADOR"';

  const dom = input.compradorDomicilio || "—";
  const cantidadDom = input.coComprador ? "ambos con" : "con";
  const aQuien = input.coComprador ? "quienes" : "quien";

  const montoNum = formatMonto(input.montoSeparacion, input.moneda);
  const montoLetras = numeroALetras(input.montoSeparacion).toUpperCase();
  const monedaTexto = input.moneda === "USD" ? "DÓLARES AMERICANOS" : "SOLES";
  const decimales = Math.round(
    (input.montoSeparacion - Math.floor(input.montoSeparacion)) * 100,
  );
  const decStr = decimales.toString().padStart(2, "0");

  const detallePago = construirDetallePago(input);
  void detallePago; // referencia para legibilidad — usamos partes inline abajo
  const fechaPago = formatFechaLarga(
    input.fechaTransferencia ?? input.fechaDocumento ?? new Date(),
  );

  const tipo = (input.tipoUnidad || "lote").toLowerCase();
  const ciudad = input.ciudadDocumento || "Huaral";
  const fecha = parseFechaSafe(input.fechaDocumento);
  const dia = fecha.getDate();
  const diaLetras = numeroALetras(dia);
  const mes = nombreMes(fecha);
  const anio = fecha.getFullYear();

  const constanciaLabel = input.metodoPago === "transferencia" ? "de transferencia" : "del pago";
  const cuentaInline = input.numeroCuentaBancaria || CUENTAS_DEFAULT[input.moneda].numero;
  const opInline = input.numeroOperacion;
  const bancoInline = input.banco || CUENTAS_DEFAULT[input.moneda].banco;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header como imagen banner */}
        <Image src={headerSrc} style={styles.headerImg} fixed />

        {/* Título */}
        <Text style={styles.titulo}>CONSTANCIA DE SEPARACIÓN</Text>

        {/* Cuerpo */}
        <View style={styles.body}>
          <Text style={styles.parrafo}>
            <Text>{`Conste por el presente documento, suscrito por la empresa `}</Text>
            <Text style={styles.bold}>{VENDEDORA.razonSocial}</Text>
            <Text>{` con RUC N° ${VENDEDORA.ruc} representado por su Gerente General `}</Text>
            <Text style={styles.bold}>{VENDEDORA.gerente}</Text>
            <Text>{`, identificado con DNI N° ${VENDEDORA.gerenteDni}, con sus poderes debidamente inscritos en la Partida N° `}</Text>
            <Text style={styles.bold}>{VENDEDORA.partida}</Text>
            <Text>{` del Registro de Personas Jurídicas de ${VENDEDORA.registroLugar}; con domicilio fiscal en ${VENDEDORA.domicilioFiscal}; a quien en lo sucesivo se le denominará `}</Text>
            <Text style={styles.bold}>"LA VENDEDORA"</Text>
            <Text>{` y de la otra parte ${input.coComprador ? "la sociedad conyugal conformada por " : ""}`}</Text>
            <Text style={styles.bold}>{input.comprador.nombre}</Text>
            <Text>{`, ${input.comprador.genero === "F" ? "identificada" : "identificado"} con DNI N° `}</Text>
            <Text style={styles.bold}>{input.comprador.dni}</Text>
            <Text>{`, ${input.comprador.nacionalidad || (input.comprador.genero === "F" ? "peruana" : "peruano")}${input.comprador.gradoInstruccion ? `, de grado de instrucción ${input.comprador.gradoInstruccion}` : ""}${input.comprador.ocupacion ? ", de ocupación " : ""}`}</Text>
            {input.comprador.ocupacion && (
              <Text style={styles.bold}>{input.comprador.ocupacion}</Text>
            )}
            {input.coComprador && (
              <>
                <Text> y </Text>
                <Text style={styles.bold}>{input.coComprador.nombre}</Text>
                <Text>{`, ${input.coComprador.genero === "F" ? "identificada" : "identificado"} con DNI N° `}</Text>
                <Text style={styles.bold}>{input.coComprador.dni}</Text>
                <Text>{`, ${input.coComprador.nacionalidad || (input.coComprador.genero === "F" ? "peruana" : "peruano")}${input.coComprador.gradoInstruccion ? `, de grado de instrucción ${input.coComprador.gradoInstruccion}` : ""}${input.coComprador.ocupacion ? `, de ocupación ${input.coComprador.ocupacion}` : ""}`}</Text>
              </>
            )}
            <Text>{`, ${cantidadDom} domicilio en ${dom}; a ${aQuien} en lo sucesivo se le denominará `}</Text>
            <Text style={styles.bold}>{labelComprador}</Text>
            <Text>{` en los términos y condiciones siguientes:`}</Text>
          </Text>

          <Text style={styles.parrafo}>
            <Text style={styles.bold}>"LA VENDEDORA"</Text>
            <Text>{` a la fecha declara que ha recibido de `}</Text>
            <Text style={styles.bold}>{labelComprador}</Text>
            <Text>{` la suma de `}</Text>
            <Text style={styles.bold}>{`${montoNum} (${montoLetras} Y ${decStr}/100 ${monedaTexto})`}</Text>
            <Text>{`, mediante ${input.metodoPago === "deposito" ? "depósito" : input.metodoPago === "transferencia" ? "transferencia bancaria" : input.metodoPago === "cheque" ? "cheque" : input.metodoPago === "tarjeta" ? "pago con tarjeta" : input.metodoPago === "efectivo" ? "efectivo" : "transferencia bancaria"} ${input.metodoPago === "efectivo" || input.metodoPago === "cheque" || input.metodoPago === "tarjeta" ? "" : `a la ${CUENTAS_DEFAULT[input.moneda].tipo} N° `}`}</Text>
            {input.metodoPago !== "efectivo" && input.metodoPago !== "cheque" && input.metodoPago !== "tarjeta" && (
              <>
                <Text style={styles.bold}>{cuentaInline}</Text>
                <Text>{`, en el banco ${bancoInline}`}</Text>
              </>
            )}
            {opInline && (
              <>
                <Text>{`, con número de operación `}</Text>
                <Text style={styles.bold}>{opInline}</Text>
              </>
            )}
            <Text>{`, conforme se acredita con la constancia ${constanciaLabel}, emitido con fecha ${fechaPago}.`}</Text>
          </Text>

          <Text style={styles.parrafo}>
            <Text>{`Suma de dinero que será considerada como parte de pago para la compraventa de acciones y derechos inmobiliarios, equivalente a la ${tipo} N° `}</Text>
            <Text style={styles.bold}>{input.loteNumero}</Text>
            <Text>{` con una extensión superficial de `}</Text>
            <Text style={styles.bold}>{`${formatArea(input.loteArea)} m²`}</Text>
            <Text>{`, del proyecto denominado `}</Text>
            <Text style={styles.bold}>{`"${input.proyectoNombre}"`}</Text>
            <Text>.</Text>
          </Text>

          <Text style={styles.parrafo}>
            <Text>{`Se firma el presente documento en señal de conformidad, en la ciudad de ${ciudad} a los `}</Text>
            <Text style={styles.bold}>{`${diaLetras} (${dia}) días`}</Text>
            <Text>{` del mes de ${mes} del año ${anio}.`}</Text>
          </Text>
        </View>

        {/* Observaciones */}
        {input.observaciones && (
          <View style={styles.observaciones}>
            <Text style={styles.observacionesLabel}>Observaciones:</Text>
            <Text>{input.observaciones}</Text>
          </View>
        )}

        {/* Firma */}
        <View style={styles.firmaWrap}>
          {input.firmaVendedorBase64 ? (
            <Image
              src={input.firmaVendedorBase64}
              style={{ width: 180, height: 60, marginBottom: 2, objectFit: "contain" }}
            />
          ) : null}
          <View style={styles.firmaLine} />
          <Text style={styles.firmaText}>{VENDEDORA.razonSocial}</Text>
          <Text style={styles.firmaText}>"LA VENDEDORA"</Text>
        </View>

        {/* Footer */}
        {useFooterImage ? (
          <Image src={footerSrc} style={styles.footerImg} fixed />
        ) : (
          <FooterFallback />
        )}
      </Page>
    </Document>
  );
}
