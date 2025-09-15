import { Suspense } from "react";
import { createServerOnlyClient } from "@/lib/supabase.server";
import { redirect } from "next/navigation";
import { esAdmin } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminUsuariosPage() {
  const supabase = await createServerOnlyClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const isAdminUser = await esAdmin();
  if (!isAdminUser) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-crm-bg-primary">
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-crm-text-primary">Gestión de Usuarios</h1>
          <p className="text-crm-text-secondary mt-2">
            Administra usuarios, roles y permisos del sistema
          </p>
        </div>

        <Suspense fallback={
          <div className="crm-card p-6">
            <div className="animate-pulse">
              <div className="h-8 bg-crm-border rounded mb-4"></div>
              <div className="h-64 bg-crm-border rounded"></div>
            </div>
          </div>
        }>
          <GestionUsuarios />
        </Suspense>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";

interface Usuario {
  id: string;
  email: string;
  nombre?: string;
  rol: string;
  estado: string;
  ultimo_acceso?: string;
  meta_mensual?: number;
  comision_porcentaje?: number;
}

function GestionUsuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarUsuarios();
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

  return (
    <div className="space-y-6">
      {/* Header con botón para crear usuario */}
      <div className="crm-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-crm-text-primary">Gestión de Usuarios</h2>
            <p className="text-crm-text-secondary text-sm mt-1">
              Crea y administra vendedores del sistema
            </p>
          </div>
          <button 
            onClick={() => setMostrarFormulario(true)}
            className="crm-button-primary px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>Crear Vendedor</span>
          </button>
        </div>
      </div>

      {/* Formulario de creación de usuario */}
      {mostrarFormulario && (
        <div className="crm-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-crm-text-primary">Crear Nuevo Vendedor</h3>
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
                  Nombre Completo
                </label>
                <input
                  type="text"
                  name="nombre"
                  required
                  className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary placeholder-crm-text-muted focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-crm-primary"
                  placeholder="Nombre del vendedor"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-crm-text-primary mb-2">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary placeholder-crm-text-muted focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-crm-primary"
                  placeholder="vendedor@amersur.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-crm-text-primary mb-2">
                  Contraseña Temporal
                </label>
                <input
                  type="password"
                  name="password"
                  required
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
                Crear Vendedor
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
                <th className="text-left py-3 px-4 font-medium text-crm-text-primary">Rol</th>
                <th className="text-left py-3 px-4 font-medium text-crm-text-primary">Meta Mensual</th>
                <th className="text-left py-3 px-4 font-medium text-crm-text-primary">Comisión</th>
                <th className="text-left py-3 px-4 font-medium text-crm-text-primary">Estado</th>
                <th className="text-left py-3 px-4 font-medium text-crm-text-primary">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-crm-text-muted">
                    <div className="animate-pulse">Cargando usuarios...</div>
                  </td>
                </tr>
              ) : usuarios.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-crm-text-muted">
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
                            {usuario.nombre?.charAt(0) || usuario.email.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-crm-text-primary">{usuario.nombre || 'Sin nombre'}</p>
                          <p className="text-sm text-crm-text-muted">{usuario.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        usuario.rol === 'ROL_ADMIN' 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {usuario.rol === 'ROL_ADMIN' ? 'Administrador' : 'Vendedor'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-crm-text-primary">
                      {usuario.meta_mensual ? `S/ ${usuario.meta_mensual.toLocaleString()}` : '-'}
                    </td>
                    <td className="py-3 px-4 text-sm text-crm-text-primary">
                      {usuario.comision_porcentaje ? `${usuario.comision_porcentaje}%` : '-'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                        Activo
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex space-x-2">
                        <button className="text-blue-600 hover:text-blue-800 text-sm">
                          Editar
                        </button>
                        <button className="text-red-600 hover:text-red-800 text-sm">
                          Desactivar
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
    </div>
  );
}
