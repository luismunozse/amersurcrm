"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Info, MessageSquare, Heart, DollarSign, Clock, ShoppingCart, Headphones, ChevronDown } from "lucide-react";
import TabInformacionBasica from "./_TabInformacionBasica";
import TabInteracciones from "./_TabInteracciones";
import TabPropiedadesInteres from "./_TabPropiedadesInteres";
import TabReservas from "./_TabReservas";
import TabVentas from "./_TabVentas";
import TabTimeline from "./_TabTimeline";
import TabProformas from "./_TabProformas";
import dynamic from "next/dynamic";

const TabProcesosCliente = dynamic(() => import("./_TabProcesosCliente"), { ssr: false });
const TabCalificacion = dynamic(() => import("./_TabCalificacion"), { ssr: false });
const TabContrato = dynamic(() => import("./_TabContrato"), { ssr: false });
const TabCronograma = dynamic(() => import("./_TabCronograma"), { ssr: false });
const TabEntrega = dynamic(() => import("./_TabEntrega"), { ssr: false });
const TabPostVenta = dynamic(() => import("./_TabPostVenta"), { ssr: false });
const TabIndependizacion = dynamic(() => import("./_TabIndependizacion"), { ssr: false });
import type { ClienteCompleto } from "@/lib/types/clientes";
import type {
  InteraccionConVendedor,
  ReservaConRelaciones,
  VentaConRelaciones,
  AsesorActual,
} from "@/lib/types/cliente-detail";
import type { ProformaRecord } from "@/types/proforma";
import type { PropiedadInteres } from "@/types/propiedades-interes";

interface Props {
  cliente: ClienteCompleto;
  interacciones: InteraccionConVendedor[];
  propiedadesInteres: PropiedadInteres[];
  reservas: ReservaConRelaciones[];
  ventas: VentaConRelaciones[];
  proformas: ProformaRecord[];
  asesorActual: AsesorActual | null;
  defaultTab?: ClienteTabType;
  vendedores: Array<{ id: string; username: string; nombre_completo?: string | null; telefono?: string | null; email?: string | null }>;
  isAdmin?: boolean;
  esPrivilegiado?: boolean;
  seguimientosVencidos?: number;
}

export type ClienteTabType =
  | 'info'
  | 'interacciones'
  | 'propiedades'
  | 'reservas'
  | 'ventas'
  | 'proformas'
  | 'timeline'
  | 'calificacion'
  | 'contrato'
  | 'cronograma'
  | 'entrega'
  | 'postventa'
  | 'independizacion'
  // Tabs agrupados
  | 'adquisicion'
  | 'postventa_hub';

// Sub-tabs dentro de cada tab agrupado
type AdquisicionSubTab = 'procesos' | 'separaciones' | 'cotizaciones';
type VentasSubTab = 'ventas' | 'cronograma' | 'contrato';
type PostVentaSubTab = 'entregas' | 'solicitudes' | 'independizacion';

export default function ClienteDetailTabs({
  cliente,
  interacciones,
  propiedadesInteres,
  reservas,
  ventas,
  proformas,
  asesorActual,
  vendedores,
  defaultTab = 'info',
  isAdmin = false,
  esPrivilegiado = false,
  seguimientosVencidos = 0,
}: Props) {
  const [activeTab, setActiveTab] = useState<ClienteTabType>(defaultTab);
  const [adquisicionSubTab, setAdquisicionSubTab] = useState<AdquisicionSubTab>('procesos');
  const [ventasSubTab, setVentasSubTab] = useState<VentasSubTab>('ventas');
  const [postVentaSubTab, setPostVentaSubTab] = useState<PostVentaSubTab>('entregas');
  const [interaccionesCount, setInteraccionesCount] = useState(interacciones.length);

  // Scroll horizontal de tabs superior: mostrar fades según posición
  const tabsScrollRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLButtonElement>(null);
  const [scrollEstado, setScrollEstado] = useState<{ izquierda: boolean; derecha: boolean }>({ izquierda: false, derecha: false });

  const actualizarScrollEstado = useCallback(() => {
    const el = tabsScrollRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setScrollEstado({
      izquierda: el.scrollLeft > 4,
      derecha: el.scrollLeft < maxScroll - 4,
    });
  }, []);

  useEffect(() => {
    actualizarScrollEstado();
    const el = tabsScrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', actualizarScrollEstado, { passive: true });
    window.addEventListener('resize', actualizarScrollEstado);
    return () => {
      el.removeEventListener('scroll', actualizarScrollEstado);
      window.removeEventListener('resize', actualizarScrollEstado);
    };
  }, [actualizarScrollEstado]);

  useEffect(() => {
    // Auto-scroll para que el tab activo quede visible
    activeTabRef.current?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [activeTab]);

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  useEffect(() => {
    setInteraccionesCount(interacciones.length);
  }, [interacciones.length]);

  const handleInteraccionesCountChange = useCallback((count: number) => {
    setInteraccionesCount(count);
  }, []);

  const tabs = [
    { id: 'info' as ClienteTabType, label: 'Información', icon: Info, count: null },
    { id: 'timeline' as ClienteTabType, label: 'Historial', icon: Clock, count: null },
    {
      id: 'interacciones' as ClienteTabType, label: 'Interacciones', icon: MessageSquare,
      count: interaccionesCount, alert: seguimientosVencidos > 0,
    },
    { id: 'propiedades' as ClienteTabType, label: 'Interés', icon: Heart, count: propiedadesInteres.length },
    { id: 'adquisicion' as ClienteTabType, label: 'Adquisición', icon: ShoppingCart, count: reservas.length + proformas.length },
    { id: 'ventas' as ClienteTabType, label: 'Ventas', icon: DollarSign, count: ventas.length },
    { id: 'postventa_hub' as ClienteTabType, label: 'Post-Venta', icon: Headphones, count: null },
  ];

  function SubTabBar({ items, active, onChange }: {
    items: { id: string; label: string }[];
    active: string;
    onChange: (id: any) => void;
  }) {
    const activeItem = items.find((i) => i.id === active) ?? items[0];
    return (
      <div className="mb-4">
        {/* Mobile: select nativo */}
        <div className="relative sm:hidden">
          <select
            value={active}
            onChange={(e) => onChange(e.target.value)}
            className="w-full appearance-none px-4 pr-10 py-2.5 text-sm font-medium bg-crm-background border border-crm-border rounded-lg text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary/30"
            aria-label="Seleccionar sección"
          >
            {items.map((item) => (
              <option key={item.id} value={item.id}>{item.label}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-crm-text-muted" aria-hidden />
          <p className="sr-only">Actualmente: {activeItem.label}</p>
        </div>

        {/* Desktop: tabs pill con indicador claro */}
        <div className="hidden sm:flex gap-1 bg-crm-background rounded-lg p-1">
          {items.map((item) => {
            const esActivo = active === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onChange(item.id)}
                className={`relative px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  esActivo
                    ? 'bg-crm-card text-crm-primary shadow-sm ring-1 ring-crm-primary/20'
                    : 'text-crm-text-muted hover:text-crm-text hover:bg-crm-card/50'
                }`}
                aria-current={esActivo ? 'page' : undefined}
              >
                {item.label}
                {esActivo && (
                  <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 h-0.5 w-8 bg-crm-primary rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-crm-card border border-crm-border rounded-lg shadow-sm">
      {/* Tab Headers */}
      <div className="relative border-b border-crm-border">
        <div ref={tabsScrollRef} className="overflow-x-auto scrollbar-none [&::-webkit-scrollbar]:hidden">
          <div className="flex">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  ref={isActive ? activeTabRef : undefined}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-4 sm:px-5 py-3 sm:py-4 text-sm font-medium whitespace-nowrap
                    transition-colors border-b-2 -mb-px
                    ${isActive
                      ? 'border-crm-primary text-crm-primary'
                      : 'border-transparent text-crm-text-muted hover:text-crm-text hover:border-crm-border'
                    }
                  `}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  <span>{tab.label}</span>
                  {tab.count !== null && tab.count > 0 && (
                    <span className={`
                      px-2 py-0.5 text-xs font-semibold rounded-full
                      ${isActive
                        ? 'bg-crm-primary text-white'
                        : 'bg-crm-background text-crm-text-muted'
                      }
                    `}>
                      {tab.count}
                    </span>
                  )}
                  {'alert' in tab && tab.alert && (
                    <span className="relative flex h-2.5 w-2.5" title={`${seguimientosVencidos} seguimiento${seguimientosVencidos > 1 ? 's' : ''} vencido${seguimientosVencidos > 1 ? 's' : ''}`}>
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Fades laterales para señalar que hay más scroll */}
        <div
          className={`pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-crm-card to-transparent transition-opacity duration-150 ${scrollEstado.izquierda ? 'opacity-100' : 'opacity-0'}`}
          aria-hidden
        />
        <div
          className={`pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-crm-card to-transparent transition-opacity duration-150 ${scrollEstado.derecha ? 'opacity-100' : 'opacity-0'}`}
          aria-hidden
        />
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'info' && (
          <TabInformacionBasica cliente={cliente} vendedores={vendedores} />
        )}

        {activeTab === 'timeline' && <TabTimeline clienteId={cliente.id} />}

        {activeTab === 'interacciones' && (
          <TabInteracciones
            clienteId={cliente.id}
            clienteNombre={cliente.nombre}
            interacciones={interacciones}
            onCountChange={handleInteraccionesCountChange}
          />
        )}

        {activeTab === 'propiedades' && (
          <TabPropiedadesInteres
            propiedades={propiedadesInteres}
            clienteId={cliente.id}
          />
        )}

        {/* ========== ADQUISICIÓN (agrupado) ========== */}
        {activeTab === 'adquisicion' && (
          <>
            <SubTabBar
              items={[
                { id: 'procesos', label: 'Procesos' },
                { id: 'separaciones', label: 'Separaciones' },
                { id: 'cotizaciones', label: 'Cotizaciones' },
              ]}
              active={adquisicionSubTab}
              onChange={setAdquisicionSubTab}
            />
            {adquisicionSubTab === 'procesos' && (
              <TabProcesosCliente clienteId={cliente.id} esPrivilegiado={esPrivilegiado} />
            )}
            {adquisicionSubTab === 'separaciones' && (
              <TabReservas
                clienteId={cliente.id}
                clienteNombre={cliente.nombre}
                clienteDni={cliente.documento_identidad ?? undefined}
                clienteDomicilio={[cliente.direccion?.calle, cliente.direccion?.distrito, cliente.direccion?.ciudad].filter(Boolean).join(", ") || undefined}
                reservas={reservas}
                isAdmin={isAdmin}
              />
            )}
            {adquisicionSubTab === 'cotizaciones' && (
              <TabProformas
                cliente={cliente}
                proformas={proformas}
                reservas={reservas}
                ventas={ventas}
                asesorActual={asesorActual}
                isAdmin={isAdmin}
              />
            )}
          </>
        )}

        {/* ========== VENTAS (agrupado) ========== */}
        {activeTab === 'ventas' && (
          <>
            <SubTabBar
              items={[
                { id: 'ventas', label: 'Ventas' },
                { id: 'cronograma', label: 'Cronograma de Pagos' },
                { id: 'contrato', label: 'Contrato / Minuta' },
              ]}
              active={ventasSubTab}
              onChange={setVentasSubTab}
            />
            {ventasSubTab === 'ventas' && <TabVentas ventas={ventas} />}
            {ventasSubTab === 'cronograma' && <TabCronograma clienteId={cliente.id} ventas={ventas} esAdmin={isAdmin} />}
            {ventasSubTab === 'contrato' && <TabContrato clienteId={cliente.id} clienteNombre={cliente.nombre} cliente={cliente} ventas={ventas} />}
          </>
        )}

        {/* ========== POST-VENTA (agrupado) ========== */}
        {activeTab === 'postventa_hub' && (
          <>
            <SubTabBar
              items={[
                { id: 'entregas', label: 'Entregas' },
                { id: 'solicitudes', label: 'Solicitudes' },
                { id: 'independizacion', label: 'Independización' },
              ]}
              active={postVentaSubTab}
              onChange={setPostVentaSubTab}
            />
            {postVentaSubTab === 'entregas' && <TabEntrega clienteId={cliente.id} clienteNombre={cliente.nombre} ventas={ventas} />}
            {postVentaSubTab === 'solicitudes' && <TabPostVenta clienteId={cliente.id} clienteNombre={cliente.nombre} ventas={ventas} />}
            {postVentaSubTab === 'independizacion' && <TabIndependizacion clienteId={cliente.id} clienteNombre={cliente.nombre} ventas={ventas} />}
          </>
        )}
      </div>
    </div>
  );
}
