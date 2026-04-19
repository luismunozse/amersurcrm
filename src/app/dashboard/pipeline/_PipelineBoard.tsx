"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
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
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PipelineCliente } from "@/lib/cache.server";
import type { EstadoCliente } from "@/lib/types/clientes";
import PipelineCard, { getUrgencia, type Urgencia } from "./_PipelineCard";
import DesestimarDialog from "./_DesestimarDialog";
import { moverClientePipeline } from "./_actions";

type ColumnaDef = { estado: EstadoCliente; label: string; dot: string; header: string };

const COLUMNAS_PRINCIPALES: ColumnaDef[] = [
  { estado: "por_contactar", label: "Por Contactar", dot: "bg-blue-500",   header: "border-t-blue-500" },
  { estado: "contactado",    label: "Contactado",    dot: "bg-yellow-500", header: "border-t-yellow-500" },
  { estado: "intermedio",    label: "Intermedio",    dot: "bg-cyan-500",   header: "border-t-cyan-500" },
  { estado: "potencial",     label: "Potencial",     dot: "bg-purple-500", header: "border-t-purple-500" },
];

const COLUMNAS_TERMINALES: ColumnaDef[] = [
  { estado: "desestimado", label: "Desestimado", dot: "bg-gray-400",   header: "border-t-gray-400" },
  { estado: "transferido", label: "Transferido", dot: "bg-green-500",  header: "border-t-green-500" },
];

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

interface DraggableCardProps {
  cliente: PipelineCliente;
  pending?: boolean;
}

function DraggableCard({ cliente, pending }: DraggableCardProps) {
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
      className={`touch-none ${isDragging ? "opacity-40" : ""} ${pending ? "pointer-events-none animate-pulse" : ""}`}
    >
      <PipelineCard cliente={cliente} asLink={!isDragging && !pending} />
    </div>
  );
}

interface DroppableColumnBodyProps {
  estado: EstadoCliente;
  cards: PipelineCliente[];
  pendingId: string | null;
}

function DroppableColumnBody({ estado, cards, pendingId }: DroppableColumnBodyProps) {
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
        cards.map((c) => <DraggableCard key={c.id} cliente={c} pending={pendingId === c.id} />)
      )}
    </div>
  );
}

interface Props {
  clientesIniciales: PipelineCliente[];
  puedeVerTodos: boolean;
  vendedorFiltro: string;
}

export default function PipelineBoard({ clientesIniciales, puedeVerTodos }: Props) {
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

  // Resync cuando el Server Component refresca (revalidatePath).
  useEffect(() => {
    setClientes(clientesIniciales);
  }, [clientesIniciales]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 15 } }),
    useSensor(KeyboardSensor),
  );

  const porEstado = useMemo(() => {
    const acc: Record<string, PipelineCliente[]> = {
      por_contactar: [], contactado: [], intermedio: [], potencial: [], desestimado: [], transferido: [],
    };
    for (const c of clientes) {
      if (acc[c.estado_cliente]) acc[c.estado_cliente].push(c);
    }
    for (const k of Object.keys(acc)) acc[k] = ordenarPorUrgencia(acc[k]);
    return acc;
  }, [clientes]);

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
      toast.success("Cliente movido");
      startTransition(() => {
        // revalidatePath ya disparó refresh del Server Component
      });
    } catch (e) {
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
    const cliente = clientes.find((c) => c.id === clienteId);
    if (!cliente) return;
    if (cliente.estado_cliente === estadoNuevo) return;

    // Regla: salir de transferido solo admin/coord/gerente
    if (cliente.estado_cliente === "transferido" && !puedeVerTodos) {
      toast.error("Solo administradores pueden mover un cliente desde Transferido");
      return;
    }

    // Regla: pasar a desestimado abre modal de motivo
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

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNAS_PRINCIPALES.map((col) => {
            const cards = porEstado[col.estado];
            const totalCapacidad = cards.reduce(
              (sum, c) => sum + (c.capacidad_compra_estimada ?? 0),
              0,
            );
            return (
              <div
                key={col.estado}
                className={`shrink-0 w-80 rounded-xl border border-crm-border bg-crm-card border-t-4 ${col.header} flex flex-col max-h-[calc(100vh-220px)]`}
              >
                <div className="px-4 py-3 border-b border-crm-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                      <h3 className="text-sm font-semibold text-crm-text-primary">{col.label}</h3>
                    </div>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-crm-bg-elevated text-crm-text-muted">
                      {cards.length}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-crm-text-muted">
                    {formatCapacidadTotal(totalCapacidad)}
                  </div>
                </div>
                <DroppableColumnBody estado={col.estado} cards={cards} pendingId={pendingId} />
              </div>
            );
          })}

          {COLUMNAS_TERMINALES.map((col) => {
            const cards = porEstado[col.estado];
            const abierto = expandidos[col.estado];
            return (
              <div
                key={col.estado}
                className={`shrink-0 rounded-xl border border-crm-border bg-crm-card border-t-4 ${col.header} flex flex-col max-h-[calc(100vh-220px)] transition-all ${
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
                        <h3 className="text-sm font-semibold text-crm-text-primary">{col.label}</h3>
                      </div>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-crm-bg-elevated text-crm-text-muted">
                        {cards.length}
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
                  <DroppableColumnBody estado={col.estado} cards={cards} pendingId={pendingId} />
                ) : (
                  <CollapsedDroppable estado={col.estado} />
                )}
              </div>
            );
          })}
        </div>

        <DragOverlay dropAnimation={null}>
          {activeCliente ? (
            <div className="rotate-2 shadow-2xl shadow-black/40 cursor-grabbing">
              <PipelineCard cliente={activeCliente} asLink={false} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

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
