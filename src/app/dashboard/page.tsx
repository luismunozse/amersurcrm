import Link from "next/link";
import { Suspense } from "react";
import { format, differenceInCalendarDays } from "date-fns";
import { es } from "date-fns/locale";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { LazyDashboardStats } from "@/components/LazyDashboardStats";
import { RecentActivities } from "@/components/RecentActivities";
import { RecentProjects } from "@/components/RecentProjects";
import { getCachedClientes, getCachedProyectos, getCachedNotificacionesNoLeidas } from "@/lib/cache.server";

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
  const [clientesData, proyectosData, notificacionesData] = await Promise.all([
    getCachedClientes(),
    getCachedProyectos(),
    getCachedNotificacionesNoLeidas(),
  ]);

  // Ensure we have arrays, default to empty arrays if null/undefined
  const clientes = Array.isArray(clientesData) ? clientesData : [];
  const proyectos = Array.isArray(proyectosData) ? proyectosData : [];
  const notificaciones = Array.isArray(notificacionesData) ? notificacionesData : [];

  const today = format(new Date(), "EEEE d 'de' MMMM", { locale: es });

  const clientesSinSeguimiento = clientes.filter((cliente) => !cliente.ultimo_contacto).length;
  const clientesConAccion = clientes.filter((cliente) => Boolean(cliente.proxima_accion)).length;
  const clientesFueraDeRango = clientes.filter((cliente) => {
    if (!cliente.ultimo_contacto) return true;
    const dias = differenceInCalendarDays(new Date(), new Date(cliente.ultimo_contacto));
    return dias >= 7;
  }).length;

  const proyectosActivos = proyectos.filter((proyecto) => proyecto.estado === "activo").length;
  const proyectosSinPlanos = proyectos.filter((proyecto) => !proyecto.planos_url).length;

  const notificacionesPendientes = notificaciones.length;

  const heroHighlights = [
    {
      label: "Clientes activos",
      description: `${clientes.length} totales • ${clientesSinSeguimiento} sin seguimiento`,
      href: "/dashboard/clientes",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5V4H2v16h5" />
        </svg>
      ),
    },
    {
      label: "Agenda coordinada",
      description: `${clientesConAccion} recordatorios asignados • ${notificacionesPendientes} alertas nuevas`,
      href: "/dashboard/agenda",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7H3v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      label: "Proyectos vigentes",
      description: `${proyectosActivos} activos • ${proyectosSinPlanos} sin planos`,
      href: "/dashboard/proyectos",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7l9-4 9 4-9 4-9-4zm0 5l9 4 9-4" />
        </svg>
      ),
    },
  ];

  const quickActions = [
    {
      title: "Registrar cliente",
      description: `${clientesFueraDeRango} clientes sin contacto en 7 días.`,
      href: "/dashboard/clientes",
      color: "primary" as const,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      ),
    },
    {
      title: "Publicar proyecto",
      description: `${proyectosSinPlanos} proyectos necesitan planos o renders`,
      href: "/dashboard/proyectos",
      color: "success" as const,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h7" />
        </svg>
      ),
    },
    {
      title: "Planificar agenda",
      description: `${clientesConAccion} recordatorios listos para asignar`,
      href: "/dashboard/agenda",
      color: "info" as const,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      title: "Analizar reportes",
      description: `${notificacionesPendientes} indicadores pendientes de revisar`,
      href: "/dashboard/admin/reportes",
      color: "warning" as const,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9h4l3 8 4-16 3 8h4" />
        </svg>
      ),
    },
  ];

  const focusAreas = [
    {
      title: "Actualizar estados de clientes",
      description: `${clientesSinSeguimiento} clientes aún no tienen seguimiento registrado`,
      href: "/dashboard/clientes",
    },
    {
      title: "Subir nuevos planos o renders",
      description: `${proyectosSinPlanos} proyectos activos requieren archivos visuales`,
      href: "/dashboard/proyectos",
    },
    {
      title: "Confirmar visitas de la semana",
      description: `${clientesConAccion} reuniones y recordatorios en agenda`,
      href: "/dashboard/agenda",
    },
  ];

  const pulseItems = [
    {
      label: "Seguimientos pendientes",
      value: `${clientesFueraDeRango} clientes requieren contacto esta semana`,
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
      value: `${clientesConAccion} recordatorios con fecha asignada`,
      tone: "success" as const,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h18M16 3v4M8 3v4M5 9h14l-1 11H6L5 9z" />
        </svg>
      ),
    },
    {
      label: "Reportes disponibles",
      value: `${notificacionesPendientes} alertas por revisar`,
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
    <div className="space-y-10">
      <section className="grid gap-6 xl:grid-cols-[minmax(0,2fr),minmax(0,1fr)]">
        <Card
          variant="elevated"
          className="relative overflow-hidden rounded-3xl border-0 bg-gradient-to-br from-crm-primary via-crm-primary/90 to-crm-accent/80 text-white shadow-crm-xl"
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

            <div className="grid gap-4 sm:grid-cols-3">
              {heroHighlights.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="group block rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm transition-colors hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
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

        <Card variant="elevated" className="h-full">
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

      <section className="grid gap-6 lg:grid-cols-[minmax(0,2fr),minmax(0,1fr)]">
        <div>
          <div className="flex items-center justify-between gap-4 pb-4">
            <h2 className="text-xl font-semibold text-crm-text-primary">Acciones rápidas</h2>
            <Link href="/dashboard" className="text-sm text-crm-primary hover:text-crm-primary/80">
              Personalizar
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-2">
            {quickActions.map((action) => (
              <Link
                key={action.title}
                href={action.href}
                className="group focus:outline-none focus-visible:ring-2 focus-visible:ring-crm-primary/50"
              >
                <Card hover variant="elevated" className="h-full border border-crm-border/70">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${toneClasses[action.color]}`}>
                        {action.icon}
                      </span>
                      <CardTitle className="text-base leading-snug">{action.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-sm leading-relaxed">
                      {action.description}
                    </CardDescription>
                  </CardContent>
                  <CardContent className="pt-4">
                    <span className="inline-flex items-center gap-2 text-sm font-medium text-crm-primary/90 transition group-hover:text-crm-primary">
                      Ir ahora
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

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

      <section className="grid gap-6 lg:grid-cols-[minmax(0,2fr),minmax(0,1fr)]">
        <Suspense fallback={
          <div>
            <h2 className="text-xl font-semibold text-crm-text-primary mb-4">Actividad reciente</h2>
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-start space-x-3 animate-pulse">
                      <div className="h-8 w-8 rounded-full bg-crm-border"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-3/4 rounded bg-crm-border"></div>
                        <div className="h-3 w-1/2 rounded bg-crm-border"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        }>
          <RecentActivities />
        </Suspense>

        <Suspense fallback={
          <div>
            <h2 className="text-xl font-semibold text-crm-text-primary mb-4">Proyectos recientes</h2>
            <div className="grid grid-cols-1 gap-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4 space-y-3">
                    <div className="h-4 w-2/3 rounded bg-crm-border"></div>
                    <div className="h-3 w-1/3 rounded bg-crm-border"></div>
                    <div className="h-3 w-full rounded bg-crm-border"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        }>
          <RecentProjects />
        </Suspense>
      </section>
    </div>
  );
}
