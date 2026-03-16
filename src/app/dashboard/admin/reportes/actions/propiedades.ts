"use server";

import { getAuthorizedClient, calcularFechas, safeAction } from "./shared";

export async function obtenerReportePropiedades(
  periodo: string = '30',
  fechaInicio?: string,
  fechaFin?: string
): Promise<{ data: any | null; error: string | null }> {
  return safeAction(async () => {
    const supabase = await getAuthorizedClient();
    const { startDate, days } = calcularFechas(periodo, fechaInicio, fechaFin);

    // 1. Obtener LOTES
    const { data: lotes } = await supabase
      .schema('crm')
      .from('lote')
      .select(`
        id, codigo, estado, precio, sup_m2, created_at,
        proyecto:proyecto_id ( nombre, estado )
      `);

    // 2. Obtener PROPIEDADES
    const { data: propiedades } = await supabase
      .schema('crm')
      .from('propiedad')
      .select(`
        id, codigo, tipo, estado_comercial, precio, created_at,
        proyecto:proyecto_id ( nombre, estado )
      `);

    // 3. Normalize and combine
    interface PropiedadNormalizada {
      id: string; codigo: string; tipo: string; estado: string;
      precio: number; created_at: string; nombreProyecto: string;
    }

    const lotesNormalizados: PropiedadNormalizada[] = (lotes || [])
      .filter((l: any) => l.proyecto?.estado === 'activo')
      .map((l: any) => ({
        id: l.id, codigo: l.codigo, tipo: 'lote', estado: l.estado,
        precio: Number(l.precio) || 0, created_at: l.created_at,
        nombreProyecto: l.proyecto?.nombre || 'Sin proyecto'
      }));

    const propiedadesNormalizadas: PropiedadNormalizada[] = (propiedades || [])
      .filter((p: any) => p.proyecto?.estado === 'activo')
      .map((p: any) => ({
        id: p.id, codigo: p.codigo, tipo: p.tipo || 'propiedad',
        estado: p.estado_comercial, precio: Number(p.precio ?? p.precio_venta) || 0,
        created_at: p.created_at, nombreProyecto: p.proyecto?.nombre || 'Sin proyecto'
      }));

    const todasPropiedades = [...lotesNormalizados, ...propiedadesNormalizadas];

    // 4. Calculate metrics
    const propiedadesNuevas = todasPropiedades.filter(p => new Date(p.created_at) >= startDate).length;
    const disponibles = todasPropiedades.filter(p => p.estado === 'disponible').length;
    const vendidas = todasPropiedades.filter(p => p.estado === 'vendido').length;
    const reservadas = todasPropiedades.filter(p => p.estado === 'reservado').length;
    const valorTotal = todasPropiedades.reduce((sum, p) => sum + p.precio, 0);
    const valorDisponible = todasPropiedades.filter(p => p.estado === 'disponible').reduce((sum, p) => sum + p.precio, 0);

    // 5. Distribution by project
    const proyectosMap = new Map<string, { total: number; disponibles: number; vendidas: number; reservadas: number }>();
    todasPropiedades.forEach(prop => {
      const actual = proyectosMap.get(prop.nombreProyecto) || { total: 0, disponibles: 0, vendidas: 0, reservadas: 0 };
      actual.total += 1;
      if (prop.estado === 'disponible') actual.disponibles += 1;
      if (prop.estado === 'vendido') actual.vendidas += 1;
      if (prop.estado === 'reservado') actual.reservadas += 1;
      proyectosMap.set(prop.nombreProyecto, actual);
    });

    const distribucionProyectos = Array.from(proyectosMap.entries()).map(([nombre, data]) => ({
      proyecto: nombre, ...data
    }));

    // 6. Distribution by type
    const tipoMap = new Map<string, number>();
    todasPropiedades.forEach(p => { tipoMap.set(p.tipo, (tipoMap.get(p.tipo) || 0) + 1); });
    const distribucionTipo = Array.from(tipoMap.entries()).map(([tipo, count]) => ({
      tipo, cantidad: count,
      porcentaje: todasPropiedades.length > 0 ? (count / todasPropiedades.length) * 100 : 0
    }));

    const porcentajeDisponibles = todasPropiedades.length > 0 ? ((disponibles / todasPropiedades.length) * 100).toFixed(1) : '0';
    const porcentajeVendidas = todasPropiedades.length > 0 ? ((vendidas / todasPropiedades.length) * 100).toFixed(1) : '0';

    const propertyStats = [
      { label: "Total Propiedades", value: todasPropiedades.length, change: `+${propiedadesNuevas} nuevas en período`, type: "positive" },
      { label: "Disponibles", value: disponibles, change: `${porcentajeDisponibles}% del total`, type: "neutral" },
      { label: "Vendidas", value: vendidas, change: `${porcentajeVendidas}% del total`, type: "positive" },
      { label: "Valor Total", value: valorTotal, change: `${lotesNormalizados.length} lotes, ${propiedadesNormalizadas.length} propiedades`, type: "positive" }
    ];

    return {
      propertyStats, distribucionProyectos, distribucionTipo,
      resumen: {
        total: todasPropiedades.length, lotes: lotesNormalizados.length,
        propiedades: propiedadesNormalizadas.length, disponibles, vendidas,
        reservadas, valorTotal, valorDisponible, nuevas: propiedadesNuevas
      },
      periodo: { inicio: startDate.toISOString(), fin: new Date().toISOString(), dias: days }
    };
  });
}
