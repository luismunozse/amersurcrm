"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import toast from "react-hot-toast";
import Image from "next/image";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { usePermissions, PERMISOS } from "@/lib/permissions";
import { ProtectedAction } from "@/components/permissions";
import UserEditModal from "@/components/UserEditModal";
import EstadoUsuarioModal from "@/components/EstadoUsuarioModal";
import ResetPasswordModal from "@/components/ResetPasswordModal";
import DeleteUserModal from "@/components/DeleteUserModal";
import ReasignarClientesModal from "@/components/ReasignarClientesModal";
import HistorialCambiosUsuario from "@/components/HistorialCambiosUsuario";
import ImportarUsuariosModal from "@/components/ImportarUsuariosModal";
import ExportButton from "@/components/export/ExportButton";
import {
  cambiarEstadoUsuario,
  resetearPasswordUsuario,
  eliminarUsuario,
  restaurarUsuario,
  reasignarClientes,
  contarClientesAsignados,
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

  // Server-side pagination state
  const [busqueda, setBusqueda] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [paginaActual, setPaginaActual] = useState(1);
  const [total, setTotal] = useState(0);
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [filtroRol, setFiltroRol] = useState("");
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
  }, [paginaActual, debouncedSearch, includeDeleted, filtroRol, sortLastAccess]);

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

  const handleCambiarEstado = async (motivo: string) => {
    if (!userCambiandoEstado) return;

    // Si se va a desactivar, verificar clientes asignados
    if (userCambiandoEstado.activo) {
      const count = await contarClientesAsignados(userCambiandoEstado.id);
      if (count > 0) {
        setReasignarUser(userCambiandoEstado);
        setReasignarClientesCount(count);
        setReasignarCallback(() => async () => {
          const result = await cambiarEstadoUsuario(
            userCambiandoEstado.id,
            false,
            motivo
          );
          if (result.success) {
            toast.success(result.message || "Estado cambiado correctamente");
            await cargarUsuarios();
          } else {
            toast.error(result.error || "Error cambiando estado");
          }
        });
        setReasignarModalOpen(true);
        setEstadoModalOpen(false);
        setUserCambiandoEstado(null);
        return;
      }
    }

    const result = await cambiarEstadoUsuario(
      userCambiandoEstado.id,
      !userCambiandoEstado.activo,
      motivo
    );

    if (result.success) {
      toast.success(result.message || "Estado cambiado correctamente");
      await cargarUsuarios();
      setEstadoModalOpen(false);
      setUserCambiandoEstado(null);
    } else {
      toast.error(result.error || "Error cambiando estado");
    }
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

  const confirmDeleteUser = async (userId: string) => {
    const result = await eliminarUsuario(userId);

    if (result.success) {
      toast.success(result.message || "Usuario eliminado exitosamente");
      setUsuarios((prev) => prev.filter((u) => u.id !== userId));
      setDeleteModalOpen(false);
      setUserToDelete(null);
      return { success: true };
    } else {
      toast.error(result.error || "Error eliminando usuario");
      return { success: false, error: result.error };
    }
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

  // Vendedores activos para reasignación
  const vendedoresActivos = usuarios
    .filter((u) => u.activo && !u.deleted_at)
    .map((u) => ({ id: u.id, username: u.username || "", nombre_completo: u.nombre_completo || "" }));

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
            <ProtectedAction permiso={PERMISOS.USUARIOS.CREAR}>
              <button
                onClick={() => setImportModalOpen(true)}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-crm-border text-crm-text-primary hover:bg-crm-hover transition-colors flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                </svg>
                <span>Importar CSV</span>
              </button>
            </ProtectedAction>
            <a
              href="/dashboard/admin/vendedores-activos"
              className="px-4 py-2 rounded-lg text-sm font-medium border border-crm-border text-crm-text-primary hover:bg-crm-hover transition-colors flex items-center space-x-2"
              title="Configurar vendedores para asignación automática de leads"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span>Vendedores Activos</span>
            </a>
            <ProtectedAction permiso={PERMISOS.USUARIOS.CREAR}>
              <button
                onClick={() => { setMostrarFormulario(true); setMostrarPassword(false); }}
                className="crm-button-primary px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
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
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
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
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mostrarPassword ? "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" : "M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"} /></svg>
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
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mostrarPassword ? "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" : "M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"} /></svg>
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
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-crm-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {busqueda && (
              <button onClick={() => setBusqueda("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-crm-text-muted hover:text-crm-text-primary">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
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

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-crm-border">
                <th className="text-left py-3 px-4 font-medium text-crm-text-primary">Usuario</th>
                <th className="text-left py-3 px-4 font-medium text-crm-text-primary">DNI</th>
                <th className="text-left py-3 px-4 font-medium text-crm-text-primary hidden md:table-cell">Teléfono</th>
                <th className="text-left py-3 px-4 font-medium text-crm-text-primary">Rol</th>
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
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    )}
                    {sortLastAccess === "asc" && (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                    )}
                    {sortLastAccess === "none" && (
                      <svg className="w-3.5 h-3.5 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>
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
                  <td colSpan={8} className="py-8 text-center text-crm-text-muted">
                    <div className="animate-pulse">Cargando usuarios...</div>
                  </td>
                </tr>
              ) : usuarios.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-crm-text-muted">
                    {debouncedSearch ? `No se encontraron usuarios para "${debouncedSearch}"` : "No hay usuarios registrados"}
                  </td>
                </tr>
              ) : (
                usuarios.map((usuario) => {
                  const isDeleted = !!usuario.deleted_at;
                  const { text: lastAccessText, color: lastAccessColor } = timeAgo(usuario.last_sign_in_at);

                  return (
                    <tr key={usuario.id} className={`border-b border-crm-border/50 ${isDeleted ? "opacity-50" : ""}`}>
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
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                  <span className="hidden sm:inline">Reseteo</span>
                                </span>
                              )}
                              {usuario.firma_url && (
                                <span className="text-crm-text-muted" title="Tiene firma digital">
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
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
                            <ProtectedAction permiso={PERMISOS.USUARIOS.ELIMINAR}>
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
                              <ProtectedAction permiso={PERMISOS.USUARIOS.EDITAR}>
                                <button className="inline-flex items-center justify-center w-8 h-8 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors" onClick={() => editarUsuarioPrompt(usuario)} title="Editar">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                </button>
                              </ProtectedAction>
                              {/* History */}
                              <ProtectedAction permiso={PERMISOS.USUARIOS.EDITAR}>
                                <button className="inline-flex items-center justify-center w-8 h-8 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors" onClick={() => { setHistorialUser(usuario); setHistorialOpen(true); }} title="Historial de cambios">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                </button>
                              </ProtectedAction>
                              {/* Reset Password */}
                              <ProtectedAction permiso={PERMISOS.USUARIOS.EDITAR}>
                                <button className="inline-flex items-center justify-center w-8 h-8 text-orange-600 hover:text-orange-800 hover:bg-orange-50 rounded-lg transition-colors" onClick={() => handleResetPassword(usuario)} title="Resetear contraseña">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                                </button>
                              </ProtectedAction>
                              {/* Toggle Active */}
                              <ProtectedAction permiso={PERMISOS.USUARIOS.ACTIVAR_DESACTIVAR}>
                                <button className={`inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${usuario.activo ? "text-red-600 hover:text-red-800 hover:bg-red-50" : "text-green-600 hover:text-green-800 hover:bg-green-50"}`} onClick={() => toggleActivo(usuario)} title={usuario.activo ? "Desactivar" : "Activar"}>
                                  {usuario.activo ? (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" /></svg>
                                  ) : (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                  )}
                                </button>
                              </ProtectedAction>
                              {/* Delete */}
                              <ProtectedAction permiso={PERMISOS.USUARIOS.ELIMINAR}>
                                <button className="inline-flex items-center justify-center w-8 h-8 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors" onClick={() => handleDeleteUser(usuario)} title="Eliminar">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
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

      <ImportarUsuariosModal
        open={importModalOpen}
        roles={roles}
        onClose={() => setImportModalOpen(false)}
        onImportComplete={cargarUsuarios}
      />
    </div>
  );
}

export default function AdminUsuariosPage() {
  const { isAdmin, loading } = useAdminPermissions();

  if (loading) {
    return (
      <div className="crm-card p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-crm-border rounded w-1/4 mb-4"></div>
          <div className="h-10 bg-crm-border rounded"></div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="crm-card p-6 border-l-4 border-crm-warning">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-crm-warning/20 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-crm-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-medium text-crm-text-primary">Acceso Restringido</h3>
            <p className="text-xs text-crm-text-muted">Solo los administradores pueden gestionar usuarios.</p>
          </div>
        </div>
      </div>
    );
  }

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
