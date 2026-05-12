"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import toast from "react-hot-toast";
import { ChevronLeft, ChevronRight, Inbox, UserPlus } from "lucide-react";
import type { PipelineCliente } from "@/lib/cache.server";
import type { EstadoCliente } from "@/lib/types/clientes";
import PipelineCard, { getUrgencia, type Urgencia } from "./_PipelineCard";
import DesestimarDialog from "./_DesestimarDialog";
import CardMenu from "./_CardMenu";
import PipelineFilters, { type UrgenciaFiltro } from "./_PipelineFilters";
import { moverClientePipeline } from "./_actions";

type ColumnaDef = { estado: EstadoCliente; label: string; dot: string; header: string };

const COLUMNAS_PRINCIPALES: ColumnaDef[] = [
  { estado: "por_contactar", label: "Por Contactar", dot: "bg-blue-500",   header: "border-t-blue-500" },
  { estado: "contactado",    label: "Contactado",    dot: "bg-yellow-500", header: "border-t-yellow-500" },
  { estado: "intermedio",    label: "Intermedio",    dot: "bg-cyan-500",   header: "border-t-cyan-500" },
  { estado: "potencial",     label: "Potencial",     dot: "bg-purple-500", header: "border-t-purple-500" },
  { estado: "en_proceso",    label: "En Proceso",    dot: "bg-indigo-500", header: "border-t-indigo-500" },
];

const COLUMNAS_TERMINALES: ColumnaDef[] = [
  { estado: "propietario", label: "Propietario", dot: "bg-green-500", header: "border-t-green-500" },
  { estado: "desestimado", label: "Desestimado", dot: "bg-gray-400",  header: "border-t-gray-400" },
  { estado: "transferido", label: "Transferido", dot: "bg-teal-500",  header: "border-t-teal-500" },
];

const TODAS_COLUMNAS = [...COLUMNAS_PRINCIPALES, ...COLUMNAS_TERMINALES];

const ESTADO_LABEL: Record<string, string> = Object.fromEntries(
  TODAS_COLUMNAS.map((c) => [c.estado, c.label]),
);

const URGENCIA_RANK: Record<Urgencia, number> = { vencida: 0, hoy: 1, futura: 2, sin_fecha: 3 };

function ordenarPorUrgencia(arr: PipelineCliente[]): PipelineCliente[] {
  return [...arr].sort((a, b) => {
    const ra = URGENCIA_RANK[getUrgencia(a.fecha_proxima_accion)];
    const rb = URGENCIA_RANK[getUrgencia(b.fecha_proxima_accion)];
    if (ra !== rb) return ra - rb;
    const fa = a.fecha_proxima_accion ? new Date(a.fecha_proxima_accion).getTime() : Infinity;
    const fb = b.fecha_proxima_accion ? new Date(b.fecha_proxima_accion).getTime() : Infinity;
    return fa - fb;
  });
}

function formatCapacidadTotal(total: number): string {
  if (total === 0) return "S/ 0";
  if (total >= 1_000_000) return `S/ ${(total / 1_000_000).toFixed(1)}M`;
  if (total >= 1_000) return `S/ ${(total / 1_000).toFixed(0)}K`;
  return `S/ ${total.toLocaleString()}`;
}

function cumpleBusqueda(cliente: PipelineCliente, termino: string): boolean {
  if (!termino) return true;
  const t = termino.toLowerCase().trim();
  if (t.length < 2) return true;
  return (
    cliente.nombre.toLowerCase().includes(t) ||
    cliente.codigo_cliente.toLowerCase().includes(t)
  );
}

function cumpleUrgencia(cliente: PipelineCliente, filtro: UrgenciaFiltro): boolean {
  if (filtro === "todas") return true;
  const u = getUrgencia(cliente.fecha_proxima_accion);
  if (filtro === "vencidas") return u === "vencida";
  if (filtro === "hoy_y_vencidas") return u === "vencida" || u === "hoy";
  return true;
}

interface DraggableCardProps {
  cliente: PipelineCliente;
  pending?: boolean;
  onMoverDesdeMenu: (estadoNuevo: EstadoCliente) => void;
}

function DraggableCard({ cliente, pending, onMoverDesdeMenu }: DraggableCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: cliente.id,
    data: { estado: cliente.estado_cliente, cliente },
  });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`touch-none relative group ${isDragging ? "opacity-40" : ""} ${pending ? "pointer-events-none animate-pulse" : ""}`}
    >
      <div className="absolute top-1.5 right-1.5 z-10 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
        <CardMenu
          estadoActual={cliente.estado_cliente as EstadoCliente}
          onSeleccionar={onMoverDesdeMenu}
          disabled={pending}
        />
      </div>
      <PipelineCard cliente={cliente} asLink={!isDragging && !pending} />
    </div>
  );
}

interface DroppableColumnBodyProps {
  estado: EstadoCliente;
  cards: PipelineCliente[];
  pendingId: string | null;
  onMoverDesdeMenu: (clienteId: string, estadoNuevo: EstadoCliente) => void;
}

function DroppableColumnBody({ estado, cards, pendingId, onMoverDesdeMenu }: DroppableColumnBodyProps) {
  const { isOver, setNodeRef } = useDroppable({ id: estado, data: { estado } });
  return (
    <div
      ref={setNodeRef}
      className={`flex-1 overflow-y-auto p-3 space-y-2 transition-colors ${
        isOver ? "bg-crm-primary/5 ring-2 ring-crm-primary/40 ring-inset" : ""
      }`}
    >
      {cards.length === 0 ? (
        <div className="text-xs text-crm-text-muted text-center py-6 select-none">
          {isOver ? "Soltar aquí" : "Sin clientes"}
        </div>
      ) : (
        cards.map((c) => (
          <DraggableCard
            key={c.id}
            cliente={c}
            pending={pendingId === c.id}
            onMoverDesdeMenu={(estadoNuevo) => onMoverDesdeMenu(c.id, estadoNuevo)}
          />
        ))
      )}
    </div>
  );
}

interface ColumnHeaderProps {
  col: ColumnaDef;
  cards: PipelineCliente[];
  totalReal: number;
}

function ColumnHeader({ col, cards, totalReal }: ColumnHeaderProps) {
  const totalCapacidad = cards.reduce((sum, c) => sum + (c.capacidad_compra_estimada ?? 0), 0);
  const hayMasSinMostrar = totalReal > cards.length;
  return (
    <div className="px-4 py-3 border-b border-crm-border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${col.dot}`} />
          <h3 className="text-sm font-semibold text-crm-text-primary">{col.label}</h3>
        </div>
        <span
          className="text-xs font-medium px-2 py-0.5 rounded-full bg-crm-bg-elevated text-crm-text-muted"
          title={
            hayMasSinMostrar
              ? `Mostrando ${cards.length} de ${totalReal} — hay ${totalReal - cards.length} más no visibles`
              : undefined
          }
        >
          {hayMasSinMostrar ? `${cards.length} / ${totalReal}` : cards.length}
        </span>
      </div>
      <div className="mt-1 text-xs text-crm-text-muted">
        {formatCapacidadTotal(totalCapacidad)}
      </div>
      {hayMasSinMostrar ? (
        <div className="mt-1 text-[10px] text-amber-600 dark:text-amber-400">
          Limitado a {cards.length} más recientes
        </div>
      ) : null}
    </div>
  );
}

interface Props {
  clientesIniciales: PipelineCliente[];
  totalesPorEstado: Record<string, number>;
  puedeVerTodos: boolean;
  vendedorFiltro: string;
  origenFiltro: string;
}

export default function PipelineBoard({
  clientesIniciales,
  totalesPorEstado,
  puedeVerTodos,
  vendedorFiltro,
  origenFiltro,
}: Props) {
  const [clientes, setClientes] = useState<PipelineCliente[]>(clientesIniciales);
  const [expandidos, setExpandidos] = useState<Record<string, boolean>>({
    desestimado: false,
    transferido: false,
  });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [desestimarPendiente, setDesestimarPendiente] = useState<{
    cliente: PipelineCliente;
    estadoPrev: string;
  } | null>(null);

  const [busqueda, setBusqueda] = useState("");
  const [urgencia, setUrgencia] = useState<UrgenciaFiltro>("todas");
  const [tabMobile, setTabMobile] = useState<EstadoCliente>("por_contactar");

  useEffect(() => {
    setClientes(clientesIniciales);
  }, [clientesIniciales]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 15 } }),
    useSensor(KeyboardSensor),
  );

  const clientesFiltrados = useMemo(() => {
    return clientes.filter((c) => cumpleBusqueda(c, busqueda) && cumpleUrgencia(c, urgencia));
  }, [clientes, busqueda, urgencia]);

  const porEstado = useMemo(() => {
    const acc: Record<string, PipelineCliente[]> = {
      por_contactar: [], contactado: [], intermedio: [], potencial: [],
      en_proceso: [], propietario: [], desestimado: [], transferido: [],
    };
    for (const c of clientesFiltrados) {
      if (acc[c.estado_cliente]) acc[c.estado_cliente].push(c);
    }
    for (const k of Object.keys(acc)) acc[k] = ordenarPorUrgencia(acc[k]);
    return acc;
  }, [clientesFiltrados]);

  const hayFiltrosActivos = Boolean(
    busqueda.trim() || urgencia !== "todas" || vendedorFiltro || origenFiltro,
  );

  const totalVisible = clientesFiltrados.length;
  const totalGlobal = Object.values(totalesPorEstado).reduce((s, n) => s + n, 0);
  const boardVacio = clientes.length === 0;
  const filtrosVacios = !boardVacio && totalVisible === 0;

  const activeCliente = activeId ? clientes.find((c) => c.id === activeId) ?? null : null;

  function aplicarOptimista(clienteId: string, estadoNuevo: string): string | null {
    let estadoPrev: string | null = null;
    setClientes((prev) =>
      prev.map((c) => {
        if (c.id !== clienteId) return c;
        estadoPrev = c.estado_cliente;
        return { ...c, estado_cliente: estadoNuevo };
      }),
    );
    return estadoPrev;
  }

  function revertir(clienteId: string, estadoPrev: string) {
    setClientes((prev) =>
      prev.map((c) => (c.id === clienteId ? { ...c, estado_cliente: estadoPrev } : c)),
    );
  }

  async function deshacerMovimiento(clienteId: string, estadoPrev: string, toastId: string) {
    toast.dismiss(toastId);
    setPendingId(clienteId);
    try {
      const res = await moverClientePipeline(clienteId, estadoPrev);
      if (!res.ok) {
        toast.error(res.error || "No se pudo deshacer el movimiento");
        return;
      }
      setClientes((prev) =>
        prev.map((c) => (c.id === clienteId ? { ...c, estado_cliente: estadoPrev } : c)),
      );
      toast.success("Movimiento deshecho");
    } catch {
      toast.error("Error al deshacer el movimiento");
    } finally {
      setPendingId(null);
    }
  }

  async function ejecutarMover(clienteId: string, estadoNuevo: string, motivo?: string) {
    const estadoPrev = aplicarOptimista(clienteId, estadoNuevo);
    setPendingId(clienteId);
    try {
      const res = await moverClientePipeline(clienteId, estadoNuevo, motivo);
      if (!res.ok) {
        if (estadoPrev) revertir(clienteId, estadoPrev);
        toast.error(res.error || "No se pudo mover el cliente");
        return;
      }

      const sinUndo =
        estadoNuevo === "desestimado" ||
        estadoNuevo === "transferido" ||
        estadoNuevo === "en_proceso";

      if (sinUndo || !estadoPrev) {
        toast.success(`Cliente movido a ${ESTADO_LABEL[estadoNuevo] ?? estadoNuevo}`);
      } else {
        const prev = estadoPrev;
        toast.custom(
          (t) => (
            <div
              className={`${
                t.visible ? "animate-in fade-in slide-in-from-bottom-2" : "opacity-0"
              } flex items-center gap-3 rounded-lg border border-crm-border bg-crm-card px-4 py-3 shadow-lg max-w-md`}
            >
              <div className="flex-1 text-sm text-crm-text-primary">
                Movido a{" "}
                <span className="font-semibold">{ESTADO_LABEL[estadoNuevo] ?? estadoNuevo}</span>
              </div>
              <button
                type="button"
                onClick={() => deshacerMovimiento(clienteId, prev, t.id)}
                className="text-sm font-semibold text-crm-primary hover:text-crm-primary/80 transition"
              >
                Deshacer
              </button>
              <button
                type="button"
                onClick={() => toast.dismiss(t.id)}
                className="text-crm-text-muted hover:text-crm-text-primary transition text-lg leading-none"
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>
          ),
          { duration: 8000 },
        );
      }

      startTransition(() => {});
    } catch {
      if (estadoPrev) revertir(clienteId, estadoPrev);
      toast.error("Error al mover el cliente");
    } finally {
      setPendingId(null);
    }
  }

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    setActiveId(null);
    if (!over) return;
    const clienteId = String(active.id);
    const estadoNuevo = String(over.id);
    intentarMover(clienteId, estadoNuevo);
  }

  function intentarMover(clienteId: string, estadoNuevo: string) {
    const cliente = clientes.find((c) => c.id === clienteId);
    if (!cliente) return;
    if (cliente.estado_cliente === estadoNuevo) return;

    if (
      (cliente.estado_cliente === "transferido" || cliente.estado_cliente === "en_proceso") &&
      !puedeVerTodos
    ) {
      toast.error(
        `Solo administradores pueden mover un cliente desde ${
          ESTADO_LABEL[cliente.estado_cliente] ?? cliente.estado_cliente
        }`,
      );
      return;
    }

    if (estadoNuevo === "desestimado") {
      setDesestimarPendiente({ cliente, estadoPrev: cliente.estado_cliente });
      return;
    }

    void ejecutarMover(clienteId, estadoNuevo);
  }

  function handleConfirmarDesestimar(motivo: string) {
    if (!desestimarPendiente) return;
    const { cliente } = desestimarPendiente;
    setDesestimarPendiente(null);
    void ejecutarMover(cliente.id, "desestimado", motivo);
  }

  const toggleTerminal = (estado: string) =>
    setExpandidos((prev) => ({ ...prev, [estado]: !prev[estado] }));

  function limpiarFiltrosClient() {
    setBusqueda("");
    setUrgencia("todas");
  }

  return (
    <>
      <PipelineFilters
        vendedorActual={vendedorFiltro}
        origenActual={origenFiltro}
        mostrarVendedor={puedeVerTodos}
        busqueda={busqueda}
        urgencia={urgencia}
        onBusquedaChange={setBusqueda}
        onUrgenciaChange={setUrgencia}
        onLimpiarTodo={limpiarFiltrosClient}
        hayFiltrosActivos={hayFiltrosActivos}
      />

      {boardVacio ? (
        <GlobalEmptyState />
      ) : filtrosVacios ? (
        <FiltrosSinResultados totalGlobal={totalGlobal} onLimpiar={limpiarFiltrosClient} />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveId(null)}
        >
          {/* Desktop: columnas horizontales */}
          <div className="hidden md:flex gap-4 overflow-x-auto pb-4">
            {COLUMNAS_PRINCIPALES.map((col) => {
              const cards = porEstado[col.estado];
              return (
                <div
                  key={col.estado}
                  className={`shrink-0 w-80 rounded-xl border border-crm-border bg-crm-card border-t-4 ${col.header} flex flex-col max-h-[calc(100vh-260px)]`}
                >
                  <ColumnHeader
                    col={col}
                    cards={cards}
                    totalReal={totalesPorEstado[col.estado] ?? cards.length}
                  />
                  <DroppableColumnBody
                    estado={col.estado}
                    cards={cards}
                    pendingId={pendingId}
                    onMoverDesdeMenu={intentarMover}
                  />
                </div>
              );
            })}

            {COLUMNAS_TERMINALES.map((col) => {
              const cards = porEstado[col.estado];
              const abierto = expandidos[col.estado];
              return (
                <div
                  key={col.estado}
                  className={`shrink-0 rounded-xl border border-crm-border bg-crm-card border-t-4 ${col.header} flex flex-col max-h-[calc(100vh-260px)] transition-all ${
                    abierto ? "w-80" : "w-14"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleTerminal(col.estado)}
                    className="px-3 py-3 border-b border-crm-border flex items-center gap-2 hover:bg-crm-bg-elevated/50 text-left"
                    aria-expanded={abierto}
                    title={`${col.label} (${cards.length})`}
                  >
                    {abierto ? (
                      <ChevronRight className="w-4 h-4 text-crm-text-muted shrink-0" />
                    ) : (
                      <ChevronLeft className="w-4 h-4 text-crm-text-muted shrink-0" />
                    )}
                    {abierto ? (
                      <div className="flex-1 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                          <h3 className="text-sm font-semibold text-crm-text-primary">
                            {col.label}
                          </h3>
                        </div>
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-crm-bg-elevated text-crm-text-muted">
                          {cards.length}
                          {totalesPorEstado[col.estado] > cards.length
                            ? ` / ${totalesPorEstado[col.estado]}`
                            : ""}
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 py-1">
                        <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                        <span
                          className="text-xs font-semibold text-crm-text-primary whitespace-nowrap"
                          style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
                        >
                          {col.label} · {cards.length}
                        </span>
                      </div>
                    )}
                  </button>
                  {abierto ? (
                    <DroppableColumnBody
                      estado={col.estado}
                      cards={cards}
                      pendingId={pendingId}
                      onMoverDesdeMenu={intentarMover}
                    />
                  ) : (
                    <CollapsedDroppable estado={col.estado} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Mobile: tabs */}
          <div className="md:hidden">
            <div className="flex gap-1 overflow-x-auto pb-2 -mx-1 px-1">
              {TODAS_COLUMNAS.map((col) => {
                const count = porEstado[col.estado].length;
                const activa = tabMobile === col.estado;
                return (
                  <button
                    key={col.estado}
                    type="button"
                    onClick={() => setTabMobile(col.estado)}
                    className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                      activa
                        ? "bg-crm-primary text-white"
                        : "bg-crm-card border border-crm-border text-crm-text-secondary"
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${activa ? "bg-white" : col.dot}`} />
                    {col.label}
                    <span
                      className={`px-1.5 rounded-full text-[10px] ${
                        activa ? "bg-white/20" : "bg-crm-bg-elevated"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {(() => {
              const col = TODAS_COLUMNAS.find((c) => c.estado === tabMobile)!;
              const cards = porEstado[tabMobile];
              return (
                <div
                  className={`rounded-xl border border-crm-border bg-crm-card border-t-4 ${col.header} flex flex-col max-h-[calc(100vh-260px)]`}
                >
                  <ColumnHeader
                    col={col}
                    cards={cards}
                    totalReal={totalesPorEstado[col.estado] ?? cards.length}
                  />
                  <DroppableColumnBody
                    estado={col.estado}
                    cards={cards}
                    pendingId={pendingId}
                    onMoverDesdeMenu={intentarMover}
                  />
                </div>
              );
            })()}
          </div>

          <DragOverlay dropAnimation={null}>
            {activeCliente ? (
              <div className="rotate-2 shadow-2xl shadow-black/40 cursor-grabbing">
                <PipelineCard cliente={activeCliente} asLink={false} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      <DesestimarDialog
        open={!!desestimarPendiente}
        clienteNombre={desestimarPendiente?.cliente.nombre ?? ""}
        pending={pendingId === desestimarPendiente?.cliente.id}
        onConfirm={handleConfirmarDesestimar}
        onCancel={() => setDesestimarPendiente(null)}
      />
    </>
  );
}

function CollapsedDroppable({ estado }: { estado: EstadoCliente }) {
  const { isOver, setNodeRef } = useDroppable({ id: estado, data: { estado } });
  return (
    <div
      ref={setNodeRef}
      className={`flex-1 transition-colors ${
        isOver ? "bg-crm-primary/10 ring-2 ring-crm-primary/40 ring-inset" : ""
      }`}
      aria-label={`Soltar para mover a ${estado}`}
    />
  );
}

function GlobalEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 rounded-xl border border-dashed border-crm-border bg-crm-card text-center">
      <Inbox className="w-12 h-12 text-crm-text-muted mb-3" />
      <h3 className="text-lg font-semibold text-crm-text-primary">Su pipeline está vacío</h3>
      <p className="mt-1 text-sm text-crm-text-muted max-w-md">
        Todavía no tiene clientes en ninguna etapa del embudo. Cree el primero para empezar a hacer
        seguimiento.
      </p>
      <Link
        href="/dashboard/clientes"
        className="mt-5 inline-flex items-center gap-2 rounded-lg bg-crm-primary px-4 py-2 text-sm font-medium text-white hover:bg-crm-primary/90 transition"
      >
        <UserPlus className="w-4 h-4" />
        Ir a Clientes
      </Link>
    </div>
  );
}

function FiltrosSinResultados({
  totalGlobal,
  onLimpiar,
}: {
  totalGlobal: number;
  onLimpiar: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 rounded-xl border border-dashed border-crm-border bg-crm-card text-center">
      <Inbox className="w-10 h-10 text-crm-text-muted mb-3" />
      <h3 className="text-base font-semibold text-crm-text-primary">
        Sin resultados con los filtros actuales
      </h3>
      <p className="mt-1 text-sm text-crm-text-muted">
        Hay {totalGlobal.toLocaleString()} clientes en total, pero ninguno coincide con los filtros.
      </p>
      <button
        type="button"
        onClick={onLimpiar}
        className="mt-4 inline-flex items-center gap-2 rounded-lg border border-crm-border bg-crm-card px-4 py-2 text-sm font-medium text-crm-text-primary hover:border-crm-primary/40 transition"
      >
        Limpiar búsqueda y urgencia
      </button>
    </div>
  );
}
