import { createServerOnlyClient } from "@/lib/supabase.server";
import { redirect, notFound } from "next/navigation";
import ClienteDetailTabs, { ClienteTabType } from "./_ClienteDetailTabs";
import { ArrowLeft, User, Phone, Mail, MapPin } from "lucide-react";
import Link from "next/link";
import { getEstadoClienteColor, getEstadoClienteLabel } from "@/lib/types/clientes";

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
    "visitas",
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

  // Obtener interacciones
  const { data: interacciones } = await supabase
    .from('cliente_interaccion')
    .select(`
      *,
      vendedor:usuario_perfil!vendedor_username(username, nombre_completo)
    `)
    .eq('cliente_id', id)
    .order('fecha_interaccion', { ascending: false });

  // Obtener propiedades de interés
  const { data: propiedadesInteres } = await supabase
    .from('cliente_propiedad_interes')
    .select(`
      *,
      lote:lote!lote_id(
        id,
        numero_lote,
        estado,
        proyecto:proyecto!proyecto_id(nombre)
      ),
      agregado_por_usuario:usuario_perfil!agregado_por(username, nombre_completo)
    `)
    .eq('cliente_id', id)
    .order('created_at', { ascending: false });

  // Obtener visitas
  const { data: visitas } = await supabase
    .from('visita_propiedad')
    .select(`
      *,
      lote:lote!lote_id(
        id,
        numero_lote,
        proyecto:proyecto!proyecto_id(nombre)
      ),
      vendedor:usuario_perfil!vendedor_username(username, nombre_completo)
    `)
    .eq('cliente_id', id)
    .order('fecha_visita', { ascending: false });

  // Obtener reservas
  const { data: reservas } = await supabase
    .from('reserva')
    .select(`
      *,
      lote:lote!lote_id(
        id,
        numero_lote,
        proyecto:proyecto!proyecto_id(nombre)
      ),
      vendedor:usuario_perfil!vendedor_username(username, nombre_completo)
    `)
    .eq('cliente_id', id)
    .order('created_at', { ascending: false });

  // Obtener ventas y pagos
  const { data: ventas } = await supabase
    .from('venta')
    .select(`
      *,
      lote:lote!lote_id(
        id,
        numero_lote,
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

  const { data: asesorActual } = await supabase
    .from('usuario_perfil')
    .select('id, nombre_completo, username, telefono, email')
    .eq('id', user.id)
    .maybeSingle();

  const { data: vendedoresRaw } = await supabase
    .from('usuario_perfil')
    .select('id, username, nombre_completo, telefono, email, rol:rol!usuario_perfil_rol_fk(nombre)')
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
                <h1 className="text-2xl font-bold text-crm-text">{cliente.nombre}</h1>
                <span className={`px-3 py-1 text-xs font-medium rounded-full bg-${estadoColor}-100 dark:bg-${estadoColor}-900/30 text-${estadoColor}-700 dark:text-${estadoColor}-300`}>
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
          visitas={visitas || []}
          reservas={reservas || []}
          ventas={ventas || []}
          proformas={proformas || []}
          asesorActual={asesorActual || null}
          vendedores={vendedores || []}
          defaultTab={defaultTab}
        />
      </div>
    </div>
  );
}
