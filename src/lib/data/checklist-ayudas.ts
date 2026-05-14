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
  // Pago
  // ============================================================
  "Comprobante de pago":
    "Voucher o constancia del pago/transferencia correspondiente al desembolso del crédito a la cuenta de Amersur.",
};

export function getAyudaChecklist(descripcion: string): string | undefined {
  return AYUDAS_CHECKLIST[descripcion];
}
