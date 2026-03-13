"use server";

import { getAuthorizedClient, calcularFechas, safeAction } from "./shared";

/**
 * Obtiene reporte de interacciones por vendedor
 */
export async function obtenerReporteInteracciones(
  periodo: string = '30'
): Promise<{ data: any | null; error: string | null }> {
  return safeAction(async () => {
    const supabase = await getAuthorizedClient();
    const { startDate, days } = calcularFechas(periodo);

    const { data: interacciones } = await supabase
      .schema('crm')
      .from('cliente_interaccion')
      .select(`
        id, cliente_id, vendedor_username, tipo, resultado,
        duracion_minutos, fecha_interaccion, proxima_accion
      `)
      .gte('fecha_interaccion', startDate.toISOString())
      .order('fecha_interaccion', { ascending: false });

    const { data: vendedores } = await supabase
      .schema('crm')
      .from('usuario_perfil')
      .select('username, nombre_completo')
      .eq('activo', true);

    const vendedoresMap = new Map(vendedores?.map(v => [v.username, v.nombre_completo]) || []);

    const interaccionesPorVendedor = new Map<string, {
      total: number; porTipo: Map<string, number>;
      porResultado: Map<string, number>; duracionTotal: number;
      clientesUnicos: Set<string>;
    }>();

    interacciones?.forEach(interaccion => {
      const vendedor = interaccion.vendedor_username;
      if (!interaccionesPorVendedor.has(vendedor)) {
        interaccionesPorVendedor.set(vendedor, {
          total: 0, porTipo: new Map(), porResultado: new Map(),
          duracionTotal: 0, clientesUnicos: new Set()
        });
      }

      const data = interaccionesPorVendedor.get(vendedor)!;
      data.total++;
      data.porTipo.set(interaccion.tipo, (data.porTipo.get(interaccion.tipo) || 0) + 1);
      if (interaccion.resultado) {
        data.porResultado.set(interaccion.resultado, (data.porResultado.get(interaccion.resultado) || 0) + 1);
      }
      data.duracionTotal += interaccion.duracion_minutos || 0;
      data.clientesUnicos.add(interaccion.cliente_id);
    });

    const rankingVendedores = Array.from(interaccionesPorVendedor.entries())
      .map(([username, data]) => ({
        username,
        nombre: vendedoresMap.get(username) || username,
        totalInteracciones: data.total,
        clientesAtendidos: data.clientesUnicos.size,
        duracionTotal: data.duracionTotal,
        promedioPorCliente: data.clientesUnicos.size > 0
          ? (data.total / data.clientesUnicos.size).toFixed(1) : '0',
        porTipo: Object.fromEntries(data.porTipo),
        porResultado: Object.fromEntries(data.porResultado)
      }))
      .sort((a, b) => b.totalInteracciones - a.totalInteracciones);

    const totalesPorTipo = new Map<string, number>();
    interacciones?.forEach(i => {
      totalesPorTipo.set(i.tipo, (totalesPorTipo.get(i.tipo) || 0) + 1);
    });

    const distribucionTipo = Array.from(totalesPorTipo.entries())
      .map(([tipo, cantidad]) => ({
        tipo, cantidad,
        porcentaje: interacciones ? ((cantidad / interacciones.length) * 100).toFixed(1) : '0'
      }))
      .sort((a, b) => b.cantidad - a.cantidad);

    const totalesPorResultado = new Map<string, number>();
    let interaccionesConResultado = 0;
    interacciones?.forEach(i => {
      if (i.resultado) {
        totalesPorResultado.set(i.resultado, (totalesPorResultado.get(i.resultado) || 0) + 1);
        interaccionesConResultado++;
      }
    });

    const distribucionResultado = Array.from(totalesPorResultado.entries())
      .map(([resultado, cantidad]) => ({
        resultado, cantidad,
        porcentaje: interaccionesConResultado > 0 ? ((cantidad / interaccionesConResultado) * 100).toFixed(1) : '0'
      }))
      .sort((a, b) => b.cantidad - a.cantidad);

    const interaccionesPorDia = new Map<string, number>();
    interacciones?.forEach(i => {
      const fecha = new Date(i.fecha_interaccion).toISOString().split('T')[0];
      interaccionesPorDia.set(fecha, (interaccionesPorDia.get(fecha) || 0) + 1);
    });

    const tendenciaDiaria = Array.from(interaccionesPorDia.entries())
      .map(([fecha, cantidad]) => ({ fecha, cantidad }))
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
      .slice(-30);

    return {
      resumen: {
        totalInteracciones: interacciones?.length || 0,
        vendedoresActivos: interaccionesPorVendedor.size,
        promedioPorVendedor: interaccionesPorVendedor.size > 0
          ? Math.round((interacciones?.length || 0) / interaccionesPorVendedor.size) : 0,
        clientesContactados: new Set(interacciones?.map(i => i.cliente_id) || []).size
      },
      rankingVendedores, distribucionTipo, distribucionResultado, tendenciaDiaria,
      periodo: { inicio: startDate.toISOString(), fin: new Date().toISOString(), dias: days }
    };
  });
}
