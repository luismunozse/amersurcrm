import { createServerOnlyClient } from "@/lib/supabase.server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Users,
  Calendar,
  FileText,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp
} from "lucide-react";
import { getEstadoClienteColor, getEstadoClienteLabel } from "@/lib/types/clientes";
import { formatearMoneda } from "@/lib/types/crm-flujo";
import { getSmallBadgeClasses } from "@/lib/utils/badge";

interface ClienteAsignado {
  id: string;
  codigo_cliente: string;
  nombre: string;
  telefono?: string;
  estado_cliente: string;
  ultimo_contacto?: string;
  proxima_accion?: string;
}

interface ProximaAccion {
  id: string;
  cliente_id: string;
  cliente: {
    nombre: string;
    codigo_cliente: string;
  };
  tipo: string;
  proxima_accion?: string;
  fecha_proxima_accion?: string;
  notas?: string;
}

interface ReservaActiva {
  id: string;
  codigo_reserva: string;
  cliente: {
    nombre: string;
    codigo_cliente: string;
  };
  lote?: {
    numero_lote: string;
    proyecto: {
      nombre: string;
    };
  };
  monto_reserva: number;
  moneda: string;
  fecha_vencimiento: string;
  estado: string;
}

interface VentaEnProceso {
  id: string;
  codigo_venta: string;
  cliente: {
    nombre: string;
    codigo_cliente: string;
  };
  lote?: {
    numero_lote: string;
    proyecto: {
      nombre: string;
    };
  };
  precio_total: number;
  saldo_pendiente: number;
  moneda: string;
  forma_pago: string;
  estado: string;
}

export default async function VendedorDashboardPage() {
  const supabase = await createServerOnlyClient();

  // Verificar autenticación
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // Obtener perfil del vendedor
  const { data: perfil } = await supabase
    .from('usuario_perfil')
    .select('username, nombre_completo, rol(nombre)')
    .eq('id', user.id)
    .single();

  if (!perfil?.username) {
    redirect('/dashboard');
  }

  // Obtener conteos totales (para las métricas)
  const [
    { count: totalClientes },
    { count: totalAccionesPendientes },
    { count: totalReservasActivas },
    { count: totalVentasEnProceso }
  ] = await Promise.all([
    // Total de clientes asignados (usar vendedor_username que es el campo correcto)
    supabase
      .from('cliente')
      .select('*', { count: 'exact', head: true })
      .eq('vendedor_username', perfil.username),

    // Total de acciones pendientes
    supabase
      .from('cliente_interaccion')
      .select('*', { count: 'exact', head: true })
      .eq('vendedor_username', perfil.username)
      .not('proxima_accion', 'is', null)
      .not('proxima_accion', 'eq', 'ninguna')
      .gte('fecha_proxima_accion', new Date().toISOString()),

    // Total de reservas activas
    supabase
      .from('reserva')
      .select('*', { count: 'exact', head: true })
      .eq('vendedor_username', perfil.username)
      .eq('estado', 'activa'),

    // Total de ventas en proceso
    supabase
      .from('venta')
      .select('*', { count: 'exact', head: true })
      .eq('vendedor_username', perfil.username)
      .eq('estado', 'en_proceso')
  ]);

  // Obtener datos para mostrar (limitados a 10)
  const { data: clientesAsignados } = await supabase
    .from('cliente')
    .select('id, codigo_cliente, nombre, telefono, estado_cliente, ultimo_contacto, proxima_accion')
    .eq('vendedor_username', perfil.username)
    .order('ultimo_contacto', { ascending: false, nullsFirst: false })
    .limit(10);

  const { data: proximasAcciones } = await supabase
    .from('cliente_interaccion')
    .select(`
      id,
      cliente_id,
      tipo,
      proxima_accion,
      fecha_proxima_accion,
      notas,
      cliente(nombre, codigo_cliente)
    `)
    .eq('vendedor_username', perfil.username)
    .not('proxima_accion', 'is', null)
    .not('proxima_accion', 'eq', 'ninguna')
    .gte('fecha_proxima_accion', new Date().toISOString())
    .order('fecha_proxima_accion', { ascending: true })
    .limit(10);

  const { data: reservasActivas } = await supabase
    .from('reserva')
    .select(`
      id,
      codigo_reserva,
      monto_reserva,
      moneda,
      fecha_vencimiento,
      estado,
      cliente(nombre, codigo_cliente),
      lote(numero_lote, proyecto(nombre))
    `)
    .eq('vendedor_username', perfil.username)
    .eq('estado', 'activa')
    .order('fecha_vencimiento', { ascending: true })
    .limit(10);

  const { data: ventasEnProceso } = await supabase
    .from('venta')
    .select(`
      id,
      codigo_venta,
      precio_total,
      saldo_pendiente,
      moneda,
      forma_pago,
      estado,
      cliente(nombre, codigo_cliente),
      lote(numero_lote, proyecto(nombre))
    `)
    .eq('vendedor_username', perfil.username)
    .eq('estado', 'en_proceso')
    .order('created_at', { ascending: false })
    .limit(10);

  // Obtener TODAS las ventas en proceso para calcular montos correctos
  const { data: todasVentasEnProceso } = await supabase
    .from('venta')
    .select('precio_total, saldo_pendiente, moneda')
    .eq('vendedor_username', perfil.username)
    .eq('estado', 'en_proceso');

  // Calcular monto total de ventas en proceso (de todas las ventas, no solo las 10 mostradas)
  const montoTotalVentas = todasVentasEnProceso?.reduce((sum, venta) => {
    if (venta.moneda === 'PEN') return sum + venta.precio_total;
    return sum;
  }, 0) || 0;

  const montoSaldoPendiente = todasVentasEnProceso?.reduce((sum, venta) => {
    if (venta.moneda === 'PEN') return sum + venta.saldo_pendiente;
    return sum;
  }, 0) || 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-crm-primary to-crm-primary-dark text-white rounded-xl p-6 shadow-lg">
        <h1 className="text-3xl font-bold mb-2">
          Bienvenido, {perfil.nombre_completo}
        </h1>
        <p className="text-crm-primary-light opacity-90">
          {perfil.username} · {perfil.rol?.[0]?.nombre || 'Vendedor'}
        </p>
      </div>

      {/* Resumen de Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-crm-card border border-crm-border rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 bg-blue-500/10 rounded-lg">
              <Users className="h-6 w-6 text-blue-500" />
            </div>
            <span className="text-2xl font-bold text-crm-text">{totalClientes ?? 0}</span>
          </div>
          <h3 className="text-sm font-medium text-crm-text-muted">Clientes Asignados</h3>
        </div>

        <div className="bg-crm-card border border-crm-border rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 bg-orange-500/10 rounded-lg">
              <Clock className="h-6 w-6 text-orange-500" />
            </div>
            <span className="text-2xl font-bold text-crm-text">{totalAccionesPendientes ?? 0}</span>
          </div>
          <h3 className="text-sm font-medium text-crm-text-muted">Acciones Pendientes</h3>
        </div>

        <div className="bg-crm-card border border-crm-border rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 bg-purple-500/10 rounded-lg">
              <FileText className="h-6 w-6 text-purple-500" />
            </div>
            <span className="text-2xl font-bold text-crm-text">{totalReservasActivas ?? 0}</span>
          </div>
          <h3 className="text-sm font-medium text-crm-text-muted">Reservas Activas</h3>
        </div>

        <div className="bg-crm-card border border-crm-border rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 bg-green-500/10 rounded-lg">
              <TrendingUp className="h-6 w-6 text-green-500" />
            </div>
            <span className="text-2xl font-bold text-crm-text">{totalVentasEnProceso ?? 0}</span>
          </div>
          <h3 className="text-sm font-medium text-crm-text-muted">Ventas en Proceso</h3>
        </div>
      </div>

      {/* Monto de Ventas */}
      {(totalVentasEnProceso ?? 0) > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-5">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
              <h3 className="text-sm font-medium text-green-900 dark:text-green-100">Monto Total en Ventas</h3>
            </div>
            <p className="text-2xl font-bold text-green-700 dark:text-green-300">
              {formatearMoneda(montoTotalVentas, 'PEN')}
            </p>
          </div>

          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-5">
            <div className="flex items-center gap-3 mb-2">
              <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              <h3 className="text-sm font-medium text-orange-900 dark:text-orange-100">Saldo Pendiente de Cobro</h3>
            </div>
            <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">
              {formatearMoneda(montoSaldoPendiente, 'PEN')}
            </p>
          </div>
        </div>
      )}

      {/* Secciones Principales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Próximas Acciones */}
        <div className="bg-crm-card border border-crm-border rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-crm-border">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-crm-text flex items-center gap-2">
                <Calendar className="h-5 w-5 text-crm-primary" />
                Próximas Acciones
              </h2>
              <Link
                href="/dashboard/clientes"
                className="text-sm text-crm-primary hover:text-crm-primary-dark"
              >
                Ver todas
              </Link>
            </div>
          </div>
          <div className="p-6">
            {!proximasAcciones || proximasAcciones.length === 0 ? (
              <div className="text-center py-8 text-crm-text-muted">
                <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No hay acciones pendientes</p>
              </div>
            ) : (
              <div className="space-y-3">
                {proximasAcciones.map((accion) => (
                  <Link
                    key={accion.id}
                    href={`/dashboard/clientes/${accion.cliente_id}`}
                    className="block p-4 rounded-lg border border-crm-border hover:border-crm-primary hover:bg-crm-card-hover transition-all"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-crm-text">
                          {accion.cliente?.[0]?.nombre}
                        </p>
                        <p className="text-xs text-crm-text-muted">
                          {accion.cliente?.[0]?.codigo_cliente}
                        </p>
                      </div>
                      <span className="px-2 py-1 text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded">
                        {accion.proxima_accion?.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-crm-text-muted">
                      <Clock className="h-4 w-4" />
                      <span>
                        {accion.fecha_proxima_accion
                          ? new Date(accion.fecha_proxima_accion).toLocaleDateString('es-PE', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'Sin fecha'}
                      </span>
                    </div>
                    {accion.notas && (
                      <p className="mt-2 text-sm text-crm-text-muted line-clamp-2">
                        {accion.notas}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Mis Clientes */}
        <div className="bg-crm-card border border-crm-border rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-crm-border">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-crm-text flex items-center gap-2">
                <Users className="h-5 w-5 text-crm-primary" />
                Mis Clientes
              </h2>
              <Link
                href="/dashboard/clientes"
                className="text-sm text-crm-primary hover:text-crm-primary-dark"
              >
                Ver todos
              </Link>
            </div>
          </div>
          <div className="p-6">
            {!clientesAsignados || clientesAsignados.length === 0 ? (
              <div className="text-center py-8 text-crm-text-muted">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No hay clientes asignados</p>
              </div>
            ) : (
              <div className="space-y-3">
                {clientesAsignados.map((cliente) => (
                  <Link
                    key={cliente.id}
                    href={`/dashboard/clientes/${cliente.id}`}
                    className="block p-4 rounded-lg border border-crm-border hover:border-crm-primary hover:bg-crm-card-hover transition-all"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-crm-text">{cliente.nombre}</p>
                        <p className="text-xs text-crm-text-muted">
                          {cliente.codigo_cliente}
                        </p>
                      </div>
                      <span className={getSmallBadgeClasses(getEstadoClienteColor(cliente.estado_cliente as any))}>
                        {getEstadoClienteLabel(cliente.estado_cliente as any)}
                      </span>
                    </div>
                    {cliente.telefono && (
                      <p className="text-sm text-crm-text-muted">{cliente.telefono}</p>
                    )}
                    {cliente.ultimo_contacto && (
                      <p className="text-xs text-crm-text-muted mt-1">
                        Último contacto: {new Date(cliente.ultimo_contacto).toLocaleDateString('es-PE')}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reservas y Ventas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Reservas Activas */}
        <div className="bg-crm-card border border-crm-border rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-crm-border">
            <h2 className="text-lg font-semibold text-crm-text flex items-center gap-2">
              <FileText className="h-5 w-5 text-crm-primary" />
              Reservas Activas
            </h2>
          </div>
          <div className="p-6">
            {!reservasActivas || reservasActivas.length === 0 ? (
              <div className="text-center py-8 text-crm-text-muted">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No hay reservas activas</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reservasActivas.map((reserva) => (
                  <div
                    key={reserva.id}
                    className="p-4 rounded-lg border border-crm-border hover:bg-crm-card-hover transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-crm-text">
                          {reserva.codigo_reserva}
                        </p>
                        <p className="text-sm text-crm-text-muted">
                          {reserva.cliente?.[0]?.nombre}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-crm-text">
                        {formatearMoneda(reserva.monto_reserva, reserva.moneda as any)}
                      </span>
                    </div>
                    {reserva.lote?.[0] && (
                      <p className="text-sm text-crm-text-muted">
                        Lote {reserva.lote[0].numero_lote} - {reserva.lote[0].proyecto?.[0]?.nombre}
                      </p>
                    )}
                    <div className="mt-2 flex items-center gap-2 text-xs text-crm-text-muted">
                      <Clock className="h-3 w-3" />
                      <span>
                        Vence: {new Date(reserva.fecha_vencimiento).toLocaleDateString('es-PE')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Ventas en Proceso */}
        <div className="bg-crm-card border border-crm-border rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-crm-border">
            <h2 className="text-lg font-semibold text-crm-text flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-crm-primary" />
              Ventas en Proceso
            </h2>
          </div>
          <div className="p-6">
            {!ventasEnProceso || ventasEnProceso.length === 0 ? (
              <div className="text-center py-8 text-crm-text-muted">
                <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No hay ventas en proceso</p>
              </div>
            ) : (
              <div className="space-y-3">
                {ventasEnProceso.map((venta) => (
                  <div
                    key={venta.id}
                    className="p-4 rounded-lg border border-crm-border hover:bg-crm-card-hover transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-crm-text">
                          {venta.codigo_venta}
                        </p>
                        <p className="text-sm text-crm-text-muted">
                          {venta.cliente?.[0]?.nombre}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-crm-text">
                          {formatearMoneda(venta.precio_total, venta.moneda as any)}
                        </p>
                        <p className="text-xs text-orange-600 dark:text-orange-400">
                          Pend: {formatearMoneda(venta.saldo_pendiente, venta.moneda as any)}
                        </p>
                      </div>
                    </div>
                    {venta.lote?.[0] && (
                      <p className="text-sm text-crm-text-muted">
                        Lote {venta.lote[0].numero_lote} - {venta.lote[0].proyecto?.[0]?.nombre}
                      </p>
                    )}
                    <span className="inline-block mt-2 px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                      {venta.forma_pago.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
