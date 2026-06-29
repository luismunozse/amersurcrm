"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ArrowUp, ArrowDown, ArrowUpDown, Rows3, Rows2, AlignJustify } from "lucide-react";

type Density = "compact" | "normal" | "relaxed";
const DENSITY_KEY = "lotes-list-density";
const DENSITY_PADDING: Record<Density, string> = {
  compact: "py-1.5",
  normal: "py-4",
  relaxed: "py-6",
};
const DENSITY_TEXT: Record<Density, string> = {
  compact: "text-xs",
  normal: "text-sm",
  relaxed: "text-sm",
};
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Edit, Trash2, Eye, Ruler, Calendar, CheckCircle, Clock, XCircle, MoreVertical, Lock, Building2, Info, Copy, Upload, Map, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import {
  actualizarLote,
  eliminarLote,
  duplicarLote,
  eliminarTodosLosLotes,
  cambiarEstadoMasivoLotes,
  aplicarDescuentoMasivoLotes,
  cambiarMonedaMasivoLotes,
  asignarVendedorMasivoLotes,
  listarVendedoresActivos,
} from "./_actions";
import LoteEditModal from "./LoteEditModal";
import LoteDetailModal from "./LoteDetailModal";
import EstadoBadgeAuditoria from "./_EstadoBadgeAuditoria";
import ModalReservaLote from "./ModalReservaLote";
import { useLoteLocks } from "@/hooks/useLoteLocks";
import DeleteAllLotesModal from "./_DeleteAllLotesModal";
import BulkImportLotesModal from "./_BulkImportLotesModal";
import ConfirmDialog from "@/components/ConfirmDialog";
import { usePermissions, PERMISOS } from "@/lib/permissions";
import { MasterplanViewer, type LoteMarcado } from "@/components/masterplan/MasterplanViewer";
import { MasterplanEditorPanel } from "@/components/masterplan/MasterplanEditorPanel";
import type { Masterplan } from "@/types/proyectos";

type Lote = {
  id: string;
  codigo: string;
  sup_m2: number | null;
  precio: number | null;
  moneda: string | null;
  estado: "disponible" | "reservado" | "vendido";
  created_at: string;
  proyecto?: {
    id: string;
    nombre: string;
  };
  data?: {
    fotos?: string[];
    plano?: string;
    renders?: string[];
    links3D?: string[];
    proyecto?: string;
    ubicacion?: string;
    etapa?: string;
    identificador?: string;
    manzana?: string;
    numero?: string;
    condiciones?: string;
    descuento?: number;
    nombre?: string;
    tipo_unidad?: string;
    precio_m2?: number;
  };
};

interface LotesListProps {
  proyectoId: string;
  lotes: Lote[];
  totalLotes?: number;
  masterplan?: Masterplan | null;
}

export default function LotesList({ proyectoId, lotes, totalLotes, masterplan }: LotesListProps) {
  const [editingLote, setEditingLote] = useState<string | null>(null);
  const [lotesState, setLotesState] = useState<Lote[]>(lotes);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [selectedLote, setSelectedLote] = useState<Lote | null>(null);
  const [reservandoLoteId, setReservandoLoteId] = useState<string | null>(null);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [confirmDeleteLote, setConfirmDeleteLote] = useState<{ id: string; codigo: string } | null>(null);
  const { esAdminOCoordinador, tienePermiso } = usePermissions();
  const puedeCrearLotes = esAdminOCoordinador() || tienePermiso(PERMISOS.LOTES.CREAR);
  const puedeEditarLotes = esAdminOCoordinador() || tienePermiso(PERMISOS.LOTES.EDITAR);
  const puedeEliminarLotes = esAdminOCoordinador() || tienePermiso(PERMISOS.LOTES.ELIMINAR);
  const puedeLiberar = esAdminOCoordinador();
  const puedeAsignarVendedor = esAdminOCoordinador();
  const puedeBulk = puedeEditarLotes;
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [vendedoresList, setVendedoresList] = useState<Array<{ username: string; nombre_completo: string; rol: string }>>([]);
  const [focusedIdx, setFocusedIdx] = useState<number>(-1);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [density, setDensity] = useState<Density>("normal");
  const [showMasterplan, setShowMasterplan] = useState<boolean>(!!masterplan?.url);
  const [editandoMp, setEditandoMp] = useState(false);
  const puedeEditarMasterplan = esAdminOCoordinador();
  const lockedLotes = useLoteLocks(proyectoId);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(DENSITY_KEY) as Density | null;
      if (saved && ["compact", "normal", "relaxed"].includes(saved)) {
        setDensity(saved);
      }
    } catch {
      // ignore
    }
  }, []);

  const changeDensity = (d: Density) => {
    setDensity(d);
    try {
      window.localStorage.setItem(DENSITY_KEY, d);
    } catch {
      // ignore
    }
  };
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentSort = searchParams.get("sort") || "codigo-asc";
  const [sortField, sortDir] = currentSort.split("-") as [string, "asc" | "desc"];

  const toggleSort = (field: "codigo" | "sup_m2" | "precio" | "created_at") => {
    const nextDir: "asc" | "desc" =
      sortField === field && sortDir === "asc" ? "desc" : "asc";
    const params = new URLSearchParams(searchParams.toString());
    const value = `${field}-${nextDir}`;
    if (value === "codigo-asc") {
      params.delete("sort");
    } else {
      params.set("sort", value);
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 inline ml-1 opacity-40" />;
    return sortDir === "asc" ? (
      <ArrowUp className="w-3 h-3 inline ml-1 text-crm-primary" />
    ) : (
      <ArrowDown className="w-3 h-3 inline ml-1 text-crm-primary" />
    );
  };

  useEffect(() => {
    if (puedeAsignarVendedor) {
      listarVendedoresActivos()
        .then((res) => {
          if (res.data) setVendedoresList(res.data);
        })
        .catch(() => undefined);
    }
  }, [puedeAsignarVendedor]);

  const toggleSelected = (loteId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(loteId)) {
        next.delete(loteId);
      } else {
        next.add(loteId);
      }
      return next;
    });
  };

  // Atajos de teclado - solo activos cuando no hay input focused ni modales abiertos
  useEffect(() => {
    const isTypingInField = () => {
      const el = document.activeElement;
      if (!el) return false;
      const tag = el.tagName;
      return (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        (el as HTMLElement).isContentEditable
      );
    };

    const isModalOpen = () =>
      !!editingLote ||
      !!selectedLote ||
      !!reservandoLoteId ||
      showDeleteAllModal ||
      showBulkImportModal ||
      !!confirmDeleteLote ||
      showShortcutsHelp;

    const handleKey = (e: KeyboardEvent) => {
      if (isTypingInField()) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const list = lotesState;
      if (list.length === 0) return;

      switch (e.key) {
        case "?":
          if (!isModalOpen()) {
            e.preventDefault();
            setShowShortcutsHelp(true);
          }
          break;
        case "j":
        case "J":
        case "ArrowDown":
          if (isModalOpen()) return;
          e.preventDefault();
          setFocusedIdx((idx) => Math.min(list.length - 1, (idx < 0 ? -1 : idx) + 1));
          break;
        case "k":
        case "K":
        case "ArrowUp":
          if (isModalOpen()) return;
          e.preventDefault();
          setFocusedIdx((idx) => Math.max(0, idx - 1));
          break;
        case " ":
        case "Space":
          if (isModalOpen() || !puedeBulk || focusedIdx < 0) return;
          e.preventDefault();
          toggleSelected(list[focusedIdx].id);
          break;
        case "Enter":
          if (isModalOpen() || focusedIdx < 0) return;
          e.preventDefault();
          setSelectedLote(list[focusedIdx]);
          break;
        case "e":
        case "E":
          if (isModalOpen() || !puedeEditarLotes || focusedIdx < 0) return;
          e.preventDefault();
          setEditingLote(list[focusedIdx].id);
          break;
        case "r":
        case "R":
          if (isModalOpen() || focusedIdx < 0) return;
          if (list[focusedIdx].estado !== "disponible") return;
          e.preventDefault();
          setReservandoLoteId(list[focusedIdx].id);
          break;
        case "Delete":
        case "Backspace":
          if (isModalOpen() || !puedeEliminarLotes || focusedIdx < 0) return;
          e.preventDefault();
          setConfirmDeleteLote({ id: list[focusedIdx].id, codigo: list[focusedIdx].codigo });
          break;
        case "Escape":
          if (showShortcutsHelp) {
            setShowShortcutsHelp(false);
          } else if (selectedIds.size > 0) {
            setSelectedIds(new Set());
          } else if (focusedIdx >= 0) {
            setFocusedIdx(-1);
          }
          break;
      }
    };

    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [
    lotesState,
    focusedIdx,
    selectedIds,
    editingLote,
    selectedLote,
    reservandoLoteId,
    showDeleteAllModal,
    showBulkImportModal,
    confirmDeleteLote,
    showShortcutsHelp,
    puedeEditarLotes,
    puedeEliminarLotes,
    puedeBulk,
  ]);

  // Reset focus si el índice queda fuera de rango (lotes filtrados, eliminados, etc)
  useEffect(() => {
    if (focusedIdx >= lotesState.length) setFocusedIdx(lotesState.length - 1);
  }, [lotesState.length, focusedIdx]);

  const toggleSelectAll = (lotes: Lote[]) => {
    setSelectedIds((prev) => {
      const allIds = lotes.map((l) => l.id);
      const allSelected = allIds.every((id) => prev.has(id));
      if (allSelected) {
        const next = new Set(prev);
        allIds.forEach((id) => next.delete(id));
        return next;
      }
      return new Set([...prev, ...allIds]);
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleBulkEstado = async (nuevoEstado: "disponible" | "reservado" | "vendido") => {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);
    try {
      const ids = Array.from(selectedIds);
      const res = await cambiarEstadoMasivoLotes(proyectoId, ids, nuevoEstado);
      if (res.success) {
        toast.success(`${res.actualizados} lote(s) actualizado(s) a ${getEstadoText(nuevoEstado)}`);
        setLotesState((prev) =>
          prev.map((l) => (selectedIds.has(l.id) ? { ...l, estado: nuevoEstado } : l)),
        );
        clearSelection();
      } else {
        toast.error(res.error || "No se pudo cambiar estado masivo");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error en cambio masivo");
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkDescuento = async () => {
    if (selectedIds.size === 0) return;
    const raw = window.prompt(
      `Aplicar descuento % a ${selectedIds.size} lote(s).\nIngrese porcentaje (1-99):`,
      "10",
    );
    if (raw === null) return;
    const pct = parseFloat(raw.replace(",", "."));
    if (!Number.isFinite(pct) || pct <= 0 || pct >= 100) {
      toast.error("Porcentaje inválido (debe ser entre 1 y 99)");
      return;
    }
    setBulkLoading(true);
    try {
      const ids = Array.from(selectedIds);
      const res = await aplicarDescuentoMasivoLotes(proyectoId, ids, pct);
      if (res.success) {
        toast.success(`${res.actualizados} lote(s) con ${pct}% de descuento`);
        clearSelection();
        window.location.reload();
      } else {
        toast.error(res.error || "No se pudo aplicar descuento");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error aplicando descuento");
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkMoneda = async (moneda: "PEN" | "USD" | "ARS") => {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);
    try {
      const ids = Array.from(selectedIds);
      const res = await cambiarMonedaMasivoLotes(proyectoId, ids, moneda);
      if (res.success) {
        toast.success(`${res.actualizados} lote(s) cambiados a ${moneda}`);
        clearSelection();
        window.location.reload();
      } else {
        toast.error(res.error || "No se pudo cambiar moneda");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error cambiando moneda");
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkAsignarVendedor = async (vendedorUsername: string | null) => {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);
    try {
      const ids = Array.from(selectedIds);
      const res = await asignarVendedorMasivoLotes(proyectoId, ids, vendedorUsername);
      if (res.success) {
        toast.success(
          vendedorUsername
            ? `${res.actualizados} lote(s) asignado(s) a ${vendedorUsername}`
            : `${res.actualizados} lote(s) sin vendedor`,
        );
        clearSelection();
      } else {
        toast.error(res.error || "No se pudo asignar vendedor");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error asignando vendedor");
    } finally {
      setBulkLoading(false);
    }
  };

  // Sincronizar el estado cuando cambien los lotes
  useEffect(() => {
    setLotesState(lotes);
  }, [lotes]);

  // Helper para parsear data
  const parseData = (data: any) => {
    if (!data) return null;
    if (typeof data === 'string') {
      try {
        return JSON.parse(data);
      } catch {
        return null;
      }
    }
    return data;
  };


  // Sincronizar estado cuando cambien los props
  useEffect(() => {
    setLotesState(lotes);
  }, [lotes]);

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openMenuId && !(event.target as Element).closest('.relative')) {
        closeMenu();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openMenuId]);

  // Usar solo los lotes reales
  const lotesAMostrar = lotesState;
  const totalListado = typeof totalLotes === "number" ? totalLotes : lotesAMostrar.length;

  const lotesMarcados: LoteMarcado[] = lotesAMostrar.map((l) => ({
    id: l.id,
    codigo: l.codigo,
    estado: l.estado,
    precio: l.precio ?? null,
    moneda: l.moneda ?? null,
    poly:
      l.data && typeof l.data === "object" && Array.isArray((l.data as any).masterplan_poly)
        ? ((l.data as any).masterplan_poly as [number, number][])
        : null,
  }));

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'disponible':
        return 'bg-green-100 text-green-600 border-green-200';
      case 'reservado':
        return 'bg-yellow-100 text-yellow-600 border-yellow-200';
      case 'vendido':
        return 'bg-red-100 text-red-600 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getEstadoText = (estado: string) => {
    switch (estado) {
      case 'disponible':
        return 'Disponible';
      case 'reservado':
        return 'Reservado';
      case 'vendido':
        return 'Vendido';
      default:
        return estado;
    }
  };

  const formatPrecio = (precio: number | null, _moneda: string | null) => {
    if (!precio) return 'No especificado';
    const formatter = new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    return formatter.format(precio).replace('PEN', 'S/');
  };

  const formatFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-PE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleEdit = (loteId: string) => {
    setEditingLote(loteId);
  };

  const handleDelete = (loteId: string, codigo: string) => {
    setConfirmDeleteLote({ id: loteId, codigo });
  };

  const confirmarDeleteLote = () => {
    if (!confirmDeleteLote) return;
    const { id: loteId, codigo } = confirmDeleteLote;
    setConfirmDeleteLote(null);

    // Snapshot del lote completo antes de removerlo (para restore en undo)
    const loteSnapshot = lotesState.find((l) => l.id === loteId);
    const idxOriginal = lotesState.findIndex((l) => l.id === loteId);
    if (!loteSnapshot) return;

    // Optimistic UI: remover inmediato
    setLotesState((prev) => prev.filter((l) => l.id !== loteId));

    let cancelled = false;
    const timeoutId = window.setTimeout(async () => {
      if (cancelled) return;
      try {
        await eliminarLote(loteId, proyectoId);
      } catch (err) {
        // Si falla el delete real, restaurar en su posición original
        setLotesState((prev) => {
          if (prev.some((l) => l.id === loteId)) return prev;
          const next = [...prev];
          next.splice(Math.min(idxOriginal, next.length), 0, loteSnapshot);
          return next;
        });
        toast.error(`Error eliminando lote: ${(err as Error).message}`);
      }
    }, 5000);

    toast(`Lote ${codigo} eliminado`, {
      duration: 5000,
      action: {
        label: "Deshacer",
        onClick: () => {
          cancelled = true;
          window.clearTimeout(timeoutId);
          setLotesState((prev) => {
            if (prev.some((l) => l.id === loteId)) return prev;
            const next = [...prev];
            next.splice(Math.min(idxOriginal, next.length), 0, loteSnapshot);
            return next;
          });
          toast.success(`Lote ${codigo} restaurado`);
        },
      },
    });
  };

  const handleDeleteAll = () => {
    setShowDeleteAllModal(true);
  };

  const handleConfirmDeleteAll = async () => {
    const totalCount = totalLotes || lotesAMostrar.length;

    try {
      // Mostrar loading toast
      const loadingToast = toast.loading(`Eliminando ${totalCount} lotes...`);

      // Actualización optimista
      setLotesState([]);

      const result = await eliminarTodosLosLotes(proyectoId);

      toast.dismiss(loadingToast);
      toast.success(result.message || `${result.deletedCount} lotes eliminados exitosamente`);

      // Refrescar la página para mostrar el estado actualizado
      window.location.reload();
    } catch (error) {
      // Revertir cambios en caso de error
      setLotesState(lotes);
      toast.error(`Error eliminando lotes: ${(error as Error).message}`);
    }
  };

  const handleView = (lote: Lote) => {
    setSelectedLote(lote);
  };

  const handleDuplicate = async (loteId: string, codigo: string) => {
    try {
      const dup = await duplicarLote(loteId, proyectoId);
      toast.success(`Lote ${codigo} duplicado como ${dup.codigo}`);
      setLotesState(prev => [dup as any, ...prev]);
    } catch (e) {
      toast.error((e as Error).message || 'Error duplicando lote');
    }
  };

  const toggleMenu = (loteId: string) => {
    setOpenMenuId(openMenuId === loteId ? null : loteId);
  };

  const closeMenu = () => {
    setOpenMenuId(null);
  };

  const handleEstadoChange = async (loteId: string, nuevoEstado: string) => {
    try {
      // Actualización optimista
      setLotesState(prevLotes => 
        prevLotes.map(lote => 
          lote.id === loteId 
            ? { ...lote, estado: nuevoEstado as "disponible" | "reservado" | "vendido" }
            : lote
        )
      );

      // Actualizar también el estado en el mapa si existe la función
      if (typeof (window as any).updateLoteState === 'function') {
        (window as any).updateLoteState(loteId, nuevoEstado);
      }

      const formData = new FormData();
      formData.append('estado', nuevoEstado);
      formData.append('proyecto_id', proyectoId);
      
      await actualizarLote(loteId, formData);
      
      const estadoText = getEstadoText(nuevoEstado);
      toast.success(`Estado cambiado a ${estadoText}`);
    } catch (error) {
      // Revertir cambios en caso de error
      setLotesState(lotes);
      toast.error(error instanceof Error ? error.message : 'Error cambiando estado');
    }
  };

  const getEstadoButtons = (lote: Lote) => {
    const buttons = [];

    if (lote.estado === 'disponible') {
      buttons.push(
        <Button
          key="reservar"
          variant="outline"
          size="sm"
          onClick={() => setReservandoLoteId(lote.id)}
          className="px-2 py-1 text-xs font-medium text-yellow-600 bg-yellow-100 border-yellow-200 hover:bg-yellow-200 hover:border-yellow-300 transition-colors"
        >
          <Clock className="w-3 h-3 mr-1" />
          <span className="hidden xl:inline">Separar</span>
        </Button>
      );
      buttons.push(
        <Button
          key="vender"
          variant="outline"
          size="sm"
          onClick={() => handleEstadoChange(lote.id, 'vendido')}
          className="px-2 py-1 text-xs font-medium text-red-600 bg-red-100 border-red-200 hover:bg-red-200 hover:border-red-300 transition-colors"
        >
          <CheckCircle className="w-3 h-3 mr-1" />
          <span className="hidden xl:inline">Vender</span>
        </Button>
      );
    }
    
    if (lote.estado === 'reservado') {
      buttons.push(
        <Button
          key="vender"
          variant="outline"
          size="sm"
          onClick={() => handleEstadoChange(lote.id, 'vendido')}
          className="px-2 py-1 text-xs font-medium text-red-600 bg-red-100 border-red-200 hover:bg-red-200 hover:border-red-300 transition-colors"
        >
          <CheckCircle className="w-3 h-3 mr-1" />
          <span className="hidden xl:inline">Vender</span>
        </Button>
      );
      buttons.push(
        <Button
          key="liberar"
          variant="outline"
          size="sm"
          onClick={() => handleEstadoChange(lote.id, 'disponible')}
          className="px-2 py-1 text-xs font-medium text-green-600 bg-green-100 border-green-200 hover:bg-green-200 hover:border-green-300 transition-colors"
        >
          <XCircle className="w-3 h-3 mr-1" />
          <span className="hidden xl:inline">Liberar</span>
        </Button>
      );
    }
    
    if (lote.estado === 'vendido') {
      buttons.push(
        <Button
          key="revertir"
          variant="outline"
          size="sm"
          onClick={() => handleEstadoChange(lote.id, 'reservado')}
          className="px-2 py-1 text-xs font-medium text-blue-600 bg-blue-100 border-blue-200 hover:bg-blue-200 hover:border-blue-300 transition-colors"
        >
          <Clock className="w-3 h-3 mr-1" />
          <span className="hidden xl:inline">Revertir</span>
        </Button>
      );
    }
    
    return buttons;
  };

  return (
    <>
    <div className="space-y-6">
      {/* Sección Masterplan interactivo */}
      <Card>
        <CardHeader>
          <button
            type="button"
            onClick={() => setShowMasterplan((v) => !v)}
            className="flex items-center justify-between w-full gap-3 text-left"
            aria-expanded={showMasterplan}
          >
            <CardTitle className="flex items-center gap-2">
              <div className="w-8 h-8 bg-crm-primary/10 rounded-lg flex items-center justify-center">
                <Map className="w-4 h-4 text-crm-primary" />
              </div>
              Masterplan
            </CardTitle>
            {showMasterplan ? (
              <ChevronUp className="w-5 h-5 text-crm-text-muted flex-shrink-0" />
            ) : (
              <ChevronDown className="w-5 h-5 text-crm-text-muted flex-shrink-0" />
            )}
          </button>
        </CardHeader>
        {showMasterplan && (
          <CardContent>
            {masterplan?.url ? (
              <MasterplanViewer
                imageUrl={masterplan.url}
                lotes={lotesMarcados}
                onLoteClick={(id) =>
                  setSelectedLote(lotesAMostrar.find((l) => l.id === id) ?? null)
                }
              />
            ) : (
              <div className="p-6 text-center text-sm text-crm-text-muted dark:text-gray-400">
                Aún no hay masterplan cargado para este proyecto.
              </div>
            )}
            {puedeEditarMasterplan && (
              <button
                type="button"
                onClick={() => setEditandoMp((v) => !v)}
                className="mt-3 px-3 py-2 border border-crm-border rounded-md text-sm active:scale-[0.98] transition ease-out-strong"
              >
                {editandoMp ? "Cerrar editor" : "Editar masterplan"}
              </button>
            )}
            {editandoMp && (
              <MasterplanEditorPanel
                proyectoId={proyectoId}
                masterplan={masterplan ? { url: masterplan.url, path: masterplan.path } : null}
                lotes={lotesMarcados}
                onSaved={() => router.refresh()}
              />
            )}
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle className="flex items-center gap-2 flex-wrap">
              <div className="w-8 h-8 bg-crm-primary/10 rounded-lg flex items-center justify-center">
                <Lock className="w-4 h-4 text-crm-primary" />
              </div>
              Lotes del Proyecto
              <span className="text-sm font-normal text-crm-text-muted">
                ({totalListado} {totalListado === 1 ? 'lote' : 'lotes'})
              </span>
            </CardTitle>

            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              {/* Botón importar CSV/Excel */}
              {puedeCrearLotes && (
                <Button
                  onClick={() => setShowBulkImportModal(true)}
                  variant="outline"
                  size="sm"
                  className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-crm-primary border-crm-primary hover:bg-crm-primary hover:text-white transition-colors w-full sm:w-auto"
                >
                  <Upload className="w-4 h-4" />
                  <span className="hidden md:inline">Importar CSV</span>
                  <span className="md:hidden">Importar</span>
                </Button>
              )}

              {/* Botón eliminar todos los lotes */}
              {totalListado > 0 && (
                <Button
                  onClick={handleDeleteAll}
                  variant="outline"
                  size="sm"
                  className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-crm-danger border-crm-danger hover:bg-crm-danger hover:text-white transition-colors w-full sm:w-auto"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden md:inline">Eliminar todos los lotes</span>
                  <span className="md:hidden">Eliminar todos</span>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {lotesAMostrar.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-crm-card-hover rounded-full flex items-center justify-center mx-auto mb-6">
                <Building2 className="w-10 h-10 text-crm-text-muted" />
              </div>
              <h4 className="text-xl font-medium text-crm-text-primary mb-3">No hay lotes registrados</h4>
              <p className="text-crm-text-muted mb-6 max-w-md mx-auto">
                Comience agregando su primer lote usando el asistente paso a paso de arriba.
              </p>
              <div className="inline-flex items-center space-x-2 px-4 py-2 bg-crm-primary/10 text-crm-primary rounded-lg">
                <Info className="w-5 h-5" />
                <span className="text-sm font-medium">Use el botón &quot;Crear Lote&quot; para comenzar</span>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {puedeBulk && selectedIds.size > 0 && (
                <div className="hidden lg:flex sticky top-0 z-10 items-center gap-3 rounded-lg border border-crm-primary/30 bg-crm-primary/10 px-4 py-3 shadow-sm">
                  <span className="text-sm font-medium text-crm-text-primary">
                    {selectedIds.size} lote(s) seleccionado(s)
                  </span>
                  <div className="ml-auto flex flex-wrap items-center gap-2">
                    <select
                      disabled={bulkLoading}
                      defaultValue=""
                      onChange={(e) => {
                        const val = e.target.value as "disponible" | "reservado" | "vendido" | "";
                        if (val) {
                          handleBulkEstado(val);
                          e.target.value = "";
                        }
                      }}
                      className="rounded-md border border-crm-border bg-crm-card px-3 py-1.5 text-sm text-crm-text-primary"
                    >
                      <option value="" disabled>
                        Cambiar estado…
                      </option>
                      <option value="disponible">Disponible</option>
                      <option value="reservado">Reservado</option>
                      <option value="vendido">Vendido</option>
                    </select>
                    {puedeAsignarVendedor && (
                      <select
                        disabled={bulkLoading}
                        defaultValue=""
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "__clear__") {
                            handleBulkAsignarVendedor(null);
                          } else if (val) {
                            handleBulkAsignarVendedor(val);
                          }
                          e.target.value = "";
                        }}
                        className="rounded-md border border-crm-border bg-crm-card px-3 py-1.5 text-sm text-crm-text-primary"
                      >
                        <option value="" disabled>
                          Asignar vendedor…
                        </option>
                        <option value="__clear__">Sin vendedor</option>
                        {vendedoresList.map((v) => (
                          <option key={v.username} value={v.username}>
                            {v.nombre_completo} ({v.username})
                          </option>
                        ))}
                      </select>
                    )}
                    <select
                      disabled={bulkLoading}
                      defaultValue=""
                      onChange={(e) => {
                        const val = e.target.value as "PEN" | "USD" | "ARS" | "";
                        if (val) {
                          handleBulkMoneda(val);
                          e.target.value = "";
                        }
                      }}
                      className="rounded-md border border-crm-border bg-crm-card px-3 py-1.5 text-sm text-crm-text-primary"
                    >
                      <option value="" disabled>
                        Moneda…
                      </option>
                      <option value="PEN">PEN</option>
                      <option value="USD">USD</option>
                      <option value="ARS">ARS</option>
                    </select>
                    <button
                      type="button"
                      onClick={handleBulkDescuento}
                      disabled={bulkLoading}
                      className="rounded-md border border-crm-border bg-crm-card px-3 py-1.5 text-sm text-crm-text-primary hover:bg-crm-card-hover"
                      title="Aplicar descuento porcentual a precios"
                    >
                      Descuento %
                    </button>
                    <button
                      type="button"
                      onClick={clearSelection}
                      disabled={bulkLoading}
                      className="rounded-md border border-crm-border bg-crm-card px-3 py-1.5 text-sm text-crm-text-primary hover:bg-crm-card-hover"
                    >
                      Limpiar
                    </button>
                  </div>
                </div>
              )}
              {/* Vista de escritorio - Tabla completa */}
              <div className="hidden lg:block space-y-3">
              {/* Atajos + densidad */}
              <div className="hidden lg:flex justify-end items-center gap-3 -mt-2">
                <div className="flex items-center gap-1 bg-crm-card-hover rounded-md p-0.5 border border-crm-border">
                  <button
                    type="button"
                    onClick={() => changeDensity("compact")}
                    className={`p-1 rounded ${density === "compact" ? "bg-crm-primary text-white" : "text-crm-text-muted hover:text-crm-text-primary"}`}
                    title="Compacto"
                    aria-label="Densidad compacta"
                  >
                    <Rows3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => changeDensity("normal")}
                    className={`p-1 rounded ${density === "normal" ? "bg-crm-primary text-white" : "text-crm-text-muted hover:text-crm-text-primary"}`}
                    title="Normal"
                    aria-label="Densidad normal"
                  >
                    <Rows2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => changeDensity("relaxed")}
                    className={`p-1 rounded ${density === "relaxed" ? "bg-crm-primary text-white" : "text-crm-text-muted hover:text-crm-text-primary"}`}
                    title="Espaciado"
                    aria-label="Densidad espaciada"
                  >
                    <AlignJustify className="w-3.5 h-3.5" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setShowShortcutsHelp(true)}
                  className="text-[11px] text-crm-text-muted hover:text-crm-text-primary inline-flex items-center gap-1"
                  title="Ver atajos de teclado"
                >
                  Atajos
                  <kbd className="px-1.5 py-0.5 rounded border border-crm-border bg-crm-card text-[10px] font-mono">?</kbd>
                </button>
              </div>

              {/* Header de la tabla */}
              <div className="grid grid-cols-12 gap-3 px-4 py-3 bg-crm-card-hover rounded-lg text-sm font-medium text-crm-text-muted">
                <div className="col-span-2 flex items-center gap-2">
                  {puedeBulk && (
                    <input
                      type="checkbox"
                      checked={
                        lotesAMostrar.length > 0 &&
                        lotesAMostrar.every((l) => selectedIds.has(l.id))
                      }
                      onChange={() => toggleSelectAll(lotesAMostrar)}
                      className="h-4 w-4 cursor-pointer rounded border-crm-border"
                      title="Seleccionar todos"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => toggleSort("codigo")}
                    className="hover:text-crm-text-primary transition-colors flex items-center"
                    title="Ordenar por código"
                  >
                    Código
                    <SortIcon field="codigo" />
                  </button>
                </div>
                <div className="col-span-2">Tipo de Unidad</div>
                <div className="col-span-2">Proyecto</div>
                <div className="col-span-1">Estado</div>
                <div className="col-span-1">
                  <button
                    type="button"
                    onClick={() => toggleSort("sup_m2")}
                    className="hover:text-crm-text-primary transition-colors flex items-center"
                    title="Ordenar por superficie"
                  >
                    Superficie
                    <SortIcon field="sup_m2" />
                  </button>
                </div>
                <div className="col-span-1">
                  <button
                    type="button"
                    onClick={() => toggleSort("precio")}
                    className="hover:text-crm-text-primary transition-colors flex items-center"
                    title="Ordenar por precio"
                  >
                    Precio
                    <SortIcon field="precio" />
                  </button>
                </div>
                <div className="col-span-1">
                  <button
                    type="button"
                    onClick={() => toggleSort("created_at")}
                    className="hover:text-crm-text-primary transition-colors flex items-center"
                    title="Ordenar por fecha"
                  >
                    Fecha
                    <SortIcon field="created_at" />
                  </button>
                </div>
                <div className="col-span-2 text-center">Acciones</div>
              </div>

                {/* Lista de lotes - Vista de escritorio */}
                {lotesAMostrar.map((lote, idx) => (
                  <div
                    key={lote.id}
                    ref={(el) => {
                      if (el && idx === focusedIdx) {
                        el.scrollIntoView({ block: "nearest", behavior: "smooth" });
                      }
                    }}
                    className={`grid grid-cols-12 gap-3 px-4 ${DENSITY_PADDING[density]} ${DENSITY_TEXT[density]} bg-crm-card border rounded-lg hover:bg-crm-card-hover transition-colors ${
                      selectedIds.has(lote.id) ? "border-crm-primary" : "border-crm-border"
                    } ${idx === focusedIdx ? "ring-2 ring-crm-primary ring-offset-1" : ""}`}
                  >
                    {/* Código */}
                    <div className="col-span-2 flex items-center gap-2">
                      {puedeBulk && (
                        <input
                          type="checkbox"
                          checked={selectedIds.has(lote.id)}
                          onChange={() => toggleSelected(lote.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="h-4 w-4 cursor-pointer rounded border-crm-border"
                        />
                      )}
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-crm-primary/10 rounded-lg flex items-center justify-center">
                          <span className="text-xs font-semibold text-crm-primary">
                            {lote.codigo.charAt(0)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-crm-text-primary truncate">{lote.codigo}</div>
                        </div>
                      </div>
                    </div>

                    {/* Tipo de Unidad */}
                    <div className="col-span-2 flex items-center">
                      <div className="flex-1 min-w-0">
                        {(() => {
                          const dataObj = parseData(lote.data);
                          return (
                            <>
                              <div className="text-crm-text-primary truncate">
                                {dataObj?.tipo_unidad || 'Lote'}
                              </div>
                              {dataObj?.manzana && (
                                <div className="text-xs text-crm-text-muted">Mz. {dataObj.manzana}</div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Proyecto */}
                    <div className="col-span-2 flex items-center">
                      <div className="flex-1 min-w-0">
                        {lote.proyecto ? (
                          <div className="text-crm-primary font-medium truncate">{lote.proyecto.nombre}</div>
                        ) : (
                          <span className="text-crm-text-muted">No especificado</span>
                        )}
                      </div>
                    </div>

                    {/* Estado */}
                    <div className="col-span-1 flex items-center gap-1.5">
                      <EstadoBadgeAuditoria loteId={lote.id} enabled={esAdminOCoordinador()}>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getEstadoColor(lote.estado)}`}>
                          {getEstadoText(lote.estado)}
                        </span>
                      </EstadoBadgeAuditoria>
                      {lockedLotes[lote.id] && (
                        <span
                          className="inline-flex items-center gap-0.5 text-[10px] text-amber-600 dark:text-amber-400 font-semibold"
                          title={`Editando: ${lockedLotes[lote.id].nombre_completo ?? lockedLotes[lote.id].username}`}
                        >
                          <Lock className="w-3 h-3" />
                          <span className="hidden xl:inline truncate max-w-[80px]">
                            {lockedLotes[lote.id].username}
                          </span>
                        </span>
                      )}
                    </div>

                    {/* Superficie */}
                    <div className="col-span-1 flex items-center text-crm-text-primary">
                      {lote.sup_m2 ? (
                        <div className="flex items-center gap-1">
                          <Ruler className="w-4 h-4 text-crm-text-muted" />
                          <span>{lote.sup_m2} m²</span>
                        </div>
                      ) : (
                        <span className="text-crm-text-muted">No especificado</span>
                      )}
                    </div>

                    {/* Precio */}
                    <div className="col-span-1 flex items-center text-crm-text-primary">
                      {lote.precio ? (
                        <div className="flex items-center gap-1">
                          <span className="text-crm-text-muted font-medium">S/</span>
                          <span className="font-medium">{formatPrecio(lote.precio, lote.moneda).replace('S/', '')}</span>
                        </div>
                      ) : (
                        <span className="text-crm-text-muted">No especificado</span>
                      )}
                    </div>

                    {/* Fecha */}
                    <div className="col-span-1 flex items-center text-crm-text-muted">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span className="text-sm">{formatFecha(lote.created_at)}</span>
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="col-span-2 flex items-center justify-end gap-1">
                      <div className="flex items-center gap-1 flex-wrap justify-end">
                        {/* Botones de cambio de estado - Solo los más importantes */}
                        <div className="flex items-center gap-1">
                          {getEstadoButtons(lote).slice(0, 1)}
                        </div>
                        
                        {/* Menú de más opciones */}
                        <div className="relative">
                          <button
                            onClick={() => toggleMenu(lote.id)}
                            className="text-crm-text-muted hover:text-crm-text-primary transition-colors p-1.5"
                            title="Más opciones"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          
                          {/* Menú desplegable */}
                          {openMenuId === lote.id && (
                            <div className="absolute right-0 top-full mt-1 w-48 bg-crm-card border border-crm-border rounded-lg shadow-lg z-50">
                              <div className="py-1">
                                {/* Botones de estado restantes */}
                                {getEstadoButtons(lote).slice(1).map((button, index) => (
                                  <div key={index} className="px-3 py-1">
                                    {button}
                                  </div>
                                ))}
                                
                                {/* Separador */}
                                {getEstadoButtons(lote).length > 1 && (
                                  <div className="border-t border-crm-border my-1"></div>
                                )}
                                
                                {/* Acciones adicionales */}
                                
                                <button
                                  onClick={() => {
                                    handleView(lote);
                                    closeMenu();
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-crm-text-primary hover:bg-crm-card-hover transition-colors"
                                >
                                  <Eye className="w-4 h-4" />
                                  Ver detalles
                                </button>
                                {puedeEditarLotes && (
                                  <button
                                    onClick={() => {
                                      handleEdit(lote.id);
                                      closeMenu();
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-crm-text-primary hover:bg-crm-card-hover transition-colors"
                                  >
                                    <Edit className="w-4 h-4" />
                                    Editar lote
                                  </button>
                                )}
                                {puedeCrearLotes && (
                                  <button
                                    onClick={() => {
                                      handleDuplicate(lote.id, lote.codigo);
                                      closeMenu();
                                    }}
                                    title="Duplicar lote"
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-crm-text-primary hover:bg-crm-card-hover transition-colors"
                                  >
                                    <Copy className="w-4 h-4" />
                                    Duplicar lote
                                  </button>
                                )}
                                {puedeEliminarLotes && (
                                  <button
                                    onClick={() => {
                                      handleDelete(lote.id, lote.codigo);
                                      closeMenu();
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-crm-danger hover:bg-crm-card-hover transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    Eliminar lote
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Vista móvil y tablet - Lista compacta */}
              <div className="lg:hidden rounded-xl border border-crm-border divide-y divide-crm-border bg-transparent">
                {lotesAMostrar.map((lote) => {
                  const dataObj = parseData(lote.data);
                  return (
                    <div key={lote.id} className="relative p-4 space-y-3 bg-crm-card/40">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-crm-text-primary">{lote.codigo}</p>
                          <p className="text-xs text-crm-text-muted">
                            {dataObj?.tipo_unidad || 'Lote'}
                            {dataObj?.manzana && ` · Mz. ${dataObj.manzana}`}
                          </p>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getEstadoColor(lote.estado)}`}>
                          {getEstadoText(lote.estado)}
                        </span>
                      </div>

                      <dl className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <dt className="text-xs text-crm-text-muted uppercase tracking-wide">Proyecto</dt>
                          <dd className="font-medium text-crm-primary truncate">
                            {lote.proyecto ? lote.proyecto.nombre : 'No especificado'}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-crm-text-muted uppercase tracking-wide">Superficie</dt>
                          <dd className="text-crm-text-primary">
                            {lote.sup_m2 ? `${lote.sup_m2} m²` : 'No especificado'}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-crm-text-muted uppercase tracking-wide">Precio</dt>
                          <dd className="text-crm-text-primary">
                            {lote.precio ? (
                              <span className="font-medium">{formatPrecio(lote.precio, lote.moneda)}</span>
                            ) : 'No especificado'}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-crm-text-muted uppercase tracking-wide">Fecha</dt>
                          <dd className="text-crm-text-muted">{formatFecha(lote.created_at)}</dd>
                        </div>
                      </dl>

                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap gap-2">
                          {getEstadoButtons(lote).slice(0, 1)}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleView(lote)}
                            className="text-green-600 hover:text-green-700 transition-colors p-2"
                            title="Ver detalles"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <div className="relative">
                            <button
                              onClick={() => toggleMenu(lote.id)}
                              className="text-crm-text-muted hover:text-crm-text-primary transition-colors p-2"
                              title="Más opciones"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                            {openMenuId === lote.id && (
                              <div className="absolute right-0 top-9 z-50 w-48 rounded-lg border border-crm-border bg-crm-card shadow-lg">
                                <div className="py-1 text-left">
                                  {getEstadoButtons(lote).slice(1).length > 0 && (
                                    <div className="px-3 py-1 space-y-1 border-b border-crm-border/80">
                                      {getEstadoButtons(lote).slice(1).map((button, index) => (
                                        <div key={index}>{button}</div>
                                      ))}
                                    </div>
                                  )}
                                  {puedeEditarLotes && (
                                    <button
                                      onClick={() => {
                                        handleEdit(lote.id);
                                        closeMenu();
                                      }}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-crm-text-primary hover:bg-crm-card-hover transition-colors"
                                    >
                                      <Edit className="w-4 h-4" />
                                      Editar lote
                                    </button>
                                  )}
                                  {puedeCrearLotes && (
                                    <button
                                      onClick={() => {
                                        handleDuplicate(lote.id, lote.codigo);
                                        closeMenu();
                                      }}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-crm-text-primary hover:bg-crm-card-hover transition-colors"
                                    >
                                      <Copy className="w-4 h-4" />
                                      Duplicar lote
                                    </button>
                                  )}
                                  {puedeEliminarLotes && (
                                    <button
                                      onClick={() => {
                                        handleDelete(lote.id, lote.codigo);
                                        closeMenu();
                                      }}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-crm-danger hover:bg-crm-card-hover transition-colors"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                      Eliminar lote
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    {/* Modal de edición de lote */}
    <LoteEditModal
      open={!!editingLote}
      onClose={() => setEditingLote(null)}
      lote={lotesAMostrar.find(l => l.id === editingLote) || null}
      proyectoId={proyectoId}
      onSave={async (payload) => {
        try {
          const fd = new FormData();
          if (typeof payload.codigo !== 'undefined') fd.append('codigo', payload.codigo);
          if (typeof payload.sup_m2 !== 'undefined') fd.append('sup_m2', String(payload.sup_m2 ?? ''));
          if (typeof payload.precio !== 'undefined') fd.append('precio', String(payload.precio ?? ''));
          if (typeof payload.moneda !== 'undefined') fd.append('moneda', String(payload.moneda ?? ''));
          if (typeof payload.estado !== 'undefined') fd.append('estado', String(payload.estado));
          fd.append('proyecto_id', proyectoId);

          await actualizarLote(payload.id, fd);
          toast.success('Lote actualizado');
          // Optimista: refrescar lista
          setLotesState(prev => prev.map(it => it.id === payload.id ? {
            ...it,
            codigo: payload.codigo ?? it.codigo,
            sup_m2: typeof payload.sup_m2 === 'undefined' ? it.sup_m2 : (payload.sup_m2 as any),
            precio: typeof payload.precio === 'undefined' ? it.precio : (payload.precio as any),
            moneda: typeof payload.moneda === 'undefined' ? it.moneda : (payload.moneda as any),
            estado: (payload.estado as any) ?? it.estado,
          } : it));
          return true;
        } catch {
          toast.error('No se pudo actualizar');
          return false;
        }
      }}
    />
    <LoteDetailModal
      open={!!selectedLote}
      onClose={() => setSelectedLote(null)}
      lote={selectedLote}
      proyectoId={proyectoId}
      onReservar={
        selectedLote?.estado === "disponible"
          ? () => {
              setSelectedLote(null);
              setReservandoLoteId(selectedLote.id);
            }
          : undefined
      }
      onEditar={
        puedeEditarLotes
          ? () => {
              setSelectedLote(null);
              if (selectedLote) setEditingLote(selectedLote.id);
            }
          : undefined
      }
      puedeLiberar={puedeLiberar}
      onLiberado={() => {
        if (selectedLote) {
          setLotesState((prev) =>
            prev.map((l) =>
              l.id === selectedLote.id ? { ...l, estado: "disponible" as const } : l,
            ),
          );
        }
      }}
      puedeConvertirVenta={puedeEditarLotes}
      onConvertidoVenta={() => {
        if (selectedLote) {
          setLotesState((prev) =>
            prev.map((l) =>
              l.id === selectedLote.id ? { ...l, estado: "vendido" as const } : l,
            ),
          );
        }
      }}
    />
    {reservandoLoteId && (
      <ModalReservaLote
        open={!!reservandoLoteId}
        onClose={() => setReservandoLoteId(null)}
        lote={lotesAMostrar.find(l => l.id === reservandoLoteId) || { id: '', codigo: '', precio: null, sup_m2: null }}
        proyectoId={proyectoId}
        onSuccess={() => {
          // Actualizar el lote a reservado localmente
          setLotesState(prevLotes =>
            prevLotes.map(lote =>
              lote.id === reservandoLoteId
                ? { ...lote, estado: 'reservado' as const }
                : lote
            )
          );
        }}
      />
    )}
    <DeleteAllLotesModal
      isOpen={showDeleteAllModal}
      onClose={() => setShowDeleteAllModal(false)}
      onConfirm={handleConfirmDeleteAll}
      lotesCount={totalLotes || lotesAMostrar.length}
    />
    <BulkImportLotesModal
      open={showBulkImportModal}
      onClose={() => setShowBulkImportModal(false)}
      proyectoId={proyectoId}
      onSuccess={() => {
        window.location.reload();
      }}
    />
    <ConfirmDialog
      open={!!confirmDeleteLote}
      title="Eliminar lote"
      description={
        confirmDeleteLote
          ? `¿Está seguro de que quiere eliminar el lote ${confirmDeleteLote.codigo}? Esta acción no se puede deshacer.`
          : ""
      }
      confirmText="Eliminar"
      cancelText="Cancelar"
      onConfirm={confirmarDeleteLote}
      onClose={() => setConfirmDeleteLote(null)}
    />
    {showShortcutsHelp && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        onClick={() => setShowShortcutsHelp(false)}
      >
        <div
          className="w-full max-w-md rounded-xl bg-crm-card border border-crm-border shadow-2xl p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-crm-text-primary">Atajos de teclado</h3>
            <button
              type="button"
              onClick={() => setShowShortcutsHelp(false)}
              className="text-crm-text-muted hover:text-crm-text-primary"
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>
          <ul className="space-y-2 text-sm text-crm-text-secondary">
            {[
              { keys: ["J", "↓"], desc: "Siguiente lote" },
              { keys: ["K", "↑"], desc: "Lote anterior" },
              { keys: ["Enter"], desc: "Ver detalle" },
              { keys: ["E"], desc: "Editar (admin)" },
              { keys: ["R"], desc: "Reservar (si disponible)" },
              { keys: ["Space"], desc: "Seleccionar para bulk" },
              { keys: ["Del", "⌫"], desc: "Eliminar (admin)" },
              { keys: ["Esc"], desc: "Limpiar selección / quitar foco" },
              { keys: ["?"], desc: "Mostrar esta ayuda" },
            ].map((row) => (
              <li key={row.desc} className="flex items-center justify-between gap-3">
                <span>{row.desc}</span>
                <span className="flex gap-1">
                  {row.keys.map((k) => (
                    <kbd
                      key={k}
                      className="px-2 py-0.5 rounded border border-crm-border bg-crm-card-hover text-[11px] font-mono text-crm-text-primary"
                    >
                      {k}
                    </kbd>
                  ))}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[11px] text-crm-text-muted">
            Atajos inactivos mientras escribe en un campo o modal abierto.
          </p>
        </div>
      </div>
    )}
    </>
  );
}
