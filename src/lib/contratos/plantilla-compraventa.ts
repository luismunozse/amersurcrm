/**
 * Plantilla de Contrato de Compraventa Inmobiliaria
 * Variables disponibles: {{variable}} - se reemplazan con datos reales
 *
 * Variables soportadas:
 * - cliente_nombre, cliente_dni, cliente_estado_civil, cliente_direccion, cliente_telefono, cliente_email
 * - proyecto_nombre, lote_codigo, lote_area, lote_precio
 * - precio_total, precio_letras, moneda, moneda_simbolo
 * - monto_separacion, monto_cuota_inicial, saldo_pendiente, numero_cuotas
 * - forma_pago
 * - empresa_nombre, empresa_ruc, empresa_direccion, empresa_representante, empresa_representante_dni
 * - contrato_codigo, contrato_fecha, contrato_fecha_letras
 * - notaria, notario
 * - partida_registral, zona_registral
 */

export interface ContratoVariables {
  // Cliente
  cliente_nombre: string;
  cliente_dni: string;
  cliente_estado_civil?: string;
  cliente_direccion?: string;
  cliente_telefono?: string;
  cliente_email?: string;

  // Proyecto / Lote
  proyecto_nombre: string;
  lote_codigo: string;
  lote_area?: string;
  lote_precio?: string;

  // Financiero
  precio_total: string;
  precio_letras?: string;
  moneda: string;
  moneda_simbolo: string;
  monto_separacion?: string;
  monto_cuota_inicial?: string;
  saldo_pendiente?: string;
  numero_cuotas?: string;
  forma_pago: string;

  // Empresa
  empresa_nombre?: string;
  empresa_ruc?: string;
  empresa_direccion?: string;
  empresa_representante?: string;
  empresa_representante_dni?: string;

  // Contrato
  contrato_codigo: string;
  contrato_fecha: string;
  contrato_fecha_letras?: string;

  // Notarial
  notaria?: string;
  notario?: string;
  partida_registral?: string;
  zona_registral?: string;
}

export function generarHTMLContrato(vars: ContratoVariables): string {
  const v = (key: keyof ContratoVariables, fallback = '___________') =>
    vars[key] || fallback;

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <style>
    @page { margin: 2.5cm 2cm; size: A4; }
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 12pt;
      line-height: 1.6;
      color: #1a1a1a;
      max-width: 700px;
      margin: 0 auto;
      padding: 40px;
    }
    .header {
      text-align: right;
      margin-bottom: 30px;
      font-size: 11pt;
      color: #444;
    }
    .header .codigo {
      font-weight: bold;
      font-size: 13pt;
      color: #1a1a1a;
    }
    h1 {
      text-align: center;
      font-size: 14pt;
      text-decoration: underline;
      font-weight: bold;
      margin: 30px 0;
    }
    h2 {
      font-size: 12pt;
      font-weight: bold;
      text-decoration: underline;
      margin-top: 25px;
    }
    p { text-align: justify; margin: 10px 0; }
    .firma-section {
      margin-top: 60px;
      display: flex;
      justify-content: space-between;
    }
    .firma-box {
      text-align: center;
      width: 45%;
    }
    .firma-linea {
      border-top: 1px solid #000;
      margin-top: 60px;
      padding-top: 5px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }
    table th, table td {
      border: 1px solid #333;
      padding: 8px 12px;
      text-align: left;
      font-size: 11pt;
    }
    table th {
      background: #f0f0f0;
      font-weight: bold;
    }
    .highlight { font-weight: bold; }
    @media print {
      body { padding: 0; max-width: none; }
    }
  </style>
</head>
<body>

<div class="header">
  <div>${v('empresa_nombre', 'AMERSUR INMOBILIARIA')}</div>
  <div class="codigo">${v('contrato_codigo')}</div>
</div>

<h1>CONTRATO DE COMPRAVENTA</h1>

<p>Señor Notario:</p>

<p>Sírvase extender en su Registro de escrituras públicas un Contrato de Compraventa que celebran, de una parte
<span class="highlight">${v('empresa_nombre', 'AMERSUR INMOBILIARIA')}</span>, con Registro Único de Contribuyente N° ${v('empresa_ruc', '_________')},
con domicilio para estos efectos en ${v('empresa_direccion', '_________')},
representada por ${v('empresa_representante', '_________')}, identificado con DNI N° ${v('empresa_representante_dni', '_________')}
(en adelante, "LA VENDEDORA"); y de la otra,</p>

<p><span class="highlight">${v('cliente_nombre')}</span>, con DNI N° ${v('cliente_dni')},
de estado civil ${v('cliente_estado_civil', 'soltero/a')},
con domicilio en ${v('cliente_direccion', '_________')}
(en adelante, "EL COMPRADOR"); en los términos y condiciones siguientes:</p>

<h2>PRIMERA: ANTECEDENTES</h2>

<p>1.1 "LA VENDEDORA" es una empresa constituida de conformidad con las leyes nacionales aplicables y cuyo objeto social es dedicarse a la construcción y negocios inmobiliarios en general; asimismo a la venta de bienes inmuebles.</p>

<p>1.2 "LA VENDEDORA" es propietaria del terreno ubicado en el proyecto <span class="highlight">${v('proyecto_nombre')}</span>,
${v('partida_registral') ? `cuya descripción y antecedentes registrales obran en la Partida Electrónica N° ${v('partida_registral')} del Registro de Predios de la Zona Registral ${v('zona_registral', 'correspondiente')}.` : 'inscrito en los Registros Públicos correspondientes.'}</p>

<h2>SEGUNDA: BIENES OBJETO DEL CONTRATO</h2>

<p>Los bienes materia del presente contrato de compraventa serán de propiedad exclusiva de "EL COMPRADOR" y son los que se detallan a continuación:</p>

<table>
  <thead>
    <tr>
      <th>TIPO</th>
      <th>UNIDAD</th>
      <th>ÁREA APROX. m²</th>
      <th>PRECIO</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>LOTE</td>
      <td>${v('lote_codigo')}</td>
      <td>${v('lote_area', '-')}</td>
      <td>${v('moneda_simbolo')} ${v('precio_total')}</td>
    </tr>
  </tbody>
  <tfoot>
    <tr>
      <th colspan="3" style="text-align: right;">TOTAL DEL PRECIO DE VENTA INCLUIDO IGV:</th>
      <th>${v('moneda_simbolo')} ${v('precio_total')}</th>
    </tr>
  </tfoot>
</table>

<h2>TERCERA: PRECIO Y FORMA DE PAGO</h2>

<p>3.1 El precio total de venta del inmueble descrito en la cláusula segunda es de <span class="highlight">${v('moneda_simbolo')} ${v('precio_total')}</span>
${v('precio_letras') ? `(${v('precio_letras')})` : ''}, incluido el Impuesto General a las Ventas.</p>

<p>3.2 "EL COMPRADOR" se obliga a pagar el precio pactado de la siguiente forma: <span class="highlight">${v('forma_pago').toUpperCase()}</span></p>

${vars.monto_separacion ? `<p>a) Separación: ${v('moneda_simbolo')} ${v('monto_separacion')}, abonado a la firma del presente documento.</p>` : ''}

${vars.monto_cuota_inicial ? `<p>b) Cuota Inicial: ${v('moneda_simbolo')} ${v('monto_cuota_inicial')}.</p>` : ''}

${vars.saldo_pendiente ? `<p>c) Saldo: ${v('moneda_simbolo')} ${v('saldo_pendiente')}${vars.numero_cuotas ? `, a ser pagado en ${v('numero_cuotas')} cuotas mensuales` : ''}.</p>` : ''}

<h2>CUARTA: OBLIGACIONES DE LAS PARTES</h2>

<p>4.1 "LA VENDEDORA" se obliga a transferir la propiedad del bien inmueble descrito en la cláusula segunda, libre de todo gravamen, carga y medida judicial o extrajudicial que limite o restrinja el derecho de propiedad de "EL COMPRADOR".</p>

<p>4.2 "EL COMPRADOR" se obliga al pago total del precio pactado en la cláusula tercera del presente contrato, en las condiciones y plazos establecidos.</p>

<h2>QUINTA: ENTREGA DEL INMUEBLE</h2>

<p>5.1 "LA VENDEDORA" hará entrega del inmueble materia del presente contrato una vez que "EL COMPRADOR" haya cancelado la totalidad del precio de venta señalado en la cláusula tercera.</p>

<h2>SEXTA: RESOLUCIÓN DEL CONTRATO</h2>

<p>6.1 En caso de que "EL COMPRADOR" incumpliera con el pago de tres (03) cuotas consecutivas, "LA VENDEDORA" podrá resolver el presente contrato de pleno derecho, mediante carta notarial dirigida a "EL COMPRADOR".</p>

<h2>SÉPTIMA: CLÁUSULA PENAL</h2>

<p>7.1 Si "EL COMPRADOR" incumpliera su obligación de pago, reconoce que "LA VENDEDORA" retendrá a título de penalidad el 10% del precio de venta pactado, sin perjuicio de la resolución del contrato.</p>

<h2>OCTAVA: DISPOSICIONES FINALES</h2>

<p>8.1 Las partes declaran que el presente contrato contiene la totalidad de los acuerdos adoptados, dejando sin efecto cualquier negociación o acuerdo previo.</p>

<p>8.2 Para efectos de cualquier controversia derivada del presente contrato, las partes se someten a la jurisdicción de los jueces y tribunales de Lima.</p>

<p>Firmado en Lima, a los ${v('contrato_fecha_letras', v('contrato_fecha'))}.</p>

<div class="firma-section">
  <div class="firma-box">
    <div class="firma-linea">
      LA VENDEDORA<br>
      <small>${v('empresa_nombre', 'AMERSUR INMOBILIARIA')}</small><br>
      <small>${v('empresa_representante', '')}</small>
    </div>
  </div>
  <div class="firma-box">
    <div class="firma-linea">
      EL COMPRADOR<br>
      <small>${v('cliente_nombre')}</small><br>
      <small>DNI: ${v('cliente_dni')}</small>
    </div>
  </div>
</div>

</body>
</html>`;
}

export function reemplazarVariables(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || '___________');
}
