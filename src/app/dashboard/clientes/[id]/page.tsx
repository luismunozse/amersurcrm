import { createServerOnlyClient, createServiceRoleClient } from "@/lib/supabase.server";
import { PERMISOS } from "@/lib/permissions";
import { obtenerPermisosUsuario } from "@/lib/permissions/server";
import { redirect, notFound } from "next/navigation";
import ClienteDetailTabs, { ClienteTabType } from "./_ClienteDetailTabs";
import { ArrowLeft, User, Phone, Mail, MapPin } from "lucide-react";
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

  // Obtener datos del cliente
  const { data: cliente, error } = await supabase
    .from('cliente')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !cliente) {
    notFound();
  }

  const { data: asesorActual } = await supabase
    .schema('crm')
    .from('usuario_perfil')
    .select('id, nombre_completo, username, telefono, email')
    .eq('id', user.id)
    .maybeSingle();

  const usuarioActual = await obtenerPermisosUsuario();
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

  // Obtener interacciones
  const { data: interacciones } = await supabase
    .from('cliente_interaccion')
    .select(`
      *,
      vendedor:usuario_perfil!vendedor_username(username, nombre_completo)
    `)
    .eq('cliente_id', id)
    .order('fecha_interaccion', { ascending: false });

  // Obtener propiedades de interés con datos del lote/proyecto
  const { data: propiedadesInteresData } = await supabase
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
    .order('fecha_agregado', { ascending: false });

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

  // Obtener reservas usando service role para bypass RLS
  // (Las políticas RLS de reserva requieren permisos específicos)
  const serviceClient = createServiceRoleClient();
  const { data: reservasRaw, error: _reservasError } = await serviceClient
    .schema('crm')
    .from('reserva')
    .select('*')
    .eq('cliente_id', id)
    .order('created_at', { ascending: false });

  // Enriquecer reservas con datos de lote/proyecto/vendedor
  let reservas: any[] = [];
  if (reservasRaw && reservasRaw.length > 0) {
    const loteIds = reservasRaw.map(r => r.lote_id).filter(Boolean);
    const { data: lotes } = loteIds.length > 0
      ? await serviceClient.schema('crm').from('lote').select('id, codigo, proyecto_id').in('id', loteIds)
      : { data: [] };

    const proyectoIds = (lotes || []).map(l => l.proyecto_id).filter(Boolean);
    const { data: proyectos } = proyectoIds.length > 0
      ? await serviceClient.schema('crm').from('proyecto').select('id, nombre').in('id', proyectoIds)
      : { data: [] };

    const vendedorUsernames = reservasRaw.map(r => r.vendedor_username).filter(Boolean);
    const { data: vendedoresReserva } = vendedorUsernames.length > 0
      ? await serviceClient.schema('crm').from('usuario_perfil').select('username, nombre_completo').in('username', vendedorUsernames)
      : { data: [] };

    reservas = reservasRaw.map(r => {
      const lote = (lotes || []).find(l => l.id === r.lote_id);
      const proyecto = lote ? (proyectos || []).find(p => p.id === lote.proyecto_id) : null;
      const vendedor = (vendedoresReserva || []).find(v => v.username === r.vendedor_username);

      return {
        ...r,
        lote: lote ? { ...lote, proyecto: proyecto || null } : null,
        vendedor: vendedor || null
      };
    });
  }

  // Obtener ventas y pagos
  const { data: ventas } = await supabase
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
    .order('created_at', { ascending: false });

  const { data: proformas } = await supabase
    .from('proforma')
    .select('*')
    .eq('cliente_id', id)
    .order('created_at', { ascending: false });

  const { data: vendedoresRaw } = await supabase
    .from('usuario_perfil')
    .select('id, username, nombre_completo, telefono, email, rol:rol!usuario_perfil_rol_id_fkey(nombre)')
    .eq('activo', true)
    .order('nombre_completo', { ascending: true });

  const vendedores = (vendedoresRaw || []).filter((v) => {
    const rol = Array.isArray(v.rol) ? v.rol[0] : v.rol;
    return rol?.nombre && ['ROL_VENDEDOR', 'ROL_COORDINADOR_VENTAS', 'ROL_GERENTE'].includes(rol.nombre);
  });

  const vendedorAsignado = vendedores?.find((v) => v.username === cliente.vendedor_username);

  const estadoColor = getEstadoClienteColor(cliente.estado_cliente);

  return (
    <div className="min-h-screen bg-crm-background">
      {/* Header */}
      <div className="bg-crm-card border-b border-crm-border sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4 mb-4">
            <Link
              href="/dashboard/clientes"
              className="p-2 hover:bg-crm-card-hover rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-crm-text-muted" />
            </Link>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-crm-text-primary">{cliente.nombre}</h1>
                <span className={getStatusBadgeClasses(estadoColor)}>
                  {getEstadoClienteLabel(cliente.estado_cliente)}
                </span>
              </div>
              <p className="text-sm text-crm-text-muted mt-1">{cliente.codigo_cliente}</p>
            </div>
          </div>

          {/* Información Rápida */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
        </div>
      </div>

      {/* Tabs con contenido */}
      <div className="max-w-7xl mx-auto px-6 py-6">
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
        />
      </div>
    </div>
  );
}
