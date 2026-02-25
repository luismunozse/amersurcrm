import { createServerOnlyClient } from "@/lib/supabase.server";
import { PERMISOS } from "@/lib/permissions";
import { obtenerPermisosUsuario } from "@/lib/permissions/server";
import { redirect, notFound } from "next/navigation";
import ClienteDetailTabs, { ClienteTabType } from "./_ClienteDetailTabs";
import AgendarEventoButton from "./_AgendarEventoButton";
import { ArrowLeft, User, Phone, Mail, MapPin, AlertTriangle } from "lucide-react";
import { contarSeguimientosVencidos } from "@/lib/utils/seguimientos";
import Link from "next/link";
import { getEstadoClienteColor, getEstadoClienteLabel } from "@/lib/types/clientes";
import { getStatusBadgeClasses } from "@/lib/utils/badge";

type SearchParams = {
  tab?: string | string[];
  action?: string | string[];
};

interface Props {
  params: Promise<{ id: string }>;
  searchParams?: Promise<SearchParams>;
}

function normalizeParam(value?: string | string[]): string | undefined {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

function resolveDefaultTab(tabRaw: string | undefined): ClienteTabType {
  const allowed: ClienteTabType[] = [
    "info",
    "timeline",
    "interacciones",
    "propiedades",
    "reservas",
    "ventas",
    "proformas",
  ];
  return allowed.includes(tabRaw as ClienteTabType) ? (tabRaw as ClienteTabType) : "info";
}

export default async function ClienteDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = searchParams ? await searchParams : {};
  const defaultTab = resolveDefaultTab(normalizeParam(sp.tab));
  const supabase = await createServerOnlyClient();

  // Verificar autenticación
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // OPTIMIZADO: Primera ronda de queries en paralelo (cliente + permisos)
  // Estas queries son necesarias para verificar permisos antes de cargar datos
  const [clienteResult, asesorActualResult, usuarioActual] = await Promise.all([
    supabase
      .from('cliente')
      .select('*')
      .eq('id', id)
      .single(),
    supabase
      .schema('crm')
      .from('usuario_perfil')
      .select('id, nombre_completo, username, telefono, email')
      .eq('id', user.id)
      .maybeSingle(),
    obtenerPermisosUsuario(),
  ]);

  const { data: cliente, error } = clienteResult;
  const { data: asesorActual } = asesorActualResult;

  if (error || !cliente) {
    notFound();
  }

  if (!usuarioActual) {
    redirect('/login');
  }

  const puedeVerTodos = usuarioActual.permisos.includes(PERMISOS.CLIENTES.VER_TODOS);
  const puedeVerAsignados = usuarioActual.permisos.includes(PERMISOS.CLIENTES.VER_ASIGNADOS);
  const esClientePropio = [
    cliente.created_by === usuarioActual.id,
    cliente.vendedor_asignado === usuarioActual.id,
    usuarioActual.username ? cliente.vendedor_username === usuarioActual.username : false,
  ].some(Boolean);

  if (!puedeVerTodos && (!puedeVerAsignados || !esClientePropio)) {
    redirect('/dashboard/clientes');
  }

  // OPTIMIZADO: Segunda ronda de queries en paralelo (todos los datos del cliente)
  // Antes: ~8 queries secuenciales (~1.6-3.2s)
  // Ahora: ~1 ronda paralela (~200-400ms)
  const [
    interaccionesResult,
    propiedadesInteresResult,
    reservasResult,
    ventasResult,
    proformasResult,
    vendedoresResult,
  ] = await Promise.all([
    // Interacciones
    supabase
      .from('cliente_interaccion')
      .select(`
        *,
        vendedor:usuario_perfil!vendedor_username(username, nombre_completo)
      `)
      .eq('cliente_id', id)
      .order('fecha_interaccion', { ascending: false }),

    // Propiedades de interés con JOIN a lote/proyecto
    supabase
      .from('cliente_propiedad_interes')
      .select(`
        *,
        lote:lote!lote_id(
          id,
          codigo,
          sup_m2,
          estado,
          moneda,
          precio,
          proyecto:proyecto!proyecto_id(
            id,
            nombre
          )
        )
      `)
      .eq('cliente_id', id)
      .order('fecha_agregado', { ascending: false }),

    // Reservas con JOIN (evita 3 queries adicionales de enriquecimiento)
    supabase
      .from('reserva')
      .select(`
        *,
        lote:lote!lote_id(
          id,
          codigo,
          proyecto:proyecto!proyecto_id(id, nombre)
        ),
        vendedor:usuario_perfil!vendedor_username(username, nombre_completo)
      `)
      .eq('cliente_id', id)
      .order('created_at', { ascending: false }),

    // Ventas con pagos
    supabase
      .from('venta')
      .select(`
        *,
        lote:lote!lote_id(
          id,
          codigo,
          proyecto:proyecto!proyecto_id(nombre)
        ),
        vendedor:usuario_perfil!vendedor_username(username, nombre_completo),
        pagos:pago(*)
      `)
      .eq('cliente_id', id)
      .order('created_at', { ascending: false }),

    // Proformas
    supabase
      .from('proforma')
      .select('*')
      .eq('cliente_id', id)
      .order('created_at', { ascending: false }),

    // Vendedores activos
    supabase
      .from('usuario_perfil')
      .select('id, username, nombre_completo, telefono, email, rol:rol!usuario_perfil_rol_id_fkey(nombre)')
      .eq('activo', true)
      .order('nombre_completo', { ascending: true }),
  ]);

  const { data: interacciones } = interaccionesResult;
  const { data: propiedadesInteresData } = propiedadesInteresResult;
  const { data: reservasRaw } = reservasResult;
  const { data: ventas } = ventasResult;
  const { data: proformas } = proformasResult;
  const { data: vendedoresRaw } = vendedoresResult;

  // Procesar propiedades de interés
  const propiedadesInteres = (propiedadesInteresData ?? []).map((item) => {
    const loteRelacion = Array.isArray(item.lote) ? item.lote[0] : item.lote;
    if (!loteRelacion) {
      return { ...item, lote: null };
    }

    const proyectoRelacion = Array.isArray(loteRelacion.proyecto)
      ? loteRelacion.proyecto[0]
      : loteRelacion.proyecto;

    return {
      ...item,
      lote: {
        ...loteRelacion,
        proyecto: proyectoRelacion ?? null,
      },
    };
  });

  // Procesar reservas (ya vienen con JOIN, no necesitan enriquecimiento adicional)
  const reservas = (reservasRaw ?? []).map((r) => {
    const loteRelacion = Array.isArray(r.lote) ? r.lote[0] : r.lote;
    const vendedorRelacion = Array.isArray(r.vendedor) ? r.vendedor[0] : r.vendedor;

    return {
      ...r,
      lote: loteRelacion ? {
        ...loteRelacion,
        proyecto: (Array.isArray(loteRelacion.proyecto) ? loteRelacion.proyecto[0] : loteRelacion.proyecto) ?? undefined,
      } : undefined,
      vendedor: vendedorRelacion || undefined,
    };
  });

  const vendedores = (vendedoresRaw || []).filter((v) => {
    const rol = Array.isArray(v.rol) ? v.rol[0] : v.rol;
    return rol?.nombre && ['ROL_VENDEDOR', 'ROL_COORDINADOR_VENTAS', 'ROL_GERENTE'].includes(rol.nombre);
  });

  const vendedorAsignado = vendedores?.find((v) => v.username === cliente.vendedor_username);

  const seguimientosVencidos = contarSeguimientosVencidos(interacciones || []);
  const estadoColor = getEstadoClienteColor(cliente.estado_cliente);

  return (
    <div className="min-h-screen bg-crm-background">
      {/* Header */}
      <div className="bg-crm-card border-b border-crm-border sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3 sm:gap-4 mb-4">
            <Link
              href="/dashboard/clientes"
              className="p-2 hover:bg-crm-card-hover rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-crm-text-muted" />
            </Link>
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-crm-text-primary">{cliente.nombre}</h1>
                <span className={getStatusBadgeClasses(estadoColor)}>
                  {getEstadoClienteLabel(cliente.estado_cliente)}
                </span>
              </div>
              <p className="text-sm text-crm-text-muted mt-1">{cliente.codigo_cliente}</p>
            </div>
            <AgendarEventoButton clienteId={cliente.id} clienteNombre={cliente.nombre} />
          </div>

          {/* Información Rápida */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {cliente.telefono && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-crm-text-muted" />
                <a
                  href={`tel:${cliente.telefono}`}
                  className="text-crm-primary hover:underline"
                >
                  {cliente.telefono}
                </a>
              </div>
            )}
            {cliente.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-crm-text-muted" />
                <a
                  href={`mailto:${cliente.email}`}
                  className="text-crm-primary hover:underline truncate"
                >
                  {cliente.email}
                </a>
              </div>
            )}
            {cliente.direccion?.ciudad && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-crm-text-muted" />
                <span className="text-crm-text-muted truncate">{cliente.direccion.ciudad}</span>
              </div>
            )}
            {vendedorAsignado && (
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-crm-text-muted" />
                <span className="text-crm-text-muted truncate">
                  Vendedor: {vendedorAsignado.nombre_completo || vendedorAsignado.username}
                </span>
              </div>
            )}
          </div>

          {/* Banner de seguimientos vencidos */}
          {seguimientosVencidos > 0 && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-800 dark:text-red-200">
                  {seguimientosVencidos} seguimiento{seguimientosVencidos > 1 ? "s" : ""} vencido{seguimientosVencidos > 1 ? "s" : ""}
                </p>
                <p className="text-xs text-red-600 dark:text-red-400">
                  Este cliente tiene acciones pendientes que requieren atencion inmediata.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs con contenido */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <ClienteDetailTabs
          cliente={cliente}
          interacciones={interacciones || []}
          propiedadesInteres={propiedadesInteres || []}
          reservas={reservas || []}
          ventas={ventas || []}
          proformas={proformas || []}
          asesorActual={asesorActual || null}
          vendedores={vendedores || []}
          defaultTab={defaultTab}
          isAdmin={usuarioActual.rol === "ROL_ADMIN"}
          seguimientosVencidos={seguimientosVencidos}
        />
      </div>
    </div>
  );
}
