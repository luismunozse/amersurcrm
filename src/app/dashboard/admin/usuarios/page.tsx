"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import UserEditModal from "@/components/UserEditModal";
import EstadoUsuarioModal from "@/components/EstadoUsuarioModal";
import ResetPasswordModal from "@/components/ResetPasswordModal";
import { cambiarEstadoUsuario, resetearPasswordUsuario } from "./_actions";

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
}

interface Rol {
  id: string;
  nombre: string;
  descripcion: string;
}

function GestionUsuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [userEditing, setUserEditing] = useState<Usuario | null>(null);
  const [estadoModalOpen, setEstadoModalOpen] = useState(false);
  const [userCambiandoEstado, setUserCambiandoEstado] = useState<Usuario | null>(null);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [passwordTemporal, setPasswordTemporal] = useState<string | null>(null);
  const [userResetPassword, setUserResetPassword] = useState<Usuario | null>(null);

  useEffect(() => {
    cargarUsuarios();
    cargarRoles();
  }, []);

  const cargarUsuarios = async () => {
    try {
      setCargando(true);
      const response = await fetch('/api/admin/usuarios');
      const data = await response.json();
      setUsuarios(data.usuarios || []);
    } catch (error) {
      console.error('Error cargando usuarios:', error);
      toast.error('Error cargando usuarios');
    } finally {
      setCargando(false);
    }
  };

  const cargarRoles = async () => {
    try {
      const response = await fetch('/api/admin/roles');
      const data = await response.json();
      setRoles(data.roles || []);
    } catch (error) {
      console.error('Error cargando roles:', error);
      toast.error('Error cargando roles');
    }
  };

  const crearUsuario = async (formData: FormData) => {
    try {
      const response = await fetch('/api/admin/usuarios', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Usuario creado exitosamente');
        setMostrarFormulario(false);
        cargarUsuarios();
      } else {
        toast.error(data.message || 'Error creando usuario');
      }
    } catch (error) {
      console.error('Error creando usuario:', error);
      toast.error('Error creando usuario');
    }
  };

  // PATCH helper
  const patchUsuario = async (payload: { id: string; nombre_completo?: string; dni?: string; telefono?: string | null; rol_id?: string; meta_mensual?: number | null; comision_porcentaje?: number | null; activo?: boolean; }) => {
    try {
      const response = await fetch('/api/admin/usuarios', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || 'Error actualizando usuario');
      }
      return true;
    } catch (error) {
      console.error('Error patch usuario:', error);
      toast.error('Error actualizando usuario');
      return false;
    }
  };

  const toggleActivo = async (u: Usuario) => {
    setUserCambiandoEstado(u);
    setEstadoModalOpen(true);
  };

  const handleCambiarEstado = async (motivo: string) => {
    if (!userCambiandoEstado) return;

    const result = await cambiarEstadoUsuario(
      userCambiandoEstado.id,
      !userCambiandoEstado.activo,
      motivo
    );

    if (result.success) {
      toast.success(result.message);
      cargarUsuarios();
      setEstadoModalOpen(false);
      setUserCambiandoEstado(null);
    } else {
      toast.error(result.error || 'Error cambiando estado');
    }
  };

  const handleResetPassword = async (u: Usuario) => {
    const result = await resetearPasswordUsuario(u.id);

    if (result.success && result.passwordTemporal) {
      setUserResetPassword(u);
      setPasswordTemporal(result.passwordTemporal);
      setResetModalOpen(true);
      cargarUsuarios();
    } else {
      toast.error(result.error || 'Error reseteando contraseña');
    }
  };

  const editarUsuarioPrompt = async (u: Usuario) => {
    setUserEditing(u);
    setModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header con botón para crear usuario */}
      <div className="crm-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-crm-text-primary">Gestión de Usuarios</h2>
            <p className="text-crm-text-secondary text-sm mt-1">
              Crea y administra usuarios del sistema (Vendedores, Coordinadores, etc.)
            </p>
          </div>
          <button 
            onClick={() => setMostrarFormulario(true)}
            className="crm-button-primary px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>Crear Usuario</span>
          </button>
        </div>
      </div>

      {/* Formulario de creación de usuario */}
      {mostrarFormulario && (
        <div className="crm-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-crm-text-primary">Crear Nuevo Usuario</h3>
            <button 
              onClick={() => setMostrarFormulario(false)}
              className="text-crm-text-muted hover:text-crm-text-primary"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form action={crearUsuario} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-crm-text-primary mb-2">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  name="nombre_completo"
                  required
                  className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary placeholder-crm-text-muted focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-crm-primary"
                  placeholder="Juan Pérez García"
                />
                <p className="text-xs text-crm-text-muted mt-1">
                  Se generará automáticamente el username (ej: jperez)
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-crm-text-primary mb-2">
                  DNI * (usado para login)
                </label>
                <input
                  type="text"
                  name="dni"
                  required
                  pattern="[0-9]{8}"
                  maxLength={8}
                  className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary placeholder-crm-text-muted focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-crm-primary"
                  placeholder="12345678"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-crm-text-primary mb-2">
                  Teléfono
                </label>
                <input
                  type="tel"
                  name="telefono"
                  className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary placeholder-crm-text-muted focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-crm-primary"
                  placeholder="987654321"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-crm-text-primary mb-2">
                  Email (Opcional)
                </label>
                <input
                  type="email"
                  name="email"
                  className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary placeholder-crm-text-muted focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-crm-primary"
                  placeholder="usuario@amersur.com (opcional)"
                />
                <p className="text-xs text-crm-text-muted mt-1">
                  Si no se proporciona, se generará automáticamente usando el DNI
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-crm-text-primary mb-2">
                  Rol *
                </label>
                <select
                  name="rol_id"
                  required
                  className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-crm-primary"
                >
                  <option value="">Seleccionar rol</option>
                  {roles.map((rol) => (
                    <option key={rol.id} value={rol.id}>
                      {rol.nombre.replace('ROL_', '').replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-crm-text-primary mb-2">
                  Contraseña Temporal *
                </label>
                <input
                  type="password"
                  name="password"
                  required
                  minLength="6"
                  className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary placeholder-crm-text-muted focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-crm-primary"
                  placeholder="Contraseña temporal"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-crm-text-primary mb-2">
                  Meta Mensual (S/.)
                </label>
                <input
                  type="number"
                  name="meta_mensual"
                  min="0"
                  step="100"
                  className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary placeholder-crm-text-muted focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-crm-primary"
                  placeholder="50000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-crm-text-primary mb-2">
                  Comisión (%)
                </label>
                <input
                  type="number"
                  name="comision_porcentaje"
                  min="0"
                  max="100"
                  step="0.1"
                  className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary placeholder-crm-text-muted focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-crm-primary"
                  placeholder="2.5"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setMostrarFormulario(false)}
                className="px-4 py-2 text-crm-text-muted hover:text-crm-text-primary border border-crm-border rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="crm-button-primary px-4 py-2 rounded-lg text-sm font-medium"
              >
                Crear Usuario
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de usuarios */}
      <div className="crm-card p-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-crm-border">
                <th className="text-left py-3 px-4 font-medium text-crm-text-primary">Usuario</th>
                <th className="text-left py-3 px-4 font-medium text-crm-text-primary">DNI</th>
                <th className="text-left py-3 px-4 font-medium text-crm-text-primary">Teléfono</th>
                <th className="text-left py-3 px-4 font-medium text-crm-text-primary">Rol</th>
                <th className="text-left py-3 px-4 font-medium text-crm-text-primary">Meta/Comisión</th>
                <th className="text-left py-3 px-4 font-medium text-crm-text-primary">Estado</th>
                <th className="text-left py-3 px-4 font-medium text-crm-text-primary">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-crm-text-muted">
                    <div className="animate-pulse">Cargando usuarios...</div>
                  </td>
                </tr>
              ) : usuarios.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-crm-text-muted">
                    No hay usuarios registrados
                  </td>
                </tr>
              ) : (
                usuarios.map((usuario) => (
                  <tr key={usuario.id} className="border-b border-crm-border/50">
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-crm-accent rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-medium">
                            {usuario.nombre_completo?.charAt(0) || usuario.username?.charAt(0).toUpperCase() || 'U'}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-crm-text-primary">{usuario.nombre_completo || 'Sin nombre'}</p>
                            {usuario.requiere_cambio_password && (
                              <span
                                className="px-2 py-0.5 text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded flex items-center gap-1"
                                title="Debe cambiar su contraseña en el próximo inicio de sesión"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                                <span className="hidden sm:inline">Reseteo pendiente</span>
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-crm-text-muted">
                            {usuario.username || 'sin-username'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-crm-text-primary">
                      {usuario.dni || '-'}
                    </td>
                    <td className="py-3 px-4 text-sm text-crm-text-primary">
                      {usuario.telefono || '-'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        usuario.rol?.nombre === 'ROL_ADMIN' 
                          ? 'bg-red-100 text-red-800' 
                          : usuario.rol?.nombre === 'ROL_COORDINADOR_VENTAS'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {usuario.rol?.nombre === 'ROL_ADMIN' 
                          ? 'Administrador' 
                          : usuario.rol?.nombre === 'ROL_COORDINADOR_VENTAS'
                          ? 'Coordinador'
                          : 'Vendedor'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        <p className="text-xs text-crm-text-primary">
                          {usuario.meta_mensual ? `S/ ${usuario.meta_mensual.toLocaleString()}` : 'Sin meta'}
                        </p>
                        <p className="text-xs text-crm-text-muted">
                          {usuario.comision_porcentaje ? `${usuario.comision_porcentaje}%` : 'Sin comisión'}
                        </p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        usuario.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {usuario.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-2">
                        <button className="text-blue-600 hover:text-blue-800 text-sm font-medium" onClick={() => editarUsuarioPrompt(usuario)}>
                          Editar
                        </button>
                        <button
                          className="text-orange-600 hover:text-orange-800 text-sm font-medium"
                          onClick={() => handleResetPassword(usuario)}
                          title="Resetear contraseña"
                        >
                          Reset
                        </button>
                        <button
                          className={`text-sm font-medium ${usuario.activo ? 'text-red-600 hover:text-red-800' : 'text-green-600 hover:text-green-800'}`}
                          onClick={() => toggleActivo(usuario)}
                        >
                          {usuario.activo ? 'Desactivar' : 'Activar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* Modal de edición */}
      <UserEditModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setUserEditing(null); }}
        user={userEditing}
        roles={roles}
        onSave={async (payload) => {
          const ok = await patchUsuario(payload);
          if (ok) {
            toast.success('Usuario actualizado');
            cargarUsuarios();
            return true;
          }
          return false;
        }}
      />

      {/* Modal de cambio de estado */}
      <EstadoUsuarioModal
        open={estadoModalOpen}
        userName={userCambiandoEstado?.nombre_completo || userCambiandoEstado?.email || ''}
        currentState={userCambiandoEstado?.activo || false}
        onConfirm={handleCambiarEstado}
        onClose={() => {
          setEstadoModalOpen(false);
          setUserCambiandoEstado(null);
        }}
      />

      {/* Modal de reset password */}
      <ResetPasswordModal
        open={resetModalOpen}
        userName={userResetPassword?.nombre_completo || userResetPassword?.email || ''}
        passwordTemporal={passwordTemporal}
        onClose={() => {
          setResetModalOpen(false);
          setUserResetPassword(null);
          setPasswordTemporal(null);
        }}
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"/>
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
          <h1 className="text-3xl font-bold text-crm-text-primary">Gestión de Usuarios</h1>
          <p className="text-crm-text-secondary mt-2">
            Administra usuarios, roles y permisos del sistema. Crea vendedores y coordinadores con información completa.
          </p>
        </div>

        <GestionUsuarios />
      </div>
    </div>
  );
}

