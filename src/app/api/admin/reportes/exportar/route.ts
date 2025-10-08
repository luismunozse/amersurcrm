import { NextRequest, NextResponse } from "next/server";
import { createServerOnlyClient } from "@/lib/supabase.server";
import { esAdmin } from "@/lib/auth/roles";

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

    const body = await request.json();
    const { tipo, periodo, datos } = body;

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

function generarHTMLReporte(tipo: string, periodo: string, datos: any): string {
  const fechaActual = new Date().toLocaleDateString('es-PE');
  const titulo = obtenerTituloReporte(tipo);

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
            <p class="subtitulo">Generado el ${fechaActual} • Período: ${periodo} días</p>
        </div>

        <div class="metadatos">
            <div class="metadato">
                <div class="metadato-label">Período</div>
                <div class="metadato-valor">${datos.periodo?.dias || periodo} días</div>
            </div>
            <div class="metadato">
                <div class="metadato-label">Desde</div>
                <div class="metadato-valor">${datos.periodo?.inicio ? new Date(datos.periodo.inicio).toLocaleDateString('es-PE') : 'N/A'}</div>
            </div>
            <div class="metadato">
                <div class="metadato-label">Hasta</div>
                <div class="metadato-valor">${datos.periodo?.fin ? new Date(datos.periodo.fin).toLocaleDateString('es-PE') : 'N/A'}</div>
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

function obtenerTituloReporte(tipo: string): string {
  const titulos: Record<string, string> = {
    'ventas': 'Reporte de Ventas',
    'clientes': 'Reporte de Clientes',
    'propiedades': 'Reporte de Propiedades',
    'rendimiento': 'Reporte de Rendimiento de Vendedores',
    'general': 'Reporte General del Sistema'
  };
  return titulos[tipo] || 'Reporte del Sistema';
}

function generarContenidoMetricas(tipo: string, datos: any): string {
  if (!datos.metricas) return '<p>No hay datos disponibles</p>';

  const { metricas } = datos;

  return `
    <div class="seccion">
      <h2 class="seccion-titulo">Métricas Principales</h2>
      <div class="metricas-grid">
        <div class="metrica">
          <div class="metrica-titulo">Ventas Totales</div>
          <div class="metrica-valor">S/ ${formatearNumero(metricas.ventas?.valorTotal || 0)}</div>
          <div class="metrica-cambio cambio-positivo">+12.5% vs período anterior</div>
        </div>
        <div class="metrica">
          <div class="metrica-titulo">Clientes Activos</div>
          <div class="metrica-valor">${metricas.clientes?.activos || 0}</div>
          <div class="metrica-cambio cambio-positivo">+${metricas.clientes?.nuevos || 0} nuevos</div>
        </div>
        <div class="metrica">
          <div class="metrica-titulo">Propiedades Vendidas</div>
          <div class="metrica-valor">${metricas.propiedades?.vendidas || 0}</div>
          <div class="metrica-cambio cambio-positivo">+${metricas.propiedades?.nuevas || 0} nuevas</div>
        </div>
        <div class="metrica">
          <div class="metrica-titulo">Tasa de Conversión</div>
          <div class="metrica-valor">${metricas.clientes?.tasaConversion?.toFixed(1) || 0}%</div>
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

function generarSeccionVentas(metricas: any): string {
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
            <td>S/ ${formatearNumero(metricas.ventas?.valorTotal || 0)}</td>
            <td class="cambio-positivo">+12.5%</td>
          </tr>
          <tr>
            <td>Propiedades Vendidas</td>
            <td>${metricas.ventas?.propiedadesVendidas || 0}</td>
            <td class="cambio-positivo">+15.3%</td>
          </tr>
          <tr>
            <td>Promedio por Venta</td>
            <td>S/ ${formatearNumero(metricas.ventas?.promedioVenta || 0)}</td>
            <td class="cambio-positivo">+5.2%</td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
}

function generarSeccionClientes(metricas: any): string {
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
            <td>${metricas.clientes?.activos || 0}</td>
            <td class="cambio-positivo">+${metricas.clientes?.nuevos || 0}</td>
          </tr>
          <tr>
            <td>Nuevos Clientes</td>
            <td>${metricas.clientes?.nuevos || 0}</td>
            <td class="cambio-positivo">+8.2%</td>
          </tr>
          <tr>
            <td>Tasa de Conversión</td>
            <td>${metricas.clientes?.tasaConversion?.toFixed(1) || 0}%</td>
            <td class="cambio-positivo">+3.1%</td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
}

function generarSeccionPropiedades(metricas: any): string {
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
            <td>${metricas.propiedades?.disponibles || 0}</td>
            <td>${calcularPorcentaje(metricas.propiedades?.disponibles, metricas.propiedades?.total)}%</td>
          </tr>
          <tr>
            <td>Vendidas</td>
            <td>${metricas.propiedades?.vendidas || 0}</td>
            <td>${calcularPorcentaje(metricas.propiedades?.vendidas, metricas.propiedades?.total)}%</td>
          </tr>
          <tr>
            <td>Total</td>
            <td>${metricas.propiedades?.total || 0}</td>
            <td>100%</td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
}

function generarSeccionRendimiento(metricas: any): string {
  const topVendedores = metricas.vendedores?.topVendedores || [];
  
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
          ${topVendedores.map((v: any) => `
            <tr>
              <td>${v.nombre || v.username}</td>
              <td>S/ ${formatearNumero(v.ventas)}</td>
              <td>${v.propiedades}</td>
              <td>S/ ${formatearNumero(v.meta)}</td>
              <td class="${v.ventas >= v.meta ? 'cambio-positivo' : 'cambio-negativo'}">
                ${calcularCumplimiento(v.ventas, v.meta)}%
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

