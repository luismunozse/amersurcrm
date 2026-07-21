"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import toast from "react-hot-toast";
import Image from "next/image";
import {
  UploadCloud,
  Users as UsersIcon,
  Plus,
  X,
  Eye,
  EyeOff,
  Search,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  Lock,
  Pencil as PencilIcon,
  Clock,
  Key,
  Trash2,
  CheckCircle2,
} from "lucide-react";

import { ProtectedAction } from "@/components/permissions";
import UserEditModal from "@/components/UserEditModal";
import EstadoUsuarioModal from "@/components/EstadoUsuarioModal";
import ResetPasswordModal from "@/components/ResetPasswordModal";
import DeleteUserModal from "@/components/DeleteUserModal";
import ReasignarClientesModal from "@/components/ReasignarClientesModal";
import HistorialCambiosUsuario from "@/components/HistorialCambiosUsuario";
import ImportarUsuariosModal from "@/components/ImportarUsuariosModal";
import ExportButton from "@/components/export/ExportButton";
import BulkCoordinadorModal from "@/components/BulkCoordinadorModal";
import SelectedVendedoresBar from "@/components/SelectedVendedoresBar";
import EquipoDecisionModal from "@/components/EquipoDecisionModal";
import { usePermissions } from "@/lib/permissions";
import {
  cambiarEstadoUsuario,
  resetearPasswordUsuario,
  eliminarUsuario,
  restaurarUsuario,
  reasignarClientes,
  contarClientesAsignados,
  type EquipoDecision,
} from "./_actions";

interface Usuario {
  id: string;
  username?: string;
  email: string;
  nombre_completo?: string;
  dni?: string;
  telefono?: string;
  rol: {
    id: string;
    nombre: string;
    descripcion: string;
  };
  activo: boolean;
  created_at: string;
  coordinador_id?: string | null;
  coordinador?: { id: string; nombre_completo: string | null } | null;
  meta_mensual?: number;
  comision_porcentaje?: number;
  requiere_cambio_password?: boolean;
  motivo_estado?: string;
  avatar_url?: string | null;
  firma_url?: string | null;
  last_sign_in_at?: string | null;
  deleted_at?: string | null;
  deleted_motivo?: string | null;
}

interface Rol {
  id: string;
  nombre: string;
  descripcion: string;
}

/**
 * Discriminated result of the deactivate/delete executors below.
 * "needs-decision" means the executor itself already opened
 * EquipoDecisionModal with fresh state — callers must NOT clear
 * equipo-decision state in that case, or they'd stomp it shut right after
 * it reopens (see handleEquipoDecisionConfirm).
 */
type EquipoActionOutcome = "completed" | "needs-decision" | "error";

function timeAgo(dateStr: string | null | undefined): { text: string; color: string } {
  if (!dateStr) return { text: "Nunca", color: "text-gray-400" };
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffHours = diffMs / 3600000;
  const diffDays = diffMs / 86400000;

  let text: string;
  if (diffHours < 1) text = "Hace unos minutos";
  else if (diffHours < 24) text = `Hace ${Math.floor(diffHours)}h`;
  else if (diffDays < 7) text = `Hace ${Math.floor(diffDays)}d`;
  else text = date.toLocaleDateString("es-PE", { day: "2-digit", month: "short" });

  const color = diffHours < 24
    ? "text-green-600"
    : diffDays < 7
    ? "text-amber-600"
    : "text-red-500";

  return { text, color };
}

function GestionUsuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [rolSeleccionado, setRolSeleccionado] = useState<string>("");
  const [cargando, setCargando] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [userEditing, setUserEditing] = useState<Usuario | null>(null);
  const [estadoModalOpen, setEstadoModalOpen] = useState(false);
  const [userCambiandoEstado, setUserCambiandoEstado] = useState<Usuario | null>(null);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [passwordTemporal, setPasswordTemporal] = useState<string | null>(null);
  const [userResetPassword, setUserResetPassword] = useState<Usuario | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<Usuario | null>(null);
  const [mostrarPassword, setMostrarPassword] = useState(false);

  const { tieneRol } = usePermissions();
  const puedeAsignarCoordinador = tieneRol("ROL_ADMIN");

  // Bulk coordinador assignment state. Map<id, nombre_completo> instead of
  // Set<id> so chips can still render the name of a vendedor selected on a
  // previous page/search even after that row leaves the current result set.
  // Survives search/page/filter changes across cargarUsuarios(); cleared only
  // after a successful bulk assignment or via the explicit "Limpiar selección"
  // action.
  const [selectedVendedores, setSelectedVendedores] = useState<Map<string, string>>(new Map());
  const [bulkCoordinadorModalOpen, setBulkCoordinadorModalOpen] = useState(false);

  // Server-side pagination state
  const [busqueda, setBusqueda] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [paginaActual, setPaginaActual] = useState(1);
  const [total, setTotal] = useState(0);
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [filtroRol, setFiltroRol] = useState("");
  const [filtroCoordinador, setFiltroCoordinador] = useState("");
  const [sortLastAccess, setSortLastAccess] = useState<"none" | "asc" | "desc">("none");
  const USUARIOS_POR_PAGINA = 10;

  // New feature states
  const [reasignarModalOpen, setReasignarModalOpen] = useState(false);
  const [reasignarUser, setReasignarUser] = useState<Usuario | null>(null);
  const [reasignarClientesCount, setReasignarClientesCount] = useState(0);
  const [reasignarCallback, setReasignarCallback] = useState<(() => void) | null>(null);
  const [historialOpen, setHistorialOpen] = useState(false);
  const [historialUser, setHistorialUser] = useState<Usuario | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);

  // Mandatory equipo-decision step (coordinador being deactivated/deleted
  // still has an active team). No skip path — the pending action is only
  // resumed once the admin makes a decision.
  const [equipoDecisionOpen, setEquipoDecisionOpen] = useState(false);
  const [equipoDecisionCoordinador, setEquipoDecisionCoordinador] = useState<Usuario | null>(null);
  const [equipoDecisionEquipoSize, setEquipoDecisionEquipoSize] = useState(0);
  const [equipoDecisionAction, setEquipoDecisionAction] = useState<((decision: EquipoDecision) => Promise<EquipoActionOutcome>) | null>(null);

  // Debounce search
  const searchTimerRef = useRef<NodeJS.Timeout>(undefined);
  useEffect(() => {
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(busqueda);
      setPaginaActual(1);
    }, 300);
    return () => clearTimeout(searchTimerRef.current);
  }, [busqueda]);

  // Cargar roles una vez
  useEffect(() => {
    fetch("/api/admin/roles", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setRoles(d.roles || []))
      .catch(() => toast.error("Error cargando roles"));
  }, []);

  const [coordinadores, setCoordinadores] = useState<{ id: string; username: string; nombre_completo: string }[]>([]);

  // Cargar coordinadores activos (para el selector de asignación de vendedores)
  useEffect(() => {
    fetch("/api/clientes/vendedores", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        const soloCoordinadores = (d.vendedores || []).filter((v: any) => v.rol === "ROL_COORDINADOR_VENTAS");
        setCoordinadores(soloCoordinadores);
      })
      .catch(() => {});
  }, []);

  // Cargar usuarios con paginación y ordenamiento server-side
  const cargarUsuarios = useCallback(async () => {
    try {
      setCargando(true);
      const params = new URLSearchParams({
        page: String(paginaActual),
        limit: String(USUARIOS_POR_PAGINA),
        includeDeleted: String(includeDeleted),
      });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (filtroRol) params.set("rol", filtroRol);
      if (filtroCoordinador) params.set("coordinador", filtroCoordinador);
      if (sortLastAccess !== "none") {
        params.set("sortBy", "ultimo_acceso");
        params.set("sortDir", sortLastAccess);
      }

      const res = await fetch(`/api/admin/usuarios?${params}`, { cache: "no-store" });
      const data = await res.json();

      setUsuarios(data.usuarios || []);
      setTotal(data.total || 0);
    } catch {
      toast.error("Error cargando usuarios");
    } finally {
      setCargando(false);
    }
  }, [paginaActual, debouncedSearch, includeDeleted, filtroRol, filtroCoordinador, sortLastAccess]);

  useEffect(() => {
    cargarUsuarios();
  }, [cargarUsuarios]);

  const totalPaginas = Math.ceil(total / USUARIOS_POR_PAGINA);

  const crearUsuario = async (formData: FormData) => {
    try {
      const rol = getRolSeleccionado();
      if (!rol) {
        toast.error("Debe seleccionar un rol válido");
        return;
      }

      const response = await fetch("/api/admin/usuarios", { method: "POST", body: formData });
      const data = await response.json();

      if (data.success) {
        toast.success("Usuario creado exitosamente");
        setMostrarFormulario(false);
        setRolSeleccionado("");
        setMostrarPassword(false);
        await cargarUsuarios();
      } else {
        toast.error(data.error || data.message || "Error creando usuario");
      }
    } catch {
      toast.error("Error creando usuario");
    }
  };

  const esRolAdmin = () => {
    if (!rolSeleccionado) return false;
    const rol = roles.find((r) => r.id === rolSeleccionado);
    return rol ? rol.nombre === "ROL_ADMIN" : false;
  };

  const getRolSeleccionado = () => {
    if (!rolSeleccionado) return null;
    return roles.find((r) => r.id === rolSeleccionado) || null;
  };

  const patchUsuario = async (payload: any) => {
    try {
      const response = await fetch("/api/admin/usuarios", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "Error actualizando usuario");
      }
      return true;
    } catch (error: any) {
      toast.error(error.message || "Error actualizando usuario");
      return false;
    }
  };

  const toggleActivo = async (u: Usuario) => {
    setUserCambiandoEstado(u);
    setEstadoModalOpen(true);
  };

  const ejecutarCambioEstado = async (
    usuario: Usuario,
    motivo: string,
    equipoDecision?: EquipoDecision
  ): Promise<EquipoActionOutcome> => {
    const result = await cambiarEstadoUsuario(usuario.id, !usuario.activo, motivo, equipoDecision);

    if (result.success) {
      toast.success(result.message || "Estado cambiado correctamente");
      await cargarUsuarios();
      setEstadoModalOpen(false);
      setUserCambiandoEstado(null);
      return "completed";
    }

    if (result.needsEquipoDecision) {
      setEquipoDecisionCoordinador(usuario);
      setEquipoDecisionEquipoSize(result.equipoSize || 0);
      setEquipoDecisionAction(() => (decision: EquipoDecision) => ejecutarCambioEstado(usuario, motivo, decision));
      setEquipoDecisionOpen(true);
      setEstadoModalOpen(false);
      return "needs-decision";
    }

    toast.error(result.error || "Error cambiando estado");
    return "error";
  };

  const handleCambiarEstado = async (motivo: string) => {
    if (!userCambiandoEstado) return;
    const usuario = userCambiandoEstado;

    // Si se va a desactivar, verificar clientes asignados (unchanged gate)
    if (usuario.activo) {
      const count = await contarClientesAsignados(usuario.id);
      if (count > 0) {
        setReasignarUser(usuario);
        setReasignarClientesCount(count);
        setReasignarCallback(() => () => ejecutarCambioEstado(usuario, motivo));
        setReasignarModalOpen(true);
        setEstadoModalOpen(false);
        setUserCambiandoEstado(null);
        return;
      }
    }

    await ejecutarCambioEstado(usuario, motivo);
  };

  const handleResetPassword = async (u: Usuario) => {
    const result = await resetearPasswordUsuario(u.id);

    if (result.success && result.passwordTemporal) {
      setUserResetPassword(u);
      setPasswordTemporal(result.passwordTemporal);
      setResetModalOpen(true);
      await cargarUsuarios();
    } else {
      toast.error(result.error || "Error reseteando contraseña");
    }
  };

  const editarUsuarioPrompt = (u: Usuario) => {
    setUserEditing(u);
    setModalOpen(true);
  };

  const handleDeleteUser = async (u: Usuario) => {
    // Check for assigned clients before deletion
    const count = await contarClientesAsignados(u.id);
    if (count > 0) {
      setReasignarUser(u);
      setReasignarClientesCount(count);
      setReasignarCallback(() => () => {
        setUserToDelete(u);
        setDeleteModalOpen(true);
      });
      setReasignarModalOpen(true);
      return;
    }
    setUserToDelete(u);
    setDeleteModalOpen(true);
  };

  const ejecutarEliminarUsuario = async (
    userId: string,
    equipoDecision?: EquipoDecision
  ): Promise<EquipoActionOutcome> => {
    const result = await eliminarUsuario(userId, undefined, equipoDecision);

    if (result.success) {
      toast.success(result.message || "Usuario eliminado exitosamente");
      setUsuarios((prev) => prev.filter((u) => u.id !== userId));
      setDeleteModalOpen(false);
      setUserToDelete(null);
      return "completed";
    }

    if (result.needsEquipoDecision) {
      const usuario = usuarios.find((u) => u.id === userId) ?? userToDelete;
      setEquipoDecisionCoordinador(usuario ?? null);
      setEquipoDecisionEquipoSize(result.equipoSize || 0);
      setEquipoDecisionAction(() => (decision: EquipoDecision) => ejecutarEliminarUsuario(userId, decision));
      setEquipoDecisionOpen(true);
      setDeleteModalOpen(false);
      return "needs-decision";
    }

    toast.error(result.error || "Error eliminando usuario");
    return "error";
  };

  // Adapts the discriminated executor outcome to DeleteUserModal's
  // { success, error } contract — the modal only cares whether it should
  // close itself, which the executor already drives directly via
  // setDeleteModalOpen for every outcome.
  const confirmDeleteUser = async (userId: string): Promise<{ success: boolean; error?: string }> => {
    const outcome = await ejecutarEliminarUsuario(userId);
    return { success: outcome === "completed" };
  };

  const handleRestaurar = async (u: Usuario) => {
    const result = await restaurarUsuario(u.id);
    if (result.success) {
      toast.success(result.message || "Usuario restaurado");
      await cargarUsuarios();
    } else {
      toast.error(result.error || "Error restaurando usuario");
    }
  };

  const handleReasignar = async (toUserId: string) => {
    if (!reasignarUser) return;
    const result = await reasignarClientes(reasignarUser.id, toUserId);
    if (result.success) {
      toast.success(result.message || "Clientes reasignados");
      setReasignarModalOpen(false);
      reasignarCallback?.();
      setReasignarUser(null);
      setReasignarCallback(null);
    } else {
      toast.error(result.error || "Error reasignando clientes");
    }
  };

  const handleReasignarSkip = () => {
    setReasignarModalOpen(false);
    reasignarCallback?.();
    setReasignarUser(null);
    setReasignarCallback(null);
  };

  const handleEquipoDecisionConfirm = async (decision: EquipoDecision) => {
    if (!equipoDecisionAction) return;
    const outcome = await equipoDecisionAction(decision);

    // The retried action re-triggered needsEquipoDecision — the executor
    // already reopened the modal with fresh coordinador/equipoSize/action
    // state, so clearing here would stomp it shut with no feedback. Surface
    // a toast instead so the admin knows the previous choice did not go
    // through and must pick again.
    if (outcome === "needs-decision") {
      toast.error("No se pudo completar la acción. Por favor, seleccione nuevamente.");
      return;
    }

    setEquipoDecisionOpen(false);
    setEquipoDecisionCoordinador(null);
    setEquipoDecisionEquipoSize(0);
    setEquipoDecisionAction(null);
  };

  // Vendedores activos para reasignación
  const vendedoresActivos = usuarios
    .filter((u) => u.activo && !u.deleted_at)
    .map((u) => ({ id: u.id, username: u.username || "", nombre_completo: u.nombre_completo || "" }));

  // Vendedores selectable for bulk coordinador assignment: active,
  // ROL_VENDEDOR, not soft-deleted — mirrors the endpoint's own per-id
  // validation so the UI never lets the admin select an id the API would
  // reject anyway.
  const vendedoresSeleccionables = usuarios
    .filter((u) => u.rol?.nombre === "ROL_VENDEDOR" && u.activo && !u.deleted_at);
  const vendedoresSeleccionablesIds = vendedoresSeleccionables.map((u) => u.id);

  const isAllSelected = vendedoresSeleccionablesIds.length > 0 &&
    vendedoresSeleccionablesIds.every((id) => selectedVendedores.has(id));
  const isSomeSelected = !isAllSelected && vendedoresSeleccionablesIds.some((id) => selectedVendedores.has(id));

  // Header select-all only ADDS this page's eligible vendedores to the
  // existing selection — it never replaces selections made on other
  // pages/searches. Unchecking removes only this page's ids.
  const toggleSelectAll = () => {
    setSelectedVendedores((prev) => {
      const next = new Map(prev);
      if (isAllSelected) {
        vendedoresSeleccionablesIds.forEach((id) => next.delete(id));
      } else {
        vendedoresSeleccionables.forEach((u) => next.set(u.id, u.nombre_completo || u.username || "Sin nombre"));
      }
      return next;
    });
  };

  const toggleSelectOne = (id: string, nombre: string) => {
    setSelectedVendedores((prev) => {
      const next = new Map(prev);
      if (next.has(id)) next.delete(id);
      else next.set(id, nombre);
      return next;
    });
  };

  const quitarSeleccionado = (id: string) => {
    setSelectedVendedores((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  };

  const limpiarSeleccion = () => {
    setSelectedVendedores(new Map());
  };

  const handleBulkAsignarCoordinador = async (coordinadorId: string | null) => {
    const vendedorIds = Array.from(selectedVendedores.keys());
    try {
      const response = await fetch("/api/admin/usuarios/bulk-coordinador", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendedorIds, coordinadorId }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data?.error || "Error asignando coordinador");
        return;
      }
      const actualizados = data.actualizados ?? 0;
      const sinCambios = data.sinCambios ?? 0;
      const rechazados: { id: string; motivo: string }[] = data.rechazados ?? [];

      const resumenAsignacion = sinCambios > 0
        ? `${actualizados} asignado${actualizados === 1 ? "" : "s"}, ${sinCambios} ya estaba${sinCambios === 1 ? "" : "n"} asignado${sinCambios === 1 ? "" : "s"}`
        : `Coordinador actualizado para ${actualizados} ${actualizados === 1 ? "vendedor" : "vendedores"}`;

      if (rechazados.length > 0) {
        const detalleMotivos = rechazados.length <= 3
          ? `: ${rechazados.map((r) => r.motivo).join("; ")}`
          : "";
        toast.error(`${resumenAsignacion}, ${rechazados.length} rechazado${rechazados.length === 1 ? "" : "s"}${detalleMotivos}`);
      } else {
        toast.success(resumenAsignacion);
      }
      setSelectedVendedores(new Map());
      setBulkCoordinadorModalOpen(false);
      await cargarUsuarios();
    } catch {
      toast.error("Error asignando coordinador");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="crm-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-crm-text-primary">Gestión de Usuarios</h2>
            <p className="text-crm-text-secondary text-sm mt-1">
              Crea y administra usuarios del sistema (Vendedores, Coordinadores, etc.)
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Export */}
            <ExportButton
              type="usuarios"
              data={usuarios}
              filters={{ q: debouncedSearch }}
              fileName="usuarios"
              label="Exportar"
              size="sm"
              variant="secondary"
            />
            {/* Import */}
            <ProtectedAction rol="ROL_ADMIN">
              <button
                onClick={() => setImportModalOpen(true)}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-crm-border text-crm-text-primary hover:bg-crm-hover transition-colors flex items-center space-x-2"
              >
                <UploadCloud className="w-4 h-4" />
                <span>Importar CSV</span>
              </button>
            </ProtectedAction>
            {/* Destination page is admin-only (layout gate) — hide for gerente. */}
            <ProtectedAction rol="ROL_ADMIN">
              <a
                href="/dashboard/admin/vendedores-activos"
                className="px-4 py-2 rounded-lg text-sm font-medium border border-crm-border text-crm-text-primary hover:bg-crm-hover transition-colors flex items-center space-x-2"
                title="Configurar vendedores para asignación automática de leads"
              >
                <UsersIcon className="w-4 h-4" />
                <span>Asignación automática de leads</span>
              </a>
            </ProtectedAction>
            <ProtectedAction rol="ROL_ADMIN">
              <button
                onClick={() => { setMostrarFormulario(true); setMostrarPassword(false); }}
                className="crm-button-primary px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Crear Usuario</span>
              </button>
            </ProtectedAction>
          </div>
        </div>
      </div>

      {/* Create form */}
      {mostrarFormulario && (
        <div className="crm-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-crm-text-primary">Crear Nuevo Usuario</h3>
            <button onClick={() => { setMostrarFormulario(false); setRolSeleccionado(""); setMostrarPassword(false); }} className="text-crm-text-muted hover:text-crm-text-primary">
              <X className="w-6 h-6" />
            </button>
          </div>
          <form action={crearUsuario} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-crm-text-primary mb-2">Rol *</label>
              <select name="rol_id" required value={rolSeleccionado} onChange={(e) => setRolSeleccionado(e.target.value)} className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-crm-primary">
                <option value="">Seleccionar rol</option>
                {roles.map((rol) => (
                  <option key={rol.id} value={rol.id}>{rol.nombre.replace("ROL_", "").replace("_", " ")}</option>
                ))}
              </select>
            </div>
            {rolSeleccionado && (
              <>
                {esRolAdmin() ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-crm-text-primary mb-2">Username *</label>
                      <input type="text" name="username" required pattern="[a-z][a-z0-9]{2,49}" className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary placeholder-crm-text-muted focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-crm-primary" placeholder="admin123" />
                      <p className="text-xs text-crm-text-muted mt-1">Solo letras minúsculas y números (3-50 caracteres, debe iniciar con letra)</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-crm-text-primary mb-2">Email *</label>
                      <input type="email" name="email" required className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary placeholder-crm-text-muted focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-crm-primary" placeholder="admin@empresa.com" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-crm-text-primary mb-2">Contraseña *</label>
                      <div className="relative">
                        <input type={mostrarPassword ? "text" : "password"} name="password" required minLength={6} className="w-full px-3 py-2 pr-10 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary placeholder-crm-text-muted focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-crm-primary" placeholder="Contraseña" />
                        <button type="button" onClick={() => setMostrarPassword(!mostrarPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 text-crm-text-muted hover:text-crm-text-primary transition-colors">
                          {mostrarPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-crm-text-primary mb-2">Nombre Completo *</label>
                      <input type="text" name="nombre_completo" required className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary placeholder-crm-text-muted focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-crm-primary" placeholder="Juan Pérez García" />
                      <p className="text-xs text-crm-text-muted mt-1">Se generará automáticamente el username (ej: jperez)</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-crm-text-primary mb-2">DNI * (usado para login)</label>
                      <input type="text" name="dni" required pattern="[0-9]{8}" maxLength={8} className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary placeholder-crm-text-muted focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-crm-primary" placeholder="12345678" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-crm-text-primary mb-2">Teléfono</label>
                      <input type="tel" name="telefono" pattern="[9][0-9]{8}" maxLength={9} className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary placeholder-crm-text-muted focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-crm-primary" placeholder="987654321" title="Debe ser un número de 9 dígitos que comience con 9" />
                      <p className="text-xs text-crm-text-muted mt-1">Formato: 9 dígitos comenzando con 9</p>
                    </div>
                    {roles.find((r) => r.id === rolSeleccionado)?.nombre === "ROL_VENDEDOR" && (
                      <div>
                        <label className="block text-sm font-medium text-crm-text-primary mb-2">Coordinador</label>
                        <select name="coordinador_id" className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-crm-primary">
                          <option value="">Sin coordinador asignado</option>
                          {coordinadores.map((c) => (
                            <option key={c.id} value={c.id}>{c.nombre_completo || c.username}</option>
                          ))}
                        </select>
                        <p className="text-xs text-crm-text-muted mt-1">El vendedor solo será visible para este coordinador y para administradores/gerentes.</p>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-crm-text-primary mb-2">Email <span className="text-red-500">*</span></label>
                      <input type="email" name="email" required className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary placeholder-crm-text-muted focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-crm-primary" placeholder="usuario@gmail.com" />
                      <p className="text-xs text-crm-text-muted mt-1">Usa un dominio válido de internet (ej: @gmail.com)</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-crm-text-primary mb-2">Contraseña Temporal *</label>
                      <div className="relative">
                        <input type={mostrarPassword ? "text" : "password"} name="password" required minLength={6} className="w-full px-3 py-2 pr-10 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary placeholder-crm-text-muted focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-crm-primary" placeholder="Contraseña temporal" />
                        <button type="button" onClick={() => setMostrarPassword(!mostrarPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 text-crm-text-muted hover:text-crm-text-primary transition-colors">
                          {mostrarPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-crm-text-primary mb-2">Meta Mensual (S/.)</label>
                      <input type="number" name="meta_mensual" min="0" step="100" className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary placeholder-crm-text-muted focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-crm-primary" placeholder="50000" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-crm-text-primary mb-2">Comisión (%)</label>
                      <input type="number" name="comision_porcentaje" min="0" max="100" step="0.1" className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary placeholder-crm-text-muted focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-crm-primary" placeholder="2.5" />
                    </div>
                  </div>
                )}
                <div className="flex justify-end space-x-3">
                  <button type="button" onClick={() => { setMostrarFormulario(false); setRolSeleccionado(""); setMostrarPassword(false); }} className="px-4 py-2 text-crm-text-muted hover:text-crm-text-primary border border-crm-border rounded-lg transition-colors">Cancelar</button>
                  <button type="submit" disabled={!getRolSeleccionado()} className="crm-button-primary px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed">Crear Usuario</button>
                </div>
              </>
            )}
          </form>
        </div>
      )}

      {/* Users list */}
      <div className="crm-card p-6">
        {/* Search + filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Buscar por nombre, username, DNI, email..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full px-4 py-2 pl-10 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary placeholder-crm-text-muted focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-crm-primary"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-crm-text-muted" />
            {busqueda && (
              <button onClick={() => setBusqueda("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-crm-text-muted hover:text-crm-text-primary">
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          <select
            value={filtroRol}
            onChange={(e) => { setFiltroRol(e.target.value); setPaginaActual(1); }}
            className="px-3 py-2 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-crm-primary"
          >
            <option value="">Todos los roles</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>{{ ROL_ADMIN: "Administrador", ROL_COORDINADOR_VENTAS: "Coordinador", ROL_GERENTE_VENTAS: "Gerente", ROL_VENDEDOR: "Vendedor" }[r.nombre] || r.nombre}</option>
            ))}
          </select>
          <select
            value={filtroCoordinador}
            onChange={(e) => { setFiltroCoordinador(e.target.value); setPaginaActual(1); }}
            className="px-3 py-2 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-crm-primary"
          >
            <option value="">Todos los coordinadores</option>
            {coordinadores.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre_completo || c.username}</option>
            ))}
            <option value="sin">Sin coordinador</option>
          </select>
          <label className="inline-flex items-center gap-2 text-sm text-crm-text-muted cursor-pointer select-none whitespace-nowrap">
            <input
              type="checkbox"
              checked={includeDeleted}
              onChange={(e) => { setIncludeDeleted(e.target.checked); setPaginaActual(1); }}
              className="rounded border-crm-border"
            />
            Mostrar eliminados
          </label>
        </div>

        {debouncedSearch && (
          <p className="text-sm text-crm-text-muted mb-3">
            {total} resultado(s) para &quot;{debouncedSearch}&quot;
          </p>
        )}

        {/* Bulk coordinador assignment bar */}
        {puedeAsignarCoordinador && selectedVendedores.size > 0 && (
          <SelectedVendedoresBar
            seleccionados={Array.from(selectedVendedores, ([id, nombre]) => ({ id, nombre }))}
            onQuitar={quitarSeleccionado}
            onLimpiar={limpiarSeleccion}
            onAsignar={() => setBulkCoordinadorModalOpen(true)}
          />
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-crm-border">
                {puedeAsignarCoordinador && (
                  <th className="py-3 px-4 w-10">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      ref={(input) => {
                        if (input) {
                          input.indeterminate = isSomeSelected;
                        }
                      }}
                      onChange={toggleSelectAll}
                      disabled={vendedoresSeleccionablesIds.length === 0}
                      aria-label="Seleccionar todos los vendedores de esta página"
                      className="w-4 h-4 text-crm-primary bg-crm-card border-crm-border rounded focus:ring-crm-primary focus:ring-2 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                    />
                  </th>
                )}
                <th className="text-left py-3 px-4 font-medium text-crm-text-primary">Usuario</th>
                <th className="text-left py-3 px-4 font-medium text-crm-text-primary">DNI</th>
                <th className="text-left py-3 px-4 font-medium text-crm-text-primary hidden md:table-cell">Teléfono</th>
                <th className="text-left py-3 px-4 font-medium text-crm-text-primary">Rol</th>
                <th className="text-left py-3 px-4 font-medium text-crm-text-primary hidden lg:table-cell">Coordinador</th>
                <th className="text-left py-3 px-4 font-medium text-crm-text-primary hidden lg:table-cell">Meta/Comisión</th>
                <th
                  className="text-left py-3 px-4 font-medium text-crm-text-primary hidden lg:table-cell cursor-pointer select-none hover:text-crm-primary transition-colors"
                  onClick={() => {
                    setSortLastAccess((prev) => prev === "none" ? "desc" : prev === "desc" ? "asc" : "none");
                    setPaginaActual(1);
                  }}
                  title="Ordenar por último acceso"
                >
                  <span className="inline-flex items-center gap-1">
                    Último Acceso
                    {sortLastAccess === "desc" && (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                    {sortLastAccess === "asc" && (
                      <ChevronUp className="w-3.5 h-3.5" />
                    )}
                    {sortLastAccess === "none" && (
                      <ArrowUpDown className="w-3.5 h-3.5 opacity-30" />
                    )}
                  </span>
                </th>
                <th className="text-left py-3 px-4 font-medium text-crm-text-primary">Estado</th>
                <th className="text-left py-3 px-4 font-medium text-crm-text-primary">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                <tr>
                  <td colSpan={puedeAsignarCoordinador ? 10 : 9} className="py-8 text-center text-crm-text-muted">
                    <div className="animate-pulse">Cargando usuarios...</div>
                  </td>
                </tr>
              ) : usuarios.length === 0 ? (
                <tr>
                  <td colSpan={puedeAsignarCoordinador ? 10 : 9} className="py-8 text-center text-crm-text-muted">
                    {debouncedSearch ? `No se encontraron usuarios para "${debouncedSearch}"` : "No hay usuarios registrados"}
                  </td>
                </tr>
              ) : (
                usuarios.map((usuario) => {
                  const isDeleted = !!usuario.deleted_at;
                  const { text: lastAccessText, color: lastAccessColor } = timeAgo(usuario.last_sign_in_at);

                  return (
                    <tr key={usuario.id} className={`border-b border-crm-border/50 ${isDeleted ? "opacity-50" : ""}`}>
                      {puedeAsignarCoordinador && (
                        <td className="py-3 px-4">
                          {usuario.rol?.nombre === "ROL_VENDEDOR" && usuario.activo && !isDeleted && (
                            <input
                              type="checkbox"
                              checked={selectedVendedores.has(usuario.id)}
                              onChange={() => toggleSelectOne(usuario.id, usuario.nombre_completo || usuario.username || "Sin nombre")}
                              aria-label={`Seleccionar a ${usuario.nombre_completo || usuario.username || "vendedor"}`}
                              className="w-4 h-4 text-crm-primary bg-crm-card border-crm-border rounded focus:ring-crm-primary focus:ring-2 cursor-pointer"
                            />
                          )}
                        </td>
                      )}
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-3">
                          {usuario.avatar_url ? (
                            <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                              <Image src={usuario.avatar_url} alt="" width={32} height={32} className="object-cover w-full h-full" unoptimized />
                            </div>
                          ) : (
                            <div className="w-8 h-8 bg-crm-accent rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-white text-sm font-medium">
                                {usuario.nombre_completo?.charAt(0) || usuario.username?.charAt(0).toUpperCase() || "U"}
                              </span>
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium text-crm-text-primary truncate">{usuario.nombre_completo || "Sin nombre"}</p>
                              {usuario.requiere_cambio_password && (
                                <span className="px-2 py-0.5 text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded flex items-center gap-1" title="Debe cambiar su contraseña">
                                  <Lock className="w-3 h-3" />
                                  <span className="hidden sm:inline">Reseteo</span>
                                </span>
                              )}
                              {usuario.firma_url && (
                                <span className="text-crm-text-muted" title="Tiene firma digital">
                                  <PencilIcon className="w-3.5 h-3.5" />
                                </span>
                              )}
                              {isDeleted && (
                                <span className="px-2 py-0.5 text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">Eliminado</span>
                              )}
                            </div>
                            <p className="text-sm text-crm-text-muted truncate">{usuario.username || "sin-username"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-crm-text-primary">{usuario.dni || "-"}</td>
                      <td className="py-3 px-4 text-sm text-crm-text-primary hidden md:table-cell">{usuario.telefono || "-"}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          usuario.rol?.nombre === "ROL_ADMIN" ? "bg-red-100 text-red-800"
                            : usuario.rol?.nombre === "ROL_COORDINADOR_VENTAS" ? "bg-purple-100 text-purple-800"
                            : "bg-blue-100 text-blue-800"
                        }`}>
                          {usuario.rol?.nombre === "ROL_ADMIN" ? "Admin"
                            : usuario.rol?.nombre === "ROL_COORDINADOR_VENTAS" ? "Coordinador"
                            : "Vendedor"}
                        </span>
                      </td>
                      <td className="py-3 px-4 hidden lg:table-cell text-sm text-crm-text-primary">
                        {usuario.rol?.nombre === "ROL_VENDEDOR"
                          ? (usuario.coordinador?.nombre_completo || <span className="text-crm-text-muted">Sin coordinador</span>)
                          : "—"}
                      </td>
                      <td className="py-3 px-4 hidden lg:table-cell">
                        <div className="space-y-1">
                          <p className="text-xs text-crm-text-primary">{usuario.meta_mensual ? `S/ ${usuario.meta_mensual.toLocaleString()}` : "Sin meta"}</p>
                          <p className="text-xs text-crm-text-muted">{usuario.comision_porcentaje ? `${usuario.comision_porcentaje}%` : "Sin comisión"}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 hidden lg:table-cell">
                        <span className={`text-xs ${lastAccessColor}`}>{lastAccessText}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          usuario.activo ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        }`}>
                          {usuario.activo ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {isDeleted ? (
                            <ProtectedAction rol="ROL_ADMIN">
                              <button
                                className="inline-flex items-center justify-center px-3 py-1 text-xs text-green-600 hover:bg-green-50 border border-green-200 rounded-lg transition-colors"
                                onClick={() => handleRestaurar(usuario)}
                                title="Restaurar usuario"
                              >
                                Restaurar
                              </button>
                            </ProtectedAction>
                          ) : (
                            <>
                              {/* Edit */}
                              <ProtectedAction rol="ROL_ADMIN">
                                <button className="inline-flex items-center justify-center w-8 h-8 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors" onClick={() => editarUsuarioPrompt(usuario)} title="Editar">
                                  <PencilIcon className="w-4 h-4" />
                                </button>
                              </ProtectedAction>
                              {/* History */}
                              <ProtectedAction rol="ROL_ADMIN">
                                <button className="inline-flex items-center justify-center w-8 h-8 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors" onClick={() => { setHistorialUser(usuario); setHistorialOpen(true); }} title="Historial de cambios">
                                  <Clock className="w-4 h-4" />
                                </button>
                              </ProtectedAction>
                              {/* Reset Password */}
                              <ProtectedAction rol="ROL_ADMIN">
                                <button className="inline-flex items-center justify-center w-8 h-8 text-orange-600 hover:text-orange-800 hover:bg-orange-50 rounded-lg transition-colors" onClick={() => handleResetPassword(usuario)} title="Resetear contraseña">
                                  <Key className="w-4 h-4" />
                                </button>
                              </ProtectedAction>
                              {/* Toggle Active */}
                              <ProtectedAction rol="ROL_ADMIN">
                                <button className={`inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${usuario.activo ? "text-red-600 hover:text-red-800 hover:bg-red-50" : "text-green-600 hover:text-green-800 hover:bg-green-50"}`} onClick={() => toggleActivo(usuario)} title={usuario.activo ? "Desactivar" : "Activar"}>
                                  {usuario.activo ? (
                                    <EyeOff className="w-4 h-4" />
                                  ) : (
                                    <CheckCircle2 className="w-4 h-4" />
                                  )}
                                </button>
                              </ProtectedAction>
                              {/* Delete */}
                              <ProtectedAction rol="ROL_ADMIN">
                                <button className="inline-flex items-center justify-center w-8 h-8 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors" onClick={() => handleDeleteUser(usuario)} title="Eliminar">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </ProtectedAction>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPaginas > 1 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-4 pt-4 border-t border-crm-border gap-3">
            <div className="text-sm text-crm-text-muted">
              Página {paginaActual} de {totalPaginas} ({total} usuarios)
            </div>
            <div className="flex items-center space-x-2">
              <button onClick={() => setPaginaActual(paginaActual - 1)} disabled={paginaActual === 1} className="px-3 py-1 rounded border border-crm-border text-crm-text-primary hover:bg-crm-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                Anterior
              </button>
              <div className="flex items-center space-x-1">
                {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((pagina) => {
                  if (pagina === 1 || pagina === totalPaginas || (pagina >= paginaActual - 1 && pagina <= paginaActual + 1)) {
                    return (
                      <button key={pagina} onClick={() => setPaginaActual(pagina)} className={`px-3 py-1 rounded border transition-colors ${paginaActual === pagina ? "bg-crm-primary text-white border-crm-primary" : "border-crm-border text-crm-text-primary hover:bg-crm-hover"}`}>
                        {pagina}
                      </button>
                    );
                  } else if (pagina === paginaActual - 2 || pagina === paginaActual + 2) {
                    return <span key={pagina} className="px-2 text-crm-text-muted">...</span>;
                  }
                  return null;
                })}
              </div>
              <button onClick={() => setPaginaActual(paginaActual + 1)} disabled={paginaActual === totalPaginas} className="px-3 py-1 rounded border border-crm-border text-crm-text-primary hover:bg-crm-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <UserEditModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setUserEditing(null); }}
        user={userEditing}
        roles={roles}
        coordinadores={coordinadores}
        onSave={async (payload) => {
          const ok = await patchUsuario(payload);
          if (ok) {
            toast.success("Usuario actualizado");
            await cargarUsuarios();
            return true;
          }
          return false;
        }}
      />

      <EstadoUsuarioModal
        open={estadoModalOpen}
        userName={userCambiandoEstado?.nombre_completo || userCambiandoEstado?.email || ""}
        currentState={userCambiandoEstado?.activo || false}
        onConfirm={handleCambiarEstado}
        onClose={() => { setEstadoModalOpen(false); setUserCambiandoEstado(null); }}
      />

      <ResetPasswordModal
        open={resetModalOpen}
        userName={userResetPassword?.nombre_completo || userResetPassword?.email || ""}
        passwordTemporal={passwordTemporal}
        onClose={() => { setResetModalOpen(false); setUserResetPassword(null); setPasswordTemporal(null); }}
      />

      <DeleteUserModal
        open={deleteModalOpen}
        onClose={() => { setDeleteModalOpen(false); setUserToDelete(null); }}
        user={userToDelete}
        onConfirm={confirmDeleteUser}
      />

      <ReasignarClientesModal
        open={reasignarModalOpen}
        userId={reasignarUser?.id || ""}
        userName={reasignarUser?.nombre_completo || ""}
        clientesCount={reasignarClientesCount}
        vendedores={vendedoresActivos}
        onConfirm={handleReasignar}
        onSkip={handleReasignarSkip}
        onClose={() => { setReasignarModalOpen(false); setReasignarUser(null); setReasignarCallback(null); }}
      />

      <HistorialCambiosUsuario
        open={historialOpen}
        userId={historialUser?.id || ""}
        userName={historialUser?.nombre_completo || ""}
        onClose={() => { setHistorialOpen(false); setHistorialUser(null); }}
      />

      <EquipoDecisionModal
        open={equipoDecisionOpen}
        coordinadorNombre={equipoDecisionCoordinador?.nombre_completo || equipoDecisionCoordinador?.email || ""}
        equipoSize={equipoDecisionEquipoSize}
        coordinadoresDisponibles={coordinadores.filter((c) => c.id !== equipoDecisionCoordinador?.id)}
        onConfirm={handleEquipoDecisionConfirm}
        onClose={() => {
          setEquipoDecisionOpen(false);
          setEquipoDecisionCoordinador(null);
          setEquipoDecisionEquipoSize(0);
          setEquipoDecisionAction(null);
        }}
      />

      <ImportarUsuariosModal
        open={importModalOpen}
        roles={roles}
        onClose={() => setImportModalOpen(false)}
        onImportComplete={cargarUsuarios}
      />

      <BulkCoordinadorModal
        open={bulkCoordinadorModalOpen}
        onClose={() => setBulkCoordinadorModalOpen(false)}
        selectedCount={selectedVendedores.size}
        coordinadores={coordinadores}
        onConfirm={handleBulkAsignarCoordinador}
      />
    </div>
  );
}

export default function AdminUsuariosPage() {
  // Acceso protegido server-side por admin/layout.tsx: ROL_ADMIN (control total)
  // y ROL_GERENTE (solo lectura). Todos los controles de mutación de esta
  // vista (crear, editar, activar/desactivar, resetear password, eliminar,
  // importar CSV) están gateados con <ProtectedAction rol="ROL_ADMIN">, y las
  // server actions/API routes que invocan también re-validan esAdmin().
  return (
    <div className="min-h-screen bg-crm-bg-primary">
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-crm-text-primary">Gestión de Usuarios</h1>
          <p className="text-sm sm:text-base text-crm-text-secondary mt-1 sm:mt-2">
            Administra usuarios, roles y permisos del sistema. Crea vendedores y coordinadores con información completa.
          </p>
        </div>
        <GestionUsuarios />
      </div>
    </div>
  );
}
