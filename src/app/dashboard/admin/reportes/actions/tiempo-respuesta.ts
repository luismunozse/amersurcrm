"use server";

import { getAuthorizedClient, calcularFechas, safeAction } from "./shared";

/**
 * Obtiene reporte de tiempo de respuesta entre captación y primer contacto
 */
export async function obtenerReporteTiempoRespuesta(
  periodo: string = '30',
  fechaInicio?: string,
  fechaFin?: string
): Promise<{ data: any | null; error: string | null }> {
  return safeAction(async () => {
    const supabase = await getAuthorizedClient();
    const { startDate, endDate, days } = calcularFechas(periodo, fechaInicio, fechaFin);

    // Obtener clientes del período con su vendedor
    const { data: clientes } = await supabase
      .schema('crm')
      .from('cliente')
      .select('id, nombre, fecha_alta, vendedor_asignado, estado_cliente, telefono, email')
      .gte('fecha_alta', startDate.toISOString())
      .lte('fecha_alta', endDate.toISOString())
      .order('fecha_alta', { ascending: false });

    // Obtener primera interacción de cada cliente (solo del período y de los clientes captados en él)
    const clienteIdsDelPeriodo = clientes?.map(c => c.id) || [];
    const { data: interacciones } = await supabase
      .schema('crm')
      .from('cliente_interaccion')
      .select('cliente_id, fecha_interaccion, vendedor_username, tipo')
      .in('cliente_id', clienteIdsDelPeriodo.length > 0 ? clienteIdsDelPeriodo : ['00000000-0000-0000-0000-000000000000'])
      .gte('fecha_interaccion', startDate.toISOString())
      .order('fecha_interaccion', { ascending: true });

    // Obtener información de vendedores
    const { data: vendedores } = await supabase
      .schema('crm')
      .from('usuario_perfil')
      .select('username, nombre_completo')
      .eq('activo', true);

    const vendedoresMap = new Map(vendedores?.map(v => [v.username, v.nombre_completo]) || []);

    // Agrupar primera interacción por cliente
    const primeraInteraccionPorCliente = new Map<string, any>();
    interacciones?.forEach(interaccion => {
      if (!primeraInteraccionPorCliente.has(interaccion.cliente_id)) {
        primeraInteraccionPorCliente.set(interaccion.cliente_id, interaccion);
      }
    });

    // Calcular tiempo de respuesta para cada cliente
    const hoy = new Date();
    const tiemposPorVendedor = new Map<string, {
      tiempos: number[];
      clientesAtendidos: number;
      clientesSinContactar: number;
    }>();

    const clientesSinContactar: any[] = [];
    const clientesConTiempo: any[] = [];

    // Umbrales de alerta (en horas)
    const UMBRAL_CRITICO = 72; // 3 días
    const UMBRAL_ALERTA = 48; // 2 días
    const UMBRAL_ATENCION = 24; // 1 día

    clientes?.forEach(cliente => {
      const vendedor = cliente.vendedor_asignado || 'Sin asignar';
      const primeraInteraccion = primeraInteraccionPorCliente.get(cliente.id);

      if (!tiemposPorVendedor.has(vendedor)) {
        tiemposPorVendedor.set(vendedor, {
          tiempos: [],
          clientesAtendidos: 0,
          clientesSinContactar: 0
        });
      }

      const dataVendedor = tiemposPorVendedor.get(vendedor)!;

      if (primeraInteraccion) {
        // Cliente contactado - calcular tiempo de respuesta
        const fechaAlta = new Date(cliente.fecha_alta);
        const fechaContacto = new Date(primeraInteraccion.fecha_interaccion);
        const tiempoHoras = (fechaContacto.getTime() - fechaAlta.getTime()) / (1000 * 60 * 60);

        // Solo considerar tiempos positivos (contacto después de captación)
        if (tiempoHoras >= 0) {
          dataVendedor.tiempos.push(tiempoHoras);
          dataVendedor.clientesAtendidos++;

          clientesConTiempo.push({
            id: cliente.id,
            nombre: cliente.nombre,
            vendedor,
            fechaAlta: cliente.fecha_alta,
            fechaContacto: primeraInteraccion.fecha_interaccion,
            tiempoHoras: Math.round(tiempoHoras * 10) / 10,
            tipoContacto: primeraInteraccion.tipo
          });
        }
      } else {
        // Cliente sin contactar
        dataVendedor.clientesSinContactar++;

        const fechaAlta = new Date(cliente.fecha_alta);
        const horasSinContacto = (hoy.getTime() - fechaAlta.getTime()) / (1000 * 60 * 60);

        let nivelAlerta = 'normal';
        if (horasSinContacto >= UMBRAL_CRITICO) {
          nivelAlerta = 'critico';
        } else if (horasSinContacto >= UMBRAL_ALERTA) {
          nivelAlerta = 'alerta';
        } else if (horasSinContacto >= UMBRAL_ATENCION) {
          nivelAlerta = 'atencion';
        }

        clientesSinContactar.push({
          id: cliente.id,
          nombre: cliente.nombre,
          telefono: cliente.telefono,
          email: cliente.email,
          vendedor,
          vendedorNombre: vendedoresMap.get(vendedor) || vendedor,
          fechaAlta: cliente.fecha_alta,
          horasSinContacto: Math.round(horasSinContacto),
          nivelAlerta,
          estado: cliente.estado_cliente
        });
      }
    });

    // Calcular métricas por vendedor
    const rankingVendedores = Array.from(tiemposPorVendedor.entries())
      .map(([username, data]) => {
        const tiemposOrdenados = [...data.tiempos].sort((a, b) => a - b);
        const promedio = data.tiempos.length > 0
          ? data.tiempos.reduce((a, b) => a + b, 0) / data.tiempos.length
          : 0;
        const mediana = (() => {
          const n = tiemposOrdenados.length;
          if (n === 0) return 0;
          if (n % 2 === 1) return tiemposOrdenados[Math.floor(n / 2)];
          return (tiemposOrdenados[n / 2 - 1] + tiemposOrdenados[n / 2]) / 2;
        })();
        const minimo = tiemposOrdenados.length > 0 ? tiemposOrdenados[0] : 0;
        const maximo = tiemposOrdenados.length > 0 ? tiemposOrdenados[tiemposOrdenados.length - 1] : 0;

        return {
          username,
          nombre: vendedoresMap.get(username) || username,
          clientesAtendidos: data.clientesAtendidos,
          clientesSinContactar: data.clientesSinContactar,
          totalClientes: data.clientesAtendidos + data.clientesSinContactar,
          promedioHoras: Math.round(promedio * 10) / 10,
          medianaHoras: Math.round(mediana * 10) / 10,
          minimoHoras: Math.round(minimo * 10) / 10,
          maximoHoras: Math.round(maximo * 10) / 10,
          tasaContacto: data.clientesAtendidos + data.clientesSinContactar > 0
            ? ((data.clientesAtendidos / (data.clientesAtendidos + data.clientesSinContactar)) * 100).toFixed(1)
            : '0'
        };
      })
      .filter(v => v.totalClientes > 0)
      .sort((a, b) => a.promedioHoras - b.promedioHoras); // Mejor tiempo primero

    // Distribución por rangos de tiempo
    const rangosDistribucion = [
      { rango: '< 1 hora', min: 0, max: 1, cantidad: 0, color: '#10B981' },
      { rango: '1-4 horas', min: 1, max: 4, cantidad: 0, color: '#3B82F6' },
      { rango: '4-12 horas', min: 4, max: 12, cantidad: 0, color: '#8B5CF6' },
      { rango: '12-24 horas', min: 12, max: 24, cantidad: 0, color: '#F59E0B' },
      { rango: '24-48 horas', min: 24, max: 48, cantidad: 0, color: '#F97316' },
      { rango: '48-72 horas', min: 48, max: 72, cantidad: 0, color: '#EF4444' },
      { rango: '> 72 horas', min: 72, max: Infinity, cantidad: 0, color: '#DC2626' }
    ];

    clientesConTiempo.forEach(cliente => {
      const rango = rangosDistribucion.find(r => cliente.tiempoHoras >= r.min && cliente.tiempoHoras < r.max);
      if (rango) {
        rango.cantidad++;
      }
    });

    // Alertas agrupadas
    const alertasCriticas = clientesSinContactar.filter(c => c.nivelAlerta === 'critico').length;
    const alertasAlerta = clientesSinContactar.filter(c => c.nivelAlerta === 'alerta').length;
    const alertasAtencion = clientesSinContactar.filter(c => c.nivelAlerta === 'atencion').length;

    // Calcular promedios globales
    const todosLosTiempos = clientesConTiempo.map(c => c.tiempoHoras);
    const promedioGlobal = todosLosTiempos.length > 0
      ? todosLosTiempos.reduce((a, b) => a + b, 0) / todosLosTiempos.length
      : 0;

    // Tendencia por día (promedio de tiempo de respuesta por día)
    const tendenciaPorDia = new Map<string, { suma: number; count: number }>();
    clientesConTiempo.forEach(cliente => {
      const fecha = new Date(cliente.fechaAlta).toISOString().split('T')[0];
      const actual = tendenciaPorDia.get(fecha) || { suma: 0, count: 0 };
      actual.suma += cliente.tiempoHoras;
      actual.count++;
      tendenciaPorDia.set(fecha, actual);
    });

    const tendenciaData = Array.from(tendenciaPorDia.entries())
      .map(([fecha, data]) => ({
        fecha,
        promedioHoras: Math.round((data.suma / data.count) * 10) / 10
      }))
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
      .slice(-30);

    return {
      resumen: {
        totalClientes: clientes?.length || 0,
        clientesContactados: clientesConTiempo.length,
        clientesSinContactar: clientesSinContactar.length,
        promedioGlobalHoras: Math.round(promedioGlobal * 10) / 10,
        alertasCriticas,
        alertasAlerta,
        alertasAtencion
      },
      rankingVendedores,
      rangosDistribucion: rangosDistribucion.filter(r => r.cantidad > 0),
      clientesSinContactar: clientesSinContactar
        .sort((a, b) => b.horasSinContacto - a.horasSinContacto)
        .slice(0, 50),
      tendenciaData,
      periodo: {
        inicio: startDate.toISOString(),
        fin: endDate.toISOString(),
        dias: days
      }
    };
  });
}
