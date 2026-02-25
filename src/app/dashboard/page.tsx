import Link from "next/link";
import { Suspense } from "react";
import { format, differenceInCalendarDays } from "date-fns";
import { es } from "date-fns/locale";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { LazyDashboardStats } from "@/components/LazyDashboardStats";
import { RecentActivities } from "@/components/RecentActivities";
import { RecentProjects } from "@/components/RecentProjects";
import { SeguimientosHoy } from "@/components/SeguimientosHoy";
import { MiniFunnelVentas } from "@/components/MiniFunnelVentas";
import { DashboardVentasChart } from "@/components/DashboardVentasChart";
import { DashboardLotesDonut } from "@/components/DashboardLotesDonut";
import { getCachedClientes, getCachedProyectos, getCachedNotificacionesNoLeidas, getCachedClientesDashboardMetrics } from "@/lib/cache.server";
import SecondaryPanelDrawer from "@/components/dashboard/SecondaryPanelDrawer";
import { obtenerPermisosUsuario } from "@/lib/permissions/server";
import { PERMISOS } from "@/lib/permissions";
import { obtenerMetricasAgenda } from "@/app/dashboard/agenda/actions";
import type { ClienteCached, ProyectoCached } from "@/types/crm";

type ClienteLite = {
  ultimo_contacto?: string | null;
  proxima_accion?: string | null;
  estado_cliente?: string | null;
};

type ProyectoLite = {
  estado?: string | null;
  planos_url?: string | null;
};

interface DashboardMetrics {
  totalClientes: number;
  clientesSinSeguimiento: number;
  clientesConAccion: number;
  clientesFueraDeRango: number;
  proyectosActivos: number;
  proyectosSinPlanos: number;
  notificacionesPendientes: number;
  // Métricas de agenda real
  eventosPendientes: number;
  eventosHoy: number;
  eventosSemana: number;
  hasError: boolean;
  puedeCrearProyectos: boolean;
  puedeEditarProyectos: boolean;
  esAdminOGerente: boolean;
  // Datos raw para pasar a componentes (evita re-fetch)
  clientes: ClienteCached[];
  proyectos: ProyectoCached[];
}

const initialMetrics: DashboardMetrics = {
  totalClientes: 0,
  clientesSinSeguimiento: 0,
  clientesConAccion: 0,
  clientesFueraDeRango: 0,
  proyectosActivos: 0,
  proyectosSinPlanos: 0,
  notificacionesPendientes: 0,
  eventosPendientes: 0,
  eventosHoy: 0,
  eventosSemana: 0,
  hasError: false,
  puedeCrearProyectos: false,
  puedeEditarProyectos: false,
  esAdminOGerente: false,
  clientes: [],
  proyectos: [],
};

async function loadDashboardMetrics(): Promise<DashboardMetrics> {
  try {
    const startTime = Date.now();
    
    // Ejecutar queries en paralelo con fallbacks para no bloquear si alguna falla
    const [clientesResult, proyectosData, notificacionesData, clienteServerMetrics, permisosUsuario, agendaMetrics] = await Promise.all([
      getCachedClientes({ mode: "dashboard", pageSize: 12, withTotal: false }).catch(() => ({ data: [] })),
      getCachedProyectos().catch(() => []),
      getCachedNotificacionesNoLeidas().catch(() => []),
      getCachedClientesDashboardMetrics().catch(() => ({ total: 0, sinSeguimiento: 0, conAccion: 0, fueraDeRango: 0 })),
      obtenerPermisosUsuario().catch(() => null),
      obtenerMetricasAgenda().catch(() => ({ eventosPendientes: 0, eventosHoy: 0, eventosSemana: 0 })),
    ]);

    if (process.env.NODE_ENV === 'development') {
      console.log(`[Dashboard] Total parallel queries: ${Date.now() - startTime}ms`);
    }

    const clientes = Array.isArray(clientesResult?.data)
      ? (clientesResult.data as ClienteLite[])
      : [];
    const proyectos = Array.isArray(proyectosData)
      ? (proyectosData as ProyectoLite[])
      : [];
    const notificaciones = Array.isArray(notificacionesData) ? notificacionesData : [];

    const clienteMetrics = clientes.reduce(
      (acc, cliente) => {
        const ultimoContacto = cliente.ultimo_contacto ? new Date(cliente.ultimo_contacto) : null;

        if (!ultimoContacto) {
          acc.sinSeguimiento += 1;
          acc.fueraDeRango += 1;
        } else {
          const dias = differenceInCalendarDays(new Date(), ultimoContacto);
          if (dias >= 7) acc.fueraDeRango += 1;
        }

        if (cliente.proxima_accion) acc.conAccion += 1;

        return acc;
      },
      { sinSeguimiento: 0, conAccion: 0, fueraDeRango: 0 },
    );

    const proyectoMetrics = proyectos.reduce(
      (acc, proyecto) => {
        if (proyecto.estado === "activo") acc.activos += 1;
        if (!proyecto.planos_url) acc.sinPlanos += 1;
        return acc;
      },
      { activos: 0, sinPlanos: 0 },
    );

    return {
      totalClientes: clienteServerMetrics.total ?? clienteMetrics.sinSeguimiento + clienteMetrics.conAccion,
      clientesSinSeguimiento: clienteServerMetrics.sinSeguimiento ?? clienteMetrics.sinSeguimiento,
      clientesConAccion: clienteServerMetrics.conAccion ?? clienteMetrics.conAccion,
      clientesFueraDeRango: clienteServerMetrics.fueraDeRango ?? clienteMetrics.fueraDeRango,
      proyectosActivos: proyectoMetrics.activos,
      proyectosSinPlanos: proyectoMetrics.sinPlanos,
      notificacionesPendientes: notificaciones.length,
      eventosPendientes: agendaMetrics.eventosPendientes,
      eventosHoy: agendaMetrics.eventosHoy,
      eventosSemana: agendaMetrics.eventosSemana,
      hasError: false,
      puedeCrearProyectos: permisosUsuario?.permisos?.includes(PERMISOS.PROYECTOS.CREAR) ?? false,
      puedeEditarProyectos: permisosUsuario?.permisos?.includes(PERMISOS.PROYECTOS.EDITAR) ?? false,
      esAdminOGerente: permisosUsuario?.rol === 'ROL_ADMIN' || permisosUsuario?.rol === 'ROL_GERENTE',
      // Pasar datos raw a componentes para evitar re-fetch
      clientes: clientes as ClienteCached[],
      proyectos: proyectos as ProyectoCached[],
    } satisfies DashboardMetrics;
  } catch (error) {
    // Mejorar el logging del error
    if (error instanceof Error) {
      console.error("Error cargando métricas del dashboard:", {
        message: error.message,
        name: error.name,
        stack: error.stack,
      });
    } else {
      console.error("Error cargando métricas del dashboard:", error);
    }
    return { ...initialMetrics, hasError: true };
  }
}

function buildHeroHighlights(metrics: DashboardMetrics) {
  return [
    {
      label: "Clientes activos",
      description: `${metrics.totalClientes.toLocaleString()} totales • ${metrics.clientesSinSeguimiento} sin seguimiento`,
      href: "/dashboard/clientes",
      icon: (
        <svg className="w-5 h-5" role="img" aria-label="Ir a clientes" focusable="false" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5V4H2v16h5" />
        </svg>
      ),
    },
    {
      label: "Agenda coordinada",
      description: `${metrics.eventosPendientes} eventos pendientes • ${metrics.eventosHoy} para hoy`,
      href: "/dashboard/agenda",
      icon: (
        <svg className="w-5 h-5" role="img" aria-label="Ir a agenda" focusable="false" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7H3v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      label: "Proyectos vigentes",
      description: `${metrics.proyectosActivos} activos • ${metrics.proyectosSinPlanos} sin planos`,
      href: "/dashboard/proyectos",
      icon: (
        <svg className="w-5 h-5" role="img" aria-label="Ir a proyectos" focusable="false" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7l9-4 9 4-9 4-9-4zm0 5l9 4 9-4" />
        </svg>
      ),
    },
  ];
}

function buildQuickActions(metrics: DashboardMetrics) {
  const actions = [
    {
      title: "Registrar cliente",
      description: `${metrics.clientesFueraDeRango} clientes sin contacto en 7 días.`,
      href: "/dashboard/clientes",
      color: "primary" as const,
      icon: (
        <svg className="w-6 h-6" role="img" aria-label="Registrar cliente" focusable="false" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      ),
    },
    {
      title: "Planificar agenda",
      description: `${metrics.eventosPendientes} eventos programados • ${metrics.eventosHoy} hoy`,
      href: "/dashboard/agenda",
      color: "info" as const,
      icon: (
        <svg className="w-6 h-6" role="img" aria-label="Planificar agenda" focusable="false" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      title: "Analizar reportes",
      description: `${metrics.notificacionesPendientes} indicadores pendientes de revisar`,
      href: metrics.esAdminOGerente ? "/dashboard/admin/reportes" : "/dashboard/vendedor/reportes",
      color: "warning" as const,
      icon: (
        <svg className="w-6 h-6" role="img" aria-label="Analizar reportes" focusable="false" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9h4l3 8 4-16 3 8h4" />
        </svg>
      ),
    },
  ];

  if (metrics.puedeCrearProyectos) {
    actions.splice(1, 0, {
      title: "Publicar proyecto",
      description: `${metrics.proyectosSinPlanos} proyectos necesitan planos o renders`,
      href: "/dashboard/proyectos",
      color: "info" as const,
      icon: (
        <svg className="w-6 h-6" role="img" aria-label="Publicar proyecto" focusable="false" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h7" />
        </svg>
      ),
    });
  }

  return actions;
}

function buildFocusAreas(metrics: DashboardMetrics) {
  const items = [
    {
      title: "Actualizar estados de clientes",
      description: `${metrics.clientesSinSeguimiento} clientes aún no tienen seguimiento registrado`,
      href: "/dashboard/clientes",
    },
    {
      title: "Confirmar visitas de la semana",
      description: `${metrics.eventosSemana} eventos programados en los próximos 7 días`,
      href: "/dashboard/agenda",
    },
  ];

  if (metrics.puedeEditarProyectos) {
    items.splice(1, 0, {
      title: "Subir nuevos planos o renders",
      description: `${metrics.proyectosSinPlanos} proyectos activos requieren archivos visuales`,
      href: "/dashboard/proyectos",
    });
  }

  return items;
}

// Loading component para el dashboard
function DashboardLoading() {
  return (
    <div className="space-y-8">
      {/* Stats loading */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-crm-card border border-crm-border rounded-xl p-6 animate-pulse">
            <div className="flex items-center justify-between mb-4">
              <div className="h-4 bg-crm-border rounded w-24"></div>
              <div className="w-8 h-8 bg-crm-border rounded-lg"></div>
            </div>
            <div className="h-8 bg-crm-border rounded w-16 mb-2"></div>
            <div className="h-3 bg-crm-border rounded w-32"></div>
          </div>
        ))}
      </div>
      
      {/* Content loading */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="h-6 bg-crm-border rounded w-32"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-crm-card border border-crm-border rounded-xl p-4 animate-pulse">
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-crm-border rounded"></div>
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-crm-border rounded w-24"></div>
                    <div className="h-3 bg-crm-border rounded w-40"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="h-6 bg-crm-border rounded w-32"></div>
          <div className="space-y-3">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="bg-crm-card border border-crm-border rounded-xl p-4 animate-pulse">
                <div className="space-y-2">
                  <div className="h-4 bg-crm-border rounded w-48"></div>
                  <div className="h-3 bg-crm-border rounded w-20"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardContent />
    </Suspense>
  );
}

async function DashboardContent() {
  const today = format(new Date(), "EEEE d 'de' MMMM", { locale: es });
  const metrics = await loadDashboardMetrics();

  const heroHighlights = buildHeroHighlights(metrics);
  const quickActions = buildQuickActions(metrics);
  const focusAreas = buildFocusAreas(metrics);

  const pulseItems = [
    {
      label: "Seguimientos pendientes",
      value: `${metrics.clientesFueraDeRango} clientes requieren contacto esta semana`,
      tone: "primary" as const,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 8a6 6 0 11-12 0 6 6 0 0112 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.73 21a2 2 0 01-3.46 0" />
        </svg>
      ),
    },
    {
      label: "Visitas programadas",
      value: `${metrics.eventosSemana} eventos en los próximos 7 días`,
      tone: "success" as const,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h18M16 3v4M8 3v4M5 9h14l-1 11H6L5 9z" />
        </svg>
      ),
    },
    {
      label: "Reportes disponibles",
      value: `${metrics.notificacionesPendientes} alertas por revisar`,
      tone: "info" as const,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6M9 5l7 7-7 7" />
        </svg>
      ),
    },
  ];

  const toneClasses = {
    primary: "bg-crm-primary/10 text-crm-primary",
    success: "bg-crm-success/10 text-crm-success",
    info: "bg-crm-info/10 text-crm-info",
    warning: "bg-crm-warning/10 text-crm-warning",
  };

  return (
    <div className="space-y-8 sm:space-y-10 px-4 pb-10 pt-6 md:px-8 md:pt-8">
      {metrics.hasError && (
        <div className="rounded-2xl border border-yellow-400/40 bg-yellow-50 dark:bg-yellow-900/20 px-5 py-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                Error al cargar métricas del dashboard
              </p>
              <p className="mt-1 text-xs text-yellow-700 dark:text-yellow-300">
                No pudimos cargar todas las estadísticas. Por favor, revisa la consola del navegador para más detalles o intenta refrescar la página.
              </p>
            </div>
          </div>
        </div>
      )}
      <section className="grid gap-6 xl:grid-cols-[minmax(0,2fr),minmax(0,1fr)]">
        <Card
          variant="elevated"
          className="relative overflow-hidden rounded-3xl border-0 bg-crm-primary text-white shadow-crm-xl"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.55),transparent_60%)] opacity-40" aria-hidden="true"></div>
          <div className="relative z-10 flex h-full flex-col gap-8 p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="max-w-2xl">
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/70">Panel general</p>
                <h1 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">
                  Gestiona tus ventas inmobiliarias en un solo lugar
                </h1>
                <p className="mt-4 text-sm text-white/80 sm:text-base">
                  Centraliza clientes, agenda y proyectos para tomar decisiones rápidas con información confiable.
                </p>
              </div>
              <span className="rounded-full border border-white/20 bg-white/15 px-4 py-2 text-sm capitalize text-white/90 shadow-crm">
                {today}
              </span>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-2 sm:grid sm:grid-cols-3 sm:overflow-visible sm:pb-0">
              {heroHighlights.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="group block min-w-[16rem] rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm transition-colors hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 sm:min-w-0"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-white">
                      {item.icon}
                    </span>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-white/95">{item.label}</p>
                      <p className="text-xs leading-snug text-white/80">{item.description}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/dashboard/clientes"
                className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2 text-sm font-medium text-crm-primary shadow-crm transition hover:bg-white/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Registrar cliente ahora
              </Link>
              <Link
                href="/dashboard/agenda"
                className="inline-flex items-center gap-2 rounded-full border border-white/30 px-5 py-2 text-sm font-medium text-white transition hover:border-white/60 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Revisar agenda
              </Link>
            </div>
          </div>
        </Card>

        <Card variant="elevated" className="hidden h-full xl:block">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center justify-between text-lg font-semibold text-crm-text-primary">
              Estado del día
              <span className="rounded-full bg-crm-primary/10 px-3 py-1 text-xs font-medium text-crm-primary">
                Equipo CRM
              </span>
            </CardTitle>
            <CardDescription className="text-sm">
              Revisa puntos clave antes de iniciar tus reuniones.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {pulseItems.map((item) => (
              <div key={item.label} className="flex items-start gap-3 rounded-2xl border border-crm-border/70 bg-crm-card/60 p-4">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${toneClasses[item.tone]}`}>
                  {item.icon}
                </span>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-crm-text-primary">{item.label}</p>
                  <p className="text-xs leading-snug text-crm-text-secondary">{item.value}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <LazyDashboardStats />

      {/* Seguimientos del día + Acciones rápidas */}
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr),minmax(0,2fr)]">
        <Suspense fallback={
          <Card className="animate-pulse">
            <CardContent className="p-6 space-y-4">
              <div className="h-5 bg-crm-border rounded w-40" />
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-crm-border" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 bg-crm-border rounded w-32" />
                    <div className="h-2.5 bg-crm-border rounded w-20" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        }>
          <SeguimientosHoy />
        </Suspense>

        <div>
          <div className="flex items-center justify-between gap-4 pb-4">
            <h2 className="text-xl font-semibold text-crm-text-primary">Acciones rápidas</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
            {quickActions.map((action) => (
              <Link
                key={action.title}
                href={action.href}
                className="group focus:outline-none focus-visible:ring-2 focus-visible:ring-crm-primary/50"
              >
                <div className="rounded-2xl border border-crm-border/60 bg-white dark:bg-crm-card shadow-sm hover:shadow-crm transition-transform hover:-translate-y-1 h-full flex flex-col p-4">
                  <div className="flex items-center gap-3">
                    <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${toneClasses[action.color]}`}>
                      {action.icon}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-crm-text-primary">{action.title}</p>
                      <p className="mt-1 text-xs text-crm-text-muted leading-snug">{action.description}</p>
                    </div>
                  </div>
                  <span className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-crm-primary/90 transition group-hover:text-crm-primary">
                    Ir ahora
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Ventas mensuales + Estado de lotes */}
      <section className="grid gap-6 lg:grid-cols-[minmax(0,3fr),minmax(0,2fr)]">
        <Suspense fallback={
          <Card className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-5 bg-crm-border rounded w-40 mb-4" />
              <div className="h-64 bg-crm-border/30 rounded-xl" />
            </CardContent>
          </Card>
        }>
          <DashboardVentasChart />
        </Suspense>

        <Suspense fallback={
          <Card className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-5 bg-crm-border rounded w-36 mb-4" />
              <div className="h-64 bg-crm-border/30 rounded-xl" />
            </CardContent>
          </Card>
        }>
          <DashboardLotesDonut />
        </Suspense>
      </section>

      {/* Pipeline de ventas + Prioridades del equipo */}
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr),minmax(0,1fr)]">
        <Suspense fallback={
          <Card className="animate-pulse">
            <CardContent className="p-6 space-y-3">
              <div className="h-5 bg-crm-border rounded w-40" />
              {[...Array(6)].map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex justify-between">
                    <div className="h-3 bg-crm-border rounded w-24" />
                    <div className="h-3 bg-crm-border rounded w-12" />
                  </div>
                  <div className="h-2 bg-crm-border/50 rounded-full" />
                </div>
              ))}
            </CardContent>
          </Card>
        }>
          <MiniFunnelVentas />
        </Suspense>

        <Card variant="elevated" className="h-full">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-crm-text-primary">Prioridades del equipo</CardTitle>
            <CardDescription>Enfócate en tareas que mantienen el pipeline saludable.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {focusAreas.map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className="flex items-start gap-3 rounded-2xl border border-crm-border/60 bg-crm-card p-4 transition hover:border-crm-primary/40 hover:shadow-crm focus:outline-none focus-visible:ring-2 focus-visible:ring-crm-primary/40"
              >
                <span className="mt-1 inline-flex h-2 w-2 shrink-0 rounded-full bg-crm-primary"></span>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-crm-text-primary">{item.title}</p>
                  <p className="text-xs leading-snug text-crm-text-secondary">{item.description}</p>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </section>

      <SecondaryPanelDrawer pulseItems={pulseItems} focusAreas={focusAreas}>
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-crm-text-muted">
              Actividad reciente
            </h3>
            <Suspense
              fallback={
                <div className="mt-4 space-y-4 rounded-2xl border border-crm-border/60 bg-crm-card p-4 animate-pulse">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-full bg-crm-border" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-3/4 rounded bg-crm-border" />
                        <div className="h-3 w-1/2 rounded bg-crm-border" />
                      </div>
                    </div>
                  ))}
                </div>
              }
            >
              <RecentActivities clientes={metrics.clientes} proyectos={metrics.proyectos} />
            </Suspense>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-crm-text-muted">
              Proyectos recientes
            </h3>
            <Suspense
              fallback={
                <div className="mt-4 grid gap-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="rounded-2xl border border-crm-border/60 bg-crm-card p-4 animate-pulse space-y-3">
                      <div className="h-4 w-2/3 rounded bg-crm-border" />
                      <div className="h-3 w-1/3 rounded bg-crm-border" />
                      <div className="h-3 w-full rounded bg-crm-border" />
                    </div>
                  ))}
                </div>
              }
            >
              <RecentProjects proyectos={metrics.proyectos} />
            </Suspense>
          </div>
        </div>
      </SecondaryPanelDrawer>

      <section className="hidden gap-6 xl:grid xl:grid-cols-[minmax(0,2fr),minmax(0,1fr)]">
        <Suspense fallback={
          <div>
            <h2 className="text-xl font-semibold text-crm-text-primary mb-4">Actividad reciente</h2>
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-start space-x-3 animate-pulse">
                      <div className="h-8 w-8 rounded-full bg-crm-border" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-3/4 rounded bg-crm-border" />
                        <div className="h-3 w-1/2 rounded bg-crm-border" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        }>
          <RecentActivities clientes={metrics.clientes} proyectos={metrics.proyectos} />
        </Suspense>

        <Suspense fallback={
          <div>
            <h2 className="text-xl font-semibold text-crm-text-primary mb-4">Proyectos recientes</h2>
            <div className="grid grid-cols-1 gap-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4 space-y-3">
                    <div className="h-4 w-2/3 rounded bg-crm-border" />
                    <div className="h-3 w-1/3 rounded bg-crm-border" />
                    <div className="h-3 w-full rounded bg-crm-border" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        }>
          <RecentProjects proyectos={metrics.proyectos} />
        </Suspense>
      </section>

    </div>
  );
}
