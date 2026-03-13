"use server";

import { getAuthorizedClient, calcularFechas, safeAction } from "./shared";

/**
 * Obtiene reporte de clientes captados según origen del lead
 */
export async function obtenerReporteOrigenLead(
  periodo: string = '30',
  fechaInicio?: string,
  fechaFin?: string
): Promise<{ data: any | null; error: string | null }> {
  return safeAction(async () => {
    const supabase = await getAuthorizedClient();
    const { startDate, endDate, days } = calcularFechas(periodo, fechaInicio, fechaFin);

    // Obtener clientes del período
    const { data: clientesPeriodo } = await supabase
      .schema('crm')
      .from('cliente')
      .select('id, nombre, origen_lead, estado_cliente, fecha_alta, vendedor_asignado')
      .gte('fecha_alta', startDate.toISOString())
      .lte('fecha_alta', endDate.toISOString())
      .order('fecha_alta', { ascending: false });

    // Obtener el total real de clientes (sin límite)
    const { count: totalClientesCount } = await supabase
      .schema('crm')
      .from('cliente')
      .select('id', { count: 'exact', head: true });

    // Obtener clientes para análisis (con límite alto para tendencias y efectividad)
    const { data: todosClientes } = await supabase
      .schema('crm')
      .from('cliente')
      .select('id, origen_lead, estado_cliente, fecha_alta')
      .order('fecha_alta', { ascending: false })
      .limit(50000); // Límite alto para análisis

    // Colores para cada origen (incluye orígenes del sistema)
    const coloresOrigen: Record<string, string> = {
      // Orígenes del sistema
      'whatsapp_web': '#25D366',        // verde whatsapp
      'publicidad': '#F59E0B',          // amber
      'referido': '#10B981',            // green
      'facebook': '#1877F2',            // facebook blue
      'instagram': '#E4405F',           // instagram pink
      'google': '#EA4335',              // google red
      'tiktok': '#000000',              // tiktok black
      'youtube': '#FF0000',             // youtube red
      'linkedin': '#0A66C2',            // linkedin blue
      // Orígenes adicionales
      'web': '#3B82F6',                 // blue
      'recomendacion': '#10B981',       // green
      'feria': '#8B5CF6',               // purple
      'campaña_facebook': '#1877F2',    // facebook blue
      'campaña_instagram': '#E4405F',   // instagram pink
      'campaña_google': '#EA4335',      // google red
      'llamada_entrante': '#14B8A6',    // teal
      'visita_oficina': '#6366F1',      // indigo
      'otro': '#6B7280',                // gray
      'No especificado': '#9CA3AF'      // gray-400
    };

    const etiquetasOrigen: Record<string, string> = {
      // Orígenes del sistema
      'whatsapp_web': 'WhatsApp Web',
      'publicidad': 'Publicidad',
      'referido': 'Referido',
      'facebook': 'Facebook',
      'instagram': 'Instagram',
      'google': 'Google',
      'tiktok': 'TikTok',
      'youtube': 'YouTube',
      'linkedin': 'LinkedIn',
      // Orígenes adicionales
      'web': 'Página Web',
      'recomendacion': 'Recomendación',
      'feria': 'Feria Inmobiliaria',
      'campaña_facebook': 'Campaña Facebook',
      'campaña_instagram': 'Campaña Instagram',
      'campaña_google': 'Campaña Google',
      'llamada_entrante': 'Llamada Entrante',
      'visita_oficina': 'Visita a Oficina',
      'otro': 'Otro',
      'No especificado': 'No especificado'
    };

    // Contar por origen (período seleccionado)
    const origenConteo = new Map<string, number>();
    clientesPeriodo?.forEach(cliente => {
      const origen = cliente.origen_lead || 'No especificado';
      origenConteo.set(origen, (origenConteo.get(origen) || 0) + 1);
    });

    const totalPeriodo = clientesPeriodo?.length || 0;

    // Distribución por origen
    const distribucionOrigen = Array.from(origenConteo.entries())
      .map(([origen, cantidad]) => ({
        origen,
        etiqueta: etiquetasOrigen[origen] || origen,
        cantidad,
        porcentaje: totalPeriodo > 0 ? ((cantidad / totalPeriodo) * 100).toFixed(1) : '0',
        color: coloresOrigen[origen] || '#6B7280'
      }))
      .sort((a, b) => b.cantidad - a.cantidad);

    // Tendencia por mes (últimos 6 meses)
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const tendenciaPorMes = new Map<string, Map<string, number>>();

    // Inicializar últimos 6 meses
    const hoy = new Date();
    for (let i = 5; i >= 0; i--) {
      const fecha = new Date(hoy);
      fecha.setMonth(hoy.getMonth() - i);
      const mesKey = `${meses[fecha.getMonth()]} ${fecha.getFullYear()}`;
      tendenciaPorMes.set(mesKey, new Map());
    }

    // Procesar todos los clientes para tendencia
    todosClientes?.forEach(cliente => {
      const fecha = new Date(cliente.fecha_alta);
      const mesKey = `${meses[fecha.getMonth()]} ${fecha.getFullYear()}`;

      if (tendenciaPorMes.has(mesKey)) {
        const origenes = tendenciaPorMes.get(mesKey)!;
        const origen = cliente.origen_lead || 'No especificado';
        origenes.set(origen, (origenes.get(origen) || 0) + 1);
      }
    });

    // Formatear tendencia para gráfico de líneas
    const tendenciaData = Array.from(tendenciaPorMes.entries()).map(([mes, origenes]) => {
      const entry: any = { mes, total: 0 };
      origenes.forEach((cantidad, origen) => {
        entry[origen] = cantidad;
        entry.total += cantidad;
      });
      return entry;
    });

    // Contar por estado para cada origen (avance en el embudo)
    // Usa clientes del período filtrado para consistencia con el resto del reporte
    const avancePorOrigen = new Map<string, { total: number; avanzados: number }>();

    const estadosAvanzados = ['activo', 'en_seguimiento', 'interesado', 'reserva', 'comprador', 'contactado'];

    clientesPeriodo?.forEach(cliente => {
      const origen = cliente.origen_lead || 'No especificado';
      const actual = avancePorOrigen.get(origen) || { total: 0, avanzados: 0 };
      actual.total++;
      if (estadosAvanzados.includes(cliente.estado_cliente)) {
        actual.avanzados++;
      }
      avancePorOrigen.set(origen, actual);
    });

    const tasaConversionPorOrigen = Array.from(avancePorOrigen.entries())
      .map(([origen, data]) => ({
        origen,
        etiqueta: etiquetasOrigen[origen] || origen,
        total: data.total,
        avanzados: data.avanzados,
        tasaConversion: data.total > 0 ? ((data.avanzados / data.total) * 100).toFixed(1) : '0',
        color: coloresOrigen[origen] || '#6B7280'
      }))
      .filter(item => item.total > 0) // Solo mostrar orígenes con clientes
      .sort((a, b) => parseFloat(b.tasaConversion) - parseFloat(a.tasaConversion));

    // Clientes por vendedor y origen
    const clientesPorVendedor = new Map<string, Map<string, number>>();
    clientesPeriodo?.forEach(cliente => {
      const vendedor = cliente.vendedor_asignado || 'Sin asignar';
      const origen = cliente.origen_lead || 'No especificado';

      if (!clientesPorVendedor.has(vendedor)) {
        clientesPorVendedor.set(vendedor, new Map());
      }
      const origenes = clientesPorVendedor.get(vendedor)!;
      origenes.set(origen, (origenes.get(origen) || 0) + 1);
    });

    const distribucionPorVendedor = Array.from(clientesPorVendedor.entries())
      .map(([vendedor, origenes]) => ({
        vendedor,
        total: Array.from(origenes.values()).reduce((a, b) => a + b, 0),
        origenes: Object.fromEntries(origenes)
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    // Lista detallada de clientes del período
    const clientesDetalle = clientesPeriodo?.slice(0, 50).map(cliente => ({
      id: cliente.id,
      nombre: cliente.nombre,
      origen: etiquetasOrigen[cliente.origen_lead || 'No especificado'] || cliente.origen_lead || 'No especificado',
      estado: cliente.estado_cliente,
      fechaAlta: cliente.fecha_alta,
      vendedor: cliente.vendedor_asignado || 'Sin asignar'
    })) || [];

    return {
      resumen: {
        totalPeriodo,
        totalHistorico: totalClientesCount || 0,
        origenPrincipal: distribucionOrigen[0]?.etiqueta || 'N/A',
        mejorConversion: tasaConversionPorOrigen[0]?.etiqueta || 'N/A'
      },
      distribucionOrigen,
      tendenciaData,
      tasaConversionPorOrigen,
      distribucionPorVendedor,
      clientesDetalle,
      periodo: {
        inicio: startDate.toISOString(),
        fin: endDate.toISOString(),
        dias: days
      }
    };
  });
}
