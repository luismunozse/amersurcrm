import { NextRequest, NextResponse } from "next/server";
import { createServerOnlyClient } from "@/lib/supabase.server";
import { esAdmin } from "@/lib/permissions/server";

type ReporteTipo = "ventas" | "clientes" | "propiedades" | "rendimiento" | "general";

interface ReportePeriodo {
  dias?: number;
  inicio?: string;
  fin?: string;
}

interface VentasMetricas {
  valorTotal?: number;
  propiedadesVendidas?: number;
  promedioVenta?: number;
  nuevas?: number;
}

interface ClientesMetricas {
  activos?: number;
  nuevos?: number;
  tasaConversion?: number;
}

interface PropiedadesMetricas {
  disponibles?: number;
  vendidas?: number;
  total?: number;
  nuevas?: number;
}

interface VendedorMetricas {
  nombre?: string;
  username?: string;
  ventas?: number;
  propiedades?: number;
  meta?: number;
}

interface VendedoresMetricas {
  topVendedores?: VendedorMetricas[];
}

interface ReporteMetricas {
  ventas?: VentasMetricas;
  clientes?: ClientesMetricas;
  propiedades?: PropiedadesMetricas;
  vendedores?: VendedoresMetricas;
}

interface ReporteDatos {
  periodo?: ReportePeriodo;
  metricas?: ReporteMetricas;
}

interface ReporteRequestBody {
  tipo: ReporteTipo;
  periodo?: string;
  datos: ReporteDatos;
}

// POST - Exportar reporte a PDF
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerOnlyClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const isAdminUser = await esAdmin();
    if (!isAdminUser) {
      return NextResponse.json({ error: "No tienes permisos de administrador" }, { status: 403 });
    }

    const rawBody: unknown = await request.json();
    const { tipo, periodo = "", datos } = normalizarCuerpo(rawBody);

    if (!tipo || !datos) {
      return NextResponse.json({ error: "Faltan parámetros requeridos" }, { status: 400 });
    }

    // Generar contenido HTML para el PDF
    const htmlContent = generarHTMLReporte(tipo, periodo, datos);

    // Por ahora, retornamos un URL simulado
    // En producción, aquí usarías una librería como Puppeteer o jsPDF
    const reporteURL = `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`;

    return NextResponse.json({
      success: true,
      url: reporteURL,
      filename: `reporte-${tipo}-${new Date().toISOString().split('T')[0]}.html`
    });

  } catch (error) {
    console.error('Error exportando reporte:', error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

function normalizarCuerpo(raw: unknown): ReporteRequestBody {
  if (!raw || typeof raw !== "object") {
    return { tipo: "general", periodo: "", datos: {} };
  }

  const record = raw as Record<string, unknown>;
  const tipo = esReporteTipo(record.tipo) ? record.tipo : "general";
  const periodo = typeof record.periodo === "string" ? record.periodo : "";

  return {
    tipo,
    periodo,
    datos: normalizarDatos(record.datos),
  };
}

function esReporteTipo(value: unknown): value is ReporteTipo {
  return value === "ventas"
    || value === "clientes"
    || value === "propiedades"
    || value === "rendimiento"
    || value === "general";
}

function normalizarDatos(raw: unknown): ReporteDatos {
  if (!raw || typeof raw !== "object") return {};

  const record = raw as Record<string, unknown>;
  const periodo = normalizarPeriodo(record.periodo);
  const metricas = normalizarMetricas(record.metricas);

  return {
    ...(periodo ? { periodo } : {}),
    ...(metricas ? { metricas } : {}),
  };
}

function normalizarPeriodo(raw: unknown): ReportePeriodo | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const record = raw as Record<string, unknown>;
  const periodo: ReportePeriodo = {};

  if (typeof record.dias === "number") periodo.dias = record.dias;
  if (typeof record.inicio === "string") periodo.inicio = record.inicio;
  if (typeof record.fin === "string") periodo.fin = record.fin;

  return Object.keys(periodo).length > 0 ? periodo : undefined;
}

function normalizarMetricas(raw: unknown): ReporteMetricas | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const record = raw as Record<string, unknown>;

  const metricas: ReporteMetricas = {};
  const ventas = normalizarVentasMetricas(record.ventas);
  if (ventas) metricas.ventas = ventas;

  const clientes = normalizarClientesMetricas(record.clientes);
  if (clientes) metricas.clientes = clientes;

  const propiedades = normalizarPropiedadesMetricas(record.propiedades);
  if (propiedades) metricas.propiedades = propiedades;

  const vendedores = normalizarVendedoresMetricas(record.vendedores);
  if (vendedores) metricas.vendedores = vendedores;

  return Object.keys(metricas).length > 0 ? metricas : undefined;
}

const numero = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

function normalizarVentasMetricas(raw: unknown): VentasMetricas | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const record = raw as Record<string, unknown>;

  const result: VentasMetricas = {};
  const valorTotal = numero(record.valorTotal);
  if (valorTotal !== undefined) result.valorTotal = valorTotal;
  const propiedadesVendidas = numero(record.propiedadesVendidas);
  if (propiedadesVendidas !== undefined) result.propiedadesVendidas = propiedadesVendidas;
  const promedioVenta = numero(record.promedioVenta);
  if (promedioVenta !== undefined) result.promedioVenta = promedioVenta;
  const nuevas = numero(record.nuevas);
  if (nuevas !== undefined) result.nuevas = nuevas;

  return Object.keys(result).length > 0 ? result : undefined;
}

function normalizarClientesMetricas(raw: unknown): ClientesMetricas | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const record = raw as Record<string, unknown>;

  const result: ClientesMetricas = {};
  const activos = numero(record.activos);
  if (activos !== undefined) result.activos = activos;
  const nuevos = numero(record.nuevos);
  if (nuevos !== undefined) result.nuevos = nuevos;
  const tasaConversion = numero(record.tasaConversion);
  if (tasaConversion !== undefined) result.tasaConversion = tasaConversion;

  return Object.keys(result).length > 0 ? result : undefined;
}

function normalizarPropiedadesMetricas(raw: unknown): PropiedadesMetricas | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const record = raw as Record<string, unknown>;

  const result: PropiedadesMetricas = {};
  const disponibles = numero(record.disponibles);
  if (disponibles !== undefined) result.disponibles = disponibles;
  const vendidas = numero(record.vendidas);
  if (vendidas !== undefined) result.vendidas = vendidas;
  const total = numero(record.total);
  if (total !== undefined) result.total = total;
  const nuevas = numero(record.nuevas);
  if (nuevas !== undefined) result.nuevas = nuevas;

  return Object.keys(result).length > 0 ? result : undefined;
}

function normalizarVendedoresMetricas(raw: unknown): VendedoresMetricas | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const record = raw as Record<string, unknown>;
  const topVendedoresRaw = Array.isArray(record.topVendedores) ? record.topVendedores : undefined;

  if (!topVendedoresRaw) return undefined;

  const topVendedores = topVendedoresRaw
    .map((vendedor): VendedorMetricas | null => {
      if (!vendedor || typeof vendedor !== "object") return null;
      const data = vendedor as Record<string, unknown>;

      const nombre = typeof data.nombre === "string" ? data.nombre : undefined;
      const username = typeof data.username === "string" ? data.username : undefined;
      const ventas = numero(data.ventas);
      const propiedades = numero(data.propiedades);
      const meta = numero(data.meta);

      const result: VendedorMetricas = {};
      if (nombre) result.nombre = nombre;
      if (username) result.username = username;
      if (ventas !== undefined) result.ventas = ventas;
      if (propiedades !== undefined) result.propiedades = propiedades;
      if (meta !== undefined) result.meta = meta;

      return Object.keys(result).length > 0 ? result : null;
    })
    .filter((item): item is VendedorMetricas => item !== null);

  return topVendedores.length > 0 ? { topVendedores } : undefined;
}

function generarHTMLReporte(tipo: ReporteTipo, periodo: string, datos: ReporteDatos): string {
  const fechaActual = new Date().toLocaleDateString('es-PE');
  const titulo = obtenerTituloReporte(tipo);
  const periodoDesde = datos.periodo?.inicio
    ? new Date(datos.periodo.inicio).toLocaleDateString('es-PE')
    : 'N/A';
  const periodoHasta = datos.periodo?.fin
    ? new Date(datos.periodo.fin).toLocaleDateString('es-PE')
    : 'N/A';
  const periodoValue = Number(periodo);
  const periodoDias = typeof datos.periodo?.dias === "number"
    ? datos.periodo.dias
    : Number.isFinite(periodoValue) && periodo.trim() !== "" ? periodoValue : undefined;

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${titulo}</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                margin: 0;
                padding: 20px;
                background: white;
                color: #333;
            }
            .header {
                border-bottom: 3px solid #3B82F6;
                padding-bottom: 20px;
                margin-bottom: 30px;
            }
            .logo {
                font-size: 24px;
                font-weight: bold;
                color: #3B82F6;
                margin-bottom: 10px;
            }
            .titulo {
                font-size: 28px;
                font-weight: bold;
                color: #1F2937;
                margin: 0;
            }
            .subtitulo {
                color: #6B7280;
                font-size: 14px;
                margin: 5px 0 0 0;
            }
            .metadatos {
                background: #F9FAFB;
                padding: 15px;
                border-radius: 8px;
                margin-bottom: 30px;
                display: flex;
                gap: 30px;
                flex-wrap: wrap;
            }
            .metadato {
                display: flex;
                flex-direction: column;
            }
            .metadato-label {
                font-size: 12px;
                color: #6B7280;
                text-transform: uppercase;
                font-weight: 600;
                margin-bottom: 4px;
            }
            .metadato-valor {
                font-size: 14px;
                color: #1F2937;
                font-weight: 500;
            }
            .metricas-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 20px;
                margin-bottom: 30px;
            }
            .metrica {
                background: white;
                border: 1px solid #E5E7EB;
                border-radius: 12px;
                padding: 20px;
                text-align: center;
            }
            .metrica-titulo {
                font-size: 14px;
                color: #6B7280;
                margin-bottom: 10px;
                font-weight: 500;
            }
            .metrica-valor {
                font-size: 24px;
                font-weight: bold;
                color: #1F2937;
                margin-bottom: 5px;
            }
            .metrica-cambio {
                font-size: 12px;
                font-weight: 500;
            }
            .cambio-positivo {
                color: #059669;
            }
            .cambio-negativo {
                color: #DC2626;
            }
            .seccion {
                margin-bottom: 30px;
            }
            .seccion-titulo {
                font-size: 20px;
                font-weight: bold;
                color: #1F2937;
                margin-bottom: 15px;
                border-bottom: 2px solid #E5E7EB;
                padding-bottom: 10px;
            }
            .tabla {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 20px;
            }
            .tabla th,
            .tabla td {
                padding: 12px;
                text-align: left;
                border-bottom: 1px solid #E5E7EB;
            }
            .tabla th {
                background: #F9FAFB;
                font-weight: 600;
                color: #374151;
                font-size: 14px;
            }
            .tabla td {
                font-size: 14px;
                color: #1F2937;
            }
            .footer {
                margin-top: 50px;
                padding-top: 20px;
                border-top: 1px solid #E5E7EB;
                text-align: center;
                color: #6B7280;
                font-size: 12px;
            }
            @media print {
                body { margin: 0; }
                .no-print { display: none; }
            }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="logo">AMERSUR CRM</div>
            <h1 class="titulo">${titulo}</h1>
            <p class="subtitulo">Generado el ${fechaActual} • Período: ${periodoDias ?? 0} días</p>
        </div>

        <div class="metadatos">
            <div class="metadato">
                <div class="metadato-label">Período</div>
                <div class="metadato-valor">${periodoDias ?? 0} días</div>
            </div>
            <div class="metadato">
                <div class="metadato-label">Desde</div>
                <div class="metadato-valor">${periodoDesde}</div>
            </div>
            <div class="metadato">
                <div class="metadato-label">Hasta</div>
                <div class="metadato-valor">${periodoHasta}</div>
            </div>
        </div>

        ${generarContenidoMetricas(tipo, datos)}

        <div class="footer">
            <p>Este reporte fue generado automáticamente por el sistema AMERSUR CRM</p>
            <p>Para más información, contacte al administrador del sistema</p>
        </div>
    </body>
    </html>
  `;
}

function obtenerTituloReporte(tipo: ReporteTipo): string {
  const titulos: Record<string, string> = {
    'ventas': 'Reporte de Ventas',
    'clientes': 'Reporte de Clientes',
    'propiedades': 'Reporte de Propiedades',
    'rendimiento': 'Reporte de Rendimiento de Vendedores',
    'general': 'Reporte General del Sistema'
  };
  return titulos[tipo] || 'Reporte del Sistema';
}

function generarContenidoMetricas(tipo: ReporteTipo, datos: ReporteDatos): string {
  const metricas = datos.metricas;
  if (!metricas) return '<p>No hay datos disponibles</p>';

  return `
    <div class="seccion">
      <h2 class="seccion-titulo">Métricas Principales</h2>
      <div class="metricas-grid">
        <div class="metrica">
          <div class="metrica-titulo">Ventas Totales</div>
          <div class="metrica-valor">S/ ${formatearNumero(metricas.ventas?.valorTotal ?? 0)}</div>
          <div class="metrica-cambio cambio-positivo">+12.5% vs período anterior</div>
        </div>
        <div class="metrica">
          <div class="metrica-titulo">Clientes Activos</div>
          <div class="metrica-valor">${metricas.clientes?.activos ?? 0}</div>
          <div class="metrica-cambio cambio-positivo">+${metricas.clientes?.nuevos ?? 0} nuevos</div>
        </div>
        <div class="metrica">
          <div class="metrica-titulo">Propiedades Vendidas</div>
          <div class="metrica-valor">${metricas.propiedades?.vendidas ?? 0}</div>
          <div class="metrica-cambio cambio-positivo">+${metricas.propiedades?.nuevas ?? 0} nuevas</div>
        </div>
        <div class="metrica">
          <div class="metrica-titulo">Tasa de Conversión</div>
          <div class="metrica-valor">${metricas.clientes?.tasaConversion?.toFixed(1) ?? 0}%</div>
          <div class="metrica-cambio cambio-positivo">+3.1% vs período anterior</div>
        </div>
      </div>
    </div>

    ${tipo === 'ventas' ? generarSeccionVentas(metricas) : ''}
    ${tipo === 'clientes' ? generarSeccionClientes(metricas) : ''}
    ${tipo === 'propiedades' ? generarSeccionPropiedades(metricas) : ''}
    ${tipo === 'rendimiento' ? generarSeccionRendimiento(metricas) : ''}
  `;
}

function generarSeccionVentas(metricas: ReporteMetricas): string {
  return `
    <div class="seccion">
      <h2 class="seccion-titulo">Análisis de Ventas</h2>
      <table class="tabla">
        <thead>
          <tr>
            <th>Métrica</th>
            <th>Valor</th>
            <th>Cambio</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Valor Total de Ventas</td>
            <td>S/ ${formatearNumero(metricas.ventas?.valorTotal ?? 0)}</td>
            <td class="cambio-positivo">+12.5%</td>
          </tr>
          <tr>
            <td>Propiedades Vendidas</td>
            <td>${metricas.ventas?.propiedadesVendidas ?? 0}</td>
            <td class="cambio-positivo">+15.3%</td>
          </tr>
          <tr>
            <td>Promedio por Venta</td>
            <td>S/ ${formatearNumero(metricas.ventas?.promedioVenta ?? 0)}</td>
            <td class="cambio-positivo">+5.2%</td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
}

function generarSeccionClientes(metricas: ReporteMetricas): string {
  return `
    <div class="seccion">
      <h2 class="seccion-titulo">Análisis de Clientes</h2>
      <table class="tabla">
        <thead>
          <tr>
            <th>Métrica</th>
            <th>Valor</th>
            <th>Cambio</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Clientes Activos</td>
            <td>${metricas.clientes?.activos ?? 0}</td>
            <td class="cambio-positivo">+${metricas.clientes?.nuevos ?? 0}</td>
          </tr>
          <tr>
            <td>Nuevos Clientes</td>
            <td>${metricas.clientes?.nuevos ?? 0}</td>
            <td class="cambio-positivo">+8.2%</td>
          </tr>
          <tr>
            <td>Tasa de Conversión</td>
            <td>${metricas.clientes?.tasaConversion?.toFixed(1) ?? 0}%</td>
            <td class="cambio-positivo">+3.1%</td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
}

function generarSeccionPropiedades(metricas: ReporteMetricas): string {
  return `
    <div class="seccion">
      <h2 class="seccion-titulo">Análisis de Propiedades</h2>
      <table class="tabla">
        <thead>
          <tr>
            <th>Estado</th>
            <th>Cantidad</th>
            <th>Porcentaje</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Disponibles</td>
            <td>${metricas.propiedades?.disponibles ?? 0}</td>
            <td>${calcularPorcentaje(metricas.propiedades?.disponibles ?? 0, metricas.propiedades?.total ?? 0)}%</td>
          </tr>
          <tr>
            <td>Vendidas</td>
            <td>${metricas.propiedades?.vendidas ?? 0}</td>
            <td>${calcularPorcentaje(metricas.propiedades?.vendidas ?? 0, metricas.propiedades?.total ?? 0)}%</td>
          </tr>
          <tr>
            <td>Total</td>
            <td>${metricas.propiedades?.total ?? 0}</td>
            <td>100%</td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
}

function generarSeccionRendimiento(metricas: ReporteMetricas): string {
  const topVendedores: VendedorMetricas[] = metricas.vendedores?.topVendedores ?? [];
  
  return `
    <div class="seccion">
      <h2 class="seccion-titulo">Rendimiento de Vendedores</h2>
      <table class="tabla">
        <thead>
          <tr>
            <th>Vendedor</th>
            <th>Ventas</th>
            <th>Propiedades</th>
            <th>Meta</th>
            <th>Cumplimiento</th>
          </tr>
        </thead>
        <tbody>
          ${topVendedores.map((v) => `
            <tr>
              <td>${v.nombre || v.username || 'Sin nombre'}</td>
              <td>S/ ${formatearNumero(v.ventas ?? 0)}</td>
              <td>${v.propiedades ?? 0}</td>
              <td>S/ ${formatearNumero(v.meta ?? 0)}</td>
              <td class="${(v.ventas ?? 0) >= (v.meta ?? 0) ? 'cambio-positivo' : 'cambio-negativo'}">
                ${calcularCumplimiento(v.ventas ?? 0, v.meta ?? 0)}%
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function formatearNumero(numero: number): string {
  if (numero >= 1000000) {
    return `${(numero / 1000000).toFixed(1)}M`;
  } else if (numero >= 1000) {
    return `${(numero / 1000).toFixed(1)}K`;
  }
  return numero.toLocaleString('es-PE');
}

function calcularPorcentaje(valor: number, total: number): string {
  if (!total || total === 0) return '0';
  return ((valor / total) * 100).toFixed(1);
}

function calcularCumplimiento(ventas: number, meta: number): string {
  if (!meta || meta === 0) return '0';
  return ((ventas / meta) * 100).toFixed(1);
}
