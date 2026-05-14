/**
 * Textos de ayuda para cada item del checklist del proceso de adquisicion.
 * Keyed por la descripcion exacta del item (tal como la devuelve la DB).
 *
 * Redactados en español peruano con la terminología real del sector
 * inmobiliario local (SUNARP, SUNAT, minuta, partida registral, etc.).
 */
export const AYUDAS_CHECKLIST: Record<string, string> = {
  // ============================================================
  // Separación
  // ============================================================
  "DNI del comprador":
    "Copia del DNI vigente del comprador (ambas caras, en PDF o imagen nítida). Si hay cónyuge copropietario, subir también el suyo.",
  "Comprobante de pago de separacion":
    "Voucher de depósito, transferencia bancaria o recibo que acredite el pago de las arras de separación.",
  "Comprobante de pago de separación":
    "Voucher de depósito, transferencia bancaria o recibo que acredite el pago de las arras de separación.",
  "Formulario de separacion firmado":
    "Formato interno de Amersur con los datos del cliente, la unidad reservada y el monto entregado en arras, firmado por el comprador.",
  "Formulario de separación firmado":
    "Formato interno de Amersur con los datos del cliente, la unidad reservada y el monto entregado en arras, firmado por el comprador.",

  // ============================================================
  // Calificación Bancaria
  // ============================================================
  "Boletas de pago (3 ultimos meses)":
    "Las tres últimas boletas de pago emitidas por el empleador. Para independientes, recibos por honorarios del mismo periodo.",
  "Boletas de pago (3 últimos meses)":
    "Las tres últimas boletas de pago emitidas por el empleador. Para independientes, recibos por honorarios del mismo periodo.",
  "Estado de cuenta bancario":
    "Estado de cuenta de los últimos 3 a 6 meses emitido por el banco del cliente.",
  "DDJJ Renta":
    "Declaración Jurada Anual de Renta presentada ante la SUNAT del último ejercicio. Se puede descargar desde Clave SOL.",
  "Declaración Jurada de Renta":
    "Declaración Jurada Anual de Renta presentada ante la SUNAT del último ejercicio. Se puede descargar desde Clave SOL.",
  "Certificado de trabajo":
    "Documento del empleador que acredita el vínculo laboral vigente, el cargo y el tiempo de servicio. Opcional para trabajadores independientes.",
  "Carta de aprobacion del banco":
    "Comunicación formal del banco confirmando que el crédito hipotecario fue aprobado, con el monto y las condiciones.",
  "Carta de aprobación del banco":
    "Comunicación formal del banco confirmando que el crédito hipotecario fue aprobado, con el monto y las condiciones.",

  // ============================================================
  // Firma de Contrato
  // ============================================================
  "Minuta de compraventa":
    "Documento legal previo a la escritura pública con los términos del contrato. Se redacta con el notario elegido.",
  "Minuta de compraventa redactada":
    "Documento legal previo a la escritura pública con los términos del contrato. La redacta el notario elegido para la operación.",
  "Comprobante de cuota inicial":
    "Voucher o transferencia bancaria que acredita el pago de la cuota inicial pactada en el contrato.",
  "Contrato firmado y escaneado":
    "Copia escaneada del contrato de compraventa firmado por el comprador y el representante de Amersur.",
  "Copia literal de la propiedad":
    "Partida registral emitida por SUNARP con el historial de titularidad y cargas del inmueble. Se obtiene en línea o en ventanilla.",

  // ============================================================
  // Desembolso
  // ============================================================
  "Comprobante de pago":
    "Voucher o constancia del pago/transferencia correspondiente al desembolso del crédito a la cuenta de Amersur.",
};

export function getAyudaChecklist(descripcion: string): string | undefined {
  return AYUDAS_CHECKLIST[descripcion];
}
